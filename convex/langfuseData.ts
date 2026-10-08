// The database side of the Langfuse export (langfuse.ts runs in Node and can't read the database itself):
// where the last export stopped, the calls logged since, and when each handbook started.
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const KEY = "langfuse.exportedUntil";
// First run: start an hour back, rather than sending the whole history at once.
const FIRST_LOOKBACK = 60 * 60 * 1000;

export const cursor = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", KEY)).unique();
    return row ? Number(row.value) : Date.now() - FIRST_LOOKBACK;
  },
});

export const setCursor = internalMutation({
  args: { at: v.number() },
  handler: async (ctx, { at }) => {
    const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", KEY)).unique();
    if (row) await ctx.db.patch(row._id, { value: String(at), at: Date.now() });
    else await ctx.db.insert("settings", { key: KEY, value: String(at), at: Date.now() });
  },
});

// Calls logged after a time, oldest first. Prompt and reply text only when asked for (test deployments).
export const calls = internalQuery({
  args: { after: v.number(), limit: v.number(), withText: v.boolean() },
  handler: async (ctx, { after, limit, withText }) => {
    const rows = await ctx.db.query("aiCalls").withIndex("by_at", (q) => q.gt("at", after)).take(limit);
    return rows.map((c) => ({
      id: c._id as string, kind: c.kind, model: c.model, ms: c.ms, ok: c.ok, at: c.at, tokensIn: c.tokensIn ?? 0, tokensOut: c.tokensOut ?? 0,
      attempts: c.attempts ?? 1, error: c.error, handbookId: c.handbookId as string | undefined, chapter: c.chapter, cachedIn: c.cachedIn,
      ...(withText ? { input: c.input, output: c.output } : {}),
    }));
  },
});

// When each handbook started, what kind it is, and when its research started. No topics or reader text.
export const handbooks = internalQuery({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, { ids }) => {
    const out: { id: string; createdAt: number; kind: string; researchStartedAt?: number }[] = [];
    for (const id of ids) {
      const hid = ctx.db.normalizeId("handbooks", id);
      const h = hid ? await ctx.db.get(hid) : null;
      if (!h) continue;
      const kind = h.source === "cache" ? "ready topic" : (h as any).fromLibrary ? "shared copy" : "typed, written live";
      out.push({ id: h._id as string, createdAt: h.createdAt, kind, researchStartedAt: (h as any).researchStartedAt });
    }
    return out;
  },
});
