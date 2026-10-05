import { v } from "convex/values";
import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { getAuthUserId } from "@convex-dev/auth/server";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";

// The public /stats page: counts only, never an email, a topic or a name.

const limiter = new RateLimiter(components.rateLimiter, {
  visitsAll: { kind: "fixed window", rate: 3000, period: HOUR },   // a made-up token per call can't flood the count past this
});

const IST_MS = 5.5 * HOUR;
const dayOf = (t: number) => new Date(t + IST_MS).toISOString().slice(0, 10);

function cleanSource(s?: string) {
  const x = (s ?? "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0].replace(/[^a-z0-9.-]/g, "").slice(0, 40);
  return x || undefined;
}

export const recordVisit = mutation({
  args: { visitor: v.string(), source: v.optional(v.string()) },
  handler: async (ctx, { visitor, source }) => {
    if (visitor.length < 8 || visitor.length > 64) return;
    const now = Date.now();
    const day = dayOf(now);
    const seen = await ctx.db.query("visits").withIndex("by_visitor_day", (q) => q.eq("visitor", visitor).eq("day", day)).first();
    if (seen) return;
    if (!(await limiter.limit(ctx, "visitsAll")).ok) return;
    await ctx.db.insert("visits", { visitor, day, source: cleanSource(source), at: now });
  },
});

// "This is my phone": stops counting this phone, and the signed-in account if there is one.
export const excludeMe = mutation({
  args: { deviceToken: v.string() },
  handler: async (ctx, { deviceToken }) => {
    if (deviceToken.length < 8 || deviceToken.length > 64) return;
    const userId = await getAuthUserId(ctx);
    await ctx.db.insert("statsExcluded", { deviceToken, userId: userId ?? undefined, at: Date.now() });
  },
});

export const summary = query({
  args: { deviceToken: v.optional(v.string()) },
  handler: async (ctx, { deviceToken }) => {
    const excluded = await ctx.db.query("statsExcluded").collect();
    const xTokens = new Set(excluded.map((e) => e.deviceToken).filter(Boolean) as string[]);
    const xUsers = new Set(excluded.map((e) => e.userId).filter(Boolean).map(String));

    const handbooks = (await ctx.db.query("handbooks").collect()).filter((h) =>
      !(h.ownerToken && xTokens.has(h.ownerToken)) && !(h.userId && xUsers.has(String(h.userId))) && !h.ownerToken?.startsWith("abuse-"));
    // A signed-in person's phone token is theirs too: drop its visits when the account is excluded.
    for (const h of await ctx.db.query("handbooks").collect()) if (h.userId && xUsers.has(String(h.userId)) && h.ownerToken) xTokens.add(h.ownerToken);

    const visits = (await ctx.db.query("visits").collect()).filter((x) => !xTokens.has(x.visitor));
    const today = dayOf(Date.now());
    const days: { day: string; visitors: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = dayOf(Date.now() - i * 24 * HOUR);
      days.push({ day: d, visitors: visits.filter((x) => x.day === d).length });
    }
    const sources: Record<string, number> = {};
    for (const x of visits) { const k = x.source ?? "direct"; sources[k] = (sources[k] ?? 0) + 1; }

    const ownerOf = (h: { userId?: unknown; ownerToken?: string }) => (h.userId ? `u:${h.userId}` : `d:${h.ownerToken}`);
    const started = new Set(handbooks.map(ownerOf));
    const passed = new Set<string>();
    for (const h of handbooks) {
      const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
      if (p?.chaptersPassed.includes(1)) passed.add(ownerOf(h));
    }

    const users = (await ctx.db.query("users").collect()).filter((u) => !xUsers.has(String(u._id)));
    const intents = (await ctx.db.query("priceIntents").collect()).filter((i) =>
      !(i.userId && xUsers.has(String(i.userId))) && !(i.deviceToken && xTokens.has(i.deviceToken)));
    const payers = new Set(intents.map((i) => (i.userId ? `u:${i.userId}` : `d:${i.deviceToken ?? i._id}`)));

    return {
      visitorsToday: visits.filter((x) => x.day === today).length,
      visitorsAll: new Set(visits.map((x) => x.visitor)).size,
      days,
      sources: Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, n]) => ({ name, n })),
      started: started.size,
      passedChapter1: passed.size,
      signups: users.length,
      signupsToday: users.filter((u) => dayOf(u._creationTime) === today).length,
      saidTheydPay: payers.size,
      thisPhoneExcluded: !!deviceToken && xTokens.has(deviceToken),
      at: Date.now(),
    };
  },
});
