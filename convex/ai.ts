"use node";
import Anthropic from "@anthropic-ai/sdk";
// The AI call. Runs only here, in a Convex action. The key is read from the
// Convex environment, never from the interface.
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const PLAN_MAX_OUT = 3000;
const CHAPTER_MAX_OUT = 6000;
const SIMPLER_MAX_OUT = 600;

type Result = { ok: true; json: any; model: string; tokensIn?: number; tokensOut?: number } | { ok: false; error: string; model: string };

async function callOpenAI(system: string, user: string, maxOut: number): Promise<{ text: string; tokensIn?: number; tokensOut?: number; model: string }> {
  const model = process.env.OPENAI_MODEL ?? "gpt-6-luna";
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      reasoning: { effort: "low" },
      max_output_tokens: maxOut,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      text: { format: { type: "json_object" } },
    }),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `OpenAI ${res.status}`);
  const text = (data.output ?? [])
    .filter((o: any) => o.type === "message")
    .flatMap((o: any) => o.content ?? [])
    .map((c: any) => c.text ?? "")
    .join("");
  return { text, tokensIn: data.usage?.input_tokens, tokensOut: data.usage?.output_tokens, model };
}

// Which model does which job. Plans and answers to questions are the judgment calls, so they get Opus 5.5;
// chapters stay on Haiku unless the reader picked a writer in the comparison; card rewrites stay on Haiku.
const HAIKU = "claude-haiku-4-5-20251001";
const OPUS = "claude-opus-5-5";
const SONNET = "claude-sonnet-5-5";
type Effort = "low" | "medium" | "high" | "xhigh" | "max";
type Kind = "plan" | "chapter" | "simpler" | "ask" | "check" | "scenes" | "audit" | "repair" | "teach" | "deeper" | "another";
// Per-job table, set by Prateek 6 Oct: quality first, cost and latency to be handled with prices or limits later.
// Thinking counts against max_tokens, so max-effort jobs get large caps (and stream; see callAnthropic).
const JOB: Record<Kind, { model: string; effort?: Effort; maxTokens: number }> = {
  plan: { model: OPUS, effort: "high", maxTokens: 32000 },   // 6 Oct: "max" thought >5 min, hit 32k and was cut off (2 of 2)
  ask: { model: OPUS, effort: "low", maxTokens: 2000 },
  simpler: { model: SONNET, effort: "medium", maxTokens: 8000 },   // 6 Oct: "max" thought 49 s and was cut off at 8,000 with no answer
  chapter: { model: OPUS, effort: "medium", maxTokens: 16000 },
  scenes: { model: HAIKU, maxTokens: 2000 },
  deeper: { model: HAIKU, maxTokens: 4500 },    // bonus lessons ("go deeper" / "another way"): shorter than a chapter
  another: { model: HAIKU, maxTokens: 4500 },
  audit: { model: OPUS, effort: "high", maxTokens: 16000 },
  repair: { model: OPUS, effort: "medium", maxTokens: 16000 },
  teach: { model: SONNET, effort: "low", maxTokens: 2000 },   // teach it back: a short reply to the reader's own 2 sentences   // one-off fixes to chapters already written (convex/repair.ts)   // measurement only (convex/audit.ts): what slipped past the fact check   // one scene line per teaching card, for the chapter pictures
  check: { model: SONNET, effort: "low", maxTokens: 16000 },   // Prateek, 6 Oct, from evals/model-choice.md: 10 of 10 planted mistakes, no stray changes, ~14 s (Opus high: 10 of 10, 38 s, ~3.5x the cost). Watch: on 4 Oct Sonnet once wrote new mistakes while fixing
};

let anthropic: Anthropic | null = null;
function client() { return (anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })); }

async function callAnthropic(kind: Kind, system: string, user: string, modelOverride?: string, effortOverride?: Effort): Promise<{ text: string; tokensIn?: number; tokensOut?: number; model: string }> {
  const job = JOB[kind];
  const model = modelOverride ?? process.env.ANTHROPIC_MODEL ?? job.model;
  const isHaiku = model.startsWith("claude-haiku");
  // Current-generation models think before answering; give them room and a set effort. Haiku takes neither.
  const maxTokens = isHaiku ? Math.min(job.maxTokens, 8000) : Math.max(job.maxTokens, kind === "chapter" ? 12000 : job.maxTokens);
  const effort = isHaiku ? undefined : (effortOverride ?? job.effort ?? "medium");
  const params = {
    model,
    max_tokens: maxTokens,
    system: system + "\n\nReturn only the JSON object. No prose, no code fences.",
    messages: [{ role: "user" as const, content: user }],
    ...(effort ? { output_config: { effort } } : {}),
    // If a current-generation model declines, Anthropic re-runs the request on a suitable model inside the same call.
    ...(isHaiku ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }),
  };
  // Large caps (max effort) stream, so a long think doesn't hit the HTTP timeout.
  const res = maxTokens > 16000 ? await client().beta.messages.stream(params as any).finalMessage() : await client().beta.messages.create(params as any);
  if (res.stop_reason === "refusal") throw new Error(`declined (${res.stop_details?.category ?? "no category"})`);
  if (res.stop_reason === "max_tokens") throw new Error("reply cut off at the token limit");
  const text = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("");
  return { text, tokensIn: res.usage.input_tokens, tokensOut: res.usage.output_tokens, model: res.model };
}

// GLM (Zhipu / Z.ai), OpenAI-style chat API. Key in the Convex env variable CHEAPER_INFERENCE_API_KEY (Prateek's credits).
// Only used when a model id starts with "glm-" (6 Oct: under test in the model comparison, not on the reader's path).
async function callGLM(system: string, user: string, model: string, maxTokens: number, effort?: string): Promise<{ text: string; tokensIn?: number; tokensOut?: number; model: string }> {
  const key = process.env.CHEAPER_INFERENCE_API_KEY;
  if (!key) throw new Error("No GLM key");
  const base = process.env.GLM_BASE_URL ?? "https://api.z.ai/api/paas/v4";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model, max_tokens: Math.min(maxTokens, 32000),
      messages: [{ role: "system", content: system + "\n\nReturn only the JSON object. No prose, no code fences." }, { role: "user", content: user }],
      thinking: { type: effort && effort !== "low" ? "enabled" : "disabled" },
    }),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`GLM ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  const choice = body.choices?.[0];
  if (choice?.finish_reason === "length") throw new Error("reply cut off at the token limit");
  return { text: String(choice?.message?.content ?? ""), tokensIn: body.usage?.prompt_tokens, tokensOut: body.usage?.completion_tokens, model: body.model ?? model };
}

function extractJson(text: string): any {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no JSON in model output");
  return JSON.parse(m[0]);
}

export const generate = internalAction({
  args: { kind: v.union(v.literal("plan"), v.literal("chapter"), v.literal("simpler"), v.literal("ask"), v.literal("check"), v.literal("scenes"), v.literal("audit"), v.literal("repair"), v.literal("teach"), v.literal("deeper"), v.literal("another")), system: v.string(), user: v.string(), model: v.optional(v.string()), effort: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("xhigh"), v.literal("max"))) },
  handler: async (ctx, { kind, system, user, model, effort }): Promise<Result> => {
    const started = Date.now();
    const maxOut = kind === "plan" ? PLAN_MAX_OUT : kind === "simpler" || kind === "ask" ? SIMPLER_MAX_OUT : CHAPTER_MAX_OUT;
    const provider = process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.OPENAI_API_KEY ? "openai" : null;
    if (!provider) {
      await ctx.runMutation(internal.handbooks.logAiCall, { kind, model: "none", input: user.slice(0, 2000), output: "", ms: 0, ok: false, error: "no provider key set" });
      return { ok: false, error: "no provider key set", model: "none" };
    }
    try {
      const viaGLM = !!model?.startsWith("glm-");
      const call = () => viaGLM ? callGLM(system, user, model!, JOB[kind].maxTokens, effort) : provider === "anthropic" ? callAnthropic(kind, system, user, model, effort) : callOpenAI(system, user, maxOut);
      let r = await call();
      let json: any;
      // A broken JSON reply (6 Oct: an unescaped quote in a SQL chapter) gets one fresh try before it counts as a failure.
      try { json = extractJson(r.text); }
      catch {
        r = await call();
        json = extractJson(r.text);
      }
      await ctx.runMutation(internal.handbooks.logAiCall, {
        kind, model: r.model, input: user.slice(0, 2000), output: r.text.slice(0, 20000),
        tokensIn: r.tokensIn, tokensOut: r.tokensOut, ms: Date.now() - started, ok: true,
      });
      return { ok: true, json, model: r.model, tokensIn: r.tokensIn, tokensOut: r.tokensOut };
    } catch (e: any) {
      const error = String(e?.message ?? e).slice(0, 500);
      await ctx.runMutation(internal.handbooks.logAiCall, { kind, model: provider, input: user.slice(0, 2000), output: "", ms: Date.now() - started, ok: false, error });
      return { ok: false, error, model: provider };
    }
  },
});

// "Ask or object": Opus 5.5, guardrailed to the card's topic. Step 1 answers without web access (cheap): it answers from
// the card, turns away off-topic questions, or says NEEDS_WEB. Only then does step 2 run with web search (cached prefix,
// capped per person per day). Returns plain text plus the links it cited or checked.
const NEEDS_WEB = "NEEDS_WEB";
export const askWithSearch = internalAction({
  args: { system: v.string(), user: v.string(), searchKey: v.string() },
  handler: async (ctx, { system, user, searchKey }): Promise<{ ok: true; answer: string; sources: { url: string; title: string }[] } | { ok: false; error: string }> => {
    const started = Date.now();
    if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "no provider key set" };
    let tokensIn = 0, tokensOut = 0, searches = 0, step = 1;
    try {
      // Step 1: no tools.
      const first = await client().beta.messages.create({
        model: OPUS, max_tokens: 2000, output_config: { effort: "low" },
        system: system + `\n\nIn this step you have no web access. If a proper answer needs facts the card doesn't contain, reply with exactly ${NEEDS_WEB} and nothing else.`,
        messages: [{ role: "user", content: user }],
        betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
      });
      tokensIn += first.usage.input_tokens; tokensOut += first.usage.output_tokens;
      if (first.stop_reason === "refusal") throw new Error(`declined (${first.stop_details?.category ?? "no category"})`);
      const firstText = first.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("").trim();
      let answer = firstText, sources: { url: string; title: string }[] = [], model = first.model;

      if (firstText === NEEDS_WEB || firstText.startsWith(NEEDS_WEB)) {
        step = 2;
        const allowed = await ctx.runMutation(internal.handbooks.takeSearchToken, { key: searchKey });
        if (!allowed) {
          // Over today's search allowance: answer from the card, and say so.
          const fallback = await client().beta.messages.create({
            model: OPUS, max_tokens: 2000, output_config: { effort: "low" },
            system: system + "\n\nYou have no web access today. Answer as well as the card allows, and say in one short clause that you couldn't check the web for this one.",
            messages: [{ role: "user", content: user }], betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
          });
          tokensIn += fallback.usage.input_tokens; tokensOut += fallback.usage.output_tokens;
          answer = fallback.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("").trim();
        } else {
          const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: user }];
          let res: Anthropic.Beta.BetaMessage | null = null;
          for (let turn = 0; turn < 3; turn++) {   // a server tool can pause a long turn; resume it at most twice
            res = await client().beta.messages.create({
              model: OPUS, max_tokens: 6000, output_config: { effort: "medium" },  // medium: low effort garbled a comparison in testing
              cache_control: { type: "ephemeral" },  // the tool instructions + system prompt are the same every time
              system, messages,
              tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 2 }],
              betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
            });
            tokensIn += res.usage.input_tokens + (res.usage.cache_read_input_tokens ?? 0) + (res.usage.cache_creation_input_tokens ?? 0);
            tokensOut += res.usage.output_tokens;
            searches += res.usage.server_tool_use?.web_search_requests ?? 0;
            if (res.stop_reason !== "pause_turn") break;
            messages.push({ role: "assistant", content: res.content });
          }
          if (!res) throw new Error("no response");
          if (res.stop_reason === "refusal") throw new Error(`declined (${res.stop_details?.category ?? "no category"})`);
          if (res.stop_reason === "max_tokens") throw new Error("reply cut off at the token limit");
          model = res.model;
          const texts = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text");
          answer = texts.map((b) => b.text).join("").trim();
          const seen = new Map<string, string>();
          for (const b of texts) for (const c of b.citations ?? []) {
            if (c.type === "web_search_result_location" && /^https?:\/\//.test(c.url) && !seen.has(c.url)) seen.set(c.url, c.title ?? new URL(c.url).hostname);
          }
          // No inline citations? Show the top results it read, so the reader can still check.
          if (seen.size === 0) for (const b of res.content as any[]) {
            if (b.type === "web_search_tool_result" && Array.isArray(b.content)) for (const r of b.content) {
              if (r?.type === "web_search_result" && /^https?:\/\//.test(r.url) && !seen.has(r.url)) seen.set(r.url, r.title ?? new URL(r.url).hostname);
            }
          }
          sources = [...seen.entries()].slice(0, 3).map(([url, title]) => ({ url, title }));
        }
      }
      await ctx.runMutation(internal.handbooks.logAiCall, { kind: "ask", model, input: user.slice(0, 2000), output: `${answer}\n[step ${step}; searches: ${searches}; sources: ${sources.map((x) => x.url).join(" ")}]`.slice(0, 20000), tokensIn, tokensOut, ms: Date.now() - started, ok: true });
      return { ok: true, answer, sources };
    } catch (e: any) {
      const error = String(e?.message ?? e).slice(0, 500);
      await ctx.runMutation(internal.handbooks.logAiCall, { kind: "ask", model: OPUS, input: user.slice(0, 2000), output: "", ms: Date.now() - started, ok: false, error });
      return { ok: false, error };
    }
  },
});
