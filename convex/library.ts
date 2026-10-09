import { v } from "convex/values";
import { smallUrl } from "./pictures";
import { typedName } from "./names";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { LIBRARY_CHECK_PROMPT } from "./prompts";
import { JUDGE, JUDGE_MODEL } from "./evalModels";
import { isOwner } from "./admin";
import { weekStartIST } from "./landing";
import { onShelf, spotlight, syncShared } from "./shelf";

// The shared library (6 Oct, Prateek: "any handbook created by one user should immediately be available for all others").

const DAY = 24 * 60 * 60 * 1000;

// After a typed topic's chapter 1 is written: share its plan and chapter 1 if the privacy check says it's a general subject.
// After a typed topic's chapter 1 is passed by its own reader: an automatic filter, then the row waits for Prateek's
// Approve on /admin (D32, 9 Oct 03:5x: "people are now starting to spam our app"). Nothing typed goes public by itself.
export const consider = internalAction({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }): Promise<void> => {
    const d: any = await ctx.runQuery(internal.library.readSource, { handbookId });
    if (!d) return;
    const h = d.h;
    const reject = async (why: string, judge?: any): Promise<void> => { await ctx.runMutation(internal.library.publish, { handbookId, share: false, why, review: "rejected", judge }); };
    // 8 Oct night (audit): a chapter 1 written for a reader's profile line is theirs, never shared.
    const prof: { line?: string | null } = await ctx.runQuery(internal.handbooks.readProfileLine, { handbookId });
    if (prof?.line) return reject("written for one reader's profile");
    if (String(h.topic ?? "").trim().length < 8) return reject("typed line under 8 characters");
    if ((h.status as string) === "declined" || h.plan?.pushback) return reject("a declined or pushback plan");
    if (d.excluded) return reject("typed from one of our own or a test phone");
    // The privacy check (its own job and schema since 8 Oct).
    const r: any = await ctx.runAction(internal.ai.generate, { kind: "library", system: LIBRARY_CHECK_PROMPT,
      user: `Typed line: "${h.topic}"\nPlan topic: ${h.plan?.topic ?? ""}\nGoal: ${h.goal ?? ""}\nOutcome: ${h.plan?.outcome7 ?? ""}`, trace: { handbookId } });
    if (!(r.ok && r.json?.share === true)) return reject(`privacy check: ${String(r.ok ? r.json?.why ?? "no" : r.error).slice(0, 120)}`);
    // The 6 Oct judge on chapter 1 (Opus high, 12 checks, about ₹3): under 9 is rejected with its weakest check named.
    const j: any = await ctx.runAction(internal.ai.generate, { kind: "audit", system: JUDGE, user: "Chapter JSON:\n" + JSON.stringify({ title: d.ch.title, cards: d.ch.cards, outcomeLine: d.ch.outcomeLine }), model: JUDGE_MODEL, effort: "high", trace: { handbookId, chapter: 1 } });
    // Chapter 1 has no quizzes by design, so the three quiz checks are "n/a" and never the weakest; the bar for chapter 1 is
    // under 7 of 12 (dc, 9 Oct: at most two real faults out of the nine checks that apply; 7 and 8 go to the queue).
    const NA = ["one_idea", "answerable", "feedback_names_confusion"];
    const checks: Record<string, any> = j.ok && j.json?.checks && typeof j.json.checks === "object" ? { ...j.json.checks } : {};
    for (const k of NA) if (k in checks) checks[k] = "n/a";
    const weakest = Object.entries(checks).find(([k, v]) => !NA.includes(k) && (v === false || v === 0))?.[0] ?? null;
    const judge: any = j.ok ? { score: Number(j.json?.score ?? 0), checks, weakest, why: String(j.json?.why ?? "").slice(0, 300), dubious: Array.isArray(j.json?.dubious_claims) ? j.json.dubious_claims.slice(0, 5) : [] } : { error: String(j.error).slice(0, 120) };
    if (j.ok && judge.score < 7) return reject(`judge ${judge.score} of 12${weakest ? `: ${weakest}` : ""}`, judge);
    await ctx.runMutation(internal.library.publish, { handbookId, share: true, why: String(r.json?.why ?? "").slice(0, 120), review: "pending", judge });
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
    const excluded = h.ownerToken ? !!(await ctx.db.query("statsExcluded").filter((q) => q.eq(q.field("deviceToken"), h.ownerToken)).first()) : false;
    return { h, ch: { title: ch.title, cards: ch.cards, outcomeLine: ch.outcomeLine }, excluded };
  },
});

export const publish = internalMutation({
  args: { handbookId: v.id("handbooks"), share: v.boolean(), why: v.string(), review: v.optional(v.string()), judge: v.optional(v.any()) },
  handler: async (ctx, { handbookId, share, why, review, judge }) => {
    const h = await ctx.db.get(handbookId);
    const ch = h && await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", 1)).unique();
    if (!h || !ch?.cards) return;
    // One shared copy per topic and kind of goal: the first stays (A/B variants come later).
    const twins = await ctx.db.query("library").withIndex("by_key", (q) => q.eq("topicKey", h.topicKey).eq("level", h.level)).collect();
    const twin = twins.some((x) => x.published && (x.mode ?? "") === (h.mode ?? ""));
    const libraryId = await ctx.db.insert("library", {
      topicKey: h.topicKey, topic: typedName(h.topic), level: h.level, goal: h.goal, mode: h.mode ?? (h.plan as any)?.mode,   // D28 (9 Oct): named by what the person typed, never the model's rewrite
      plan: h.plan, chapter1: { title: ch.title, cards: ch.cards, outcomeLine: ch.outcomeLine, svg: (ch as any).svg, pictures: ch.pictures, recallCards: ch.recallCards, recallTiers: (ch as any).recallTiers },
      // D32: never published here; "pending" waits for Approve on /admin, "rejected" says why.
      sourceHandbookId: handbookId, published: false, starts: 1, passes: 0, why: twin ? "a copy for this topic and goal is already shared" : why, createdAt: Date.now(),
      review: twin ? "rejected" : (review ?? (share ? "pending" : "rejected")), reviewWhy: twin ? "a copy for this topic and goal is already shared" : (share ? undefined : why), judge,
    });
    const row = await ctx.db.get(libraryId); if (row) await syncShared(ctx, row);
  },
});

// The shared row a handbook belongs to: the one it was copied from, or the one it was published as.
export async function sharedRow(ctx: QueryCtx | MutationCtx, h: Doc<"handbooks">) {
  const row = (h as any).fromLibrary ? await ctx.db.get((h as any).fromLibrary as Id<"library">)
    : await ctx.db.query("library").withIndex("by_source", (q) => q.eq("sourceHandbookId", h._id)).first();
  return row?.published ? row : null;
}

// A later chapter, the first time any reader of a shared handbook unlocks it: saved for everyone after (7 Oct).
// Only neutral chapters (written with no reader's profile or quiz history) are saved; a level's row is its own.
export const saveChapter = internalMutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), tiersOnly: v.optional(v.boolean()) },
  handler: async (ctx, { handbookId, n, tiersOnly }) => {
    const h = await ctx.db.get(handbookId);
    const row = h && await sharedRow(ctx, h);
    if (!row) return;
    // 8 Oct: quiz versions are written after the chapter, in the background; they are added to the saved copy here.
    const saved = (row.chapters ?? {})[String(n)];
    if (tiersOnly) {
      if (!saved) return;
      const c: any = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
      if (c) await ctx.db.patch(row._id, { chapters: { ...(row.chapters ?? {}), [String(n)]: { ...saved, quizTiers: c.quizTiers, recallTiers: c.recallTiers } } });
      return;
    }
    if (saved) return;
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    if (!ch?.cards || ch.status !== "ready") return;
    const c: any = ch;
    await ctx.db.patch(row._id, { chapters: { ...(row.chapters ?? {}), [String(n)]: { title: c.title, cards: c.cards, outcomeLine: c.outcomeLine, svg: c.svg, pictures: c.pictures ?? [], recallCards: c.recallCards, quizTiers: c.quizTiers, recallTiers: c.recallTiers } } });
  },
});

// Pictures are drawn after the words: keep the shared copy of that chapter in step when they land.
export const syncPictures = internalMutation({
  args: { handbookId: v.id("handbooks"), n: v.optional(v.number()) },
  handler: async (ctx, { handbookId, n = 1 }) => {
    const h = await ctx.db.get(handbookId);
    const row = h && (n === 1 ? await ctx.db.query("library").withIndex("by_source", (q) => q.eq("sourceHandbookId", handbookId)).first() : await sharedRow(ctx, h));
    const ch = row && await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    if (!row || !ch?.pictures?.length) return;
    if (n === 1) { await ctx.db.patch(row._id, { chapter1: { ...row.chapter1, pictures: ch.pictures } }); const fresh = await ctx.db.get(row._id); if (fresh) await syncShared(ctx, fresh); return; }
    const saved = (row.chapters ?? {})[String(n)];
    if (saved && !(saved.pictures ?? []).some((p: any) => p.storageId) && saved.title === ch.title) await ctx.db.patch(row._id, { chapters: { ...row.chapters, [String(n)]: { ...saved, pictures: ch.pictures } } });
  },
});


// Copy a shared plan and chapter 1 into a handbook (a new one from Explore, or a typed one that matched).
export async function copyInto(ctx: MutationCtx, handbookId: Id<"handbooks">, row: Doc<"library">) {
  const now = Date.now();
  await ctx.db.patch(handbookId, { status: "ready", plan: row.plan, goal: row.goal, mode: row.mode, fromLibrary: row._id });
  const c = row.chapter1;
  await ctx.db.insert("chapters", { handbookId, n: 1, status: "ready", title: c.title, cards: c.cards, outcomeLine: c.outcomeLine, svg: c.svg, pictures: c.pictures, recallCards: c.recallCards, recallTiers: c.recallTiers, createdAt: now });
  await ctx.db.patch(row._id, { starts: row.starts + 1 });
  const fresh = await ctx.db.get(row._id); if (fresh) await syncShared(ctx, fresh);
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
    if (row) { await ctx.db.patch(row._id, { passes: row.passes + 1 }); const fresh = await ctx.db.get(row._id); if (fresh) await syncShared(ctx, fresh); }
  },
});

// Explore: ready topics and shared ones, with honest badges.
export const explore = query({
  args: {},
  handler: async (ctx) => {
    // Reads the shelf (shelf.ts) and this week's handbooks only, never every full handbook (7 Oct, before launch).
    const url = async (id?: any) => (id ? await smallUrl(ctx, id) : null);   // D29b: the small variant when one exists
    const weekAgo = Date.now() - 7 * DAY;
    const excluded = await ctx.db.query("statsExcluded").collect();
    const xTokens = new Set(excluded.map((e) => e.deviceToken).filter(Boolean) as string[]);
    const xUsers = new Set(excluded.map((e) => e.userId).filter(Boolean).map(String));
    const recent = (await ctx.db.query("handbooks").withIndex("by_created", (q) => q.gte("createdAt", weekAgo)).collect()).filter((h) => !h.ownerToken?.startsWith("abuse-")
      && !(h.ownerToken && xTokens.has(h.ownerToken)) && !(h.userId && xUsers.has(String(h.userId))));
    // Finished chapter 1, for "Most finished" (7 Oct: chips on Explore).
    const finished = new Set<string>();
    for (const h of recent) { const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique(); if (p?.chaptersPassed.includes(1)) finished.add(h._id); }
    const thisWeek = weekStartIST();
    const shelf = await ctx.db.query("shelf").collect();
    const items: any[] = [];
    const seen = new Set<string>();
    // D34: only what the owner keeps on the Shelf; ready rows carry their real counts (readers only, since D34) so the
    // Spotlight and "Most finished" can rank them with the shared ones.
    for (const r of shelf.filter((x) => x.kind === "ready" && x.level === "new" && onShelf(x))) {
      if (seen.has(r.topic)) continue; seen.add(r.topic);
      const mine = recent.filter((h) => h.source === "cache" && h.topic === r.topic);
      items.push({ kind: "ready", key: r.key, topic: r.title, outcome: r.outcome, mode: r.mode ?? null, cover: await url(r.cover), week: mine.length, starts: r.starts, passes: r.passes, pick: !!r.pick, award: r.award ?? null,
        finishedWeek: mine.filter((h) => finished.has(h._id)).length, trending: r.trendingWeek === thisWeek, addedAt: r.addedAt });
    }
    for (const r of shelf.filter((x) => x.kind === "shared" && onShelf(x))) {
      if (seen.has(r.topic)) continue; seen.add(r.topic);
      const mine = recent.filter((h) => (h as any).fromLibrary === r.libraryId);
      items.push({ kind: "shared", id: r.libraryId, key: r.key, topic: r.title, goal: r.goal ?? null, outcome: r.outcome, mode: r.mode ?? null, cover: await url(r.cover),
        week: mine.length, starts: r.starts, passes: r.passes, pick: !!r.pick, award: r.award ?? null, finishedWeek: mine.filter((h) => finished.has(h._id)).length, trending: false, addedAt: r.addedAt });
    }
    const hot = new Set(items.filter((i) => i.week >= 2).sort((a, b) => b.week - a.week).slice(0, 3).map((i) => i.key));
    const loved = new Set(items.filter((i) => i.starts !== null && i.starts >= 3 && i.passes / i.starts >= 0.5).sort((a, b) => b.passes / b.starts - a.passes / a.starts).slice(0, 3).map((i) => i.key));
    // D34: the Spotlight, the three readers finish most (shelf.ts spotlight); spot is 1 to 3 on those, null elsewhere.
    const spot = spotlight(items);
    return items.map((i) => ({ ...i, hot: hot.has(i.key), loved: loved.has(i.key), spot: spot.indexOf(i.key) + 1 || null }))
      .sort((a, b) => (a.spot ?? 9) - (b.spot ?? 9) || Number(b.hot) - Number(a.hot) || Number(b.loved) - Number(a.loved) || b.week - a.week || Number(!!b.cover) - Number(!!a.cover));
  },
});


// The owner's view on /admin: every shared row, with a switch.
export const adminList = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isOwner(ctx)).ok) return null;
    return (await ctx.db.query("library").collect()).sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => ({ id: r._id, topic: r.topic, goal: r.goal ?? null, mode: r.mode ?? null, published: r.published, pick: !!r.pick, starts: r.starts, passes: r.passes, why: r.why ?? null, createdAt: r.createdAt, review: r.review ?? null }));
  },
});
// D32: the review queue for /admin (owner only): pending rows newest first, then the automatic rejections.
export const reviewQueue = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isOwner(ctx)).ok) return null;
    const rows = (await ctx.db.query("library").collect()).filter((r) => r.review === "pending" || r.review === "rejected").sort((a, b) => b.createdAt - a.createdAt);
    return rows.map((r) => {
      const cards: any[] = Array.isArray(r.chapter1?.cards) ? r.chapter1.cards : [];
      const text = cards.filter((c) => typeof c?.body === "string").slice(0, 2).map((c) => String(c.body).replace(/\*\*/g, "").slice(0, 320));
      return { id: r._id, review: r.review, reviewWhy: r.reviewWhy ?? null, topic: r.topic, level: r.level, goal: r.goal ?? null, mode: r.mode ?? null, title: r.chapter1?.title ?? null, text,
        judge: r.judge ? { score: r.judge.score ?? null, weakest: r.judge.weakest ?? null, error: r.judge.error ?? null } : null, starts: r.starts, passes: r.passes, createdAt: r.createdAt, why: r.why ?? null,
        reviewedBy: r.reviewedBy ?? null, reviewedAt: r.reviewedAt ?? null };
    });
  },
});
export const decide = mutation({
  args: { id: v.id("library"), approve: v.boolean(), why: v.optional(v.string()) },
  handler: async (ctx, { id, approve, why }) => {
    const who = await isOwner(ctx);
    if (!who.ok) throw new Error("Owner only");
    const me = await getAuthUserId(ctx); const user = me ? await ctx.db.get(me) : null;
    const row = await ctx.db.get(id);
    if (!row) return;
    const twins = await ctx.db.query("library").withIndex("by_key", (q) => q.eq("topicKey", row.topicKey).eq("level", row.level)).collect();
    const twin = twins.some((x) => x._id !== id && x.published && (x.mode ?? "") === (row.mode ?? ""));
    if (approve && twin) throw new Error("A copy for this topic and goal is already shared; hide that one first.");
    await ctx.db.patch(id, { published: approve, review: approve ? "approved" : "rejected", reviewWhy: approve ? undefined : (why?.trim().slice(0, 200) || "rejected by the owner"), reviewedBy: user?.email ?? "owner", reviewedAt: Date.now() });
    const fresh = await ctx.db.get(id); if (fresh) await syncShared(ctx, fresh);
  },
});
export const pendingCount = internalQuery({ args: {}, handler: async (ctx) => (await ctx.db.query("library").collect()).filter((r) => r.review === "pending").length });
export const setPublished = mutation({
  args: { id: v.id("library"), published: v.optional(v.boolean()), pick: v.optional(v.boolean()) },
  handler: async (ctx, { id, published, pick }) => {
    if (!(await isOwner(ctx)).ok) throw new Error("Owner only");
    await ctx.db.patch(id, { ...(published !== undefined ? { published } : {}), ...(pick !== undefined ? { pick } : {}) });
    const row = await ctx.db.get(id); if (row) await syncShared(ctx, row);
  },
});

// "What's next" (6 Oct): 3 topics to try after a handbook, from the ready shelf and the shared library. Prefers the same
// kind of handbook (a story after a story), skips topics this reader already has, then the most started this week.
export const related = query({
  args: { topic: v.string(), deviceToken: v.string() },
  handler: async (ctx, { topic, deviceToken }) => {
    const userId = await getAuthUserId(ctx);
    const mine = userId ? await ctx.db.query("handbooks").withIndex("by_user", (q) => q.eq("userId", userId)).collect() : await ctx.db.query("handbooks").withIndex("by_token", (q) => q.eq("ownerToken", deviceToken)).collect();
    const have = new Set(mine.map((h) => h.topic.toLowerCase()).concat(mine.map((h) => String((h.plan as any)?.topic ?? "").toLowerCase())));
    const url = async (id?: any) => (id ? await smallUrl(ctx, id) : null);   // D29b: the small variant when one exists
    const weekAgo = Date.now() - 7 * DAY;
    const recent = await ctx.db.query("handbooks").withIndex("by_created", (q) => q.gte("createdAt", weekAgo)).collect();
    const shelf = await ctx.db.query("shelf").collect();
    const current = shelf.find((r) => r.topic === topic || r.title === topic);
    const myMode = current?.mode ?? mine.find((h) => h.topic === topic)?.mode ?? null;
    const items: any[] = []; const seen = new Set<string>();
    for (const r of shelf.filter((x) => x.kind === "ready" && x.level === "new" && onShelf(x))) {
      if (seen.has(r.topic) || have.has(r.topic.toLowerCase()) || have.has(r.title.toLowerCase()) || r.topic === topic) continue; seen.add(r.topic);
      items.push({ kind: "ready", topic: r.title, outcome: r.outcome, cover: await url(r.cover), score: (r.mode && r.mode === myMode ? 10 : 0) + recent.filter((h) => h.topic === r.topic).length });
    }
    for (const r of shelf.filter((x) => x.kind === "shared" && onShelf(x))) {
      if (seen.has(r.topic) || have.has(r.topic.toLowerCase())) continue; seen.add(r.topic);
      items.push({ kind: "shared", id: r.libraryId, topic: r.title, outcome: r.outcome, cover: await url(r.cover), score: (r.mode && r.mode === myMode ? 10 : 0) + r.starts });
    }
    return items.sort((a, b) => b.score - a.score).slice(0, 3).map(({ score: _s, ...x }) => x);
  },
});

