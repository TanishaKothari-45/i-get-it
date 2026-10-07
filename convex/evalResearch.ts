"use node";
import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { PROMPT } from "./research";

// Research comparison (8 Oct, Prateek): the same research prompt and request, run by Claude Sonnet 5.5 with Anthropic's
// web search (what the app uses) and by Gemini models with Google Search grounding, direct from Google (GEMINI_API_KEY).
// Measurement only: nothing is stored on a handbook. Run: npx convex run --prod evalResearch:compare '{...}'

const ask = (topic: string, level: string) => `Typed: "${topic}"\nLevel: ${level}\nToday: ${new Date().toISOString().slice(0, 10)}`;
const parse = (text: string) => { const m = text.match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch { return null; } };

async function claude(topic: string, level: string) {
  const started = Date.now();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const messages: any[] = [{ role: "user", content: ask(topic, level) }];
  let res: any, searches = 0, tokensIn = 0, tokensOut = 0;
  for (let i = 0; i < 3; i++) {
    res = await client.beta.messages.create({ model: "claude-sonnet-5-5", max_tokens: 4000, system: PROMPT, messages,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4 } as any], output_config: { effort: "low" } as any } as any);
    searches += res.usage?.server_tool_use?.web_search_requests ?? 0;
    tokensIn += res.usage?.input_tokens ?? 0; tokensOut += res.usage?.output_tokens ?? 0;
    if (res.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: res.content });
  }
  const text = (res?.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  const queries = (res?.content ?? []).filter((b: any) => b.type === "server_tool_use").map((b: any) => String(b.input?.query ?? ""));
  // $2 / $10 per million tokens, $10 per 1,000 searches; ₹84 a dollar.
  const usd = (tokensIn * 2 + tokensOut * 10) / 1e6 + searches * 0.01;
  return { model: "claude-sonnet-5-5 (Anthropic web search)", ms: Date.now() - started, tokensIn, tokensOut, searches, queries, inr: Math.round(usd * 84 * 100) / 100, brief: parse(text), raw: parse(text) ? undefined : text.slice(0, 1500) };
}

// Google's list prices per million tokens (in, out); grounded prompts carry a separate Google Search fee, not counted here.
const GEMINI_PRICE: Record<string, [number, number]> = { "gemini-3.1-pro": [2, 12], "gemini-3.8-flash": [0.75, 3.75] };

async function gemini(model: string, topic: string, level: string) {
  const started = Date.now();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: PROMPT }] },
      contents: [{ role: "user", parts: [{ text: ask(topic, level) }] }],
      tools: [{ google_search: {} }],
      generationConfig: { maxOutputTokens: 8000 },
    }),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) return { model: `${model} (Google Search)`, ms: Date.now() - started, error: `${res.status}: ${JSON.stringify(body).slice(0, 300)}` };
  const cand = body.candidates?.[0];
  const text = (cand?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
  const meta = cand?.groundingMetadata ?? {};
  const u = body.usageMetadata ?? {};
  const tokensIn = u.promptTokenCount ?? 0, tokensOut = (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
  const key = Object.keys(GEMINI_PRICE).find((k) => model.startsWith(k));
  const [a, b] = key ? GEMINI_PRICE[key] : [0, 0];
  return {
    model: `${model} (Google Search)`, ms: Date.now() - started, tokensIn, tokensOut,
    searches: (meta.webSearchQueries ?? []).length, queries: meta.webSearchQueries ?? [],
    grounded: (meta.groundingChunks ?? []).map((c: any) => ({ title: c.web?.title ?? "", url: c.web?.uri ?? "" })).slice(0, 10),
    inr: Math.round(((tokensIn * a + tokensOut * b) / 1e6) * 84 * 100) / 100, searchFeeNotCounted: true,
    brief: parse(text), raw: parse(text) ? undefined : text.slice(0, 1500), finish: cand?.finishReason,
  };
}

export const geminiModels = internalAction({
  args: {},
  handler: async () => {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" } });
    const body: any = await res.json().catch(() => ({}));
    return (body.models ?? []).map((m: any) => String(m.name).replace("models/", "")).filter((n: string) => /gemini-3/.test(n));
  },
});

export const compare = internalAction({
  args: { topic: v.string(), level: v.optional(v.string()), gemini: v.array(v.string()), skipClaude: v.optional(v.boolean()) },
  handler: async (_ctx, { topic, level = "new", gemini: models, skipClaude }) => {
    // Gemini answers 503 ("high demand") at busy times: try a model up to 3 times, 20 s apart.
    const retry = async (m: string) => {
      let r: any;
      for (let i = 0; i < 3; i++) { r = await gemini(m, topic, level); if (!String(r.error ?? "").startsWith("503")) break; await new Promise((x) => setTimeout(x, 20000)); }
      return r;
    };
    const runs = await Promise.all([
      ...(skipClaude ? [] : [claude(topic, level).catch((e: any) => ({ model: "claude-sonnet-5-5", error: String(e?.message ?? e).slice(0, 300) }))]),
      ...models.map((m) => retry(m).catch((e: any) => ({ model: m, error: String(e?.message ?? e).slice(0, 300) }))),
    ]);
    return { topic, level, at: Date.now(), runs };
  },
});
