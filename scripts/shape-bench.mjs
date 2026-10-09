// The shape benchmark (9 Oct, feat/handbook-shape). For each typed line and goal:
//   old: research v5 and plan v7 on Gemini 3.8 Flash (eval functions), with the old code clamp (quick 1 to 3, course 7);
//   new: the real pipeline on dev (evalShape:create, then handbooks:generatePlan): research v6, plan v8 with its checks,
//        chapter 1 (and every chapter of a quick handbook) written and fact-checked, and chapter 2 of a course.
// Code checks only; the reviewers read the output afterwards. Dev deployment only (needs Node 20+ for the Convex CLI):
//   node scripts/shape-bench.mjs        writes evals/shape-bench/raw.json and report.md
import { execFile } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);
const OUT = "evals/shape-bench";
// From a one-minute recipe to a months-long skill; "expect" is our own guess, for the report only (reviewers never see it).
const TOPICS = [
  { topic: "how to make dal", level: "new", goal: "make dal for a family dinner tonight", mode: "skill", expect: "1 to 2, quick" },
  { topic: "how to tie a tie", level: "new", goal: "tie a tie for my interview tomorrow", mode: "skill", expect: "1, quick" },
  { topic: "my wifi is slow at home", level: "new", goal: "fix it myself this weekend", mode: "skill", expect: "1 to 2, quick" },
  { topic: "avengers before doomsday", level: "new", goal: "catch up before the new film", mode: "story", expect: "2 to 4, quick" },
  { topic: "how compound interest works", level: "new", goal: "understand why starting early matters", mode: "subject", expect: "1 to 3" },
  { topic: "git merge conflicts", level: "some", goal: "stop being scared of merge conflicts", mode: "skill", expect: "1 to 3" },
  { topic: "git", level: "new", goal: "use git at my new job", mode: "skill", expect: "4 to 6, course" },
  { topic: "chess", level: "new", goal: "play a full game with my nephew", mode: "skill", expect: "3 to 5, course" },
  { topic: "swimming", level: "new", goal: "swim one length of a pool", mode: "skill", expect: "4 to 7, course, body" },
  { topic: "mutual funds", level: "new", goal: "start a SIP this month", mode: "decision", expect: "3 to 5, course" },
  { topic: "how the stock market works", level: "new", goal: "understand the news about markets", mode: "subject", expect: "4 to 6, course" },
  { topic: "world war 2", level: "new", goal: "understand why it started and how it ended", mode: "subject", expect: "5 to 7, course" },
  { topic: "spanish", level: "new", goal: "hold basic conversations on a trip in three months", mode: "skill", expect: "7, course" },
  { topic: "getting over a breakup", level: "new", goal: "feel like myself again", mode: "subject", expect: "2 to 4, gentle" },
];
const CONCURRENCY = 5;

const convex = async (fn, args, timeout = 11 * 60 * 1000) => {
  const { stdout } = await run("npx", ["convex", "run", fn, JSON.stringify(args)], { maxBuffer: 50 * 1024 * 1024, timeout });
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
};
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Start a long step on the server and read until it lands (the CLI gives up on calls of more than about 5 minutes).
const waitPlan = async (id) => {
  await convex("evalShape:runPlan", { handbookId: id });
  for (let k = 0; k < 90; k++) { await sleep(10000); const h = await convex("evalShape:read", { handbookId: id }); if (h?.plan || ["failed", "declined", "question"].includes(h?.status)) return h; }
  return convex("evalShape:read", { handbookId: id });
};
const waitChapter = async (id, n) => {
  await convex("evalShape:runChapter", { handbookId: id, n });
  for (let k = 0; k < 60; k++) { await sleep(10000); const c = (await convex("evalShape:read", { handbookId: id }))?.chapters?.find((x) => x.n === n); if (c && c.status !== "writing") return c; }
};

async function pool(items, f) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => { while (i < items.length) { const k = i++; out[k] = await f(items[k], k).catch((e) => ({ error: String(e?.stderr || e?.message || e).slice(0, 300) })); } }));
  return out;
}
const request = (t) => ({ topic: t.topic, level: t.level, goal: t.goal, mode: t.mode });

// ---------- old: research v5 + plan v7, old clamp ----------
async function oldArm(t) {
  const r = await convex("evalResearchPrompt:runOne", { request: request(t), version: "v5" });
  const d = r?.output;
  const brief = d ? { ...d, chapters: d.format === "quick" ? Math.max(1, Math.min(3, Number(d.chapters) || 2)) : 7 } : null;
  const p = await convex("evalPlanPrompt:runOne", { request: request(t), brief: brief ?? undefined, version: "v7", model: "gemini-3.8-flash" });
  log(`  old ${t.topic}: brief ${brief?.format ?? "-"} ${brief?.chapters ?? "-"}, plan ${p?.plan?.chapters?.length ?? "failed"}`);
  return { brief, plan: p?.plan ?? null, error: p?.error ?? r?.error ?? null, inr: (r?.inr ?? 0) + (p?.inr ?? 0) };
}

// ---------- new: the real pipeline ----------
async function waitFor(id, ns) {
  for (let k = 0; k < 60; k++) {
    const h = await convex("evalShape:read", { handbookId: id });
    const done = ns.every((n) => { const c = h?.chapters?.find((x) => x.n === n); return c && c.status !== "writing"; });
    if (done || ["failed", "declined", "question"].includes(h?.status)) return h;
    await sleep(10000);
  }
  return convex("evalShape:read", { handbookId: id });
}
async function newArm(t) {
  const id = await convex("evalShape:create", request(t));
  const started = Date.now();
  let h = await waitPlan(id);
  const planMs = Date.now() - started;
  if (!h?.plan) { log(`  new ${t.topic}: no plan (${h?.status}: ${h?.error ?? h?.question ?? ""})`); return { id, h, planMs }; }
  const total = h.plan.chapters.length, quick = h.plan.format === "quick";
  h = await waitFor(id, quick ? Array.from({ length: total }, (_, i) => i + 1) : [1]);
  if (!quick && total >= 2) {
    await waitChapter(id, 2);
    h = await convex("evalShape:read", { handbookId: id });
  }
  const cost = await convex("evalShape:cost", { handbookId: id });
  log(`  new ${t.topic}: ${h.plan.format} ${total} chapters, written ${h.chapters.filter((c) => c.status === "ready").length}, ₹${cost.inr.toFixed(2)}`);
  return { id, h, planMs, cost };
}

mkdirSync(OUT, { recursive: true });
log(`old arm: ${TOPICS.length} topics`);
const olds = await pool(TOPICS, oldArm);
log(`new arm: ${TOPICS.length} topics through the real pipeline`);
const news = await pool(TOPICS, newArm);
const results = TOPICS.map((t, i) => ({ ...t, old: olds[i], new: news[i] }));
writeFileSync(`${OUT}/raw.json`, JSON.stringify({ at: new Date().toISOString(), results }, null, 2));

// ---------- report (code checks) ----------
const words = (s) => String(s ?? "").replace(/\*\*|\*/g, "").trim().split(/\s+/).filter(Boolean).length;
const cardWords = (c) => c.type === "exercise" ? words(c.prompt) + (c.options ?? []).reduce((a, o) => a + words(o.text), 0) : words(c.body) + words(c.instruction) + (c.steps ?? []).reduce((a, x) => a + words(x.do) + words(x.see), 0) + (c.items ?? []).reduce((a, x) => a + words(x), 0);
const shape = (p) => p ? `${p.format ?? "?"} ${p.chapters?.length ?? 0}` : "failed";
const L = ["# Shape benchmark: old (research v5, plan v7) vs new (research v6, plan v8, writer v5)", "", `Run ${new Date().toISOString()}, Gemini 3.8 Flash, dev deployment. Old = eval functions with the old code clamp; new = the real pipeline with its checks and the fact check.`, "",
  "| Typed line (goal) | Our guess | Old: format, chapters | New: format, chapters | New minutes | New body | New picture | New chapter 1 | Ch 1 words / cards | Ch 2 words / cards (target) | ₹ new |", "|---|---|---|---|---|---|---|---|---|---|---|"];
for (const r of results) {
  const p = r.new?.h?.plan, chs = r.new?.h?.chapters ?? [];
  const c = (n) => { const ch = chs.find((x) => x.n === n); if (!ch || ch.status !== "ready") return ch ? ch.status : "–"; const ws = (ch.cards ?? []).reduce((a, x) => a + cardWords(x), 0); return `${ws} / ${ch.cards.length}`; };
  const m2 = Number(p?.chapters?.[1]?.minutes);
  L.push(`| ${r.topic} (${r.goal}) | ${r.expect} | ${shape(r.old?.plan)} | ${shape(p)}${r.new?.error ? ` (${r.new.error.slice(0, 60)})` : ""} | ${p ? (p.chapters ?? []).map((x) => x.minutes ?? "?").join(", ") : "–"} | ${p?.body ?? "–"} | ${p?.picture?.name ?? "none"} | ${p?.chapters?.[0]?.title ?? "–"} | ${c(1)} | ${c(2)}${m2 ? ` (${Math.round(Math.max(300, Math.min(1200, m2 * 60)) / 50) * 50})` : ""} | ${r.new?.cost ? r.new.cost.inr.toFixed(2) : "–"} |`);
}
const sum = (f) => results.reduce((a, r) => a + (f(r) ?? 0), 0);
L.push("", `Cost: old arm ₹${sum((r) => r.old?.inr).toFixed(2)}, new arm ₹${sum((r) => r.new?.cost?.inr).toFixed(2)}.`, "");
writeFileSync(`${OUT}/report.md`, L.join("\n"));
log(`done: ${OUT}/report.md`);
