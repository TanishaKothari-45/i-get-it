"use node";
// Research prompt v1 vs v2 (8 Oct): run one research call with either prompt, and have Claude Sonnet judge the result,
// alone (with web search to check facts) and side by side (blind, both orders). Nothing is stored except the call log.
// Driven by scripts/research-eval.mjs; results land in evals/research-v1-v2/. (evalResearch.ts is Prateek's model
// comparison; this one holds the model fixed and changes only the prompt.)
import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { inrOf } from "./costs";
import { GEMINI_RESEARCHER, GEMINI_THINKING, askFor, geminiResearch, type Version } from "./research";

export const JUDGE = "claude-sonnet-5-5";
// Search is billed per query on top of tokens (list prices, 8 Oct): Gemini grounding $14 and Anthropic web search $10
// per 1,000. Estimates at ₹84 a dollar.
const GEMINI_SEARCH_INR = (14 / 1000) * 84;
const CLAUDE_SEARCH_INR = (10 / 1000) * 84;

const request = v.object({ topic: v.string(), goal: v.optional(v.string()), mode: v.optional(v.string()), level: v.string() });

// One research call, Gemini only (the live path), so v1 and v2 differ in the prompt alone. No Claude fallback here:
// a failure is a result.
export const runOne = internalAction({
  args: { request, version: v.union(v.literal("v1"), v.literal("v4"), v.literal("v5"), v.literal("v6"), v.literal("v7")), structured: v.optional(v.boolean()), thinking: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("default"))) },
  handler: async (ctx, { request: r, version, structured = true, thinking }) => {
    const ask = askFor(r);
    const a = await geminiResearch(GEMINI_RESEARCHER, ask, version as Version, structured, thinking ?? GEMINI_THINKING);
    await ctx.runMutation(internal.handbooks.logAiCall, {
      kind: `eval research ${version}`, model: a.model, input: ask, output: a.decided ? JSON.stringify(a.decided).slice(0, 4000) : "",
      tokensIn: a.tokensIn, tokensOut: a.tokensOut, ms: a.ms, ok: !a.error, error: a.error,
    });
    const tokenInr = inrOf(a.model, !a.error, a.tokensIn, a.tokensOut);
    return {
      version, thinking: thinking ?? GEMINI_THINKING, ask, model: a.model, ms: a.ms, searches: a.searches, grounded: a.grounded ?? 0, queries: a.queries ?? [], tokensIn: a.tokensIn, tokensOut: a.tokensOut,
      inr: tokenInr + a.searches * GEMINI_SEARCH_INR, tokenInr, error: a.error ?? null, output: a.decided,
    };
  },
});

const JUDGE_PROMPT = `You judge the research step of I Get It. I Get It writes a short handbook for one reader. Before writing, a researcher reads the reader's request, searches the web, and returns a brief: the kind of handbook, its format and length, a framing line, and the facts and sources the handbook must rest on. The writer trusts these facts. A wrong fact goes straight to the reader.

You get the reader's request and one brief. Judge only the brief.

1. Check every fact. Use web search for any fact you are not sure of, most of all numbers, dates, names and anything that can change with time. Compare with Today. Give each fact a verdict: "correct", "wrong", "outdated" or "unsure". Also say if the fact helps the reader's goal: true or false.
2. Score each dimension from 1 (poor) to 5 (excellent), with one short reason:
- accuracy: the facts are true.
- goalFit: the facts and decisions serve the reader's goal and level, not the topic in general.
- breadth: the brief covers every part of the topic the goal needs, from what the reader knows now to the goal. A planner could plan all the chapters from it.
- depth: each part has enough detail that a writer could teach it without guessing.
- currency: facts that change with time are current as of Today.
- specificity: each fact is concrete and checkable, not vague.
- decisions: kind, format and chapters fit this request.
- sources: the sources are relevant, authoritative and real.
- clarity: short, plain sentences that translate well. No filler.
3. List up to 3 facts the handbook needs that the brief does not have.
4. Name the single best thing and the single worst thing about this brief.

Return JSON only:
{"facts":[{"fact":"...","verdict":"correct|wrong|outdated|unsure","helpsGoal":true,"note":"..."}],"scores":{"accuracy":{"score":1,"why":"..."},"goalFit":{"score":1,"why":"..."},"breadth":{"score":1,"why":"..."},"depth":{"score":1,"why":"..."},"currency":{"score":1,"why":"..."},"specificity":{"score":1,"why":"..."},"decisions":{"score":1,"why":"..."},"sources":{"score":1,"why":"..."},"clarity":{"score":1,"why":"..."}},"missing":["..."],"best":"...","worst":"..."}`;

const COMPARE_PROMPT = `You compare two research briefs from I Get It for the same reader request. I Get It writes a short handbook for one reader from the brief. The writer trusts the brief's facts.

For each dimension, say which brief is better: "A", "B" or "tie". Then say which brief you would give the planner and writer, and why, in two sentences at most. Judge only what is in the briefs. Do not prefer a brief because it is longer, and do not count a framing line for or against a brief.

Dimensions: accuracy, goalFit (serves this reader's goal and level), breadth (covers every part the goal needs), depth (enough detail per part to teach it), currency (as of Today), specificity, decisions (kind, format, chapters), sources, clarity.

Return JSON only:
{"dimensions":{"accuracy":"A|B|tie","goalFit":"A|B|tie","breadth":"A|B|tie","depth":"A|B|tie","currency":"A|B|tie","specificity":"A|B|tie","decisions":"A|B|tie","sources":"A|B|tie","clarity":"A|B|tie"},"overall":"A|B|tie","why":"..."}`;

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
  return {
    verdict, error: error ?? (verdict ? null : `no JSON: ${text.slice(0, 200)}`), ms: Date.now() - started, searches: used, tokensIn, tokensOut,
    inr: inrOf(JUDGE, true, tokensIn, tokensOut) + used * CLAUDE_SEARCH_INR,
  };
}

async function logJudge(ctx: any, kind: string, user: string, j: Awaited<ReturnType<typeof askJudge>>) {
  await ctx.runMutation(internal.handbooks.logAiCall, {
    kind, model: JUDGE, input: user.slice(0, 4000), output: JSON.stringify(j.verdict ?? j.error).slice(0, 4000),
    tokensIn: j.tokensIn, tokensOut: j.tokensOut, ms: j.ms, ok: !j.error, error: j.error ?? undefined,
  });
}

// One brief, judged alone, with up to 5 web searches to check its facts. The judge is not told which prompt wrote it.
export const judgeOne = internalAction({
  args: { request, output: v.any() },
  handler: async (ctx, { request: r, output }) => {
    const user = `Reader's request:\n${askFor(r)}\n\nBrief:\n${JSON.stringify(output, null, 2)}`;
    const j = await askJudge(JUDGE_PROMPT, user, 5);
    await logJudge(ctx, "eval judge", user, j);
    return j;
  },
});

// Two briefs side by side, blind, no search. The script runs it once each way round to cancel position bias.
export const compare = internalAction({
  args: { request, a: v.any(), b: v.any() },
  handler: async (ctx, { request: r, a, b }) => {
    const user = `Reader's request:\n${askFor(r)}\n\nBrief A:\n${JSON.stringify(a, null, 2)}\n\nBrief B:\n${JSON.stringify(b, null, 2)}`;
    const j = await askJudge(COMPARE_PROMPT, user, 0);
    await logJudge(ctx, "eval compare", user, j);
    return j;
  },
});
