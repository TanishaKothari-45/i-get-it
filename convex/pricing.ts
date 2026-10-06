import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { standing } from "./payments";

// The loyalty ladder. One place to change the numbers.
// Price starts at START, falls by the same percentage every month you stay, and reaches half by month 13,
// where it stays. A real cancel restarts you at month 1. A pause (up to MAX_PAUSE_MONTHS) keeps your rung.
export const START = 499;            // rupees, month 1
export const FLOOR_SHARE = 0.5;      // reached at month 13
export const MONTHS_TO_FLOOR = 12;
export const MAX_PAUSE_MONTHS = 2;
export const FREE_DAYS = 7;          // week 1 is free; no payment details asked

// Month 1 is index 0.
export function priceForMonth(index: number): number {
  const k = Math.max(0, Math.min(index, MONTHS_TO_FLOOR));
  return Math.round(START * Math.pow(FLOOR_SHARE, k / MONTHS_TO_FLOOR));
}

export function ladder(): { month: number; price: number }[] {
  return Array.from({ length: MONTHS_TO_FLOOR + 1 }, (_, k) => ({ month: k + 1, price: priceForMonth(k) }));
}

// For when payments land: the state machine, written now so the rules are fixed in code, not in copy.
export type SubState = { status: "none" | "active" | "paused" | "cancelled"; monthIndex: number; pausedMonths: number };
export function onRenew(s: SubState): SubState { return s.status === "active" ? { ...s, monthIndex: s.monthIndex + 1 } : s; }
export function onPause(s: SubState): SubState { return s.status === "active" ? { ...s, status: "paused", pausedMonths: 0 } : s; }
export function onPauseMonthPassed(s: SubState): SubState {
  if (s.status !== "paused") return s;
  const pausedMonths = s.pausedMonths + 1;
  return pausedMonths > MAX_PAUSE_MONTHS ? { status: "cancelled", monthIndex: 0, pausedMonths: 0 } : { ...s, pausedMonths };
}
export function onResume(s: SubState): SubState { return s.status === "paused" ? { ...s, status: "active" } : s; }
export function onCancel(_s: SubState): SubState { return { status: "cancelled", monthIndex: 0, pausedMonths: 0 }; }
export function onSubscribe(s: SubState): SubState { return { status: "active", monthIndex: s.status === "paused" ? s.monthIndex : 0, pausedMonths: 0 }; }

export const plans = query({
  args: { deviceToken: v.optional(v.string()) },
  handler: async (ctx, { deviceToken }) => {
    const userId = await getAuthUserId(ctx);
    let intent = null;
    if (userId) intent = await ctx.db.query("priceIntents").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (!intent && deviceToken) intent = await ctx.db.query("priceIntents").withIndex("by_device", (q) => q.eq("deviceToken", deviceToken)).first();
    return {
      ladder: ladder(),
      start: START,
      floor: priceForMonth(MONTHS_TO_FLOOR),
      freeDays: FREE_DAYS,
      maxPauseMonths: MAX_PAUSE_MONTHS,
      yearOne: ladder().slice(0, 12).reduce((a, r) => a + r.price, 0),
      locked: intent ? { price: intent.price, at: intent.at } : null,
      signedIn: !!userId,
      pay: await standing(ctx, userId),
    };
  },
});

// "Pay" tapped. No payment is taken and no card is asked: payments are not live. This records the tap
// (shown on /stats as "Tapped Pay"). Once Razorpay keys are set, payments.ts takes over.
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
    await ctx.db.insert("priceIntents", { userId: userId ?? undefined, deviceToken, handbookId: mine ? handbookId : undefined, price: priceForMonth(0), at: Date.now() });
    return { price: priceForMonth(0), already: false };
  },
});
