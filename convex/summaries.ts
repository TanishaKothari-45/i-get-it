// Small documents built from bigger tables (schema.ts, "summaries"), so a page everyone opens reads one row
// instead of a whole table. Never the source of truth: each is rebuilt from the tables it summarises.
import type { MutationCtx, QueryCtx } from "./_generated/server";

export type SummaryName = "landing" | "stats";

export async function readSummary(ctx: QueryCtx, name: SummaryName): Promise<{ data: any; at: number } | null> {
  const row = await ctx.db.query("summaries").withIndex("by_name", (q) => q.eq("name", name)).unique();
  return row ? { data: row.data, at: row.at } : null;
}

export async function saveSummary(ctx: MutationCtx, name: SummaryName, data: unknown) {
  const row = await ctx.db.query("summaries").withIndex("by_name", (q) => q.eq("name", name)).unique();
  if (row) await ctx.db.patch(row._id, { data, at: Date.now() });
  else await ctx.db.insert("summaries", { name, data, at: Date.now() });
}
