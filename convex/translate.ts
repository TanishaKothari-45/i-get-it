"use node";
// Translation: English handbook text into the reader's language. Runs only here, in a Convex action;
// keys are read from the Convex environment. Indian languages go to Sarvam (sarvam-105b), with Gemini
// as the backup; every other language goes to Gemini.
import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { RetryableError, extractJson, postJson, sleep } from "./ai";
import { ENGLISH, languageInfo, type LanguageInfo } from "./languages";
import { translatePrompt } from "./prompts";
import { voice as voiceV } from "./schema";

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
