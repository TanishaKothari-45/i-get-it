import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { standing } from "./payments";

// Early-bird tiers (Prateek, 7 Oct; replaces the falling monthly ladder). One place to change the numbers.
// The tier is set by how many people have paid so far: the first 50 paying customers get tier 1, the next 100
// tier 2, and so on. A person keeps the tier they first paid at for as long as they keep paying (a gap of up to
// GRACE_DAYS after their paid days run out is fine); someone who stops for longer comes back at the current tier.
// Every payment is one-time: a month covers 30 days, a year 365, and nothing renews by itself.
export const TIERS: { size: number | null; month: number; year: number }[] = [
  { size: 50, month: 199, year: 1999 },
  { size: 100, month: 299, year: 2999 },
  { size: 200, month: 399, year: 3999 },
  { size: null, month: 499, year: 4999 },   // the last tier has no limit
];
export const FREE_DAYS = 7;          // week 1 is free; no payment details asked
export const GRACE_DAYS = 7;
export const DAYS = { month: 30, year: 365 } as const;
export type Plan = keyof typeof DAYS;

// Which tier (0-based) is open when `customers` people have already paid.
export function tierFor(customers: number): number {
  let start = 0;
  for (let i = 0; i < TIERS.length; i++) {
    const size = TIERS[i].size;
    if (size === null || customers < start + size) return i;
    start += size;
  }
  return TIERS.length - 1;
}

// The tiers as the pricing screens show them, with the true number of spots left in each.
export function tierTable(customers: number) {
  let start = 0;
  return TIERS.map((t, i) => {
    const taken = Math.max(0, Math.min(customers - start, t.size ?? Infinity));
    const row = { tier: i + 1, month: t.month, year: t.year, size: t.size, left: t.size === null ? null : t.size - taken, open: tierFor(customers) === i };
    start += t.size ?? 0;
    return row;
  });
}

export const plans = query({
  args: { deviceToken: v.optional(v.string()) },
  handler: async (ctx, { deviceToken }) => {
    const userId = await getAuthUserId(ctx);
    let intent = null;
    if (userId) intent = await ctx.db.query("priceIntents").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (!intent && deviceToken) intent = await ctx.db.query("priceIntents").withIndex("by_device", (q) => q.eq("deviceToken", deviceToken)).first();
    const pay = await standing(ctx, userId);
    return {
      tiers: tierTable(pay.customers),
      freeDays: FREE_DAYS,
      days: DAYS,
      locked: intent ? { price: intent.price, at: intent.at } : null,
      signedIn: !!userId,
      pay,
    };
  },
});

// "Pay" tapped while payments are off (no Razorpay keys). No payment is taken and no card is asked: this records
// the tap (shown on /stats as "Tapped Pay"). With Razorpay keys set, payments.ts takes over.
export const lockPrice = mutation({
  args: { deviceToken: v.optional(v.string()), handbookId: v.optional(v.id("handbooks")) },
  handler: async (ctx, { deviceToken, handbookId }) => {
    const userId = await getAuthUserId(ctx);
    if (deviceToken && (deviceToken.length < 8 || deviceToken.length > 64)) throw new Error("Bad device");
    if (!userId && !deviceToken) throw new Error("No device");
    const existing = userId
      ? await ctx.db.query("priceIntents").withIndex("by_user", (q) => q.eq("userId", userId)).first()
      : await ctx.db.query("priceIntents").withIndex("by_device", (q) => q.eq("deviceToken", deviceToken!)).first();
    if (existing) return { price: existing.price, already: true };
    // Keep the handbook link only if it is the caller's own.
    const h = handbookId ? await ctx.db.get(handbookId) : null;
    const mine = h && ((userId && h.userId === userId) || (deviceToken && h.ownerToken === deviceToken));
    const price = TIERS[tierFor((await standing(ctx, userId)).customers)].month;
    await ctx.db.insert("priceIntents", { userId: userId ?? undefined, deviceToken, handbookId: mine ? handbookId : undefined, price, at: Date.now() });
    return { price, already: false };
  },
});
