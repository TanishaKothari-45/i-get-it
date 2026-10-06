// Pictures for a chapter's teaching cards: the database half (the drawing is images.ts). A reader's chapter is drawn
// one picture per action, in lanes; a ready topic's chapter is drawn by hand and shared with every copy of it.
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { level, pictureV } from "./schema";
import { limiter } from "./handbooks";

export const takePictureBudget = internalMutation({
  args: { count: v.number() },
  handler: async (ctx, { count }) => (await limiter.limit(ctx, "picturesAll", { count })).ok,
});

export const setPictures = internalMutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), status: v.string(), pictures: v.optional(v.array(pictureV)) },
  handler: async (ctx, { handbookId, n, status, pictures }) => {
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    if (ch) await ctx.db.patch(ch._id, { picturesStatus: status, ...(pictures ? { pictures } : {}) });
  },
});

// Pictures still drawing after this long are given up on: the ones drawn stay, the rest are marked failed.
const PICTURES_TIMEOUT_MS = 30 * 60 * 1000;
type PictureRow = { card: number; scene: string; storageId?: Id<"_storage">; failed?: boolean };
const pictureDone = (p: PictureRow) => !!p.storageId || !!p.failed;
const picturesStatusOf = (pictures: PictureRow[]) => (pictures.some((p) => p.storageId) ? "done" : "failed");

// The scenes are known: store them (no drawings yet), start one lane per AT_ONCE, and watch the lot.
export const startPictures = internalMutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), pictures: v.array(v.object({ card: v.number(), scene: v.string() })), lanes: v.number() },
  handler: async (ctx, { handbookId, n, pictures, lanes }) => {
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    if (!ch) return;
    await ctx.db.patch(ch._id, { picturesStatus: "drawing", pictures });
    for (let k = 0; k < Math.min(lanes, pictures.length); k++) {
      await ctx.scheduler.runAfter(0, internal.images.drawLane, { handbookId, n, k, card: pictures[k].card, scene: pictures[k].scene });
    }
    await ctx.scheduler.runAfter(PICTURES_TIMEOUT_MS, internal.pictures.expirePictures, { handbookId, n });
  },
});

// One picture drawn (or not): store it, hand the lane its next picture, and say "done" once every one is settled.
export const setPicture = internalMutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), k: v.number(), card: v.number(), scene: v.string(), storageId: v.optional(v.id("_storage")), lanes: v.number() },
  handler: async (ctx, { handbookId, n, k, card, scene, storageId, lanes }) => {
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    const pictures: PictureRow[] = ch?.pictures ?? [];
    // The chapter was rewritten while this one was drawing: it's not this chapter's picture any more.
    if (!ch || pictures[k]?.card !== card || pictures[k]?.scene !== scene) return;
    const next = pictures.map((p, i) => (i === k ? { ...p, ...(storageId ? { storageId } : { failed: true }) } : p));
    const settled = next.every(pictureDone);
    await ctx.db.patch(ch._id, { pictures: next, ...(settled ? { picturesStatus: picturesStatusOf(next) } : {}) });
    const after = k + lanes;
    if (after < next.length && !pictureDone(next[after])) {
      await ctx.scheduler.runAfter(0, internal.images.drawLane, { handbookId, n, k: after, card: next[after].card, scene: next[after].scene });
    }
  },
});

export const expirePictures = internalMutation({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }) => {
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    if (ch?.picturesStatus !== "drawing") return;
    const pictures = (ch.pictures ?? []).map((p) => (pictureDone(p) ? p : { ...p, failed: true }));
    await ctx.db.patch(ch._id, { pictures, picturesStatus: picturesStatusOf(pictures) });
  },
});

export const readCacheChapter = internalQuery({
  args: { topicKey: v.string(), level, n: v.number() },
  handler: async (ctx, { topicKey, level: lvl, n }) => {
    const row = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", topicKey).eq("level", lvl)).unique();
    return row ? { topic: row.topic, plan: row.plan, chapter: row.chapters.find((c: any) => c.n === n) ?? null } : null;
  },
});

export const listCache = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query("cache").collect()).map((r) => ({ topicKey: r.topicKey, level: r.level, topic: r.topic, chapters: r.chapters.map((c: any) => ({ n: c.n, pictures: (c.pictures ?? []).length })) })),
});

// Store a ready topic's pictures on the cache row and on every other spelling of the same topic
// ("ww2", "wwii"... are separate rows with the same chapters), then give them to every reader's copy
// of that chapter that has none yet (same title only: a copy rewritten for a reader keeps its own).
export const setCachePictures = internalMutation({
  args: { topicKey: v.string(), level, n: v.number(), pictures: v.array(pictureV) },
  handler: async (ctx, { topicKey, level: lvl, n, pictures }) => {
    const row = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", topicKey).eq("level", lvl)).unique();
    const title = row?.chapters.find((c: any) => c.n === n)?.title;
    if (!row || !title) return { rows: 0, copies: 0 };
    const keys = new Set<string>();
    for (const r of await ctx.db.query("cache").collect()) {
      if (r.level !== lvl || r.topic !== row.topic) continue;
      const c = r.chapters.find((x: any) => x.n === n);
      if (!c || c.title !== title || (r.topicKey !== topicKey && c.pictures?.length)) continue;
      await ctx.db.patch(r._id, { chapters: r.chapters.map((x: any) => (x.n === n ? { ...x, pictures } : x)) });
      keys.add(r.topicKey);
    }
    let copies = 0;
    for (const h of await ctx.db.query("handbooks").collect()) {
      if (h.source !== "cache" || !keys.has(h.topicKey) || h.level !== lvl) continue;
      const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id).eq("n", n)).unique();
      if (!ch || ch.pictures?.length || ch.title !== title) continue;
      await ctx.db.patch(ch._id, { pictures, picturesStatus: "done" });
      copies++;
    }
    await ctx.scheduler.runAfter(0, internal.landing.rebuildLanding, {});
    return { rows: keys.size, copies };
  },
});

