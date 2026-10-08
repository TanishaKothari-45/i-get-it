// Writer prompt v1 vs v2 on Gemini 3.8 Flash (8 Oct). Frozen inputs: the saved Opus v1 plans (Swimming, a course;
// World War I, quick) and their research briefs. Cases: Swimming chapter 1 (reading only), Swimming chapter 2 (quizzes),
// World War I chapter 1 (quick: no quizzes). 2 chapters per prompt per case. Per case, the four chapters are ranked
// blind together (Sonnet, no web search), twice in different orders. Code checks on top.
// Dev deployment only:  node scripts/chapter-eval.mjs   writes evals/chapter-v1-v2/raw.json and report.md
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);
// VERSIONS=v3 NO_JUDGE=1 node scripts/chapter-eval.mjs: write and code-check only, no judge (8 Oct, writer v3).
const VERSIONS = (process.env.VERSIONS ?? "v1,v2").split(",");
const OUT = `evals/chapter-${VERSIONS.join("-")}`;
const RUNS = Number(process.env.RUNS ?? 2);
const JUDGE = !process.env.NO_JUDGE;
const research = JSON.parse(readFileSync("evals/research-v1-v2-v3/raw.json", "utf8")).research;
const briefOf = (genre) => research.find((r) => r.genre === genre && r.version === "v3" && r.n === 1).output;
const swimPlan = JSON.parse(readFileSync("evals/plan-compare/raw.json", "utf8")).results.find((r) => r.prompt === "v1").plan;
const warPlan = JSON.parse(readFileSync("evals/plan-v1-v2/raw.json", "utf8")).plans.find((p) => p.case === "world war I" && p.version === "v1" && p.n === 1).plan;
// As generatePlan stores them: the goal added, chapters numbered.
const stored = (plan, goal) => ({ ...plan, goal, chapters: plan.chapters.map((c, i) => ({ ...c, n: i + 1 })) });
const CASES = [
  { id: "swimming ch1", n: 1, plan: stored(swimPlan, "swim my first full length of a pool without stopping"), brief: briefOf("physical skill") },
  { id: "swimming ch2", n: 2, plan: stored(swimPlan, "swim my first full length of a pool without stopping"), brief: briefOf("physical skill") },
  { id: "world war I ch1", n: 1, plan: stored(warPlan, "understand why it started and how it changed the world"), brief: briefOf("history") },
];
const convex = async (fn, args) => JSON.parse((await run("npx", ["convex", "run", fn, JSON.stringify(args)], { maxBuffer: 50 * 1024 * 1024, timeout: 11 * 60 * 1000 })).stdout);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ---------- code checks ----------
const words = (s) => String(s ?? "").replace(/\*\*|\*/g, "").trim().split(/\s+/).filter(Boolean).length;
const cardWords = (c) => c.type === "exercise" ? words(c.prompt) + (c.options ?? []).reduce((a, o) => a + words(o.text), 0) : words(c.body);
function checks(c, ch) {
  if (!ch) return { valid: false };
  const cards = ch.cards ?? [], ex = cards.filter((x) => x.type === "exercise");
  const quick = c.plan.format === "quick";
  const text = cards.filter((x) => x.type !== "exercise");
  const spread = ex.map((e) => { const l = (e.options ?? []).map((o) => words(o.text)); return Math.max(...l) - Math.min(...l); });
  const rightLongest = ex.filter((e) => { const r = (e.options ?? []).find((o) => o.id === e.answer); return r && (e.options ?? []).every((o) => o.id === e.answer || words(o.text) < words(r.text)); }).length;
  const whyNotOk = ex.filter((e) => { const wrong = (e.options ?? []).map((o) => o.id).filter((id) => id !== e.answer).sort().join(); return Object.keys(e.whyNot ?? {}).sort().join() === wrong; }).length;
  const leaks = ex.filter((e) => { const r = String((e.options ?? []).find((o) => o.id === e.answer)?.text ?? "").toLowerCase(); return r.length > 12 && String(e.reteach ?? "").toLowerCase().includes(r); }).length;
  const last = [...cards].reverse().find((x) => x.type === "teach");
  return {
    valid: true, cards: cards.length, exercises: ex.length,
    shapeOk: c.n === 1 || quick ? ex.length === 0 && (c.n !== 1 || cards.length === 6) : ex.length >= 2,
    totalWords: cards.reduce((a, x) => a + cardWords(x), 0),
    maxCardWords: Math.max(0, ...text.map(cardWords)),
    cardsOverLimit: text.filter((x) => cardWords(x) > (c.n === 1 ? 80 : 120)).length,
    optionSpreadMax: spread.length ? Math.max(...spread) : null,
    rightIsLongest: rightLongest, whyNotKeysOk: `${whyNotOk}/${ex.length}`, reteachLeaks: leaks,
    nextLine: /\bNext:/.test(String(last?.body ?? "")) ? String(last.body).split("Next:")[1].trim().slice(0, 120) : null,
    recall: (ch.recallQuizzes ?? []).length, svgChars: typeof ch.svg === "string" ? ch.svg.length : 0,
  };
}

mkdirSync(OUT, { recursive: true });
const jobs = [];
for (const c of CASES) for (const version of VERSIONS) for (let k = 1; k <= RUNS; k++) jobs.push({ c, version, k });
log(`writing ${jobs.length} chapters on Gemini 3.8 Flash`);
const chapters = await Promise.all(jobs.map(async (j) => {
  const r = await convex("evalChapterPrompt:runOne", { plan: j.c.plan, brief: j.c.brief, level: "new", n: j.c.n, version: j.version }).catch((e) => ({ ok: false, error: String(e.stderr || e.message).slice(0, 200) }));
  log(`  ${j.c.id} ${j.version} #${j.k}: ${r.ok ? `${(r.ms / 1000).toFixed(0)} s, ${r.chapter?.cards?.length ?? 0} cards` : "FAILED " + r.error}`);
  return { case: j.c.id, version: j.version, k: j.k, ...r, checks: checks(j.c, r.chapter), reads: [] };
}));

const letters = "ABCD";
log(JUDGE ? "ranking (3 cases x 2 orders)" : "no judge (NO_JUDGE set)");
const rankings = [];
if (JUDGE) await Promise.all(CASES.map(async (c) => {
  const cs = chapters.filter((x) => x.case === c.id && x.chapter);
  const order1 = cs.map((_, i) => i).sort(() => Math.random() - 0.5), order2 = [...order1].reverse();
  for (const order of [order1, order2]) {
    const j = await convex("evalChapterPrompt:rankChapters", { plan: c.plan, brief: c.brief, n: c.n, chapters: order.map((i, k) => ({ label: letters[k], chapter: cs[i].chapter })) });
    rankings.push({ case: c.id, order: order.map((i) => `${cs[i].version}#${cs[i].k}`), verdict: j.verdict, error: j.error, inr: j.inr });
    order.forEach((i, k) => { const s = j.verdict?.versions?.find((x) => x.label === letters[k]); cs[i].reads.push({ rank: (j.verdict?.ranking ?? []).indexOf(letters[k]) + 1, scores: s?.scores ?? null, note: s?.note ?? null }); });
  }
}));
writeFileSync(`${OUT}/raw.json`, JSON.stringify({ at: new Date().toISOString(), model: "gemini-3.8-flash", cases: CASES.map(({ plan, brief, ...c }) => c), chapters, rankings }, null, 2));

// ---------- report ----------
const DIMS = ["hook", "followsPlan", "teachBeforeTest", "quizzes", "clarity", "concreteness", "picture", "fidelity", "pace"];
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const f = (x, d = 2) => (typeof x === "number" ? x.toFixed(d) : "–");
const scoreOf = (x, d) => mean(x.reads.map((r) => r.scores?.[d]).filter((v) => typeof v === "number"));
const meanOf = (x) => mean(DIMS.map((d) => scoreOf(x, d)).filter((v) => v !== null));
const of = (v, id) => chapters.filter((x) => x.version === v && x.chapter && (!id || x.case === id));
const place = (xs) => mean(xs.flatMap((x) => x.reads.map((r) => r.rank).filter((r) => r > 0)));
const L = ["# Writer prompt v1 vs v2 (Gemini 3.8 Flash)", "", `Run ${new Date().toISOString()}. Frozen Opus v1 plans and research briefs. ${RUNS} chapters per prompt per case. Judge: Claude Sonnet 5.5, no web search, blind; per case the four chapters ranked together, read twice in different orders. Place 1 is best of 4. The svg field is not shown to the judge.`, "",
  `| Prompt | Judge mean | Mean place (of 4) | ${CASES.map((c) => `${c.id} mean / place`).join(" | ")} | Latency median | Tokens in / out | ₹ a chapter |`, `|---|---|---|${CASES.map(() => "---").join("|")}|---|---|---|`];
for (const v of VERSIONS) {
  const g = of(v); const ms = g.map((x) => x.ms).sort((a, b) => a - b);
  L.push(`| ${v} | **${f(mean(g.map(meanOf)))}** | ${f(place(g), 1)} | ${CASES.map((c) => `${f(mean(of(v, c.id).map(meanOf)))} / ${f(place(of(v, c.id)), 1)}`).join(" | ")} | ${ms.length ? (ms[Math.floor((ms.length - 1) / 2)] / 1000).toFixed(0) + " s" : "–"} | ${Math.round(mean(g.map((x) => x.tokensIn)))} / ${Math.round(mean(g.map((x) => x.tokensOut)))} | ₹${f(mean(g.map((x) => x.inr)))} |`);
}
L.push("", `| Dimension | ${VERSIONS.join(" | ")} |`, `|---|${VERSIONS.map(() => "---").join("|")}|`, ...DIMS.map((d) => `| ${d} | ${VERSIONS.map((v) => f(mean(of(v).map((x) => scoreOf(x, d)).filter((y) => y !== null)))).join(" | ")} |`));
L.push("", "## Code checks", "", "| Case | Prompt | Run | Cards | Quizzes | Shape right | Words | Longest card | Cards over the limit | Option length spread (max) | Right answer is longest | whyNot keys right | reteach gives it away | svg chars | Next: line |", "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const x of chapters) { const k = x.checks; L.push(k.valid ? `| ${x.case} | ${x.version} | ${x.k} | ${k.cards} | ${k.exercises} | ${k.shapeOk ? "yes" : "**no**"} | ${k.totalWords} | ${k.maxCardWords} | ${k.cardsOverLimit} | ${k.optionSpreadMax ?? "–"} | ${k.rightIsLongest} | ${k.whyNotKeysOk} | ${k.reteachLeaks} | ${k.svgChars} | ${k.nextLine ? `"${k.nextLine}"` : "**missing**"} |` : `| ${x.case} | ${x.version} | ${x.k} | failed: ${x.error} | | | | | | | | | | | |`); }
L.push("", "## Judge's notes", "", ...chapters.filter((x) => x.chapter).map((x) => `- **${x.case}, ${x.version} #${x.k}** (places ${x.reads.map((r) => r.rank).join(", ")}): ${x.reads.map((r) => r.note).filter(Boolean).join(" / ")}`));
L.push("", "Judge's summaries:", "", ...rankings.map((r) => `- ${r.case}: ${r.verdict?.why ?? r.error}`));
L.push("", `Cost: chapters ₹${f(chapters.reduce((a, x) => a + (x.inr ?? 0), 0))}, judging ₹${f(rankings.reduce((a, r) => a + (r.inr ?? 0), 0))}.`, "");
writeFileSync(`${OUT}/report.md`, L.join("\n"));
log(`done: ${OUT}/report.md`);
