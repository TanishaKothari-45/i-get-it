// The delivery review (9 Oct): judges delivered handbooks against docs/intent-spec.md and traces each gap to the step
// that caused it. Builds one bundle (the spec, then each handbook: typed line, goal, level, research brief, plan, chapters
// card by card), and can send it to GPT-6.1 Sol on the Cheaper Inference marketplace as a reviewer. The Claude reviewer
// (.claude/agents/delivery-reviewer.md) reads the same bundle. Gemini is not used as a judge: it marks its own family's
// chapters too kindly (9 Oct). Dev deployment only (Node 20+).
//   node scripts/delivery-review.mjs --from evals/shape-bench/raw.json [--flash-only] [--with-pipeline] [--gpt]
//   node scripts/delivery-review.mjs --ids <handbookId>,<handbookId> [--with-pipeline] [--gpt]
//   node scripts/delivery-review.mjs --mode prompts [--gpt]      (no handbooks: can these prompts deliver the spec?)
// Writes evals/reviews/<time>/bundle.md (and gpt.md, gpt.json with --gpt).
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const flag = (k) => process.argv.includes(k);
const convex = async (fn, args, timeout = 10 * 60 * 1000) => { const { stdout } = await run("npx", ["convex", "run", fn, JSON.stringify(args)], { maxBuffer: 1e8, timeout }); const t = stdout.trim(); return t ? JSON.parse(t) : null; };
const OUT = `evals/reviews/${new Date().toISOString().slice(0, 16).replace(":", "-")}-${process.argv.includes("prompts") ? "prompts" : "delivery"}`;

// ---------- the handbooks ----------
const MODE = arg("--mode") === "prompts" ? "prompts" : "delivery";
let books = [];
if (MODE === "prompts") {
  // no handbooks: the pipeline is the material
} else if (arg("--from")) {
  books = JSON.parse(readFileSync(arg("--from"), "utf8")).results.map((r) => ({ topic: r.topic, goal: r.goal, level: r.level, h: r.new?.h ?? r.h })).filter((b) => b.h);
} else if (arg("--ids")) {
  for (const id of arg("--ids").split(",")) { const h = await convex("evalShape:read", { handbookId: id.trim() }); if (h) books.push({ topic: h.topic, goal: h.goal, level: h.level, h }); }
} else { console.log("give --from <raw.json> or --ids <id,id>"); process.exit(1); }
const writtenBy = (c) => String(c.model ?? "");
const keep = (c) => c.status === "ready" && (!flag("--flash-only") || writtenBy(c).startsWith("gemini"));

// ---------- rendering, as a reader sees it ----------
const briefText = (b) => !b ? "(no research brief)" : b.failed ? "(research failed: no brief)" : [
  `Suggested: ${b.format}, ${b.chapters} chapters · kind ${b.kind || "?"}`,
  b.deliverable ? `What the reader walks away with: ${b.deliverable}` : null,
  b.start ? `Start: ${b.start}` : null,
  (b.parts ?? []).length ? `Pieces: ${(b.parts).map((p) => `${p.part} (${p.depth ?? p.weight ?? "?"})${p.needs?.length ? ` [must-haves: ${p.needs.join("; ")}]` : ""}`).join("; ")}` : null,
  `Facts found: ${(b.facts ?? []).length} · sources: ${(b.sources ?? []).length}`,
].filter(Boolean).join("\n");
const planText = (p) => !p ? "(no plan)" : [
  `${p.format} · ${p.chapters?.length ?? 0} chapters${p.body !== undefined ? ` · body skill: ${p.body}` : ""}`,
  `Outcome: ${p.outcome7 ?? "–"}`,
  `Picture: ${p.picture?.name ? `${p.picture.name}: ${p.picture.line ?? ""}` : `none${p.pictureWhyNot ? ` (${p.pictureWhyNot})` : ""}`}`,
  ...(p.chapters ?? []).map((c, k) => `${k + 1}. ${c.title}${c.minutes ? ` (${c.minutes} min)` : ""}${c.pieces?.length ? ` · pieces: ${c.pieces.join("; ")}` : ""}${c.needs?.length ? ` · must deliver: ${c.needs.join("; ")}` : ""}${c.assumes?.length ? ` · assumes: ${c.assumes.join("; ")}` : ""}\n   Covers: ${c.covers ?? "–"} · Outcome: ${c.outcome ?? "–"} · Hook: ${c.hook ?? "–"} · Blocks: ${(c.blocks ?? []).join(", ") || "–"}`),
].join("\n");
const cardText = (c, i) => {
  const head = `[card ${i + 1}] ${c.type}${c.title ? `: ${c.title}` : ""}${c.kind ? ` (${c.kind})` : ""}`;
  if (c.type === "exercise") return `${head}\n${c.prompt}\n${(c.options ?? []).map((o) => `  ${o.id}) ${o.text}${o.id === c.answer ? "   ← answer" : ""}`).join("\n")}${c.reteach ? `\n  reteach: ${c.reteach}` : ""}`;
  if (c.type === "steps") return `${head}\n${(c.steps ?? []).map((s, k) => `  ${k + 1}. ${s.do}${s.see ? ` → ${s.see}` : ""}`).join("\n")}`;
  if (c.type === "doit") return `${head}\n${c.instruction ?? ""}${c.items?.length ? `\n${c.items.map((x) => `  - ${x}`).join("\n")}` : ""}${c.target ? ` (target ${c.target})` : ""}`;
  if (c.type === "move") return `${head}\nCues: ${(c.cues ?? []).join(" | ")}${c.body ? `\n${c.body}` : ""}`;
  if (c.type === "tryit") return `${head}\n(interactive page) ${c.idea ?? ""}`;
  return `${head}\n${c.body ?? ""}`;
};
const bookText = (b, i) => {
  const chs = (b.h.chapters ?? []).filter(keep);
  return [`## Handbook ${i + 1}: "${b.topic}"`, `Goal: ${b.goal ?? "(none chosen)"} · Level: ${b.level === "some" ? "knows a little" : "complete beginner"}`,
    `### Research brief\n${briefText(b.h.brief)}`, `### Plan\n${planText(b.h.plan)}`,
    ...chs.map((c) => `### Chapter ${c.n} of ${b.h.plan?.chapters?.length ?? "?"}: ${c.title}\n${(c.cards ?? []).map(cardText).join("\n\n")}\n\nOutcome line: ${c.outcomeLine ?? "–"}`),
    chs.length < (b.h.chapters ?? []).filter((c) => c.status === "ready").length ? "(Chapters written by another model are left out.)" : null,
  ].filter(Boolean).join("\n\n");
};

// How the code joins the steps (kept by hand; update it when the code changes).
const FLOW = `## How the steps connect (code)
1. The reader types a line (at most 200 characters) and picks a level ("new" or "some"; words like "advanced" or "beginner" in the line can set it). In parallel: a match against ready-made handbooks, and the goal question (Gemini Flash), which offers 3 goals or a free answer.
2. After the goal: research (Gemini Flash with Google Search, at most 3 searches, thinking medium) returns the brief as JSON checked against a schema. If research fails, the plan is told there is no brief and decides alone.
3. The plan (Gemini Flash, thinking medium) gets the typed line, level, language, voice, goal, mode, today's date and the brief as text (with each piece's depth and must-haves). Each chapter lists its pieces, must-haves ("needs"), what it assumes, minutes and reading minutes. Code checks: the chapter count must be 1 to 7 or the plan fails; a plan under 3 chapters, a course with no analogy and no reason ("pictureWhyNot"), the same block list in every chapter, a brief piece in no chapter, or a chapter assuming a piece no earlier chapter teaches is asked again once. "body" (from the plan) decides whether move and doit cards stay. The format the plan chose is kept.
4. Chapters (Gemini Flash): chapter 1 is written straight after the plan; a course writes each next chapter one ahead of the reader; a quick handbook writes its chapters in order, each as soon as the one before is saved. Each request carries the plan JSON, level, language, voice, this chapter's pieces with their depth, where the reader starts, the chapter's must-haves, an "Already taught" record built from each earlier chapter's ledger (what it taught, terms, names, opener, closing line), the next chapter or "Last chapter", this chapter's research facts (others marked "do not retell"), sources, a Length line in words from the chapter's reading minutes (about 130 a minute, 200 to 1,800; chapter 1 at most 450), and today's date. The writer returns a ledger with the chapter.
5. Malformed quizzes are dropped (never failing the chapter); chapter 1, quick and story chapters keep none. A chapter with fewer than 4 non-quiz cards fails.
6. The fact check (Claude Sonnet, low effort) reads the cards, the level (code sends level "new" to it as "complete beginner", so its beginner check runs for every new reader), the research facts and sources for this chapter's pieces, today's date, and the chapter's must-haves, outcome line and next chapter; it checks delivery as well as truth and can add up to 2 cards for a missing must-have; it can rewrite a card (same type and shape) and writes the picture scenes in the same call. Its fixes are applied; a broken fix is asked again once, else the chapter is stored as "unchecked".
7. Quiz versions (easier and harder) are written in the background by Sonnet and fact-checked. Pictures are drawn when a chapter is opened.
8. Chapters are shared: a later reader who types the same topic (with a matching goal) gets the same handbook.`;
let pipeline = "";
if (flag("--with-pipeline") || MODE === "prompts") {
  const code = `import * as P from "${process.cwd()}/convex/prompts.ts"; import { PROMPT_V8 } from "${process.cwd()}/convex/research.ts";
console.log([["Goal question", P.INTENT_PROMPT_V2], ["Research", PROMPT_V8], ["Plan", P.PLAN_PROMPT_V9], ["Chapter writer", P.CHAPTER_PROMPT_V6], ["Fact check", P.CHECK_SCENES_PROMPT_V3]].map(([h, t]) => "### " + h + "\\n\\n\`\`\`text\\n" + t + "\\n\`\`\`").join("\\n\\n"));`;
  const f = `${OUT}.prompts.mts`; mkdirSync("evals/reviews", { recursive: true }); writeFileSync(f, code);
  pipeline = `\n\n# PART 3. THE PIPELINE\n\n${FLOW}\n\n## The live prompts\n\n${(await run("npx", ["-y", "tsx", f], { maxBuffer: 1e8 })).stdout}`;
  rmSync(f, { force: true });
}

mkdirSync(OUT, { recursive: true });
const spec = readFileSync("docs/intent-spec.md", "utf8");
const bundle = MODE === "prompts"
  ? `MODE: PROMPTS\n\n# PART 1. THE INTENT SPEC\n\n${spec}${pipeline}\n`
  : `MODE: DELIVERY\n\n# PART 1. THE INTENT SPEC\n\n${spec}\n\n# PART 2. THE HANDBOOKS\n\n${books.map(bookText).join("\n\n---\n\n")}${pipeline}\n`;
writeFileSync(`${OUT}/bundle.md`, bundle);
console.log(`${OUT}/bundle.md: ${books.length} handbooks, ${bundle.length} characters`);

if (flag("--gpt")) {
  const brief = readFileSync("evals/reviewer/brief.md", "utf8");
  const r = await convex("evalReview:reviewMarket", { model: "gpt-6.1-sol", brief, bundle });
  writeFileSync(`${OUT}/gpt.md`, r?.text ?? "");
  writeFileSync(`${OUT}/gpt.json`, JSON.stringify({ ok: r?.ok, error: r?.error, ms: r?.ms, tokensIn: r?.tokensIn, tokensOut: r?.tokensOut, model: r?.model }, null, 2));
  console.log(`GPT-6.1 Sol: ${r?.ok ? `${OUT}/gpt.md` : `failed: ${r?.error}`}`);
}
console.log(`Claude reviewer: run the delivery-reviewer agent on ${OUT}/bundle.md`);
