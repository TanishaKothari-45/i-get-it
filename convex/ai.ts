"use node";
// The AI call. Runs only here, in a Convex action. The key is read from the
// Convex environment, never from the interface.
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const PLAN_MAX_OUT = 3000;
const CHAPTER_MAX_OUT = 4500;
const SIMPLER_MAX_OUT = 600;
const DEEPER_MAX_OUT = 3500;

// How long one call may take before it's abandoned, per kind of call.
const TIMEOUT_MS = { plan: 90_000, chapter: 120_000, simpler: 30_000, deeper: 120_000 };
const MAX_OUT = { plan: PLAN_MAX_OUT, chapter: CHAPTER_MAX_OUT, simpler: SIMPLER_MAX_OUT, deeper: DEEPER_MAX_OUT };
// One retry, after a short wait (or the provider's Retry-After, capped).
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 2_000;
const MAX_RETRY_AFTER_MS = 20_000;

type Result = { ok: true; json: any; model: string } | { ok: false; error: string; model: string };
type Reply = { text: string; tokensIn?: number; tokensOut?: number; model: string };

// A failure worth one more try: a timeout, a dropped connection, a rate limit, the provider having a bad moment.
class RetryableError extends Error {
  retryAfterMs?: number;
  constructor(message: string, retryAfterMs?: number) { super(message); this.retryAfterMs = retryAfterMs; }
}

function retryAfterMs(res: Response): number | undefined {
  const seconds = Number(res.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, MAX_RETRY_AFTER_MS) : undefined;
}

async function postJson(label: string, url: string, headers: Record<string, string>, body: unknown, timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
  } catch (e: any) {
    throw new RetryableError(e?.name === "AbortError" ? `${label} timed out after ${timeoutMs / 1000}s` : `${label} unreachable: ${e?.message ?? e}`);
  } finally {
    clearTimeout(timer);
  }
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message ?? `${label} ${res.status}`;
    if (res.status === 408 || res.status === 429 || res.status >= 500) throw new RetryableError(message, retryAfterMs(res));
    throw new Error(message);
  }
  return data;
}

async function callOpenAI(system: string, user: string, maxOut: number, timeoutMs: number): Promise<Reply> {
  const model = process.env.OPENAI_MODEL ?? "gpt-6-luna";
  const data = await postJson("OpenAI", "https://api.openai.com/v1/responses", { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, {
    model,
    reasoning: { effort: "low" },
    max_output_tokens: maxOut,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    text: { format: { type: "json_object" } },
  }, timeoutMs);
  const text = (data.output ?? [])
    .filter((o: any) => o.type === "message")
    .flatMap((o: any) => o.content ?? [])
    .map((c: any) => c.text ?? "")
    .join("");
  return { text, tokensIn: data.usage?.input_tokens, tokensOut: data.usage?.output_tokens, model };
}

async function callAnthropic(system: string, user: string, maxOut: number, timeoutMs: number): Promise<Reply> {
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
  const data = await postJson("Anthropic", "https://api.anthropic.com/v1/messages", { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" }, {
    model,
    max_tokens: maxOut,
    system: system + "\n\nReturn only the JSON object. No prose, no code fences.",
    messages: [{ role: "user", content: user }],
  }, timeoutMs);
  const text = (data.content ?? []).map((c: any) => c.text ?? "").join("");
  return { text, tokensIn: data.usage?.input_tokens, tokensOut: data.usage?.output_tokens, model };
}

// A reply that isn't valid JSON is usually a one-off (cut short, or chatty); worth the one retry.
function extractJson(text: string): any {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new RetryableError("no JSON in model output");
  try { return JSON.parse(m[0]); } catch (e: any) { throw new RetryableError(`unreadable JSON in model output: ${e?.message ?? e}`); }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const generate = internalAction({
  args: { kind: v.union(v.literal("plan"), v.literal("chapter"), v.literal("simpler"), v.literal("deeper")), system: v.string(), user: v.string() },
  handler: async (ctx, { kind, system, user }): Promise<Result> => {
    const maxOut = MAX_OUT[kind];
    const provider = process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.OPENAI_API_KEY ? "openai" : null;
    const input = user.slice(0, 2000);
    if (!provider) {
      await ctx.runMutation(internal.handbooks.logAiCall, { kind, model: "none", input, output: "", ms: 0, ok: false, error: "no provider key set" });
      return { ok: false, error: "no provider key set", model: "none" };
    }
    for (let attempt = 1; ; attempt++) {
      const started = Date.now();
      try {
        const r = provider === "anthropic" ? await callAnthropic(system, user, maxOut, TIMEOUT_MS[kind]) : await callOpenAI(system, user, maxOut, TIMEOUT_MS[kind]);
        const json = extractJson(r.text);
        await ctx.runMutation(internal.handbooks.logAiCall, {
          kind, model: r.model, input, output: r.text.slice(0, 20000),
          tokensIn: r.tokensIn, tokensOut: r.tokensOut, ms: Date.now() - started, ok: true,
        });
        return { ok: true, json, model: r.model };
      } catch (e: any) {
        const retrying = e instanceof RetryableError && attempt < MAX_ATTEMPTS;
        const error = `${retrying ? `attempt ${attempt}, retrying: ` : ""}${String(e?.message ?? e)}`.slice(0, 500);
        await ctx.runMutation(internal.handbooks.logAiCall, { kind, model: provider, input, output: "", ms: Date.now() - started, ok: false, error });
        if (!retrying) return { ok: false, error, model: provider };
        await sleep(e.retryAfterMs ?? RETRY_DELAY_MS);
      }
    }
  },
});
