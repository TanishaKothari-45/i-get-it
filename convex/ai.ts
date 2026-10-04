"use node";
// The AI call. Runs only here, in a Convex action. The key is read from the
// Convex environment, never from the interface.
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const PLAN_MAX_OUT = 3000;
const CHAPTER_MAX_OUT = 6000;
const SIMPLER_MAX_OUT = 600;

type Result = { ok: true; json: any; model: string } | { ok: false; error: string; model: string };

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

async function callAnthropic(system: string, user: string, maxOut: number, modelOverride?: string): Promise<{ text: string; tokensIn?: number; tokensOut?: number; model: string }> {
  const model = modelOverride ?? process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: maxOut,
      system: system + "\n\nReturn only the JSON object. No prose, no code fences.",
      messages: [{ role: "user", content: user }],
    }),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `Anthropic ${res.status}`);
  const text = (data.content ?? []).map((c: any) => c.text ?? "").join("");
  return { text, tokensIn: data.usage?.input_tokens, tokensOut: data.usage?.output_tokens, model };
}

function extractJson(text: string): any {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no JSON in model output");
  return JSON.parse(m[0]);
}

export const generate = internalAction({
  args: { kind: v.union(v.literal("plan"), v.literal("chapter"), v.literal("simpler")), system: v.string(), user: v.string(), model: v.optional(v.string()) },
  handler: async (ctx, { kind, system, user, model }): Promise<Result> => {
    const started = Date.now();
    const maxOut = kind === "plan" ? PLAN_MAX_OUT : kind === "simpler" ? SIMPLER_MAX_OUT : CHAPTER_MAX_OUT;
    const provider = process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.OPENAI_API_KEY ? "openai" : null;
    if (!provider) {
      await ctx.runMutation(internal.handbooks.logAiCall, { kind, model: "none", input: user.slice(0, 2000), output: "", ms: 0, ok: false, error: "no provider key set" });
      return { ok: false, error: "no provider key set", model: "none" };
    }
    try {
      const r = provider === "anthropic" ? await callAnthropic(system, user, maxOut, model) : await callOpenAI(system, user, maxOut);
      const json = extractJson(r.text);
      await ctx.runMutation(internal.handbooks.logAiCall, {
        kind, model: r.model, input: user.slice(0, 2000), output: r.text.slice(0, 20000),
        tokensIn: r.tokensIn, tokensOut: r.tokensOut, ms: Date.now() - started, ok: true,
      });
      return { ok: true, json, model: r.model };
    } catch (e: any) {
      const error = String(e?.message ?? e).slice(0, 500);
      await ctx.runMutation(internal.handbooks.logAiCall, { kind, model: provider, input: user.slice(0, 2000), output: "", ms: Date.now() - started, ok: false, error });
      return { ok: false, error, model: provider };
    }
  },
});
