// Plan prompt v1 vs v4 vs v5 on Gemini 3.8 Flash (8 Oct): the cheap check of which in-place edit of v1 holds up.
// v4 = v1 with three measured fixes + an Input list; v5 = v4 in STE style. Two topics on frozen research briefs
// (World War I, quick, where v1's framing example was copied; Swimming, a course), 2 runs per prompt. Per topic, one
// blind ranking of all six plans (Sonnet, no web search), read twice in different orders. Code checks on top.
// Dev deployment only:  node scripts/plan-variants.mjs   writes evals/plan-variants/raw.json and report.md
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);
const OUT = "evals/plan-variants";
const MODEL = "gemini-3.8-flash";
const VERSIONS = ["v1", "v4", "v5"];
const RUNS = 2;
const saved = JSON.parse(readFileSync("evals/research-v1-v2-v3/raw.json", "utf8")).research;
const briefOf = (genre) => saved.find((r) => r.genre === genre && r.version === "v3" && r.n === 1).output;
const TOPICS = [
  { id: "world war I", request: { topic: "World War I", level: "new", goal: "understand why it started and how it changed the world", mode: "subject" }, brief: briefOf("history") },
  { id: "swimming", request: { topic: "Swimming", level: "new", goal: "swim my first full length of a pool without stopping", mode: "skill" }, brief: briefOf("physical skill") },
];
const convex = async (fn, args) => JSON.parse((await run("npx", ["convex", "run", fn, JSON.stringify(args)], { maxBuffer: 50 * 1024 * 1024, timeout: 11 * 60 * 1000 })).stdout);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const words = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length;
const checks = (p) => !p ? { valid: false } : {
  valid: true, format: p.format, chapters: p.chapters?.length ?? 0,
  countOk: p.format === "course" ? p.chapters?.length === 7 : p.chapters?.length >= 1 && p.chapters?.length <= 3,
  outcomesYouCan: (p.chapters ?? []).filter((c) => /^you can\b/i.test(String(c.outcome ?? "").trim())).length,
  hooksOver18: (p.chapters ?? []).filter((c) => words(c.hook) >= 18).length,
  framing: p.framing ?? null,
  copiedFraming: /let'?s run through it quickly|get you going/i.test(String(p.framing ?? "")),
  picture: p.picture?.name ?? null,
  asked: !!p.needsClarification,
};

mkdirSync(OUT, { recursive: true });
const jobs = [];
for (const t of TOPICS) for (const version of VERSIONS) for (let n = 1; n <= RUNS; n++) jobs.push({ t, version, n });
log(`writing ${jobs.length} plans on ${MODEL}`);
const plans = await Promise.all(jobs.map(async (j) => {
  const r = await convex("evalPlanPrompt:runOne", { request: j.t.request, brief: j.t.brief, version: j.version, model: MODEL }).catch((e) => ({ ok: false, error: String(e.stderr || e.message).slice(0, 200) }));
  log(`  ${j.t.id} ${j.version} #${j.n}: ${r.ok ? `${(r.ms / 1000).toFixed(0)} s` : "FAILED " + r.error}`);
  return { topic: j.t.id, version: j.version, n: j.n, ...r, checks: checks(r.plan) };
}));

const letters = "ABCDEF";
log("ranking (2 topics x 2 orders)");
const rankings = [];
await Promise.all(TOPICS.map(async (t) => {
  const ps = plans.filter((p) => p.topic === t.id && p.plan);
  const order1 = ps.map((_, i) => i).sort(() => Math.random() - 0.5), order2 = [...order1].reverse();
  for (const order of [order1, order2]) {
    const j = await convex("evalPlanPrompt:rankPlans", { request: t.request, brief: t.brief, plans: order.map((i, k) => ({ label: letters[k], plan: ps[i].plan })) });
    rankings.push({ topic: t.id, order: order.map((i) => `${ps[i].version}#${ps[i].n}`), ...j });
    order.forEach((i, k) => {
      const s = j.verdict?.plans?.find((x) => x.label === letters[k]);
      ps[i].reads = [...(ps[i].reads ?? []), { rank: (j.verdict?.ranking ?? []).indexOf(letters[k]) + 1, scores: s?.scores ?? null, note: s?.note ?? null }];
    });
  }
}));
writeFileSync(`${OUT}/raw.json`, JSON.stringify({ at: new Date().toISOString(), model: MODEL, plans, rankings: rankings.map(({ verdict, error, inr, topic, order }) => ({ topic, order, verdict, error, inr })) }, null, 2));

const DIMS = ["goalFit", "coverage", "progression", "outcomes", "hooks", "picture", "fidelity", "sources", "clarity"];
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const f = (x, d = 2) => (typeof x === "number" ? x.toFixed(d) : "–");
const scoreOf = (p, d) => mean((p.reads ?? []).map((r) => r.scores?.[d]).filter((v) => typeof v === "number"));
const meanOf = (p) => mean(DIMS.map((d) => scoreOf(p, d)).filter((v) => v !== null));
const of = (v, t) => plans.filter((p) => p.version === v && p.plan && (!t || p.topic === t));
const L = ["# Plan prompt v1 vs v4 vs v5 (Gemini 3.8 Flash, medium)", "", `Run ${new Date().toISOString()}. Frozen research briefs. ${RUNS} plans per prompt per topic. Judge: Claude Sonnet 5.5, no web search, blind; per topic all six plans ranked together, read twice in different orders. Place is 1 (best) to 6.`, "",
  "| Prompt | Judge mean | Mean place (of 6) | World War I mean / place | Swimming mean / place | Latency median | Tokens in / out | ₹ a plan | Framing copied from v1's example |", "|---|---|---|---|---|---|---|---|---|"];
for (const v of VERSIONS) {
  const g = of(v);
  const place = (ps) => mean(ps.flatMap((p) => (p.reads ?? []).map((r) => r.rank).filter((x) => x > 0)));
  const ms = g.map((p) => p.ms).sort((a, b) => a - b);
  L.push(`| ${v} | **${f(mean(g.map(meanOf)))}** | ${f(place(g), 1)} | ${f(mean(of(v, "world war I").map(meanOf)))} / ${f(place(of(v, "world war I")), 1)} | ${f(mean(of(v, "swimming").map(meanOf)))} / ${f(place(of(v, "swimming")), 1)} | ${ms.length ? (ms[Math.floor((ms.length - 1) / 2)] / 1000).toFixed(0) + " s" : "–"} | ${Math.round(mean(g.map((p) => p.tokensIn)))} / ${Math.round(mean(g.map((p) => p.tokensOut)))} | ₹${f(mean(g.map((p) => p.inr).filter((x) => typeof x === "number")))} | ${g.filter((p) => p.checks.copiedFraming).length}/${g.filter((p) => p.checks.framing).length} |`);
}
L.push("", `| Dimension | ${VERSIONS.join(" | ")} |`, `|---|${VERSIONS.map(() => "---").join("|")}|`, ...DIMS.map((d) => `| ${d} | ${VERSIONS.map((v) => f(mean(of(v).map((p) => scoreOf(p, d)).filter((x) => x !== null)))).join(" | ")} |`));
L.push("", "## Code checks", "", "| Prompt | Plans ok | Chapter count right | Outcomes start \"You can\" | Hooks 18+ words | Asked a question despite a goal |", "|---|---|---|---|---|---|");
for (const v of VERSIONS) { const g = of(v); L.push(`| ${v} | ${g.length}/${plans.filter((p) => p.version === v).length} | ${g.filter((p) => p.checks.countOk).length}/${g.length} | ${g.reduce((a, p) => a + p.checks.outcomesYouCan, 0)}/${g.reduce((a, p) => a + p.checks.chapters, 0)} | ${g.reduce((a, p) => a + p.checks.hooksOver18, 0)} | ${g.filter((p) => p.checks.asked).length} |`); }
L.push("", "## Framing lines (World War I, quick)", "", ...plans.filter((p) => p.topic === "world war I" && p.plan).map((p) => `- ${p.version} #${p.n}: "${p.checks.framing}"`));
L.push("", "## Judge's notes", "", ...plans.filter((p) => p.plan).map((p) => `- **${p.topic}, ${p.version} #${p.n}** (places ${(p.reads ?? []).map((r) => r.rank).join(", ")}): ${(p.reads ?? []).map((r) => r.note).filter(Boolean).join(" / ")}`));
L.push("", "Judge's summaries:", "", ...rankings.map((r) => `- ${r.topic}: ${r.verdict?.why ?? r.error}`));
L.push("", `Cost: plans ₹${f(plans.reduce((a, p) => a + (p.inr ?? 0), 0))}, judging ₹${f(rankings.reduce((a, r) => a + (r.inr ?? 0), 0))}.`, "");
writeFileSync(`${OUT}/report.md`, L.join("\n"));
log(`done: ${OUT}/report.md`);
