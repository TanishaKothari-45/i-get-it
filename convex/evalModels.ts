"use node";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { PLAN_PROMPT, planUserMessage, CHAPTER_PROMPT, chapterUserMessage, CHECK_PROMPT, checkUserMessage } from "./prompts";

// Model comparison (Shaktimaan, 6 Oct). Dev only, by hand; nothing here is on the reader's path.
// Every call goes through ai.generate with a model and effort override; one fixed judge (Opus 5.5 high) scores.
const effortV = v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("xhigh"), v.literal("max")));
export const JUDGE_MODEL = "claude-opus-5-5";

const PLAN_SCORE = `You score one handbook plan against these rules, 1 to 5 (5 = follows every rule well, 3 = usable with clear gaps, 1 = fails the job). Rules: seven chapters, each teaching one thing, building in order; a specific, honest day-7 outcome (never "understand the basics"); one analogy carried through; each chapter has a plain title, one line on what it covers, an outcome starting "You can", and a hook under 18 words that is an honest open loop; plain words, numbers over adjectives; sources only real works it is certain of; no invented facts. Return only JSON: {"score": <1-5>, "why": "<one line>"}`;

export const JUDGE = `You are a strict editor judging one chapter of a short teaching handbook for a busy adult reading on a phone. Answer each check with true or false only, then name the weakest card and one concrete fix. Be harsh: a check passes only if it clearly holds.

Checks:
1. hook: the first sentence of card 1 would stop a scroll: specific, surprising or a real question, no throat-clearing.
2. short_cards: no single card over 120 words.
3. concrete_images: every teach card contains at least one concrete image (a thing, a place, a moment), not only abstractions.
4. one_idea: the chapter teaches one thing; the three exercises test that same thing from three angles.
5. answerable: every exercise can be answered from what the chapter taught (no outside knowledge needed).
6. feedback_names_confusion: every wrong-option feedback names what it was confused with; none says "incorrect" or "wrong".
7. no_cliche: no "imagine a world", "in today's fast-paced", "unlock", "dive in", "game-changer", or similar.
8. topic_specific: a reader could tell this was written for this exact topic, not pasted from a template.
9. facts_ok: no claim you believe to be false or invented (names, dates, numbers, tools). If unsure, mark false and say which.
10. would_keep_reading: a 28-year-old product manager who is not already interested would finish this chapter.
11. laugh_or_sit_up: at least one moment that makes the reader smile or sit up.
12. open_loop: the chapter ends with a line that makes the next chapter wanted.

Return JSON only: {"checks":{"hook":bool,...,"open_loop":bool},"score":<count of true>,"weakest_card":<1-based index>,"why":"<one line>","fix":"<one concrete change, one line>","dubious_claims":["..."]}`;

export const plan = internalAction({
  args: { topic: v.string(), model: v.string(), effort: effortV },
  handler: async (ctx, { topic, model, effort }): Promise<any> => {
    const t0 = Date.now();
    const r: any = await ctx.runAction(internal.ai.generate, { kind: "plan", system: PLAN_PROMPT, user: planUserMessage(topic, "new", "English", "friend"), model, effort });
    const ms = Date.now() - t0;
    if (!r.ok) return { ok: false, ms, error: r.error };
    const j: any = await ctx.runAction(internal.ai.generate, { kind: "audit", system: PLAN_SCORE, user: JSON.stringify(r.json), model: JUDGE_MODEL, effort: "high" });
    return { ok: true, ms, tokensIn: r.tokensIn, tokensOut: r.tokensOut, plan: r.json, score: j.ok ? j.json?.score : null, why: j.ok ? j.json?.why : j.error, judgeIn: j.tokensIn, judgeOut: j.tokensOut };
  },
});

export const chapter = internalAction({
  args: { plan: v.any(), model: v.string(), effort: effortV, n: v.optional(v.number()) },
  handler: async (ctx, { plan, model, effort, n = 1 }): Promise<any> => {
    const t0 = Date.now();
    const r: any = await ctx.runAction(internal.ai.generate, { kind: "chapter", system: CHAPTER_PROMPT, user: chapterUserMessage(plan, "new", "English", "friend", n), model, effort });
    const ms = Date.now() - t0;
    if (!r.ok) return { ok: false, ms, error: r.error };
    const slim = { title: r.json?.title, cards: r.json?.cards, outcomeLine: r.json?.outcomeLine };
    const j: any = await ctx.runAction(internal.ai.generate, { kind: "audit", system: JUDGE, user: "Chapter JSON:\n" + JSON.stringify(slim), model: JUDGE_MODEL, effort: "high" });
    return { ok: true, ms, tokensIn: r.tokensIn, tokensOut: r.tokensOut, cardTypes: (r.json?.cards ?? []).map((c: any) => c.type), judge: j.ok ? j.json : { error: j.error }, judgeIn: j.tokensIn, judgeOut: j.tokensOut };
  },
});

export const check = internalAction({
  args: { title: v.string(), cards: v.any(), model: v.string(), effort: effortV },
  handler: async (ctx, { title, cards, model, effort }): Promise<any> => {
    const t0 = Date.now();
    const r: any = await ctx.runAction(internal.ai.generate, { kind: "check", system: CHECK_PROMPT, user: checkUserMessage("Indian stock market basics", "new", { title, cards }), model, effort });
    const ms = Date.now() - t0;
    if (!r.ok) return { ok: false, ms, error: r.error };
    return { ok: true, ms, tokensIn: r.tokensIn, tokensOut: r.tokensOut, fixes: r.json?.fixes ?? [] };
  },
});

export const ping = internalAction({
  args: { model: v.string() },
  handler: async (ctx, { model }): Promise<any> => {
    const t0 = Date.now();
    const r: any = await ctx.runAction(internal.ai.generate, { kind: "simpler", system: "Reply with JSON.", user: 'Return {"ok": true}', model, effort: "low" });
    return { ms: Date.now() - t0, ...r };
  },
});

// Which service issued the cheaper-inference key, from its shape only (the key itself is never returned).
export const keyShape = internalAction({
  args: {},
  handler: async (): Promise<any> => {
    const k = process.env.CHEAPER_INFERENCE_API_KEY ?? "";
    const known: [string, RegExp][] = [["OpenRouter", /^sk-or-/], ["Groq", /^gsk_/], ["Together", /^tgp_/], ["Fireworks", /^fw_/], ["DeepSeek or OpenAI-style", /^sk-[A-Za-z0-9]{20,}$/], ["Anthropic", /^sk-ant-/], ["Zhipu (id.secret)", /^[A-Za-z0-9]{20,}\.[A-Za-z0-9]{8,}$/], ["Hugging Face", /^hf_/], ["Google", /^AIza/]];
    return { length: k.length, looksLike: known.find(([, re]) => re.test(k))?.[0] ?? "unknown", hasDot: k.includes("."), hasDash: k.includes("-"), whitespace: /\s/.test(k) };
  },
});

// The model ids the cheaper-inference marketplace offers (names only).
export const listModels = internalAction({
  args: {},
  handler: async (): Promise<any> => {
    const base = process.env.GLM_BASE_URL ?? "https://api.z.ai/api/paas/v4";
    const res = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${process.env.CHEAPER_INFERENCE_API_KEY ?? ""}` } });
    const body: any = await res.json().catch(() => ({}));
    return { status: res.status, ids: (body.data ?? []).map((m: any) => m.id), error: res.ok ? undefined : JSON.stringify(body).slice(0, 200) };
  },
});
