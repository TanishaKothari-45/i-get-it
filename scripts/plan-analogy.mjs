// Does the v6 analogy rule (map the picture before writing, picture.maps) give better analogies on a weaker model?
// (8 Oct) Two new Gemini 3.8 Flash plans with v6 on Swimming, ranked blind with the four saved Flash Swimming plans
// (v1, v5) from evals/plan-variants: six plans, Sonnet without web search, read twice in different orders.
// Dev deployment only:  node scripts/plan-analogy.mjs   writes evals/plan-analogy/raw.json and report.md
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);
const OUT = "evals/plan-analogy";
const MODEL = "gemini-3.8-flash";
const request = { topic: "Swimming", level: "new", goal: "swim my first full length of a pool without stopping", mode: "skill" };
const brief = JSON.parse(readFileSync("evals/research-v1-v2-v3/raw.json", "utf8")).research.find((r) => r.genre === "physical skill" && r.version === "v3" && r.n === 1).output;
const saved = JSON.parse(readFileSync("evals/plan-variants/raw.json", "utf8")).plans.filter((p) => p.topic === "swimming" && ["v1", "v5"].includes(p.version) && p.plan);
const convex = async (fn, args) => JSON.parse((await run("npx", ["convex", "run", fn, JSON.stringify(args)], { maxBuffer: 50 * 1024 * 1024, timeout: 11 * 60 * 1000 })).stdout);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// How far the picture reaches into the chapters: titles or covers that use a word from the picture's name or its pairs.
const stop = new Set(["the", "a", "an", "of", "your", "and", "to", "in", "on", "with", "for", "is", "as"]);
function pictureReach(p) {
  const pic = p?.picture;
  if (!pic) return { pairs: 0, chaptersUsing: 0 };
  const vocab = new Set([pic.name, ...(pic.maps ?? []).map((m) => m.is)].join(" ").toLowerCase().match(/[a-z]+/g)?.filter((w) => w.length > 2 && !stop.has(w)) ?? []);
  const chaptersUsing = (p.chapters ?? []).filter((c) => `${c.title} ${c.covers}`.toLowerCase().match(/[a-z]+/g)?.some((w) => vocab.has(w))).length;
  return { pairs: pic.maps?.length ?? 0, chaptersUsing };
}

mkdirSync(OUT, { recursive: true });
log("writing 2 plans with v6");
const fresh = await Promise.all([1, 2].map(async (n) => {
  const r = await convex("evalPlanPrompt:runOne", { request, brief, version: "v6", model: MODEL });
  log(`  v6 #${n}: ${r.ok ? `${(r.ms / 1000).toFixed(0)} s` : "FAILED " + r.error}`);
  return { version: "v6", n, ...r };
}));
const plans = [...saved.map((p) => ({ ...p, reads: [] })), ...fresh.filter((p) => p.plan).map((p) => ({ ...p, reads: [] }))];

const letters = "ABCDEF";
const order1 = plans.map((_, i) => i).sort(() => Math.random() - 0.5), order2 = [...order1].reverse();
log("ranking (2 orders)");
const judged = await Promise.all([order1, order2].map(async (order) => ({ order, ...(await convex("evalPlanPrompt:rankPlans", { request, brief, plans: order.map((i, k) => ({ label: letters[k], plan: plans[i].plan })) })) })));
for (const j of judged) j.order.forEach((i, k) => { const s = j.verdict?.plans?.find((x) => x.label === letters[k]); plans[i].reads.push({ rank: (j.verdict?.ranking ?? []).indexOf(letters[k]) + 1, scores: s?.scores ?? null, note: s?.note ?? null }); });

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const f = (x, d = 2) => (typeof x === "number" ? x.toFixed(d) : "–");
const DIMS = ["goalFit", "coverage", "progression", "outcomes", "hooks", "picture", "fidelity", "sources", "clarity"];
const rows = plans.map((p) => ({ name: `${p.version} #${p.n}`, version: p.version, picture: p.plan.picture, reach: pictureReach(p.plan), titles: (p.plan.chapters ?? []).map((c) => c.title),
  pic: mean(p.reads.map((r) => r.scores?.picture).filter((x) => typeof x === "number")), all: mean(p.reads.flatMap((r) => DIMS.map((d) => r.scores?.[d])).filter((x) => typeof x === "number")),
  ranks: p.reads.map((r) => r.rank), notes: p.reads.map((r) => r.note).filter(Boolean), ms: p.ms, tokensOut: p.tokensOut, inr: p.inr }));
writeFileSync(`${OUT}/raw.json`, JSON.stringify({ at: new Date().toISOString(), model: MODEL, request, plans: rows, judges: judged.map(({ order, verdict, error, inr }) => ({ order, verdict, error, inr })) }, null, 2));

const L = ["# Analogy rule: v6 against v1 and v5 (Gemini 3.8 Flash, Swimming)", "", "Six plans ranked together, blind, twice in different orders (Sonnet, no web search). Place 1 is best of 6.", "",
  "| Prompt | Picture score (of 5) | All dimensions | Mean place | Pairs mapped | Chapters using the picture (of 7) | ₹ a plan |", "|---|---|---|---|---|---|---|"];
for (const v of ["v1", "v5", "v6"]) { const g = rows.filter((r) => r.version === v); L.push(`| ${v} | **${f(mean(g.map((r) => r.pic).filter((x) => x !== null)))}** | ${f(mean(g.map((r) => r.all)))} | ${f(mean(g.flatMap((r) => r.ranks)), 1)} | ${f(mean(g.map((r) => r.reach.pairs)), 1)} | ${f(mean(g.map((r) => r.reach.chaptersUsing)), 1)} | ₹${f(mean(g.map((r) => r.inr).filter((x) => typeof x === "number")))} |`); }
L.push("", "## Each plan's picture", "");
for (const r of rows) {
  L.push(`### ${r.name} (places ${r.ranks.join(", ")}; picture ${f(r.pic, 1)})`, "", `**${r.picture?.name ?? "no picture"}**: ${r.picture?.line ?? ""}`, "");
  if (r.picture?.maps?.length) L.push(...r.picture.maps.map((m) => `- ${m.part} → ${m.is}`), "");
  L.push(`Chapters: ${r.titles.join(" → ")}`, "", `Judge: ${r.notes.join(" / ")}`, "");
}
L.push(`Judge's summaries: ${judged.map((j) => j.verdict?.why ?? j.error).join(" / ")}`, "", `Cost: plans ₹${f(fresh.reduce((a, p) => a + (p.inr ?? 0), 0))}, judging ₹${f(judged.reduce((a, j) => a + (j.inr ?? 0), 0))}.`, "");
writeFileSync(`${OUT}/report.md`, L.join("\n"));
log(`done: ${OUT}/report.md`);
