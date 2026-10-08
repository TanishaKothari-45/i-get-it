import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// The shelf (7 Oct, before launch traffic): one light row per ready topic and per shared handbook, with just what the
// landing page, Explore, "Jump to next" and the wait-screen story show. Those pages read this table and this week's
// handbooks, never every full handbook (a ready topic row carries all 7 chapters of cards and pictures).
// Kept in step by the writes that change what it shows; rebuild everything with: npx convex run shelf:rebuildAll '{}'

const firstSentence = (s: unknown) => String(s ?? "").split(/(?<=\.)\s/)[0];

// The cover is a drawing in the house style (design/style-anchor.md: one medium for the whole set), never a real photo:
// a Wikimedia press photo of an actor on the Avengers book broke the shelf (art-direction pass, 8 Oct night). Card 0's
// drawing first, then any drawing; a photo (it carries a credit) only when the chapter has no drawing at all.
function coverOf(pictures: any[] | undefined) {
  const ps = (pictures ?? []).filter((p: any) => p.storageId);
  const drawn = ps.filter((p: any) => !p.credit);
  return (drawn.find((p: any) => p.card === 0) ?? drawn[0] ?? ps[0])?.storageId;
}

// A ready topic: refreshed from its stored copy (any one spelling; they share content).
export async function syncReady(ctx: MutationCtx, topic: string) {
  const rows = await ctx.db.query("cache").withIndex("by_topic", (q) => q.eq("topic", topic)).collect();
  const r = rows.find((x) => x.level === "new");
  const existing = await ctx.db.query("shelf").withIndex("by_topic_kind", (q) => q.eq("topic", topic).eq("kind", "ready")).unique();
  if (!r) { if (existing) await ctx.db.delete(existing._id); return; }
  const ch1: any = r.chapters.find((c: any) => c.n === 1);
  const stories: any[] = [];
  for (const ch of r.chapters as any[]) (ch.cards ?? []).forEach((c: any, i: number) => {
    const pic = ch.pictures?.find((p: any) => p.card === i && p.storageId);
    if (stories.length < 12 && c?.type === "example" && typeof c.body === "string" && pic) stories.push({ chapter: ch.title ?? `Chapter ${ch.n}`, title: c.title ?? null, text: c.body, storageId: pic.storageId });
  });
  const row = {
    kind: "ready" as const, topic, key: r.topicKey, title: String((r.plan as any)?.topic ?? r.topic), level: r.level, mode: (r.plan as any)?.mode ?? undefined,
    outcome: firstSentence((r.plan as any)?.outcome7), cover: coverOf(ch1?.pictures),
    trendingWeek: (r as any).trendingWeek, addedAt: (r as any).addedAt ?? r._creationTime, improvedAt: (r as any).improvedAt, stories, published: true,
  };
  if (existing) await ctx.db.patch(existing._id, row);
  else await ctx.db.insert("shelf", { ...row, starts: 0, passes: 0 });
}

// A shared handbook: refreshed from its library row.
export async function syncShared(ctx: MutationCtx, l: Doc<"library">) {
  const existing = await ctx.db.query("shelf").withIndex("by_library", (q) => q.eq("libraryId", l._id)).unique();
  const row = {
    kind: "shared" as const, topic: l.topic, key: l.topicKey, title: l.topic, level: l.level, mode: l.mode, goal: l.goal,
    outcome: firstSentence((l.plan as any)?.outcome7), cover: coverOf(l.chapter1?.pictures),
    addedAt: l.createdAt, libraryId: l._id, pick: !!l.pick, published: l.published, starts: l.starts, passes: l.passes,
  };
  if (existing) await ctx.db.patch(existing._id, row);
  else await ctx.db.insert("shelf", row);
}

export const syncReadyTopic = internalMutation({ args: { topic: v.string() }, handler: async (ctx, { topic }) => { await syncReady(ctx, topic); } });
export const syncSharedRow = internalMutation({
  args: { libraryId: v.id("library") },
  handler: async (ctx, { libraryId }) => { const l = await ctx.db.get(libraryId); if (l) await syncShared(ctx, l); },
});

// Someone started or passed chapter 1 of a ready topic: the counts the landing page shows.
export const countReady = internalMutation({
  args: { topic: v.string(), started: v.optional(v.boolean()), passed: v.optional(v.boolean()) },
  handler: async (ctx, { topic, started, passed }) => {
    const s = await ctx.db.query("shelf").withIndex("by_topic_kind", (q) => q.eq("topic", topic).eq("kind", "ready")).unique();
    if (s) await ctx.db.patch(s._id, { starts: (s.starts ?? 0) + (started ? 1 : 0), passes: (s.passes ?? 0) + (passed ? 1 : 0) });
  },
});

// One-off fill: every ready topic and shared handbook, then ready-topic starts and passes counted from the handbooks.
export const topics = internalQuery({ args: {}, handler: async (ctx) => [...new Set((await ctx.db.query("cache").collect()).filter((r) => r.level === "new").map((r) => r.topic))] });
export const libraryIds = internalQuery({ args: {}, handler: async (ctx) => (await ctx.db.query("library").collect()).map((l) => l._id) });
export const countPage = internalQuery({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { cursor }) => {
    const r = await ctx.db.query("handbooks").paginate({ cursor, numItems: 100 });
    const excluded = new Set((await ctx.db.query("statsExcluded").collect()).map((e) => e.deviceToken));   // our own phones and test replays
    const out: { topic: string; passed: boolean }[] = [];
    for (const h of r.page) {
      if (h.source !== "cache" || h.ownerToken?.startsWith("abuse-") || (h.ownerToken && excluded.has(h.ownerToken)) || h.hiddenAt) continue;
      const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
      out.push({ topic: h.topic, passed: !!p?.chaptersPassed.includes(1) });
    }
    return { out, cursor: r.continueCursor, done: r.isDone };
  },
});
export const setCounts = internalMutation({
  args: { counts: v.array(v.object({ topic: v.string(), starts: v.number(), passes: v.number() })) },
  handler: async (ctx, { counts }) => {
    for (const c of counts) {
      const s = await ctx.db.query("shelf").withIndex("by_topic_kind", (q) => q.eq("topic", c.topic).eq("kind", "ready")).unique();
      if (s) await ctx.db.patch(s._id, { starts: c.starts, passes: c.passes });
    }
  },
});
export const rebuildAll = internalAction({
  args: {},
  handler: async (ctx): Promise<{ ready: number; shared: number }> => {
    const topics: string[] = await ctx.runQuery(internal.shelf.topics, {});
    for (const topic of topics) await ctx.runMutation(internal.shelf.syncReadyTopic, { topic });
    const ids: any[] = await ctx.runQuery(internal.shelf.libraryIds, {});
    for (const libraryId of ids) await ctx.runMutation(internal.shelf.syncSharedRow, { libraryId });
    const counts = new Map<string, { starts: number; passes: number }>();
    let cursor: string | null = null;
    for (;;) {
      const p: any = await ctx.runQuery(internal.shelf.countPage, { cursor });
      for (const x of p.out) { const c = counts.get(x.topic) ?? { starts: 0, passes: 0 }; c.starts++; if (x.passed) c.passes++; counts.set(x.topic, c); }
      cursor = p.cursor; if (p.done) break;
    }
    await ctx.runMutation(internal.shelf.setCounts, { counts: [...counts].map(([topic, c]) => ({ topic, ...c })) });
    return { ready: topics.length, shared: ids.length };
  },
});
