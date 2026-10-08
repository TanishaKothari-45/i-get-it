import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, query, type MutationCtx } from "./_generated/server";
import { isOwner } from "./admin";

// What the app spends, per day, per provider and model, and per job inside a model (7 Oct, Prateek: "per day cost by
// all models, and in a model see what's costing"). Every call already goes through handbooks.logAiCall; it adds its
// estimated cost here, so /admin reads one small row per day, model and job instead of the full call log.
// Estimates in rupees at ₹84 a dollar, from list prices; a provider's bill is the truth.

const PER_M: Record<string, [number, number]> = {   // ₹ per million tokens, in / out
  opus: [420, 2100],
  fable: [420, 2100],     // not public: priced like Opus until known
  sonnet: [252, 1260],
  haiku: [84, 420],
  "deepseek-v4.1-flash": [25.2, 100.8],
  "gemini-3.8-flash": [63, 315],          // Google's list price ($0.75 / $3.75); Cheaper Inference sells it at about 35% off   // DeepSeek's list price at peak ($0.30 / $1.20); a reseller's bill may differ
};
const PER_CALL: Record<string, number> = {           // ₹ per successful call
  muse_image: 0.85,       // Runway, 1 credit
  gen4_image: 4.2,        // Runway, 5 credits
  gen4_image_turbo: 1.7,  // Runway, 2 credits
  supadata: 0,            // YouTube transcripts, free tier
};

export function providerOf(model: string) {
  const m = model.toLowerCase();
  if (m.startsWith("claude") || m === "anthropic") return "Anthropic";
  if (m.startsWith("gpt") || m.startsWith("o1") || m.startsWith("o3")) return "OpenAI";
  if (m.includes("gemini")) return "Google";
  if (m.startsWith("glm") || m.startsWith("ci:")) return "Cheaper Inference";
  if (m.startsWith("tic:") || m.includes("deepseek")) return "The Inference Company";
  if (m.includes("image") || m.startsWith("gen4") || m.startsWith("muse")) return "Runway";
  if (m.includes("supadata")) return "Supadata";
  return "Other";
}

export function inrOf(model: string, ok: boolean, tokensIn = 0, tokensOut = 0) {
  const m = model.toLowerCase() === "anthropic" ? "opus" : model.toLowerCase();
  for (const [k, [a, b]] of Object.entries(PER_M)) if (m.includes(k)) return (tokensIn * a + tokensOut * b) / 1e6;
  for (const [k, p] of Object.entries(PER_CALL)) if (m.includes(k)) return ok ? p : 0;
  return 0;
}

const IST = 5.5 * 60 * 60 * 1000;
const dayOf = (t: number) => new Date(t + IST).toISOString().slice(0, 10);

export async function addCost(ctx: MutationCtx, c: { model: string; kind: string; ok: boolean; tokensIn?: number; tokensOut?: number; at?: number }) {
  const day = dayOf(c.at ?? Date.now());
  const provider = providerOf(c.model);
  const row = await ctx.db.query("costDaily").withIndex("by_day_model_kind", (q) => q.eq("day", day).eq("model", c.model).eq("kind", c.kind)).unique();
  const inr = inrOf(c.model, c.ok, c.tokensIn, c.tokensOut);
  if (row) await ctx.db.patch(row._id, { calls: row.calls + 1, failed: row.failed + (c.ok ? 0 : 1), tokensIn: row.tokensIn + (c.tokensIn ?? 0), tokensOut: row.tokensOut + (c.tokensOut ?? 0), inr: row.inr + inr });
  else await ctx.db.insert("costDaily", { day, provider, model: c.model, kind: c.kind, calls: 1, failed: c.ok ? 0 : 1, tokensIn: c.tokensIn ?? 0, tokensOut: c.tokensOut ?? 0, inr });
}

// One-off: rebuild costDaily from the whole call log, a page at a time. Run: npx convex run --prod costs:backfill '{}'
export const page = internalQuery({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { cursor }) => {
    const r = await ctx.db.query("aiCalls").paginate({ cursor, numItems: 150 });
    return { rows: r.page.map((c) => ({ model: c.model, kind: c.kind, ok: c.ok, tokensIn: c.tokensIn, tokensOut: c.tokensOut, at: c.at })), cursor: r.continueCursor, done: r.isDone };
  },
});
export const clear = internalMutation({ args: {}, handler: async (ctx) => { for (const r of await ctx.db.query("costDaily").collect()) await ctx.db.delete(r._id); } });
export const addMany = internalMutation({
  args: { rows: v.array(v.object({ model: v.string(), kind: v.string(), ok: v.boolean(), tokensIn: v.optional(v.number()), tokensOut: v.optional(v.number()), at: v.number() })) },
  handler: async (ctx, { rows }) => { for (const r of rows) await addCost(ctx, r); },
});
export const backfill = internalAction({
  args: {},
  handler: async (ctx): Promise<{ calls: number }> => {
    await ctx.runMutation(internal.costs.clear, {});
    let cursor: string | null = null, calls = 0;
    for (;;) {
      const p: any = await ctx.runQuery(internal.costs.page, { cursor });
      if (p.rows.length) await ctx.runMutation(internal.costs.addMany, { rows: p.rows });
      calls += p.rows.length; cursor = p.cursor;
      if (p.done) break;
    }
    return { calls };
  },
});

// /admin: the last N days, newest first, each with providers, models and jobs. Owner only.
export const byDay = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days = 14 }) => {
    if (!(await isOwner(ctx)).ok) return null;
    const since = dayOf(Date.now() - (Math.min(60, Math.max(1, days)) - 1) * 24 * 60 * 60 * 1000);
    const rows = await ctx.db.query("costDaily").withIndex("by_day_model_kind", (q) => q.gte("day", since)).collect();
    const out = new Map<string, { day: string; inr: number; calls: number; models: Map<string, { model: string; provider: string; inr: number; calls: number; failed: number; tokensIn: number; tokensOut: number; kinds: { kind: string; inr: number; calls: number; failed: number; tokensIn: number; tokensOut: number }[] }> }>();
    for (const r of rows) {
      const d = out.get(r.day) ?? { day: r.day, inr: 0, calls: 0, models: new Map() };
      const m = d.models.get(r.model) ?? { model: r.model, provider: r.provider, inr: 0, calls: 0, failed: 0, tokensIn: 0, tokensOut: 0, kinds: [] };
      m.inr += r.inr; m.calls += r.calls; m.failed += r.failed; m.tokensIn += r.tokensIn; m.tokensOut += r.tokensOut;
      m.kinds.push({ kind: r.kind, inr: r.inr, calls: r.calls, failed: r.failed, tokensIn: r.tokensIn, tokensOut: r.tokensOut });
      d.inr += r.inr; d.calls += r.calls;
      d.models.set(r.model, m); out.set(r.day, d);
    }
    return [...out.values()].sort((a, b) => (a.day < b.day ? 1 : -1)).map((d) => ({
      day: d.day, inr: Math.round(d.inr), calls: d.calls,
      models: [...d.models.values()].sort((a, b) => b.inr - a.inr).map((m) => ({ ...m, inr: Math.round(m.inr * 10) / 10, kinds: m.kinds.sort((a, b) => b.inr - a.inr).map((k) => ({ ...k, inr: Math.round(k.inr * 10) / 10 })) })),
    }));
  },
});
