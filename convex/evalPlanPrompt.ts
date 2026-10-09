"use node";
// Plan prompt v1 vs an improved version (8 Oct; v2, a rewrite, lost; v3 improves v1): write one plan with either prompt from a frozen research brief, and have Claude Sonnet
// judge it, alone (with web search to check the "Draws on" works exist) and side by side (blind, both orders).
// The model stays the live plan model (Opus 5.5, high effort), so only the prompt differs. Nothing is stored except the
// call log. Driven by scripts/plan-eval.mjs; results land in evals/plan-v1-v2/ and evals/plan-v1-v3/.
import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { inrOf } from "./costs";
import { PLAN_PROMPT, PLAN_PROMPT_V1, PLAN_PROMPT_V8, briefForPlan, planUserMessage } from "./prompts";
import { jsonSchema, problems } from "./schemas";

const JUDGE = "claude-sonnet-5-5";
const CLAUDE_SEARCH_INR = (10 / 1000) * 84;
// On feat/handbook-shape (9 Oct) the prompts file is Prateek's layout: v1 is his base text and the live PLAN_PROMPT is
// v1 with the v4, v6 and v7 edits. v4 to v6 as separate prompts are gone; their results stay in evals/plan-*.
const PROMPTS = { v1: PLAN_PROMPT_V1, v7: PLAN_PROMPT, v8: PLAN_PROMPT_V8 } as const;
const request = v.object({ topic: v.string(), level: v.union(v.literal("new"), v.literal("some")), goal: v.optional(v.string()), mode: v.optional(v.string()) });
type Request = { topic: string; level: "new" | "some"; goal?: string; mode?: string };
const userOf = (r: Request, brief: any) => planUserMessage(r.topic, r.level, "English", "friend", undefined, r.goal, r.mode) + briefForPlan(brief ?? null);

// The models compared (8 Oct). "opus" is the live plan model (Opus 5.5, high effort, through ai.generate). Gemini is
// called direct from Google here (the plan step has no Gemini route; the live code is untouched), with the plan JSON
// schema and one corrective retry, as research does. "tic:" is DeepSeek V4 Pro on The Inference Company, through
// ai.generate (key INFERENCE_API_KEY).
const MODELS = ["opus", "gemini-3.8-flash", "gemini-3.1-pro-preview", "tic:", "ci:deepseek-v4-pro"] as const;
// Gemini thinking per model: Flash capped at medium (as research); Pro on its default.
const GEMINI_THINKING: Record<string, string | undefined> = { "gemini-3.8-flash": "medium" };
// Token prices not in costs.ts, ₹ per million in / out at ₹84 a dollar. Gemini 3.1 Pro: assumed equal to Gemini 3 Pro's
// list price ($2 / $12, prompts under 200k); check Google's page before quoting it. DeepSeek V4 Pro on The Inference
// Company: price unknown, so its ₹ is left out.
const EXTRA_PER_M: Record<string, [number, number]> = { "gemini-3.1-pro-preview": [168, 1008] };

async function geminiPlan(model: string, system: string, user: string) {
  const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_BACKUP].filter(Boolean) as string[];
  let tokensIn = 0, tokensOut = 0, json: any = null, error: string | null = null, ask = user;
  for (let attempt = 0; attempt < 2; attempt++) {
    // As research does: on 503 or 429, the other key, then a 10 s wait and both again.
    let res: any, body: any;
    const dead = new Set<number>();
    for (let i = 0; i < 2 * keys.length; i++) {
      if (dead.has(i % keys.length)) continue;
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", signal: AbortSignal.timeout(240000),
      headers: { "Content-Type": "application/json", "x-goog-api-key": keys[i % keys.length] },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: ask }] }],
        generationConfig: {
          maxOutputTokens: 32000, responseMimeType: "application/json",
          ...(jsonSchema("plan") ? { responseJsonSchema: jsonSchema("plan") } : {}),
          ...(GEMINI_THINKING[model] ? { thinkingConfig: { thinkingLevel: GEMINI_THINKING[model] } } : {}),
        },
      }),
      }).catch((e: any) => ({ ok: false, status: 0, json: async () => ({ error: String(e?.message ?? e) }) }) as any);
      body = await res.json().catch(() => ({}));
      if (res.ok) break;
      // 9 Oct: a key out of credit (402) is dropped and the other key carries on (see ai.ts callGemini).
      if (res.status === 402 && dead.size + 1 < keys.length) dead.add(i % keys.length);
      else if (![503, 429, 0].includes(res.status)) break;
      if (i % keys.length === keys.length - 1) await new Promise((x) => setTimeout(x, 10000));
    }
    if (!res.ok) { error = `Gemini ${res.status}: ${JSON.stringify(body).slice(0, 200)}`; break; }
    const u = body.usageMetadata ?? {};
    tokensIn += u.promptTokenCount ?? 0; tokensOut += (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
    const cand = body.candidates?.[0];
    if (cand?.finishReason && /SAFETY|PROHIBITED|BLOCKLIST/.test(cand.finishReason)) { error = `declined (${cand.finishReason})`; break; }
    const text = (cand?.content?.parts ?? []).filter((p: any) => !p.thought).map((p: any) => p.text ?? "").join("");
    const m = text.match(/\{[\s\S]*\}/); try { json = m ? JSON.parse(m[0]) : null; } catch { json = null; }
    const wrong = json ? problems("plan", json) : "no JSON object in the reply";
    if (!wrong) { error = null; break; }
    error = `schema: ${wrong.replace(/\n/g, " ").slice(0, 200)}`;
    ask = `${user}\n\nYour previous reply did not match the required JSON shape:\n${wrong}\nReturn the whole JSON object again, with these fixed.`;
  }
  return { ok: !error, json: error ? null : json, error, model, tokensIn, tokensOut };
}

// One plan, the way generatePlan writes it (same user message), with the chosen prompt and model.
export const runOne = internalAction({
  args: { request, brief: v.optional(v.any()), version: v.union(v.literal("v1"), v.literal("v7"), v.literal("v8")), model: v.optional(v.union(...MODELS.map((m) => v.literal(m)))) },
  handler: async (ctx, { request: r, brief, version, model = "opus" }) => {
    const started = Date.now();
    const system = PROMPTS[version], user = userOf(r, brief);
    const out: any = model.startsWith("gemini") ? await geminiPlan(model, system, user)
      : await ctx.runAction(internal.ai.generate, { kind: "plan", system, user, logAs: "eval plan", ...(model === "opus" ? {} : { model }) });
    const ms = Date.now() - started;
    if (model.startsWith("gemini")) await ctx.runMutation(internal.handbooks.logAiCall, { kind: "eval plan", model, input: user.slice(0, 4000), output: out.json ? JSON.stringify(out.json).slice(0, 4000) : "", tokensIn: out.tokensIn, tokensOut: out.tokensOut, ms, ok: !!out.ok, error: out.error ?? undefined });
    const name = String(out.model ?? model);
    const extra = EXTRA_PER_M[name];
    const inr = extra ? ((out.tokensIn ?? 0) * extra[0] + (out.tokensOut ?? 0) * extra[1]) / 1e6 : name.includes("deepseek") || model === "tic:" ? null : inrOf(name, !!out.ok, out.tokensIn ?? 0, out.tokensOut ?? 0);
    return {
      version, model, ms, ok: !!out.ok, error: out.ok ? null : String(out.error ?? "failed"), modelUsed: name,
      tokensIn: out.tokensIn ?? 0, tokensOut: out.tokensOut ?? 0, inr, plan: out.ok ? out.json : null,
    };
  },
});

const JUDGE_PROMPT = `You judge the plan step of I Get It. I Get It writes a short handbook for one reader: a course of 7 chapters, or a quick handbook of 1 to 3. A planner reads the reader's request and a research brief, and writes the plan: the topic, the outcome, the chapters (title, what each covers, an outcome and a hook), an analogy for a course, a framing line for a quick one, and the works it draws on. A writer then writes every chapter from this plan.

You get the request, the research brief (it can be absent) and one plan. Judge only the plan.

1. Check each work in "sources" (shown to the reader as "Draws on"). Use web search if you are not sure it exists exactly as named. Say if it exists: true or false.
2. Score each dimension from 1 (poor) to 5 (excellent), with one short reason:
- goalFit: the whole plan serves the reader's goal and level, not the topic in general.
- coverage: the chapters cover every part the brief says the goal needs, and nothing the goal does not need.
- progression: chapter 1 is what everything else rests on; each chapter teaches one thing; the chapters build in order.
- outcomes: the outcomes are specific, honest and reachable. No "understand the basics".
- hooks: each hook is a specific question or a surprising true claim that makes the reader want the chapter. No clickbait.
- picture: the analogy fits this topic, maps several parts of it and carries through the chapters; it is not a stock comparison. Score null if the plan has no analogy and is quick or story mode.
- framing: the framing line is specific to this topic and natural. Score null if the plan is a course.
- fidelity: nothing contradicts the brief's facts, and nothing specific is made up.
- sources: the works exist exactly as named and fit the handbook. Fewer is fine; a wrong one is bad.
- clarity: plain words, short, concrete, no filler.
3. Name the single best thing and the single worst thing about this plan.

Return JSON only:
{"sources":[{"what":"...","exists":true,"note":"..."}],"scores":{"goalFit":{"score":1,"why":"..."},"coverage":{"score":1,"why":"..."},"progression":{"score":1,"why":"..."},"outcomes":{"score":1,"why":"..."},"hooks":{"score":1,"why":"..."},"picture":{"score":null,"why":"..."},"framing":{"score":null,"why":"..."},"fidelity":{"score":1,"why":"..."},"sources":{"score":1,"why":"..."},"clarity":{"score":1,"why":"..."}},"best":"...","worst":"..."}`;

const COMPARE_PROMPT = `You compare two plans from I Get It for the same reader request and research brief. A writer writes every chapter of the handbook from the plan.

For each dimension, say which plan is better: "A", "B" or "tie". Then say which plan you would give the writer, and why, in two sentences at most. Judge only what is in the plans. Do not prefer a plan because it is longer.

Dimensions: goalFit (serves this reader's goal and level), coverage (every part the brief says the goal needs), progression (chapter 1 is the foundation, one thing per chapter, builds in order), outcomes (specific, honest, reachable), hooks (specific, true, not clickbait), picture (the analogy fits and carries through; "tie" if neither has one), framing ("tie" if neither has one), fidelity (agrees with the brief's facts, nothing made up), sources (real works that fit), clarity.

Return JSON only:
{"dimensions":{"goalFit":"A|B|tie","coverage":"A|B|tie","progression":"A|B|tie","outcomes":"A|B|tie","hooks":"A|B|tie","picture":"A|B|tie","framing":"A|B|tie","fidelity":"A|B|tie","sources":"A|B|tie","clarity":"A|B|tie"},"overall":"A|B|tie","why":"..."}`;

const parse = (text: string) => { const m = text.match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch { return null; } };

async function askJudge(system: string, user: string, searches: number) {
  const started = Date.now();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const messages: any[] = [{ role: "user", content: user }];
  let tokensIn = 0, tokensOut = 0, used = 0, text = "", error: string | null = null;
  try {
    for (let i = 0; i < 4; i++) {
      const res: any = await client.beta.messages.create({
        model: JUDGE, max_tokens: 8000, system, messages, output_config: { effort: "medium" },
        ...(searches ? { tools: [{ type: "web_search_20260209", name: "web_search", max_uses: searches }] } : {}),
      } as any);
      tokensIn += res.usage?.input_tokens ?? 0; tokensOut += res.usage?.output_tokens ?? 0;
      used += res.usage?.server_tool_use?.web_search_requests ?? 0;
      if (res.stop_reason === "pause_turn") { messages.push({ role: "assistant", content: res.content }); continue; }
      text = (res.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
      break;
    }
  } catch (e: any) { error = String(e?.message ?? e).slice(0, 300); }
  const verdict = parse(text);
  return { verdict, error: error ?? (verdict ? null : `no JSON: ${text.slice(0, 200)}`), ms: Date.now() - started, tokensIn, tokensOut, inr: inrOf(JUDGE, true, tokensIn, tokensOut) + used * CLAUDE_SEARCH_INR };
}

const context = (r: Request, brief: any) => `Reader's request:\n${userOf(r, null).trim()}\n\nResearch brief:\n${brief ? JSON.stringify({ kind: brief.kind, format: brief.format, chapters: brief.chapters, outline: brief.outline ?? null, facts: brief.facts }, null, 2) : "(none)"}`;

async function log(ctx: any, kind: string, user: string, j: Awaited<ReturnType<typeof askJudge>>) {
  await ctx.runMutation(internal.handbooks.logAiCall, { kind, model: JUDGE, input: user.slice(0, 4000), output: JSON.stringify(j.verdict ?? j.error).slice(0, 4000), tokensIn: j.tokensIn, tokensOut: j.tokensOut, ms: j.ms, ok: !j.error, error: j.error ?? undefined });
}

// One plan, judged alone, with up to 3 web searches to check its "Draws on" works. Blind to the prompt version.
export const judgeOne = internalAction({
  args: { request, brief: v.optional(v.any()), plan: v.any() },
  handler: async (ctx, { request: r, brief, plan }) => {
    const user = `${context(r, brief)}\n\nPlan:\n${JSON.stringify(plan, null, 2)}`;
    const j = await askJudge(JUDGE_PROMPT, user, 3);
    await log(ctx, "eval plan judge", user, j);
    return j;
  },
});

// Two plans side by side, blind, no search. The script runs it once each way round.
export const compare = internalAction({
  args: { request, brief: v.optional(v.any()), a: v.any(), b: v.any() },
  handler: async (ctx, { request: r, brief, a, b }) => {
    const user = `${context(r, brief)}\n\nPlan A:\n${JSON.stringify(a, null, 2)}\n\nPlan B:\n${JSON.stringify(b, null, 2)}`;
    const j = await askJudge(COMPARE_PROMPT, user, 0);
    await log(ctx, "eval plan compare", user, j);
    return j;
  },
});

// Which Gemini models this key can call (names only), to pick exact model ids for the plan comparison.
export const geminiModels = internalAction({
  args: {},
  handler: async () => {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" } });
    const j: any = await r.json();
    return (j.models ?? []).map((m: any) => String(m.name).replace("models/", "")).filter((n: string) => /gemini-3/.test(n));
  },
});

// Several plans for the same request, judged together (8 Oct, the cheap prompt + model comparison): Sonnet, no web
// search, blind (plans labelled A, B, C...; the script shuffles them and runs it twice to cancel position bias).
const RANK_PROMPT = `You compare several plans from I Get It for the same reader request and research brief. A writer writes every chapter of the handbook from the plan. You do not know who wrote each plan.

Score every plan on each dimension from 1 (poor) to 5 (excellent):
- goalFit: serves this reader's goal and level, not the topic in general.
- coverage: covers every part the brief says the goal needs.
- progression: chapter 1 is the foundation; one thing per chapter; the chapters build in order.
- outcomes: specific, honest and reachable. Numbers come from the brief or are a test the reader can do.
- hooks: specific open loops or surprising true claims. No clickbait.
- picture: the analogy fits this topic, maps several of its parts and carries through the chapters.
- fidelity: agrees with the brief's facts; nothing specific is made up.
- sources: works that are real as far as you know, and that fit. Fewer is fine.
- clarity: plain, short, concrete, no filler.
Then rank all the plans from best to worst, and give one sentence on each plan: its best and its worst thing. Do not prefer a plan because it is longer.

Return JSON only:
{"plans":[{"label":"A","scores":{"goalFit":1,"coverage":1,"progression":1,"outcomes":1,"hooks":1,"picture":1,"fidelity":1,"sources":1,"clarity":1},"note":"..."}],"ranking":["A","B"],"why":"two sentences on what separates the best from the rest"}`;

export const rankPlans = internalAction({
  args: { request, brief: v.optional(v.any()), plans: v.array(v.object({ label: v.string(), plan: v.any() })) },
  handler: async (ctx, { request: r, brief, plans }) => {
    const user = `${context(r, brief)}\n\n${plans.map((p) => `Plan ${p.label}:\n${JSON.stringify(p.plan, null, 2)}`).join("\n\n")}`;
    const j = await askJudge(RANK_PROMPT, user, 0);
    await log(ctx, "eval plan rank", user, j);
    return j;
  },
});
