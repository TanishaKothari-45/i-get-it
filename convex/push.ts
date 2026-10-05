import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, internalQuery, mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// Nudges, the stored half: which devices said yes, and what each one would be nudged about.
// Sending lives in pushSend.ts (it needs Node for the web-push library).

const CHAPTERS = 7;
const DEFAULT_NUDGE_AT = "21:00";
const MAX_FIELD = 1024;

// The public half of the VAPID key pair. Safe to hand to every browser; the private half never leaves Convex.
export const publicKey = query({
  args: {},
  handler: async () => process.env.VAPID_PUBLIC_KEY ?? null,
});

// A device said yes. Saved once per browser address; saying yes again just refreshes it.
export const subscribe = mutation({
  args: { deviceToken: v.string(), endpoint: v.string(), p256dh: v.string(), auth: v.string(), timezone: v.string() },
  handler: async (ctx, { deviceToken, endpoint, p256dh, auth, timezone }) => {
    if (!endpoint.startsWith("https://") || [endpoint, p256dh, auth, timezone].some((s) => s.length > MAX_FIELD)) throw new Error("Bad subscription");
    const userId = (await getAuthUserId(ctx)) ?? undefined;
    const existing = await ctx.db.query("pushSubscriptions").withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint)).unique();
    const fields = { p256dh, auth, deviceToken, userId, timezone, stoppedAt: undefined, stoppedReason: undefined };
    if (existing) await ctx.db.patch(existing._id, fields);
    else await ctx.db.insert("pushSubscriptions", { endpoint, ...fields, createdAt: Date.now() });
  },
});

// They turned nudges off. Kept as stopped, not deleted, so we can see who turned them off and when.
export const unsubscribe = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const existing = await ctx.db.query("pushSubscriptions").withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint)).unique();
    if (existing && !existing.stoppedAt) await ctx.db.patch(existing._id, { stoppedAt: Date.now(), stoppedReason: "turned off" });
  },
});

type Target = { handbookId: string; topic: string; chapter: number; nudgeAt: string; lastStudiedAt: number };

// The handbook a device would be nudged about: the one studied most recently that isn't finished.
async function activeHandbook(ctx: QueryCtx, sub: Doc<"pushSubscriptions">): Promise<Target | null> {
  const byDevice = await ctx.db.query("handbooks").withIndex("by_token", (q) => q.eq("ownerToken", sub.deviceToken)).collect();
  const byUser = sub.userId ? await ctx.db.query("handbooks").withIndex("by_user", (q) => q.eq("userId", sub.userId)).collect() : [];
  let best: Target | null = null;
  for (const h of [...byDevice, ...byUser]) {
    if (h.status !== "ready" || !h.bookId) continue;
    const progress = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
    if (!progress || progress.chaptersPassed.length >= CHAPTERS) continue;
    if (best && progress.updatedAt <= best.lastStudiedAt) continue;
    const book = await ctx.db.get(h.bookId);
    best = {
      handbookId: h._id, topic: book?.plan?.topic ?? h.topic, chapter: progress.currentChapter,
      nudgeAt: progress.tomorrowAt ?? DEFAULT_NUDGE_AT, lastStudiedAt: progress.updatedAt,
    };
  }
  return best;
}

// Every subscribed device with what it would be nudged about. Devices with nothing in progress are left out.
export const candidates = internalQuery({
  args: {},
  handler: async (ctx) => {
    const subs = (await ctx.db.query("pushSubscriptions").collect()).filter((s) => !s.stoppedAt);
    const out = [];
    for (const sub of subs) {
      const target = await activeHandbook(ctx, sub);
      if (!target) continue;
      out.push({ subId: sub._id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, timezone: sub.timezone, lastSentDay: sub.lastSentDay ?? null, ...target });
    }
    return out;
  },
});

// Every device still taking nudges (stopped ones are left out).
export const allSubscriptions = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query("pushSubscriptions").collect()).filter((s) => !s.stoppedAt),
});

export const markSent = internalMutation({
  args: { subId: v.id("pushSubscriptions"), day: v.string() },
  handler: async (ctx, { subId, day }) => {
    if (await ctx.db.get(subId)) await ctx.db.patch(subId, { lastSentDay: day });
  },
});

// The browser said this address is gone for good (uninstalled, blocked, expired). Kept as stopped,
// with the reason, so we can see when and why nudges ended; no more sends go to it.
export const markStopped = internalMutation({
  args: { subId: v.id("pushSubscriptions"), reason: v.string() },
  handler: async (ctx, { subId, reason }) => {
    const sub = await ctx.db.get(subId);
    if (sub && !sub.stoppedAt) await ctx.db.patch(subId, { stoppedAt: Date.now(), stoppedReason: reason });
  },
});
