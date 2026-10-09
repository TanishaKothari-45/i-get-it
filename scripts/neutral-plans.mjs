// The neutral set (9 Oct): 12 requests across domains, breadth, depth and pace, none from earlier tests. Plans only, on
// Gemini alone (flashOnly: research falls back to Gemini 3.1 Pro, never Claude; no Opus), at most 2 at a time because
// Google's Flash is busy. Dev deployment only (Node 20+):  node scripts/neutral-plans.mjs
// Writes evals/neutral/<time>/raw.json (the shape delivery-review.mjs reads) and report.md.
import { execFile } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);
export const NEUTRAL = [
  { topic: "change a flat bicycle tyre", level: "new", goal: "do it myself this weekend", mode: "skill" },
  { topic: "prepare for a job interview", level: "new", goal: "my interview is next Monday", mode: "skill" },
  { topic: "how vaccines work", level: "new", goal: "explain it to my parents", mode: "subject" },
  { topic: "photosynthesis", level: "new", goal: "pass my class 10 exam", mode: "subject" },
  { topic: "start running", level: "new", goal: "run 5 km without stopping in two months", mode: "skill" },
  { topic: "excel", level: "new", goal: "make a monthly budget sheet", mode: "skill" },
  { topic: "the french revolution", level: "new", goal: "understand what happened and why", mode: "subject" },
  { topic: "indian constitution basics", level: "new", goal: "understand my rights", mode: "subject" },
  { topic: "file my income tax return", level: "new", goal: "file it myself this year", mode: "decision" },
  { topic: "meditation", level: "new", goal: "sleep better", mode: "skill" },
  { topic: "game of thrones", level: "new", goal: "catch up before the new season", mode: "story" },
  { topic: "speak confidently in meetings", level: "some", goal: "speak up in team meetings", mode: "skill" },
];
const OUT = `evals/neutral/${new Date().toISOString().slice(0, 16).replace(":", "-")}`;
const convex = async (fn, args) => { const { stdout } = await run("npx", ["convex", "run", fn, JSON.stringify(args)], { maxBuffer: 1e8, timeout: 11 * 60 * 1000 }); const t = stdout.trim(); return t ? JSON.parse(t) : null; };
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

async function one(t) {
  const id = await convex("evalShape:create", { ...t, flashOnly: true, planOnly: true });
  let h;
  for (let k = 0; k < 3; k++) {
    h = await waitPlan(id);
    if (h?.plan) break;
    log(`    ${t.topic}: plan failed (${String(h?.error ?? h?.status).slice(0, 70)}), retry ${k + 1} after 45 s`);
    await convex("evalShape:resetForRetry", { handbookId: id });
    await sleep(45000);
  }
  const cost = await convex("evalShape:cost", { handbookId: id });
  const p = h?.plan, b = h?.brief;
  log(`  ${t.topic}: ${p ? `${p.format} ${p.chapters.length}` : "no plan"} · research ${b ? (b.failed ? "failed" : "ok") : "-"} · faults left ${h?.test?.finalFaults?.length ?? "-"} · ₹${cost.inr.toFixed(2)}`);
  return { id, h, cost };
}
mkdirSync(OUT, { recursive: true });
const res = new Array(NEUTRAL.length); let i = 0;
await Promise.all([0, 1].map(async () => { while (i < NEUTRAL.length) { const k = i++; res[k] = await one(NEUTRAL[k]).catch((e) => ({ error: String(e?.message ?? e).slice(0, 200) })); } }));
const results = NEUTRAL.map((t, k) => ({ ...t, new: res[k] }));
writeFileSync(`${OUT}/raw.json`, JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
const L = ["# Neutral set: plans on Gemini alone (research v8, plan v9)", "", "| Line (goal) | Research | Walks away with | Pieces (depth) | Plan | Chapters: pieces → must-haves | Analogy | Faults left | ₹ |", "|---|---|---|---|---|---|---|---|---|"];
for (const r of results) {
  const h = r.new?.h, p = h?.plan, b = h?.brief;
  L.push(`| ${r.topic} (${r.goal}) | ${b ? (b.failed ? "failed" : `${b.format} ${b.chapters}`) : "–"} | ${b?.deliverable ?? "–"} | ${(b?.parts ?? []).map((x) => `${x.part} (${x.depth ?? x.weight})`).join("; ")} | ${p ? `${p.format} ${p.chapters.length}` : "no plan"} | ${p ? p.chapters.map((c, k) => `${k + 1}. ${c.title} [${(c.pieces ?? []).join(", ")}] → ${(c.needs ?? []).length} must-haves${c.readMinutes ? `, ${c.readMinutes} min read` : ""}`).join("<br>") : "–"} | ${p?.picture?.name ?? (p?.pictureWhyNot ? `none: ${p.pictureWhyNot}` : "none")} | ${(h?.test?.finalFaults ?? []).join("; ") || "none"} | ${r.new?.cost?.inr?.toFixed(2) ?? "–"} |`);
}
L.push("", `Cost: ₹${results.reduce((a, r) => a + (r.new?.cost?.inr ?? 0), 0).toFixed(2)}.`, "");
writeFileSync(`${OUT}/report.md`, L.join("\n"));
log(`done: ${OUT}/report.md`);
