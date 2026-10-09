"use node";
// Writer prompt v1 vs v2 (8 Oct): write one chapter from a frozen plan and research brief with either prompt, and
// rank several chapters for the same plan and chapter blind (Claude Sonnet, no web search). Nothing is stored except
// the call log. Driven by scripts/chapter-eval.mjs; results land in evals/chapter-v1-v2/.
import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { inrOf } from "./costs";
import { CHAPTER_PROMPT, CHAPTER_PROMPT_V1, CHAPTER_PROMPT_V5, briefForChapter, chapterUserMessage } from "./prompts";

const JUDGE = "claude-sonnet-5-5";
// On feat/handbook-shape (9 Oct): v1 is Prateek's base text; the live CHAPTER_PROMPT is v1 with the v3 edits and VOICE AND
// TENSION (v4). v3 as a separate prompt is gone; its results stay in evals/chapter-v3.
const PROMPTS = { v1: CHAPTER_PROMPT_V1, v4: CHAPTER_PROMPT, v5: CHAPTER_PROMPT_V5 } as const;
const userOf = (plan: any, level: "new" | "some", n: number, brief: any) => chapterUserMessage(plan, level, "English", "friend", n) + briefForChapter(brief ?? null);

// One chapter, the way generateChapter writes it (same user message), on the chosen model (default: Gemini 3.8 Flash).
export const runOne = internalAction({
  args: { plan: v.any(), brief: v.optional(v.any()), level: v.union(v.literal("new"), v.literal("some")), n: v.number(), version: v.union(v.literal("v1"), v.literal("v4"), v.literal("v5")), model: v.optional(v.string()) },
  handler: async (ctx, { plan, brief, level, n, version, model = "gemini-3.8-flash" }) => {
    const started = Date.now();
    const out: any = await ctx.runAction(internal.ai.generate, { kind: "chapter", system: PROMPTS[version], user: userOf(plan, level, n, brief), model, logAs: "eval chapter" });
    return {
      version, model: out.model ?? model, ms: Date.now() - started, ok: !!out.ok, error: out.ok ? null : String(out.error ?? "failed"),
      tokensIn: out.tokensIn ?? 0, tokensOut: out.tokensOut ?? 0, inr: inrOf(String(out.model ?? model), !!out.ok, out.tokensIn ?? 0, out.tokensOut ?? 0),
      chapter: out.ok ? out.json : null,
    };
  },
});

const RANK_PROMPT = `You compare several versions of one chapter of an I Get It handbook. I Get It teaches one reader on a phone, one card per screen, swiped like short videos. Every version was written from the same plan and the same reference facts. You do not know who wrote each version.

Score every version on each dimension from 1 (poor) to 5 (excellent):
- hook: the first card's first sentence makes a busy reader want the next card. It is specific and true.
- followsPlan: it teaches what the plan says this chapter covers, toward its outcome.
- teachBeforeTest: every quiz tests only what an earlier card taught. Chapter 1 and quick handbooks have no quizzes; score 5 if that holds, 1 if it does not.
- quizzes: three options of the same length and detail; the right one does not stand out; each "whyNot" names the confusion; "reteach" never gives the answer away. Score null if there are no quizzes and none were due.
- clarity: plain words; a new term is explained where it first appears; short cards.
- concreteness: real images, names, numbers and examples, not abstractions.
- picture: the plan's analogy is used consistently where it helps, and dropped where it breaks. Score null if the plan has no analogy.
- fidelity: agrees with the reference facts; nothing specific is made up.
- pace: each card is short enough for a phone and earns the next swipe; the chapter is not padded.
Then rank all the versions from best to worst, and give one sentence on each: its best and its worst thing. Do not prefer a version because it is longer.

Return JSON only:
{"versions":[{"label":"A","scores":{"hook":1,"followsPlan":1,"teachBeforeTest":1,"quizzes":null,"clarity":1,"concreteness":1,"picture":null,"fidelity":1,"pace":1},"note":"..."}],"ranking":["A","B"],"why":"two sentences on what separates the best from the rest"}`;

const parse = (text: string) => { const m = text.match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch { return null; } };

// Several chapters for the same plan and chapter, judged together. The svg field is dropped before judging: readers
// never see it, so it must not count for or against a version.
export const rankChapters = internalAction({
  args: { plan: v.any(), brief: v.optional(v.any()), n: v.number(), chapters: v.array(v.object({ label: v.string(), chapter: v.any() })) },
  handler: async (ctx, { plan, brief, n, chapters }) => {
    const started = Date.now();
    const user = `Plan:\n${JSON.stringify(plan, null, 2)}\n\nReference facts:\n${brief?.facts?.length ? `- ${brief.facts.join("\n- ")}` : "(none)"}\n\nChapter ${n}, ${chapters.length} versions:\n\n${chapters.map((c) => { const { svg, ...rest } = c.chapter ?? {}; return `Version ${c.label}:\n${JSON.stringify(rest, null, 2)}`; }).join("\n\n")}`;
    let verdict: any = null, error: string | null = null, tokensIn = 0, tokensOut = 0;
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const res: any = await client.beta.messages.create({ model: JUDGE, max_tokens: 8000, system: RANK_PROMPT, messages: [{ role: "user", content: user }], output_config: { effort: "medium" } } as any);
      tokensIn = res.usage?.input_tokens ?? 0; tokensOut = res.usage?.output_tokens ?? 0;
      const text = (res.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
      verdict = parse(text);
      if (!verdict) error = `no JSON: ${text.slice(0, 200)}`;
    } catch (e: any) { error = String(e?.message ?? e).slice(0, 300); }
    const ms = Date.now() - started;
    await ctx.runMutation(internal.handbooks.logAiCall, { kind: "eval chapter rank", model: JUDGE, input: user.slice(0, 4000), output: JSON.stringify(verdict ?? error).slice(0, 4000), tokensIn, tokensOut, ms, ok: !error, error: error ?? undefined });
    return { verdict, error, ms, inr: inrOf(JUDGE, true, tokensIn, tokensOut) };
  },
});
