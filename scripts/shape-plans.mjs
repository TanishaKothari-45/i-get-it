// Plans only, on Gemini Flash alone (9 Oct). The same 14 lines as shape-bench, through the real pipeline with a test
// handbook marked flashOnly and planOnly: research v6 and plan v8 with their checks, no Opus or Claude backup, no
// chapters. The old plans (research v5, plan v7) are reused from evals/shape-bench/raw.json. Also records which plan
// faults Flash's first plan had. Dev deployment only (Node 20+):  node scripts/shape-plans.mjs
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);
const OUT = "evals/shape-plans";
const before = JSON.parse(readFileSync("evals/shape-bench/raw.json", "utf8")).results;
const convex = async (fn, args) => { const { stdout } = await run("npx", ["convex", "run", fn, JSON.stringify(args)], { maxBuffer: 50 * 1024 * 1024, timeout: 11 * 60 * 1000 }); const t = stdout.trim(); return t ? JSON.parse(t) : null; };
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

async function pool(items, f, n = 5) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await f(items[k]).catch((e) => ({ error: String(e?.stderr || e?.message || e).slice(0, 300) })); } }));
  return out;
}

async function one(t) {
  const id = await convex("evalShape:create", { topic: t.topic, level: t.level, goal: t.goal, mode: t.mode, flashOnly: true, planOnly: true });
  const h = await waitPlan(id);
  const cost = await convex("evalShape:cost", { handbookId: id });
  const p = h?.plan;
  log(`  ${t.topic}: ${p ? `${p.format} ${p.chapters.length}` : `no plan (${h?.status}: ${h?.error ?? ""})`}, first faults ${h?.test?.firstFaults?.length ?? "–"}, left ${h?.test?.finalFaults?.length ?? "–"}, ₹${cost.inr.toFixed(2)}`);
  return { id, h, cost };
}

mkdirSync(OUT, { recursive: true });
log(`${before.length} lines, Flash only, plans only`);
const news = await pool(before, one);
const results = before.map((t, i) => ({ topic: t.topic, goal: t.goal, level: t.level, mode: t.mode, expect: t.expect, old: t.old, new: news[i] }));
writeFileSync(`${OUT}/raw.json`, JSON.stringify({ at: new Date().toISOString(), results }, null, 2));

const shape = (p) => p ? `${p.format ?? "?"} ${p.chapters?.length ?? 0}` : "failed";
const L = ["# Plans on Flash alone: old (research v5, plan v7) vs new (research v6, plan v8)", "", `Run ${new Date().toISOString()}. New = the real plan step on a test handbook, Gemini 3.8 Flash only (no Opus or Claude backup), no chapters.`, "",
  "| Typed line (goal) | Our guess | Old | Research said | New plan | Minutes | Picture | Body | Flash's first plan: faults | Left after the re-ask | Start | Part weights | ₹ |", "|---|---|---|---|---|---|---|---|---|---|---|---|---|"];
for (const r of results) {
  const h = r.new?.h, p = h?.plan, b = h?.brief;
  L.push(`| ${r.topic} (${r.goal}) | ${r.expect} | ${shape(r.old?.plan)} | ${b ? (b.failed ? "failed" : `${b.format} ${b.chapters}`) : "–"} | ${shape(p)} | ${p ? p.chapters.map((c) => c.minutes ?? "?").join(", ") : "–"} | ${p?.picture?.name ?? "none"} | ${p?.body ?? "–"} | ${(h?.test?.firstFaults ?? []).join("; ") || "none"} | ${(h?.test?.finalFaults ?? []).join("; ") || "none"} | ${b?.start ?? "–"} | ${(b?.parts ?? []).map((x) => `${x.part}: ${x.weight}`).join("; ")} | ${r.new?.cost?.inr?.toFixed(2) ?? "–"} |`);
}
L.push("", `Cost of this run: ₹${results.reduce((a, r) => a + (r.new?.cost?.inr ?? 0), 0).toFixed(2)}.`, "");
writeFileSync(`${OUT}/report.md`, L.join("\n"));
log(`done: ${OUT}/report.md`);
