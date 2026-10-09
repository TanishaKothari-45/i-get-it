// Turns <round dir>/raw.json (from research-eval.mjs) into <round dir>/report.md.
// Run: node scripts/research-eval-report.mjs evals/research-v1-v2-v3
import { readFileSync, writeFileSync } from "node:fs";

const DIR = process.argv[2] ?? "evals/research-v1-v2";
const raw = JSON.parse(readFileSync(`${DIR}/raw.json`, "utf8"));
const { topics, research, at } = raw;
const V = raw.versions ?? ["v1", "v2"];
// The first round stored comparisons as v1AsA / v2AsA; read both shapes.
const comparisons = (raw.comparisons ?? []).map((c) => (c.x ? c : { genre: c.genre, n: c.n, x: "v1", y: "v2", xAsA: c.v1AsA, yAsA: c.v2AsA }));
const scored = new Set(research.flatMap((r) => Object.keys(r.judge?.verdict?.scores ?? {})));
const DIMS = ["accuracy", "goalFit", "coverage", "breadth", "depth", "currency", "specificity", "decisions", "framing", "sources", "clarity"].filter((d) => scored.has(d));

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const f1 = (x) => (x === null || x === undefined ? "–" : (+x).toFixed(1));
const f2 = (x) => (x === null || x === undefined ? "–" : (+x).toFixed(2));
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : "–");
const secs = (ms) => (ms === null || ms === undefined ? "–" : `${(ms / 1000).toFixed(0)} s`);
const med = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)]; };
const of = (v, genre) => research.filter((r) => r.version === v && (!genre || r.genre === genre));
const ok = (rs) => rs.filter((r) => r.output);
const score = (r, d) => r.judge?.verdict?.scores?.[d]?.score;
const scores = (rs, d) => rs.map((r) => score(r, d)).filter((x) => typeof x === "number");

const L = [];
L.push(`# Research prompt ${V.join(" vs ")}`, "");
L.push(`Run ${at ?? "?"} on the dev deployment. Researcher: Gemini 3.8 Flash with Google Search (the live path, no Claude fallback), so only the prompt differs. Judge: Claude Sonnet 5.5, blind to the version; alone with up to 5 web searches to check facts, and side by side in both orders. ${research.length} research runs, ${comparisons.length * 2} side-by-side judgements.`, "");
L.push("Topics:", "", "| Genre | Typed | Goal | Mode | Level |", "|---|---|---|---|---|");
for (const t of topics) L.push(`| ${t.genre} | ${t.request.topic} | ${t.request.goal} | ${t.request.mode} | ${t.request.level} |`);
L.push("");

L.push("## Latency, tokens and cost (research call only)", "");
L.push("| | Runs ok | Latency median / max | Tokens in avg | Tokens out avg | ₹ a run |", "|---|---|---|---|---|---|");
for (const v of V) {
  const rs = of(v), g = ok(rs);
  L.push(`| ${v} | ${g.length}/${rs.length} | ${secs(med(g.map((r) => r.ms)))} / ${secs(g.length ? Math.max(...g.map((r) => r.ms)) : null)} | ${Math.round(mean(g.map((r) => r.tokensIn)) ?? 0)} | ${Math.round(mean(g.map((r) => r.tokensOut)) ?? 0)} | ₹${f2(mean(g.map((r) => r.inr)))} |`);
}
L.push("", "Tokens out include Gemini's thinking. Gemini rarely reports its searches (it searched: it had 7 Oct 2026 news right), so search counts are left out and the ₹ is tokens plus reported searches only.", "");

L.push("## Output shape (code checks)", "");
L.push("| | Facts avg | Outline parts avg | Words a sentence | Sentences over 20 words | Sources avg |", "|---|---|---|---|---|---|");
for (const v of V) {
  const c = ok(of(v)).map((r) => r.checks);
  const parts = c.map((x) => x.outline?.length).filter((x) => x);
  L.push(`| ${v} | ${f1(mean(c.map((x) => x.facts)))} | ${parts.length ? f1(mean(parts)) : "–"} | ${f1(mean(c.map((x) => x.factWordsAvg)))} | ${c.reduce((a, x) => a + x.sentencesOver20, 0)} | ${f1(mean(c.map((x) => x.sources)))} |`);
}
L.push("");

L.push("## Facts checked by the judge", "");
L.push("| | Facts | Correct | Wrong | Outdated | Unsure | Help the goal |", "|---|---|---|---|---|---|---|");
for (const v of V) {
  const fs = ok(of(v)).flatMap((r) => r.judge?.verdict?.facts ?? []);
  const n = (x) => fs.filter((f) => f.verdict === x).length;
  L.push(`| ${v} | ${fs.length} | ${pct(n("correct"), fs.length)} | ${n("wrong")} | ${n("outdated")} | ${n("unsure")} | ${pct(fs.filter((f) => f.helpsGoal).length, fs.length)} |`);
}
L.push("");

L.push("## Quality scores (judge alone, 1 to 5, mean)", "");
L.push(`| Dimension | ${V.join(" | ")} | ${topics.map((t) => `${t.genre} ${V.join(" / ")}`).join(" | ")} |`, `|---|${V.map(() => "---").join("|")}|${topics.map(() => "---").join("|")}|`);
for (const d of DIMS)
  L.push(`| ${d} | ${V.map((v) => f2(mean(scores(ok(of(v)), d)))).join(" | ")} | ${topics.map((t) => V.map((v) => f1(mean(scores(ok(of(v, t.genre)), d)))).join(" / ")).join(" | ")} |`);
L.push(`| **all** | ${V.map((v) => `**${f2(mean(DIMS.flatMap((d) => scores(ok(of(v)), d))))}**`).join(" | ")} | ${topics.map(() => "").join(" | ")} |`, "");

L.push("## Side by side (blind, both orders)", "");
L.push("A pair counts for a version only when the judge picked it in both orders; otherwise it is a split (position bias or a real tie).", "");
const verdictOf = (c, key) => {
  const get = (j) => (key === "overall" ? j?.verdict?.overall : j?.verdict?.dimensions?.[key]);
  const pick = (x, a, b) => (x === "A" ? a : x === "B" ? b : "tie");
  const p = pick(get(c.xAsA), c.x, c.y), q = pick(get(c.yAsA), c.y, c.x);
  return p === q ? p : "split";
};
const cmpDims = [...DIMS.filter((d) => d !== "framing"), "overall"];
const matchups = [...new Set(comparisons.map((c) => `${c.x}|${c.y}`))];
for (const m of matchups) {
  const [x, y] = m.split("|");
  const cs = comparisons.filter((c) => c.x === x && c.y === y);
  L.push(`### ${x} vs ${y} (${cs.length} pairs)`, "", `| Dimension | ${x} wins | ${y} wins | Tie | Split |`, "|---|---|---|---|---|");
  for (const d of cmpDims) {
    const vs = cs.map((c) => verdictOf(c, d));
    const n = (z) => vs.filter((w) => w === z).length;
    L.push(`| ${d === "overall" ? "**overall**" : d} | ${n(x)} | ${n(y)} | ${n("tie")} | ${n("split")} |`);
  }
  L.push("", "The judge's reasons (each order):", "");
  for (const c of cs) L.push(`- **${c.genre} #${c.n}** → ${verdictOf(c, "overall")}. ${x} as A: ${c.xAsA?.verdict?.why ?? c.xAsA?.error ?? ""} / ${y} as A: ${c.yAsA?.verdict?.why ?? c.yAsA?.error ?? ""}`);
  L.push("");
}

L.push("## Each topic", "");
for (const t of topics) {
  L.push(`### ${t.genre}: ${t.request.topic}`, "");
  L.push("| Run | Kind | Format | Chapters | Facts | Latency | ₹ | Judge mean | Outline / framing |", "|---|---|---|---|---|---|---|---|---|");
  for (const r of research.filter((x) => x.genre === t.genre)) {
    if (!r.output) { L.push(`| ${r.version} #${r.n} | failed: ${String(r.error ?? "").slice(0, 80)} | | | | | | | |`); continue; }
    const m = mean(DIMS.map((d) => score(r, d)).filter((x) => typeof x === "number"));
    const extra = r.checks.outline ? r.checks.outline.join(" → ") : r.checks.framing ? `"${r.checks.framing}"` : "–";
    L.push(`| ${r.version} #${r.n} | ${r.checks.kind} | ${r.checks.format} | ${r.checks.chapters} | ${r.checks.facts} | ${secs(r.ms)} | ₹${f2(r.inr)} | ${f2(m)} | ${extra} |`);
  }
  L.push("");
  for (const r of ok(research.filter((x) => x.genre === t.genre))) {
    const j = r.judge?.verdict;
    if (!j) continue;
    L.push(`- **${r.version} #${r.n}**. Best: ${j.best} Worst: ${j.worst}${(j.missing ?? []).length ? ` Missing: ${j.missing.join("; ")}` : ""}`);
    for (const f of (j.facts ?? []).filter((f) => f.verdict !== "correct")) L.push(`  - ${f.verdict}: "${f.fact}" (${f.note ?? ""})`);
  }
  L.push("");
}

const judgeInr = research.reduce((a, r) => a + (r.judge?.inr ?? 0), 0) + comparisons.reduce((a, c) => a + (c.xAsA?.inr ?? 0) + (c.yAsA?.inr ?? 0), 0);
const researchInr = research.reduce((a, r) => a + (r.inr ?? 0), 0);
L.push("## What this eval cost", "", `Research ₹${f2(researchInr)}, judging ₹${f2(judgeInr)}, total ₹${f2(researchInr + judgeInr)} (estimates from list prices).`, "");

writeFileSync(`${DIR}/report.md`, L.join("\n"));
console.log(`${DIR}/report.md`);
