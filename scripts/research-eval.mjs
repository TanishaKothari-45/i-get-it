// Research prompt eval (8 Oct). For each topic: research with each prompt version (RUNS times), judge every brief
// alone, and compare every pair of versions side by side, blind, in both orders. Code checks run here; quality comes
// from the judge. Run against the dev deployment only:
//   node scripts/research-eval.mjs                  v1 against the live v4
// Writes evals/<round>/raw.json; then node scripts/research-eval-report.mjs <round dir> writes report.md.
import { execFile } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);
const RUNS = 2;

// The goal, mode and level are what the intent step would have given. Rounds 1 and 2 (8 Oct) tested v2 and v3, since
// removed from the code; their topics, prompts and results are in evals/research-v1-v2/ and evals/research-v1-v2-v3/.
const ROUNDS = {
  v14: {
    out: "evals/research-v1-v4", versions: ["v1", "v4"],
    topics: [
      { genre: "physical skill", request: { topic: "Swimming", goal: "swim my first full length of a pool without stopping", mode: "skill", level: "new" } },
      { genre: "history", request: { topic: "World War I", goal: "understand why it started and how it changed the world", mode: "subject", level: "new" } },
    ],
  },
};
const ROUND = ROUNDS[process.env.EVAL ?? "v14"];
const { out: OUT, versions: VERSIONS, topics: TOPICS } = ROUND;

async function convex(fn, args) {
  const { stdout } = await run("npx", ["convex", "run", fn, JSON.stringify(args)], { maxBuffer: 20 * 1024 * 1024, timeout: 11 * 60 * 1000 });
  return JSON.parse(stdout);
}

// ---------- code checks ----------
const words = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length;
const sentences = (s) => String(s ?? "").split(/(?<=[.!?])\s+/).filter((x) => x.trim());
function checks(r) {
  const o = r.output;
  if (!o) return { valid: false };
  const facts = Array.isArray(o.facts) ? o.facts : [];
  const lens = facts.flatMap((f) => sentences(f).map(words));
  const sources = Array.isArray(o.sources) ? o.sources : [];
  return {
    valid: true,
    kind: o.kind, format: o.format, chapters: o.chapters,
    outline: Array.isArray(o.outline) ? o.outline : null,
    facts: facts.length,
    factWordsAvg: lens.length ? +(lens.reduce((a, b) => a + b, 0) / lens.length).toFixed(1) : 0,
    sentencesOver20: lens.filter((n) => n > 20).length,
    sources: sources.length,
    framing: o.framing ?? null,
  };
}
// The judges never see the framing line: v3 leaves it to the planner, so it must not count for or against a brief.
const forJudge = (o) => { const { framing, ...rest } = o; return rest; };

// Run jobs with at most `limit` at once.
async function pool(jobs, limit) {
  const out = new Array(jobs.length);
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < jobs.length) {
      const i = next++;
      try { out[i] = await jobs[i](); } catch (e) { out[i] = { error: String(e?.stderr || e?.message || e).slice(0, 400) }; }
    }
  }));
  return out;
}

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const save = (extra = {}) => writeFileSync(`${OUT}/raw.json`, JSON.stringify({ versions: VERSIONS, topics: TOPICS, ...extra }, null, 2));

mkdirSync(OUT, { recursive: true });
log(`research: ${TOPICS.length} topics x ${VERSIONS.join(", ")} x ${RUNS} runs`);
const meta = [];
for (const t of TOPICS) for (const version of VERSIONS) for (let n = 1; n <= RUNS; n++) meta.push({ genre: t.genre, request: t.request, version, n });
const research = (await pool(meta.map((m) => async () => {
  const r = await convex("evalResearchPrompt:runOne", { request: m.request, version: m.version });
  log(`  ${m.genre} ${m.version} #${m.n}: ${r.error ? "FAILED " + r.error.slice(0, 80) : `${(r.ms / 1000).toFixed(0)} s, ${r.facts ?? r.output?.facts?.length} facts`}`);
  return { ...r, checks: checks(r) };
}), 6)).map((r, i) => ({ ...meta[i], ...r }));
save({ research });

log("judging each brief alone");
const judged = await pool(research.map((r) => async () => {
  if (!r.output) return null;
  const j = await convex("evalResearchPrompt:judgeOne", { request: r.request, output: forJudge(r.output) });
  log(`  ${r.genre} ${r.version} #${r.n}: ${j.error ? "FAILED " + j.error.slice(0, 80) : "ok"}`);
  return j;
}), 6);
research.forEach((r, i) => { r.judge = judged[i]; });
save({ research });

log("comparing every pair of versions side by side, both orders");
const pairs = [];
for (const t of TOPICS) for (let n = 1; n <= RUNS; n++)
  for (let i = 0; i < VERSIONS.length; i++) for (let k = i + 1; k < VERSIONS.length; k++) {
    const x = research.find((r) => r.genre === t.genre && r.version === VERSIONS[i] && r.n === n);
    const y = research.find((r) => r.genre === t.genre && r.version === VERSIONS[k] && r.n === n);
    if (x?.output && y?.output) pairs.push({ genre: t.genre, request: t.request, n, x, y });
  }
const compared = await pool(pairs.flatMap((p) => [
  async () => convex("evalResearchPrompt:compare", { request: p.request, a: forJudge(p.x.output), b: forJudge(p.y.output) }),
  async () => convex("evalResearchPrompt:compare", { request: p.request, a: forJudge(p.y.output), b: forJudge(p.x.output) }),
]), 6);
const comparisons = pairs.map((p, i) => ({ genre: p.genre, n: p.n, x: p.x.version, y: p.y.version, xAsA: compared[2 * i], yAsA: compared[2 * i + 1] }));
save({ research, comparisons, at: new Date().toISOString() });
log(`done: ${OUT}/raw.json`);
