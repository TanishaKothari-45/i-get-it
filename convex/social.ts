import { v } from "convex/values";
import { internalMutation, type QueryCtx } from "./_generated/server";

// Our own Instagram and X numbers per day, for the public /stats page (8 Oct). Written only from the command line
// (npx convex run --prod social:record '{...}') or, later, by the API job; never from the site.

const metric = v.optional(v.number());
export const SOCIAL_FIELDS = {
  posts: metric, views: metric, reach: metric, likes: metric, comments: metric, shares: metric,
  saves: metric, follows: metric, profileVisits: metric, linkClicks: metric,
};

export const record = internalMutation({
  args: { day: v.string(), platform: v.union(v.literal("instagram"), v.literal("x")), via: v.optional(v.union(v.literal("typed"), v.literal("api"))), ...SOCIAL_FIELDS },
  handler: async (ctx, { day, platform, via, ...m }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("day must be YYYY-MM-DD");
    const row = { day, platform, via: via ?? "typed", at: Date.now(), ...m };
    const old = await ctx.db.query("socialDaily").withIndex("by_platform_and_day", (q) => q.eq("platform", platform).eq("day", day)).unique();
    if (old) await ctx.db.replace(old._id, row);
    else await ctx.db.insert("socialDaily", row);
  },
});

// The last 14 days for both platforms, oldest first, for stats.summary
export async function recentSocial(ctx: QueryCtx) {
  const out = [];
  for (const platform of ["instagram", "x"] as const) {
    const rows = await ctx.db.query("socialDaily").withIndex("by_platform_and_day", (q) => q.eq("platform", platform)).order("desc").take(14);
    out.push(...rows.reverse().map(({ _id, _creationTime, ...r }) => r));
  }
  return out;
}
