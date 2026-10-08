// Prompt + model comparison on one topic, cheaply (8 Oct). Five plans for the same request and frozen brief:
// Opus 5.5 high with v1 (saved from evals/plan-v1-v2), and v3 on Opus, Gemini 3.8 Flash (medium), Gemini 3.1 Pro and
// DeepSeek V4 Pro. One blind ranking judge (Sonnet, no web search), run twice with the plans in a different order.
// Dev deployment only:  node scripts/plan-compare.mjs   writes evals/plan-compare/raw.json and report.md
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);
const OUT = "evals/plan-compare";
const request = { topic: "Swimming", level: "new", goal: "swim my first full length of a pool without stopping", mode: "skill" };
const brief = JSON.parse(readFileSync("evals/research-v1-v2-v3/raw.json", "utf8")).research.find((r) => r.genre === "physical skill" && r.version === "v3" && r.n === 1).output;
const saved = JSON.parse(readFileSync("evals/plan-v1-v2/raw.json", "utf8")).plans.find((p) => p.case === "swimming" && p.version === "v1" && p.n === 1);
const NEW = [
  { model: "opus", label: "Opus 5.5 high" },
  { model: "gemini-3.8-flash", label: "Gemini 3.8 Flash (medium)" },
  { model: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
  { model: "ci:deepseek-v4-pro", label: "DeepSeek V4 Pro" },
];
const convex = async (fn, args) => JSON.parse((await run("npx", ["convex", "run", fn, JSON.stringify(args)], { maxBuffer: 50 * 1024 * 1024, timeout: 11 * 60 * 1000 })).stdout);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

mkdirSync(OUT, { recursive: true });
log("writing 4 plans with v3");
const fresh = await Promise.all(NEW.map(async (m) => {
  const r = await convex("evalPlanPrompt:runOne", { request, brief, version: "v3", model: m.model });
  log(`  ${m.label}: ${r.ok ? `${(r.ms / 1000).toFixed(0)} s` : "FAILED " + r.error}`);
  return { ...m, prompt: "v3", ...r };
}));
const plans = [{ model: "opus", label: "Opus 5.5 high", prompt: "v1", reused: true, ...saved }, ...fresh].filter((p) => p.plan);

// Two orders: shuffled, then reversed, so each plan sits in a different place each time. Labels are letters only.
const order1 = plans.map((_, i) => i).sort(() => Math.random() - 0.5), order2 = [...order1].reverse();
const letters = "ABCDE";
const rankWith = async (order) => {
  const j = await convex("evalPlanPrompt:rankPlans", { request, brief, plans: order.map((i, k) => ({ label: letters[k], plan: plans[i].plan })) });
  return { order, ...j };
};
log("judging (2 orders)");
const judged = await Promise.all([rankWith(order1), rankWith(order2)]);

const DIMS = ["goalFit", "coverage", "progression", "outcomes", "hooks", "picture", "fidelity", "sources", "clarity"];
const result = plans.map((p, i) => {
  const per = judged.map((j) => { const k = j.order.indexOf(i); const l = letters[k]; const s = j.verdict?.plans?.find((x) => x.label === l); return { s, rank: (j.verdict?.ranking ?? []).indexOf(l) + 1, note: s?.note }; });
  const scores = Object.fromEntries(DIMS.map((d) => { const xs = per.map((x) => x.s?.scores?.[d]).filter((v) => typeof v === "number"); return [d, xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null]; }));
  const vals = DIMS.map((d) => scores[d]).filter((v) => v !== null);
  return { name: `${p.label}, ${p.prompt}`, model: p.model, prompt: p.prompt, reused: !!p.reused, ms: p.ms, tokensIn: p.tokensIn, tokensOut: p.tokensOut, inr: p.inr, plan: p.plan, scores, mean: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null, ranks: per.map((x) => x.rank), notes: per.map((x) => x.note) };
}).sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0));
writeFileSync(`${OUT}/raw.json`, JSON.stringify({ at: new Date().toISOString(), request, brief, results: result, judges: judged.map((j) => ({ order: j.order, verdict: j.verdict, error: j.error, inr: j.inr })) }, null, 2));

const f = (x, d = 1) => (typeof x === "number" ? x.toFixed(d) : "–");
const L = ["# Plan: prompt v1 vs v3 and four models, one topic", "", `Swimming (new, goal: ${request.goal}). Frozen research brief. Judge: Claude Sonnet 5.5, no web search, blind, all five plans at once, run twice in different orders. One plan per row: a strong signal, not proof.`, "",
  "| Plan | Mean | Ranks (2 orders) | Latency | Tokens in / out | ₹ |", "|---|---|---|---|---|---|",
  ...result.map((r) => `| ${r.name}${r.reused ? " (saved)" : ""} | **${f(r.mean, 2)}** | ${r.ranks.join(", ")} | ${f(r.ms / 1000, 0)} s | ${r.tokensIn} / ${r.tokensOut} | ${typeof r.inr === "number" ? "₹" + f(r.inr, 2) : "not priced"} |`),
  "", `| Dimension | ${result.map((r) => r.name).join(" | ")} |`, `|---|${result.map(() => "---").join("|")}|`,
  ...DIMS.map((d) => `| ${d} | ${result.map((r) => f(r.scores[d])).join(" | ")} |`),
  "", "Judge's notes:", "", ...result.map((r) => `- **${r.name}**: ${r.notes.filter(Boolean).join(" / ")}`),
  "", `Judge's summary: ${judged.map((j) => j.verdict?.why ?? j.error).join(" / ")}`,
  "", `Cost: plans ₹${f(fresh.reduce((a, p) => a + (p.inr ?? 0), 0), 2)} (DeepSeek not priced), judging ₹${f(judged.reduce((a, j) => a + (j.inr ?? 0), 0), 2)}.`, ""];
writeFileSync(`${OUT}/report.md`, L.join("\n"));
log(`done: ${OUT}/report.md`);
