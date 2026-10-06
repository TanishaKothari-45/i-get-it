import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { isOwner } from "./admin";

// The AI provider switch on /admin (6 Oct). "claude" is the default and the way back; "inference" sends plans, chapters,
// checks, rewrites, teach-backs and picture scenes to The Inference Company (deepseek-v4-pro). Ask or object stays on Claude
// (its web search is Claude's). Only the owner can read or flip it, checked here on the server.
const PROVIDERS = ["claude", "inference"] as const;

export const provider = internalQuery({
  args: {},
  handler: async (ctx): Promise<"claude" | "inference"> => {
    const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "provider")).unique();
    return row?.value === "inference" ? "inference" : "claude";
  },
});

export const providerStatus = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isOwner(ctx)).ok) return null;
    const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "provider")).unique();
    return { provider: row?.value === "inference" ? "inference" : "claude", since: row?.at ?? null, inferenceKeySet: !!process.env.INFERENCE_API_KEY };
  },
});

export const setProvider = mutation({
  args: { provider: v.union(v.literal("claude"), v.literal("inference")) },
  handler: async (ctx, { provider }) => {
    if (!(await isOwner(ctx)).ok) throw new Error("Owner only");
    if (provider === "inference" && !process.env.INFERENCE_API_KEY) throw new Error("Set INFERENCE_API_KEY first");
    if (!PROVIDERS.includes(provider)) throw new Error("Unknown provider");
    const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "provider")).unique();
    if (row) await ctx.db.patch(row._id, { value: provider, at: Date.now() });
    else await ctx.db.insert("settings", { key: "provider", value: provider, at: Date.now() });
  },
});
