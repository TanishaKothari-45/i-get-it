"use node";
// Research before writing: one Claude call with web search (at most MAX_SEARCHES), for handbooks whose subject goes
// out of date (and for picks, to find more of the same kind). Its findings are short, one line each with a link, so
// the plan and every chapter get the same small block, never raw pages. Searching is never in the way: no key, a
// failed call or nothing found, and the handbook is written without it.
import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { postJson, extractJson } from "./ai";
import { RESEARCH_PROMPT, researchMessage, researchText } from "./prompts";

const MAX_SEARCHES = 3;
const RESEARCH_MAX_OUT = 1500;
const TIMEOUT_MS = 90_000;

// The findings as text for the prompts, or null when there are none (no key, a failed call, nothing found).
export const run = internalAction({
  args: { topic: v.string(), brief: v.optional(v.string()), chapters: v.optional(v.array(v.string())) },
  handler: async (ctx, { topic, brief, chapters }): Promise<string | null> => (await research(ctx, topic, { brief, chapters })) ?? null,
});

async function research(ctx: ActionCtx, topic: string, context: { brief?: string; chapters?: string[] }): Promise<string | undefined> {
  const input = researchMessage(topic, context);
  if (!process.env.ANTHROPIC_API_KEY) {
    await ctx.runMutation(internal.handbooks.logAiCall, { kind: "research", model: "none", input: input.slice(0, 2000), output: "", ms: 0, ok: false, error: "no Anthropic key: written without research" });
    return undefined;
  }
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
  const started = Date.now();
  try {
    const data = await postJson("Anthropic", "https://api.anthropic.com/v1/messages", { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, {
      model,
      max_tokens: RESEARCH_MAX_OUT,
      system: RESEARCH_PROMPT,
      messages: [{ role: "user", content: input }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: MAX_SEARCHES }],
    }, TIMEOUT_MS);
    // The answer arrives as text blocks between the searches and their results; only the text is the report.
    const text = (data.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text ?? "").join("");
    const searches = data.usage?.server_tool_use?.web_search_requests ?? 0;
    const found = researchText(extractJson(text));
    await ctx.runMutation(internal.handbooks.logAiCall, {
      kind: "research", model, input: input.slice(0, 2000), output: `[${searches} searches] ${text}`.slice(0, 20000),
      tokensIn: data.usage?.input_tokens, tokensOut: data.usage?.output_tokens, ms: Date.now() - started, ok: true,
    });
    return found;
  } catch (e: any) {
    await ctx.runMutation(internal.handbooks.logAiCall, { kind: "research", model, input: input.slice(0, 2000), output: "", ms: Date.now() - started, ok: false, error: `written without research: ${String(e?.message ?? e)}`.slice(0, 500) });
    return undefined;
  }
}
