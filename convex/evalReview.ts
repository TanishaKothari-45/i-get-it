"use node";
// A neutral review by a second model family (9 Oct, feat/handbook-shape): the same brief and bundle a fresh Claude
// reviewer read, sent once to Gemini 3.1 Pro. Text in, text out; nothing is stored except the call log row.
// Run: npx convex run evalReview:review '{"brief":"...","bundle":"..."}'
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const REVIEWER = "gemini-3.1-pro-preview";

// Is each Gemini key working? One tiny call per key; only the key's name, the status and the error come back.
export const pingGemini = internalAction({
  args: { model: v.optional(v.string()) },
  handler: async (_ctx, { model = "gemini-3.8-flash" }) => {
    const out: any[] = [];
    for (const name of ["GEMINI_API_KEY", "GEMINI_API_KEY_BACKUP"]) {
      const key = process.env[name];
      if (!key) { out.push({ name, set: false }); continue; }
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", signal: AbortSignal.timeout(60000), headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Reply with the word ok." }] }], generationConfig: { maxOutputTokens: 200 } }),
      }).catch((e: any) => ({ ok: false, status: 0, json: async () => ({ error: { message: String(e?.message ?? e) } }) }) as any);
      const body: any = await res.json().catch(() => ({}));
      out.push({ name, set: true, status: res.status, ok: res.ok, error: res.ok ? null : String(body?.error?.message ?? JSON.stringify(body)).slice(0, 200), keyEnds: key.slice(-4) });
    }
    return out;
  },
});

// The Cheaper Inference marketplace (OpenAI-style API; base URL and key in Convex env, Prateek's credits): a third
// reviewer from another model family. Only ids and context lengths come back; the key never leaves Convex.
const marketBase = () => process.env.GLM_BASE_URL ?? "https://api.z.ai/api/paas/v4";
export const models = internalAction({
  args: {},
  handler: async () => {
    const key = process.env.CHEAPER_INFERENCE_API_KEY;
    if (!key) return { ok: false, error: "no CHEAPER_INFERENCE_API_KEY", models: [] };
    const res = await fetch(`${marketBase()}/models`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(30000) }).catch((e: any) => ({ ok: false, status: 0, json: async () => ({ error: String(e?.message ?? e) }) }) as any);
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: `${res.status}: ${JSON.stringify(body).slice(0, 300)}`, models: [] };
    const list: any[] = Array.isArray(body.data) ? body.data : Array.isArray(body) ? body : [];
    return { ok: true, error: null, models: list.map((m) => ({ id: String(m.id ?? m.name), context: m.context_length ?? m.context_window ?? m.max_context ?? null, owner: m.owned_by ?? null })) };
  },
});

// One review on a marketplace model: the brief as the system prompt, the bundle as the user message, text back.
export const reviewMarket = internalAction({
  args: { model: v.string(), brief: v.string(), bundle: v.string() },
  handler: async (ctx, { model, brief, bundle }) => {
    const key = process.env.CHEAPER_INFERENCE_API_KEY;
    if (!key) return { ok: false, error: "no CHEAPER_INFERENCE_API_KEY", text: "" };
    const started = Date.now();
    let text = "", error: string | null = null, tokensIn = 0, tokensOut = 0;
    const res = await fetch(`${marketBase()}/chat/completions`, {
      method: "POST", signal: AbortSignal.timeout(540000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 32000, messages: [{ role: "system", content: brief }, { role: "user", content: bundle }] }),
    }).catch((e: any) => ({ ok: false, status: 0, json: async () => ({ error: String(e?.message ?? e) }) }) as any);
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) error = `${res.status}: ${JSON.stringify(body).slice(0, 300)}`;
    else {
      const choice = body.choices?.[0];
      text = String(choice?.message?.content ?? "");
      tokensIn = body.usage?.prompt_tokens ?? 0; tokensOut = body.usage?.completion_tokens ?? 0;
      error = text ? null : `no text (finish: ${choice?.finish_reason ?? "unknown"})`;
      if (text && choice?.finish_reason === "length") text += "\n\n(The reply was cut off at the token limit.)";
    }
    const ms = Date.now() - started;
    await ctx.runMutation(internal.handbooks.logAiCall, { kind: "eval review", model: `ci:${model}`, input: bundle.slice(0, 4000), output: text.slice(0, 4000), tokensIn, tokensOut, ms, ok: !error, error: error ?? undefined });
    return { ok: !error, error, ms, tokensIn, tokensOut, text, model: body.model ?? model };
  },
});

export const review = internalAction({
  args: { brief: v.string(), bundle: v.string() },
  handler: async (ctx, { brief, bundle }) => {
    const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_BACKUP].filter(Boolean) as string[];
    if (!keys.length) return { ok: false, error: "no Gemini key set", text: "" };
    const started = Date.now();
    let text = "", error: string | null = null, tokensIn = 0, tokensOut = 0;
    const dead = new Set<number>();
    for (let i = 0; i < 3 * keys.length; i++) {
      if (dead.has(i % keys.length)) continue;
      const key = keys[i % keys.length];
      if (i && i % keys.length === 0) await new Promise((x) => setTimeout(x, 15000));
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${REVIEWER}:generateContent`, {
        method: "POST", signal: AbortSignal.timeout(480000),
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: brief }] }, contents: [{ role: "user", parts: [{ text: bundle }] }], generationConfig: { maxOutputTokens: 32000 } }),
      }).catch((e: any) => ({ ok: false, status: 0, json: async () => ({ error: String(e?.message ?? e) }) }) as any);
      const body: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        error = `Gemini ${res.status}: ${JSON.stringify(body).slice(0, 300)}`;
        // A key out of credit (402) is dropped; a busy model (503, 429) is tried again after a wait.
        if (res.status === 402 && dead.size + 1 < keys.length) { dead.add(i % keys.length); continue; }
        if (res.status === 503 || res.status === 429 || res.status === 0) continue;
        break;
      }
      const u = body.usageMetadata ?? {};
      tokensIn = u.promptTokenCount ?? 0; tokensOut = (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
      text = (body.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
      error = text ? null : `no text (finish: ${body.candidates?.[0]?.finishReason ?? "unknown"})`;
      break;
    }
    const ms = Date.now() - started;
    await ctx.runMutation(internal.handbooks.logAiCall, { kind: "eval review", model: REVIEWER, input: bundle.slice(0, 4000), output: text.slice(0, 4000), tokensIn, tokensOut, ms, ok: !error, error: error ?? undefined });
    return { ok: !error, error, ms, tokensIn, tokensOut, text };
  },
});
