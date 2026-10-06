import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { LIBRARY_CHECK_PROMPT } from "./prompts";
import { isOwner } from "./admin";

// The shared library (6 Oct, Prateek: "any handbook created by one user should immediately be available for all others").

const DAY = 24 * 60 * 60 * 1000;

// After a typed topic's chapter 1 is written: share its plan and chapter 1 if the privacy check says it's a general subject.
export const consider = internalAction({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    const d: any = await ctx.runQuery(internal.library.readSource, { handbookId });
    if (!d) return;
    const r: any = await ctx.runAction(internal.ai.generate, { kind: "intent", system: LIBRARY_CHECK_PROMPT,
      user: `Typed line: "${d.h.topic}"\nPlan topic: ${d.h.plan?.topic ?? ""}\nGoal: ${d.h.goal ?? ""}\nOutcome: ${d.h.plan?.outcome7 ?? ""}` });
    const share = r.ok && r.json?.share === true;
    await ctx.runMutation(internal.library.publish, { handbookId, share, why: String(r.ok ? r.json?.why ?? "" : r.error).slice(0, 120) });
  },
});

export const readSource = internalQuery({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    const h = await ctx.db.get(handbookId);
    if (!h || h.source !== "live" || h.fromLibrary || !h.plan || (h.status as string) === "declined") return null;
    if (await ctx.db.query("library").withIndex("by_source", (q) => q.eq("sourceHandbookId", handbookId)).first()) return null;
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", 1)).unique();
    if (!ch || ch.status !== "ready" || !ch.cards) return null;
    return { h };
  },
});

export const publish = internalMutation({
  args: { handbookId: v.id("handbooks"), share: v.boolean(), why: v.string() },
  handler: async (ctx, { handbookId, share, why }) => {
    const h = await ctx.db.get(handbookId);
    const ch = h && await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", 1)).unique();
    if (!h || !ch?.cards) return;
    // One shared copy per topic and kind of goal: the first stays (A/B variants come later).
    const twins = await ctx.db.query("library").withIndex("by_key", (q) => q.eq("topicKey", h.topicKey).eq("level", h.level)).collect();
    const twin = twins.some((x) => x.published && (x.mode ?? "") === (h.mode ?? ""));
    await ctx.db.insert("library", {
      topicKey: h.topicKey, topic: String((h.plan as any)?.topic ?? h.topic), level: h.level, goal: h.goal, mode: h.mode ?? (h.plan as any)?.mode,
      plan: h.plan, chapter1: { title: ch.title, cards: ch.cards, outcomeLine: ch.outcomeLine, svg: (ch as any).svg, pictures: ch.pictures, recallCards: ch.recallCards },
      sourceHandbookId: handbookId, published: share && !twin, starts: 1, passes: 0, why: twin ? "a copy for this topic and goal is already shared" : why, createdAt: Date.now(),
    });
  },
});

// Pictures are drawn after the words: keep the shared chapter 1 in step when they land.
export const syncPictures = internalMutation({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    const row = await ctx.db.query("library").withIndex("by_source", (q) => q.eq("sourceHandbookId", handbookId)).first();
    const ch = row && await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", 1)).unique();
    if (row && ch?.pictures) await ctx.db.patch(row._id, { chapter1: { ...row.chapter1, pictures: ch.pictures } });
  },
});

// Copy a shared plan and chapter 1 into a handbook (a new one from Explore, or a typed one that matched).
async function copyInto(ctx: MutationCtx, handbookId: Id<"handbooks">, row: Doc<"library">) {
  const now = Date.now();
  await ctx.db.patch(handbookId, { status: "ready", plan: row.plan, goal: row.goal, mode: row.mode, fromLibrary: row._id });
  const c = row.chapter1;
  await ctx.db.insert("chapters", { handbookId, n: 1, status: "ready", title: c.title, cards: c.cards, outcomeLine: c.outcomeLine, svg: c.svg, pictures: c.pictures, recallCards: c.recallCards, createdAt: now });
  await ctx.db.patch(row._id, { starts: row.starts + 1 });
}

export async function matchForIntent(ctx: MutationCtx, h: Doc<"handbooks">, mode?: string): Promise<boolean> {
  const rows = await ctx.db.query("library").withIndex("by_key", (q) => q.eq("topicKey", h.topicKey).eq("level", h.level)).collect();
  const row = rows.find((x) => x.published && (x.mode ?? "") === (mode ?? x.mode ?? ""));
  if (!row) return false;
  await copyInto(ctx, h._id, row);
  return true;
}

export const start = mutation({
  args: { libraryId: v.id("library"), deviceToken: v.string() },
  handler: async (ctx, { libraryId, deviceToken }) => {
    const row = await ctx.db.get(libraryId);
    if (!row?.published) throw new Error("Not available");
    const userId = await getAuthUserId(ctx);
    const mine = userId ? await ctx.db.query("handbooks").withIndex("by_user", (q) => q.eq("userId", userId)).collect() : await ctx.db.query("handbooks").withIndex("by_token", (q) => q.eq("ownerToken", deviceToken)).collect();
    const already = mine.find((x) => x.topicKey === row.topicKey && !x.hiddenAt);
    if (already) return { handbookId: already._id, existing: true };
    const handbookId = await ctx.db.insert("handbooks", { topic: row.topic, topicKey: row.topicKey, level: row.level, language: "English", voice: "friend", status: "planning",
      ownerToken: deviceToken, userId: userId ?? undefined, source: "live", createdAt: Date.now() });
    await ctx.db.insert("progress", { handbookId, currentChapter: 1, currentCard: 0, chaptersPassed: [], passedExercises: [], missedExercises: [], lastOpenedAt: Date.now(), updatedAt: Date.now() });
    await copyInto(ctx, handbookId, row);
    return { handbookId, existing: false };
  },
});

export const countPass = internalMutation({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    const h = await ctx.db.get(handbookId);
    if (!h) return;
    const row = h.fromLibrary ? await ctx.db.get(h.fromLibrary) : await ctx.db.query("library").withIndex("by_source", (q) => q.eq("sourceHandbookId", handbookId)).first();
    if (row) await ctx.db.patch(row._id, { passes: row.passes + 1 });
  },
});

// Explore: ready topics and shared ones, with honest badges.
export const explore = query({
  args: {},
  handler: async (ctx) => {
    const url = async (id?: any) => (id ? await ctx.storage.getUrl(id) : null);
    const cover = async (ch: any) => url((ch?.pictures ?? []).find((p: any) => p.storageId)?.storageId);
    const weekAgo = Date.now() - 7 * DAY;
    const excluded = await ctx.db.query("statsExcluded").collect();
    const xTokens = new Set(excluded.map((e) => e.deviceToken).filter(Boolean) as string[]);
    const xUsers = new Set(excluded.map((e) => e.userId).filter(Boolean).map(String));
    const recent = (await ctx.db.query("handbooks").collect()).filter((h) => h.createdAt >= weekAgo && !h.ownerToken?.startsWith("abuse-")
      && !(h.ownerToken && xTokens.has(h.ownerToken)) && !(h.userId && xUsers.has(String(h.userId))));
    const items: any[] = [];
    const seen = new Set<string>();
    for (const r of (await ctx.db.query("cache").collect()).filter((x) => x.level === "new")) {
      if (seen.has(r.topic)) continue; seen.add(r.topic);
      const ch1 = r.chapters.find((c: any) => c.n === 1);
      items.push({ kind: "ready", key: r.topicKey, topic: (r.plan as any)?.topic ?? r.topic, outcome: String((r.plan as any)?.outcome7 ?? "").split(/(?<=\.)\s/)[0], mode: (r.plan as any)?.mode ?? null,
        cover: await cover(ch1), week: recent.filter((h) => h.source === "cache" && h.topic === r.topic).length, starts: null, passes: null });
    }
    for (const r of await ctx.db.query("library").collect()) {
      if (!r.published || seen.has(r.topic)) continue; seen.add(r.topic);
      items.push({ kind: "shared", id: r._id, key: r.topicKey, topic: r.topic, goal: r.goal ?? null, outcome: String(r.plan?.outcome7 ?? "").split(/(?<=\.)\s/)[0], mode: r.mode ?? null,
        cover: await cover(r.chapter1), week: recent.filter((h) => h.fromLibrary === r._id || h._id === r.sourceHandbookId).length, starts: r.starts, passes: r.passes, pick: !!r.pick });
    }
    const hot = new Set(items.filter((i) => i.week >= 2).sort((a, b) => b.week - a.week).slice(0, 3).map((i) => i.key));
    const loved = new Set(items.filter((i) => i.starts !== null && i.starts >= 3 && i.passes / i.starts >= 0.5).sort((a, b) => b.passes / b.starts - a.passes / a.starts).slice(0, 3).map((i) => i.key));
    return items.map((i) => ({ ...i, hot: hot.has(i.key), loved: loved.has(i.key) }))
      .sort((a, b) => Number(b.hot) - Number(a.hot) || Number(b.loved) - Number(a.loved) || b.week - a.week || Number(!!b.cover) - Number(!!a.cover));
  },
});

// The owner's view on /admin: every shared row, with a switch.
export const adminList = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isOwner(ctx)).ok) return null;
    return (await ctx.db.query("library").collect()).sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => ({ id: r._id, topic: r.topic, goal: r.goal ?? null, mode: r.mode ?? null, published: r.published, pick: !!r.pick, starts: r.starts, passes: r.passes, why: r.why ?? null, createdAt: r.createdAt }));
  },
});
export const setPublished = mutation({
  args: { id: v.id("library"), published: v.optional(v.boolean()), pick: v.optional(v.boolean()) },
  handler: async (ctx, { id, published, pick }) => {
    if (!(await isOwner(ctx)).ok) throw new Error("Owner only");
    await ctx.db.patch(id, { ...(published !== undefined ? { published } : {}), ...(pick !== undefined ? { pick } : {}) });
  },
});
