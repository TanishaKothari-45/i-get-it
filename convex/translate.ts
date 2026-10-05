"use node";
// Translation: English handbook text into the reader's language. Runs only here, in a Convex action;
// keys are read from the Convex environment. Indian languages go to Sarvam (sarvam-105b), with Gemini
// as the backup; every other language goes to Gemini.
import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { ENGLISH, languageInfo, type LanguageInfo } from "./languages";
import { translatePrompt } from "./prompts";

const voiceV = v.union(v.literal("friend"), v.literal("straight"), v.literal("stories"));
const MAX_RETRY_AFTER_MS = 20_000;

// A failure worth one more try: a timeout, a dropped connection, a rate limit, the provider having a bad moment.
class RetryableError extends Error {
  retryAfterMs?: number;
  constructor(message: string, retryAfterMs?: number) { super(message); this.retryAfterMs = retryAfterMs; }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function retryAfterMs(res: Response): number | undefined {
  const seconds = Number(res.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, MAX_RETRY_AFTER_MS) : undefined;
}

// One POST with a timeout. Timeouts, dropped connections, 408, 429 and 5xx are worth a retry; other errors aren't.
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

// A reply that isn't valid JSON is usually a one-off (cut short, or chatty); worth the one retry.
function extractJson(text: string): any {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new RetryableError("no JSON in model output");
  try { return JSON.parse(m[0]); } catch (e: any) { throw new RetryableError(`unreadable JSON in model output: ${e?.message ?? e}`); }
}

// English characters per call. Whole cards only, so a card is never split; small enough that the
// translated reply stays under Sarvam's 4,096-token cap on the Starter plan.
const BATCH_CHARS = 2_500;
const TIMEOUT_MS = 90_000;
const SARVAM_MAX_OUT = 4_096;
const GEMINI_MAX_OUT = 8_192;
// One retry on the same provider, then the backup provider (if there is one).
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 2_000;

type Provider = "sarvam" | "gemini";
type Reply = { text: string; tokensIn?: number; tokensOut?: number; model: string };
type Item = { id: string; card: number; text: string };
type Result = { ok: true; groups: string[][] } | { ok: false; error: string };

async function callSarvam(system: string, user: string): Promise<Reply> {
  const key = process.env.SARVAM_API_KEY!;
  const model = process.env.SARVAM_MODEL ?? "sarvam-105b";
  const data = await postJson("Sarvam", "https://api.sarvam.ai/v1/chat/completions", { "api-subscription-key": key, Authorization: `Bearer ${key}` }, {
    model,
    max_tokens: SARVAM_MAX_OUT,
    temperature: 0.2,
    reasoning_effort: null,   // thinking tokens would eat the reply cap and the credits
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  }, TIMEOUT_MS);
  return { text: data.choices?.[0]?.message?.content ?? "", tokensIn: data.usage?.prompt_tokens, tokensOut: data.usage?.completion_tokens, model };
}

async function callGemini(system: string, user: string): Promise<Reply> {
  const model = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
  const data = await postJson("Gemini", `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { "x-goog-api-key": process.env.GEMINI_API_KEY! }, {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: GEMINI_MAX_OUT, thinkingConfig: { thinkingLevel: "low" } },
  }, TIMEOUT_MS);
  const parts: any[] = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("");
  return { text, tokensIn: data.usageMetadata?.promptTokenCount, tokensOut: data.usageMetadata?.candidatesTokenCount, model };
}

const CALL: Record<Provider, (system: string, user: string) => Promise<Reply>> = { sarvam: callSarvam, gemini: callGemini };

// Who translates, in the order to try them. Only providers whose key is set.
function providersFor(info: LanguageInfo): Provider[] {
  const order: Provider[] = info.indian ? ["sarvam", "gemini"] : ["gemini"];
  return order.filter((p) => (p === "sarvam" ? !!process.env.SARVAM_API_KEY : !!process.env.GEMINI_API_KEY));
}

// Groups (one per card) packed into calls of up to BATCH_CHARS, in reading order.
function batches(groups: string[][]): Item[][] {
  const out: Item[][] = [];
  let current: Item[] = [];
  let size = 0;
  groups.forEach((group, card) => {
    const chars = group.reduce((sum, s) => sum + s.length, 0);
    if (current.length && size + chars > BATCH_CHARS) { out.push(current); current = []; size = 0; }
    current.push(...group.map((text, i) => ({ id: `${card}.${i}`, card, text })));
    size += chars;
  });
  if (current.length) out.push(current);
  return out;
}

// Every id back, each with text; anything less is worth one more try.
function readItems(json: any, items: Item[]): Map<string, string> {
  const got = new Map<string, string>();
  for (const it of Array.isArray(json?.items) ? json.items : []) {
    if (typeof it?.id === "string" && typeof it?.text === "string" && it.text.trim()) got.set(it.id, it.text);
  }
  const missing = items.filter((it) => !got.has(it.id)).length;
  if (missing) throw new RetryableError(`translation came back with ${missing} of ${items.length} items missing`);
  return got;
}

async function translateBatch(ctx: ActionCtx, kind: string, providers: Provider[], system: string, items: Item[]): Promise<Map<string, string>> {
  const user = JSON.stringify({ items });
  const input = user.slice(0, 2000);
  let lastError = "no provider";
  for (const provider of providers) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const started = Date.now();
      try {
        const r = await CALL[provider](system, user);
        const got = readItems(extractJson(r.text), items);
        await ctx.runMutation(internal.handbooks.logAiCall, { kind, model: r.model, input, output: r.text.slice(0, 20000), tokensIn: r.tokensIn, tokensOut: r.tokensOut, ms: Date.now() - started, ok: true });
        return got;
      } catch (e: any) {
        const retrying = e instanceof RetryableError && attempt < MAX_ATTEMPTS;
        lastError = `${provider}: ${String(e?.message ?? e)}`.slice(0, 500);
        await ctx.runMutation(internal.handbooks.logAiCall, { kind, model: provider, input, output: "", ms: Date.now() - started, ok: false, error: `${retrying ? `attempt ${attempt}, retrying: ` : ""}${lastError}` });
        if (!retrying) break;   // next provider, if any
        await sleep(e.retryAfterMs ?? RETRY_DELAY_MS);
      }
    }
  }
  throw new Error(lastError);
}

// Translate groups of strings (one group per card) and return them in the same shape.
export const groups = internalAction({
  args: { language: v.string(), voice: voiceV, kind: v.string(), groups: v.array(v.array(v.string())) },
  handler: async (ctx, { language, voice, kind, groups }): Promise<Result> => {
    const info = languageInfo(language);
    if (!info || language === ENGLISH) return { ok: false, error: `can't translate into ${language}` };
    const providers = providersFor(info);
    const label = `translate-${kind}`;
    if (!providers.length) {
      await ctx.runMutation(internal.handbooks.logAiCall, { kind: label, model: "none", input: language, output: "", ms: 0, ok: false, error: "no translation key set" });
      return { ok: false, error: "no translation key set" };
    }
    const system = translatePrompt(language, voice, info.indian);
    try {
      const done = await Promise.all(batches(groups).map((b) => translateBatch(ctx, label, providers, system, b)));
      const byId = new Map(done.flatMap((m) => [...m]));
      return { ok: true, groups: groups.map((g, card) => g.map((_, i) => byId.get(`${card}.${i}`)!)) };
    } catch (e: any) {
      return { ok: false, error: String(e?.message ?? e).slice(0, 500) };
    }
  },
});
