import { v } from "convex/values";
import { typedName } from "./names";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { isOwner } from "./admin";

// The shelf (7 Oct, before launch traffic): one light row per ready topic and per shared handbook, with just what the
// landing page, Explore, "Jump to next" and the wait-screen story show. Those pages read this table and this week's
// handbooks, never every full handbook (a ready topic row carries all 7 chapters of cards and pictures).
// Kept in step by the writes that change what it shows; rebuild everything with: npx convex run shelf:rebuildAll '{}'

const firstSentence = (s: unknown) => String(s ?? "").split(/(?<=\.)\s/)[0];

// D34 (9 Oct, Prateek: "Let's clean up the Shelf! Keep only the best handbooks there"): a row is on the Shelf when it is
// published and the owner has not taken it off. Every reader of the shelf table (the Shelf, the landing carousel, the
// wait stories, "What's next", the goal picker) goes through this one test.
export const onShelf = (r: { published: boolean; offShelf?: boolean }) => r.published && !r.offShelf;

// Spotlight (D34): the three handbooks readers like best. Finishing chapter 1 is the strongest "liked it" we record, so
// it ranks first (10 points each); a start is 1 point and breaks ties. A pinned row (the owner's pick) goes first. A row
// nobody has read is never spotlighted; with fewer than three eligible rows the Spotlight is shorter, never padded.
type SpotItem = { key: string; starts: number | null; passes: number | null; pick?: boolean; award?: unknown };
export function spotlight(items: SpotItem[]): string[] {
  const score = (i: SpotItem) => (i.passes ?? 0) * 10 + (i.starts ?? 0);
  // D34a: an awarded handbook has its own row on the Shelf, so it is never also in the Spotlight.
  return items.filter((i) => !i.award && (i.pick || (i.passes ?? 0) >= 1 || (i.starts ?? 0) >= 3))
    .sort((a, b) => Number(!!b.pick) - Number(!!a.pick) || score(b) - score(a)).slice(0, 3).map((i) => i.key);
}

// On or off the Shelf. A ready topic carries the flag itself; a shared handbook is switched through its library row so
// the review queue on /admin stays the one record of what is public (off = published false, review "rejected", with why).
export async function setShelfState(ctx: MutationCtx, r: Doc<"shelf">, on: boolean, why: string | undefined, by: string) {
  if (r.kind === "shared" && r.libraryId) {
    const l = await ctx.db.get(r.libraryId);
    if (!l) return;
    await ctx.db.patch(l._id, { published: on, review: on ? "approved" : "rejected", reviewWhy: on ? undefined : (why ?? "taken off the Shelf by the owner"), reviewedBy: by, reviewedAt: Date.now() });
    const fresh = await ctx.db.get(l._id); if (fresh) await syncShared(ctx, fresh);
    return;
  }
  await ctx.db.patch(r._id, { offShelf: !on, offWhy: on ? undefined : (why ?? "taken off the Shelf by the owner") });
}

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
  // D29 (9 Oct): the three true wait stories written for this topic come first; example cards are the old fallback.
  for (const w of (Array.isArray((r as any).waitStories) ? (r as any).waitStories : []) as any[]) stories.push({ kind: "wait", chapter: "", title: w.title, text: (w.frames ?? []).join("\n\n"), frames: w.frames, source: w.source, storageId: w.storageId });
  if (!stories.length) for (const ch of r.chapters as any[]) (ch.cards ?? []).forEach((c: any, i: number) => {
    const pic = ch.pictures?.find((p: any) => p.card === i && p.storageId);
    if (stories.length < 12 && c?.type === "example" && typeof c.body === "string" && pic) stories.push({ chapter: ch.title ?? `Chapter ${ch.n}`, title: c.title ?? null, text: c.body, storageId: pic.storageId });
  });
  const row = {
    kind: "ready" as const, topic, key: r.topicKey, title: typedName(r.topic), level: r.level, mode: (r.plan as any)?.mode ?? undefined,
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
  args: { topic: v.string(), started: v.optional(v.boolean()), passed: v.optional(v.boolean()), handbookId: v.optional(v.id("handbooks")) },
  handler: async (ctx, { topic, started, passed, handbookId }) => {
    // D34: our own phones, test replays and abuse tokens never count (before, every review agent's run did; rebuildAll
    // recounts from the handbooks with the same exclusions).
    const h = handbookId ? await ctx.db.get(handbookId) : null;
    if (h?.ownerToken && (h.ownerToken.startsWith("abuse-") || await ctx.db.query("statsExcluded").filter((q) => q.eq(q.field("deviceToken"), h.ownerToken)).first())) return;
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

// The owner's view (D34): every row that could be on the Shelf, with its counts, its state and the Spotlight as it stands.
export const adminList = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isOwner(ctx)).ok) return null;
    const rows = (await ctx.db.query("shelf").collect()).filter((r) => r.kind === "shared" || r.level === "new");
    const items = rows.map((r) => ({ id: r._id, kind: r.kind, key: r.key, title: r.title, mode: r.mode ?? null, goal: r.goal ?? null, starts: r.starts, passes: r.passes,
      on: onShelf(r), offWhy: r.kind === "shared" ? null : (r.offWhy ?? null), pick: !!r.pick, award: r.award ?? null, cover: !!r.cover, stories: Array.isArray(r.stories) ? r.stories.length : 0, libraryId: r.libraryId ?? null, addedAt: r.addedAt }));
    const spot = spotlight(items.filter((i) => i.on));
    return items.map((i) => ({ ...i, spot: spot.indexOf(i.key) + 1 || null }))
      .sort((a, b) => Number(b.on) - Number(a.on) || (a.spot ?? 9) - (b.spot ?? 9) || b.passes - a.passes || b.starts - a.starts);
  },
});
export const setOnShelf = mutation({
  args: { id: v.id("shelf"), on: v.boolean(), why: v.optional(v.string()) },
  handler: async (ctx, { id, on, why }) => {
    if (!(await isOwner(ctx)).ok) throw new Error("Owner only");
    const me = await getAuthUserId(ctx); const user = me ? await ctx.db.get(me) : null;
    const r = await ctx.db.get(id);
    if (r) await setShelfState(ctx, r, on, why?.trim().slice(0, 200) || undefined, user?.email ?? "owner");
  },
});
// Pin to the Spotlight (the owner's pick). A shared row's pick lives on its library row too, so a resync keeps it.
export const setPick = mutation({
  args: { id: v.id("shelf"), pick: v.boolean() },
  handler: async (ctx, { id, pick }) => {
    if (!(await isOwner(ctx)).ok) throw new Error("Owner only");
    const r = await ctx.db.get(id);
    if (!r) return;
    if (r.kind === "shared" && r.libraryId) await ctx.db.patch(r.libraryId, { pick });
    await ctx.db.patch(id, { pick });
  },
});
// One-off from the command line (D34, the first clean-up): take rows off by key, with the reason recorded on each.
//   npx convex run --prod shelf:takeOff '{"keys":["asdfgh"],"why":"typed junk"}'
export const takeOff = internalMutation({
  args: { keys: v.array(v.string()), why: v.string(), on: v.optional(v.boolean()), kind: v.optional(v.union(v.literal("ready"), v.literal("shared"))) },
  handler: async (ctx, { keys, why, on, kind }) => {
    // A ready topic and a shared handbook can share a key: pass kind to touch one of them only.
    const rows = (await ctx.db.query("shelf").collect()).filter((r) => keys.includes(r.key) && (!kind || r.kind === kind));
    for (const r of rows) await setShelfState(ctx, r, on ?? false, why, "dc (D34)");
    return rows.map((r) => `${r.kind}: ${r.title}`);
  },
});
// What each ready topic actually holds (D34, the clean-up): chapters, the thinnest chapter, pictures, wait stories.
export const audit = internalQuery({
  args: {},
  handler: async (ctx) => {
    const out: any[] = [];
    for (const r of (await ctx.db.query("cache").collect()).filter((x) => x.level === "new")) {
      const chs = (r.chapters ?? []) as any[];
      const words = (ch: any) => (ch.cards ?? []).reduce((t: number, c: any) => t + String(c?.body ?? c?.prompt ?? "").split(/\s+/).filter(Boolean).length, 0);
      const s = await ctx.db.query("shelf").withIndex("by_topic_kind", (q) => q.eq("topic", r.topic).eq("kind", "ready")).unique();
      out.push({ topic: r.topic, chapters: chs.length, planned: ((r.plan as any)?.chapters ?? []).length, minCards: Math.min(...chs.map((c) => (c.cards ?? []).length)), minWords: Math.min(...chs.map(words)),
        ch1Pictures: (chs.find((c) => c.n === 1)?.pictures ?? []).filter((p: any) => p.storageId).length, stories: Array.isArray(r.waitStories) ? r.waitStories.length : 0, version: r.version ?? 0,
        starts: s?.starts ?? null, passes: s?.passes ?? null, offShelf: !!s?.offShelf, cover: !!s?.cover });
    }
    return out.sort((a, b) => (b.passes ?? 0) - (a.passes ?? 0) || (b.starts ?? 0) - (a.starts ?? 0));
  },
});

// D34a: the owner's award on a handbook (null removes it). An awarded handbook is put on the Shelf at the same time, since
// the Awards row opens it on a tap.
export const setAward = mutation({
  args: { id: v.id("shelf"), award: v.union(v.null(), v.object({ title: v.string(), line: v.string() })) },
  handler: async (ctx, { id, award }) => {
    if (!(await isOwner(ctx)).ok) throw new Error("Owner only");
    const me = await getAuthUserId(ctx); const user = me ? await ctx.db.get(me) : null;
    const r = await ctx.db.get(id);
    if (!r) return;
    const a = award ? { title: award.title.trim().slice(0, 60), line: award.line.trim().slice(0, 200) } : undefined;
    await ctx.db.patch(id, { award: a });
    if (a && !onShelf(r)) await setShelfState(ctx, r, true, undefined, user?.email ?? "owner");
  },
});
// From the command line, by key:  npx convex run --prod shelf:giveAward '{"key":"how to make dal","title":"…","line":"…"}'
export const giveAward = internalMutation({
  args: { key: v.string(), title: v.string(), line: v.string() },
  handler: async (ctx, { key, title, line }) => {
    // A typed line can be 200 characters; the key may be given as a prefix of at least 12 characters.
    const rows = (await ctx.db.query("shelf").collect()).filter((r) => (r.key === key || (key.length >= 12 && r.key.startsWith(key))) && (r.kind === "shared" || r.level === "new"));
    for (const r of rows) { await ctx.db.patch(r._id, { award: { title, line } }); if (!onShelf(r)) await setShelfState(ctx, r, true, undefined, "dc (D34a)"); }
    return rows.map((r) => `${r.kind}: ${r.title}`);
  },
});
// Every row's state in one line each, for the command line.
export const rows = internalQuery({
  args: {},
  handler: async (ctx) => {
    const out: string[] = [];
    for (const r of (await ctx.db.query("shelf").collect()).filter((x) => x.kind === "shared" || x.level === "new")) {
      const l = r.libraryId ? await ctx.db.get(r.libraryId) : null;
      out.push(`${r.kind} | ${r.key} | ${onShelf(r) ? "ON" : "off"} | starts ${r.starts} passes ${r.passes}${r.pick ? " | pinned" : ""}${r.award ? ` | award: ${r.award.title}` : ""}${l ? ` | lib published ${l.published} review ${l.review ?? "-"} ${l.reviewWhy ?? ""}` : ""}${r.offWhy ? ` | off: ${r.offWhy}` : ""}`);
    }
    return out.sort();
  },
});
