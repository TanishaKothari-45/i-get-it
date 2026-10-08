"use node";
import Anthropic from "@anthropic-ai/sdk";
// The AI call. Runs only here, in a Convex action. The key is read from the
// Convex environment, never from the interface.
import { v } from "convex/values";
import { jsonSchema, problems } from "./schemas";
import { traceV } from "./trace";
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
type Kind = "plan" | "chapter" | "simpler" | "ask" | "check" | "scenes" | "audit" | "repair" | "teach" | "intent" | "versions" | "match" | "artifact" | "move" | "library" | "stories";
// Per-job table, set by Prateek 6 Oct: quality first, cost and latency to be handled with prices or limits later.
// Thinking counts against max_tokens, so max-effort jobs get large caps (and stream; see callAnthropic).
const JOB: Record<Kind, { model: string; effort?: Effort; maxTokens: number }> = {
  plan: { model: OPUS, effort: "high", maxTokens: 32000 },
  versions: { model: SONNET, effort: "low", maxTokens: 12000 },   // 7 Oct: easier and harder quiz versions from a finished chapter (Opus writing them doubled a chapter's cost)
  match: { model: HAIKU, maxTokens: 300 },
  library: { model: HAIKU, maxTokens: 300 },
  stories: { model: OPUS, effort: "medium", maxTokens: 8000 },   // D29 (9 Oct): three true wait stories per ready handbook, written once   // 8 Oct (Tanisha): the shared-library privacy check, with its own schema (it ran under "intent" and failed every time)   // 7 Oct: does a typed topic match a handbook we already have (by meaning)?
  intent: { model: HAIKU, maxTokens: 600 },   // "What's it for?": three goals in about a second, before the plan   // 6 Oct: "max" thought >5 min, hit 32k and was cut off (2 of 2)
  ask: { model: OPUS, effort: "low", maxTokens: 2000 },
  simpler: { model: SONNET, effort: "medium", maxTokens: 8000 },   // 6 Oct: "max" thought 49 s and was cut off at 8,000 with no answer
  chapter: { model: OPUS, effort: "medium", maxTokens: 32000 },   // 7 Oct: three quiz versions plus thinking passed 16,000
  scenes: { model: SONNET, effort: "low", maxTokens: 4000 },   // 6 Oct: Sonnet, not Haiku: deciding which cards get a real photo needs judgment
  audit: { model: OPUS, effort: "high", maxTokens: 16000 },
  repair: { model: OPUS, effort: "medium", maxTokens: 16000 },
  teach: { model: SONNET, effort: "low", maxTokens: 2000 },   // teach it back: a short reply to the reader's own 2 sentences   // one-off fixes to chapters already written (convex/repair.ts)   // measurement only (convex/audit.ts): what slipped past the fact check   // one scene line per teaching card, for the chapter pictures
  check: { model: SONNET, effort: "low", maxTokens: 16000 },
  artifact: { model: SONNET, effort: "medium", maxTokens: 16000 },
  move: { model: SONNET, effort: "medium", maxTokens: 16000 },   // 8 Oct: the moving figure for a body-skill chapter's "move" card   // 8 Oct test: one interactive HTML explainer per chapter (evalArtifact.ts)   // Prateek, 6 Oct, from evals/model-choice.md: 10 of 10 planted mistakes, no stray changes, ~14 s (Opus high: 10 of 10, 38 s, ~3.5x the cost). Watch: on 4 Oct Sonnet once wrote new mistakes while fixing
};

let anthropic: Anthropic | null = null;
function client() { return (anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })); }

// Claude prompt caching (8 Oct, Tanisha): off for now. A cache write costs 1.25x normal input and a hit 0.1x, and the cache
// lives 5 minutes, so it saves money only when the same system prompt is sent again within 5 minutes in more than about
// 1 call in 5. At today's traffic most calls would pay the write and never hit. Turn on when traffic is steady; Anthropic
// reports cache_read_input_tokens in every reply, so the hit rate can be checked first. (Gemini caches by itself.)
const CACHE_PROMPTS = false;

async function callAnthropic(kind: Kind, system: string, user: string, modelOverride?: string, effortOverride?: Effort): Promise<{ text: string; tokensIn?: number; tokensOut?: number; cachedIn?: number; model: string }> {
  const job = JOB[kind];
  const model = modelOverride ?? process.env.ANTHROPIC_MODEL ?? job.model;
  const isHaiku = model.startsWith("claude-haiku");
  // Current-generation models think before answering; give them room and a set effort. Haiku takes neither.
  const maxTokens = isHaiku ? Math.min(job.maxTokens, 8000) : Math.max(job.maxTokens, kind === "chapter" ? 12000 : job.maxTokens);
  const effort = isHaiku ? undefined : (effortOverride ?? job.effort ?? "medium");
  const params = {
    model,
    max_tokens: maxTokens,
    system: CACHE_PROMPTS
      ? [{ type: "text", text: system + "\n\nReturn only the JSON object. No prose, no code fences.", cache_control: { type: "ephemeral" } }] as any
      : system + "\n\nReturn only the JSON object. No prose, no code fences.",
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
  return { text, tokensIn: res.usage.input_tokens, tokensOut: res.usage.output_tokens, cachedIn: (res.usage as any).cache_read_input_tokens || undefined, model: res.model };
}

// GLM (Zhipu / Z.ai), OpenAI-style chat API. Key in the Convex env variable CHEAPER_INFERENCE_API_KEY (Prateek's credits).
// Only used when a model id starts with "glm-" (6 Oct: under test in the model comparison, not on the reader's path).
async function callGLM(system: string, user: string, model: string, maxTokens: number, effort?: string, kind?: string): Promise<{ text: string; tokensIn?: number; tokensOut?: number; model: string }> {
  const key = process.env.CHEAPER_INFERENCE_API_KEY;
  if (!key) throw new Error("No GLM key");
  const base = process.env.GLM_BASE_URL ?? "https://api.z.ai/api/paas/v4";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST", signal: AbortSignal.timeout(150000),   // 8 Oct: a check hung 5 minutes on the marketplace, then failed
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model, max_tokens: Math.min(maxTokens, 32000),
      messages: [{ role: "system", content: system + "\n\nReturn only the JSON object. No prose, no code fences." }, { role: "user", content: user }],
      thinking: { type: effort && effort !== "low" ? "enabled" : "disabled" },
      // 8 Oct: the job's JSON schema goes with the request, so the reply is held to it at the source (schemas.ts).
      ...(kind && jsonSchema(kind) ? { response_format: { type: "json_schema", json_schema: { name: kind, schema: jsonSchema(kind), strict: false } } } : {}),
    }),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`GLM ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  const choice = body.choices?.[0];
  if (choice?.finish_reason === "length") throw new Error("reply cut off at the token limit");
  return { text: String(choice?.message?.content ?? ""), tokensIn: body.usage?.prompt_tokens, tokensOut: body.usage?.completion_tokens, model: body.model ?? model };
}

// The Inference Company (Manthan's, 6 Oct): an OpenAI-style API serving deepseek-v4-pro. Key in the Convex env variable
// INFERENCE_API_KEY. Used when the /admin switch says "inference", or when a call names a model starting "tic:" (tests).
// Each call carries an x-task-id header naming the job, so the console shows cost per job.
const INFERENCE_MODEL = "deepseek-v4-pro";
async function callInference(kind: string, system: string, user: string, maxTokens: number, model = INFERENCE_MODEL): Promise<{ text: string; tokensIn?: number; tokensOut?: number; model: string }> {
  const key = process.env.INFERENCE_API_KEY;
  if (!key) throw new Error("No INFERENCE_API_KEY");
  const res = await fetch("https://console.theinferencecompany.si/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "x-task-id": `igetit-${kind}` },
    body: JSON.stringify({
      model, max_tokens: Math.min(maxTokens, 32000),
      messages: [{ role: "system", content: system + "\n\nReturn only the JSON object. No prose, no code fences." }, { role: "user", content: user }],
    }),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Inference ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  const choice = body.choices?.[0];
  if (choice?.finish_reason === "length") throw new Error("reply cut off at the token limit");
  return { text: String(choice?.message?.content ?? ""), tokensIn: body.usage?.prompt_tokens, tokensOut: body.usage?.completion_tokens, model: `${body.model ?? model} (inference)` };
}

// One small request to check the key and the connection: npx convex run ai:pingInference
export const pingInference = internalAction({
  args: {},
  handler: async (): Promise<any> => {
    const t = Date.now();
    try { const r = await callInference("ping", "Reply with a JSON object.", 'Return {"ok": true, "says": "<one short sentence about the Odyssey>"}', 400); return { ms: Date.now() - t, ...r }; }
    catch (e: any) { return { ms: Date.now() - t, error: String(e?.message ?? e) }; }
  },
});

// Gemini, direct from Google (8 Oct, Tanisha: the plan and chapter steps' first choice; Prateek 8 Oct night: "hers"). Any
// model id starting "gemini-". Keys in the Convex env: GEMINI_API_KEY, then GEMINI_API_KEY_BACKUP on 503 or 429 (as
// research does). The job's JSON schema goes with the request; Flash thinks at "medium" (bounded cost and time, measured
// on research). A safety block comes back as "declined (...)", like Claude's refusals.
const GEMINI_THINKING: Record<string, string> = { "gemini-3.8-flash": "medium" };
// Time budget: all Gemini tries for one step (keys, waits, the JSON and schema retries) share one budget. Past it the
// step fails here and the caller's backup (Opus, for plans and chapters) writes it instead. Measured on Flash: plans
// 17 to 34 s, so 90 s (typical plus 60 s, room for one schema retry); chapters 27 to 70 s, so 150 s.
export const GEMINI_STEP_BUDGET = 150000;
const GEMINI_BUDGET: Partial<Record<Kind, number>> = { plan: 90000, chapter: 150000 };
async function callGemini(kind: Kind, system: string, user: string, model: string, maxTokens: number, deadline = Date.now() + GEMINI_STEP_BUDGET): Promise<{ text: string; tokensIn?: number; tokensOut?: number; model: string }> {
  const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_BACKUP].filter(Boolean) as string[];
  if (!keys.length) throw new Error("No Gemini key");
  const schema = jsonSchema(kind);
  let res: any, body: any;
  for (let i = 0; i < 2 * keys.length; i++) {
    const left = deadline - Date.now();
    if (left < 5000) throw new Error("Gemini time budget used up");
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", signal: AbortSignal.timeout(left),
      headers: { "Content-Type": "application/json", "x-goog-api-key": keys[i % keys.length] },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          maxOutputTokens: Math.min(maxTokens, 32000), responseMimeType: "application/json",
          ...(schema ? { responseJsonSchema: schema } : {}),
          ...(GEMINI_THINKING[model] ? { thinkingConfig: { thinkingLevel: GEMINI_THINKING[model] } } : {}),
        },
      }),
    }).catch((e: any) => ({ ok: false, status: 0, json: async () => ({ error: String(e?.message ?? e) }) }) as any);
    body = await res.json().catch(() => ({}));
    if (res.ok || ![503, 429, 0].includes(res.status)) break;
    if (i % keys.length === keys.length - 1 && deadline - Date.now() > 15000) await new Promise((x) => setTimeout(x, 5000));
  }
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  const cand = body.candidates?.[0];
  if (body.promptFeedback?.blockReason || /SAFETY|PROHIBITED|BLOCKLIST/.test(String(cand?.finishReason ?? ""))) throw new Error(`declined (${body.promptFeedback?.blockReason ?? cand?.finishReason})`);
  if (cand?.finishReason === "MAX_TOKENS") throw new Error("reply cut off at the token limit");
  const text = (cand?.content?.parts ?? []).filter((x: any) => !x.thought).map((x: any) => x.text ?? "").join("");
  const u = body.usageMetadata ?? {};
  return { text, tokensIn: u.promptTokenCount, tokensOut: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0), model };
}

function extractJson(text: string): any {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no JSON in model output");
  return JSON.parse(m[0]);
}

export const generate = internalAction({
  args: { kind: v.union(v.literal("plan"), v.literal("chapter"), v.literal("simpler"), v.literal("ask"), v.literal("check"), v.literal("scenes"), v.literal("audit"), v.literal("repair"), v.literal("teach"), v.literal("intent"), v.literal("versions"), v.literal("match"), v.literal("artifact"), v.literal("move"), v.literal("library"), v.literal("stories")), system: v.string(), user: v.string(), model: v.optional(v.string()), effort: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("xhigh"), v.literal("max"))), trace: traceV, logAs: v.optional(v.string()) },
  // trace (8 Oct, Tanisha): the handbook and chapter the call belongs to, for the call log. logAs: the step name in the
  // log when it differs from the job (e.g. "eval plan" for a prompt test), so tests never count as readers' handbooks.
  handler: async (ctx, { kind, system, user, model, effort, trace, logAs }): Promise<Result> => {
    const started = Date.now();
    let attempts = 1;   // a broken, cut-off or off-schema reply is asked again inside this call
    const maxOut = kind === "plan" ? PLAN_MAX_OUT : kind === "simpler" || kind === "ask" ? SIMPLER_MAX_OUT : CHAPTER_MAX_OUT;
    const provider = process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.OPENAI_API_KEY ? "openai" : null;
    if (!provider) {
      await ctx.runMutation(internal.handbooks.logAiCall, { ...trace, kind: logAs ?? kind, model: "none", input: user.slice(0, 2000), output: "", ms: 0, ok: false, error: "no provider key set" });
      return { ok: false, error: "no provider key set", model: "none" };
    }
    // The /admin switch: The Inference Company instead of Claude, unless this call names its own model (comparisons, tests).
    const viaInference = model?.startsWith("tic:") || (!model && !!process.env.INFERENCE_API_KEY && (await ctx.runQuery(internal.settings.provider, {})) === "inference");
    try {
      const viaGLM = !!model?.startsWith("glm-");
      // "ci:<model>" (8 Oct): any model on the Cheaper Inference marketplace (Prateek's credits), thinking on where Claude thinks.
      const viaCheaper = !!model?.startsWith("ci:");
      const viaGemini = !!model?.startsWith("gemini-");
      const geminiDeadline = started + (GEMINI_BUDGET[kind] ?? GEMINI_STEP_BUDGET);
      const callWith = (u: string) => viaGemini ? callGemini(kind, system, u, model!, JOB[kind].maxTokens, geminiDeadline) : viaInference ? callInference(kind, system, u, JOB[kind].maxTokens, model?.startsWith("tic:") && model.length > 4 ? model.slice(4) : undefined) : viaCheaper ? callGLM(system, u, model!.slice(3), JOB[kind].maxTokens, effort ?? JOB[kind].effort, kind) : viaGLM ? callGLM(system, u, model!, JOB[kind].maxTokens, effort) : provider === "anthropic" ? callAnthropic(kind, system, u, model, effort) : callOpenAI(system, u, maxOut);
      const call = () => callWith(user);
      // A marketplace call that times out or drops gets one more try (8 Oct); provider errors on Claude are left as before.
      let r = await call().catch(async (e: any) => {
        if ((viaCheaper || viaGLM) && /fetch failed|aborted|timeout|GLM 5\d\d/i.test(String(e?.message ?? e))) { attempts++; return call(); }
        throw e;
      });
      let json: any;
      // A broken JSON reply (6 Oct: an unescaped quote in a SQL chapter) gets one fresh try before it counts as a failure.
      try { json = extractJson(r.text); }
      catch {
        attempts++;
        r = await call();
        json = extractJson(r.text);
      }
      // 8 Oct: every reply is checked against its job's schema (schemas.ts). A mismatch gets one more try that names
      // the problems; a second mismatch is a failure, never a half-valid reply.
      const wrong = problems(kind, json);
      if (wrong) {
        const fix = `${user}\n\nYour previous reply did not match the required JSON shape:\n${wrong}\nReturn the whole JSON object again, with these fixed.`;
        attempts++;
        r = await callWith(fix);
        json = extractJson(r.text);
        const still = problems(kind, json);
        if (still) throw new Error(`reply did not match the ${kind} schema: ${still.replace(/\n/g, " ").slice(0, 300)}`);
      }
      await ctx.runMutation(internal.handbooks.logAiCall, {
        ...trace, attempts, kind: logAs ?? kind, model: r.model, input: user.slice(0, 2000), output: r.text.slice(0, 20000),
        tokensIn: r.tokensIn, tokensOut: r.tokensOut, cachedIn: (r as any).cachedIn, ms: Date.now() - started, ok: true,
      });
      return { ok: true, json, model: r.model, tokensIn: r.tokensIn, tokensOut: r.tokensOut };
    } catch (e: any) {
      const error = String(e?.message ?? e).slice(0, 500);
      // A failed call is logged under the model it asked for when it named one (8 Oct: so a failed Gemini plan shows
      // as Gemini in the cost and latency reports, not as "anthropic").
      const failedModel = model && !model.startsWith("tic:") ? model.replace(/^ci:/, "") : provider;
      await ctx.runMutation(internal.handbooks.logAiCall, { ...trace, attempts, kind: logAs ?? kind, model: failedModel, input: user.slice(0, 2000), output: "", ms: Date.now() - started, ok: false, error });
      return { ok: false, error, model: failedModel };
    }
  },
});

// "Ask or object": Opus 5.5, guardrailed to the card's topic. Step 1 answers without web access (cheap): it answers from
// the card, turns away off-topic questions, or says NEEDS_WEB. Only then does step 2 run with web search (cached prefix,
// capped per person per day). Returns plain text plus the links it cited or checked.
const NEEDS_WEB = "NEEDS_WEB";
export const askWithSearch = internalAction({
  args: { system: v.string(), user: v.string(), searchKey: v.string(), trace: traceV },
  handler: async (ctx, { system, user, searchKey, trace }): Promise<{ ok: true; answer: string; sources: { url: string; title: string }[] } | { ok: false; error: string }> => {
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
      await ctx.runMutation(internal.handbooks.logAiCall, { ...trace, kind: "ask", model, input: user.slice(0, 2000), output: `${answer}\n[step ${step}; searches: ${searches}; sources: ${sources.map((x) => x.url).join(" ")}]`.slice(0, 20000), tokensIn, tokensOut, ms: Date.now() - started, ok: true });
      return { ok: true, answer, sources };
    } catch (e: any) {
      const error = String(e?.message ?? e).slice(0, 500);
      await ctx.runMutation(internal.handbooks.logAiCall, { ...trace, kind: "ask", model: OPUS, input: user.slice(0, 2000), output: "", ms: Date.now() - started, ok: false, error });
      return { ok: false, error };
    }
  },
});
