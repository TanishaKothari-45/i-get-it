import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { DOCTOR_PROMPT } from "./prompts";
import { factCheck } from "./handbooks";
import { isOwner } from "./admin";
import { FROZEN } from "./frozen";
import { problems } from "./schemas";

// Self-improving handbooks (6 Oct, Prateek: "if multiple people start and quit a handbook, generate a much better
// output... and see the A/B test results"). Ready topics only: their chapter 1 is shared, so one fix serves everyone.
const HOUR = 3600000, DAY = 24 * HOUR;
const MIN_ARM = 8;          // readers on each side before deciding
const MARGIN = 0.10;        // B must get at least 10 more readers in 100 through chapter 1

// Which ready topics are losing readers in chapter 1: 2+ quit, and 40%+ of the last 14 days' starts.
export const candidates = internalQuery({
  args: {},
  handler: async (ctx) => {
    const excluded = await ctx.db.query("statsExcluded").collect();
    const xTokens = new Set(excluded.map((e) => e.deviceToken).filter(Boolean) as string[]);
    const since = Date.now() - 14 * DAY;
    const running = new Set((await ctx.db.query("experiments").collect()).filter((e) => e.status === "running").map((e) => e.topic));
    // Only topics still on the shelf: an old topic with no stored copy (the first Avengers) has nothing to rewrite.
    const shelf = new Set((await ctx.db.query("cache").collect()).filter((r) => r.level === "new").map((r) => r.topic));
    const books = (await ctx.db.query("handbooks").collect()).filter((h) => h.source === "cache" && h.createdAt >= since && !h.ownerToken?.startsWith("abuse-") && !(h.ownerToken && xTokens.has(h.ownerToken)));
    const byTopic = new Map<string, Doc<"handbooks">[]>();
    for (const h of books) { if (!byTopic.has(h.topic)) byTopic.set(h.topic, []); byTopic.get(h.topic)!.push(h); }
    const out: any[] = [];
    for (const [topic, hs] of byTopic) {
      if (running.has(topic) || !shelf.has(topic) || FROZEN.has(topic)) continue;   // frozen: shown in a live post or ad
      const quitters: any[] = [];
      for (const h of hs) {
        const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
        if (!p || p.chaptersPassed.includes(1) || p.currentChapter !== 1 || p.lastOpenedAt > Date.now() - 2 * HOUR) continue;
        const answers = (await ctx.db.query("answers").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).collect()).filter((a) => a.chapter === 1 && !a.recall);
        if (p.currentCard === 0 && !answers.length) continue;   // never really started reading
        const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id).eq("n", 1)).unique();
        quitters.push({ stoppedAtCard: p.currentCard, of: ch?.cards?.length ?? null,
          missed: answers.filter((a) => !a.correct).map((a) => ({ card: a.cardIndex, picked: (ch?.cards?.[a.cardIndex] as any)?.options?.find((o: any) => o.id === a.optionId)?.text ?? a.optionId })) });
      }
      if (quitters.length >= 2 && quitters.length / hs.length >= 0.4) out.push({ topic, starts: hs.length, quitters });
    }
    return out;
  },
});

// Diagnose one topic and start an A/B test with the rewrite.
export const diagnose = internalAction({
  args: { topic: v.string(), evidence: v.any() },
  handler: async (ctx, { topic, evidence }): Promise<any> => {
    const row: any = await ctx.runQuery(internal.doctor.readTopic, { topic });
    if (!row) return { ok: false, error: "no such ready topic" };
    const ch = row.chapters.find((c: any) => c.n === 1);
    const r: any = await ctx.runAction(internal.ai.generate, { kind: "repair", system: DOCTOR_PROMPT,
      user: `Topic: ${row.plan?.topic ?? topic}\nMode: ${row.plan?.mode ?? "subject"}\nChapter 1: ${ch.title}\nCards:\n${JSON.stringify(ch.cards, null, 1)}\n\nReaders who quit:\n${JSON.stringify(evidence.quitters ?? evidence, null, 1)}` });
    if (!r.ok) return { ok: false, error: r.error };
    const cards = Array.isArray(r.json?.cards) ? r.json.cards : [];
    const exercises = cards.filter((c: any) => c?.type === "exercise");
    if (cards.length < 6 || !exercises.every((e: any) => Array.isArray(e.options) && e.options.length === 3 && e.options.some((o: any) => o.id === e.answer))) return { ok: false, error: "rewrite failed the shape check" };
    const checked = await factCheck(ctx, row.plan?.topic ?? topic, row.level, ch.title ?? "", cards);
    const id: Id<"experiments"> | null = await ctx.runMutation(internal.doctor.start, { topic, topicKey: row.topicKey, level: row.level, diagnosis: String(r.json.diagnosis ?? "").slice(0, 800), lesson: String(r.json.lesson ?? "").slice(0, 300), evidence, b: { title: ch.title, cards: checked.cards, outcomeLine: ch.outcomeLine } });
    if (!id) return { ok: false, error: "the rewrite had a card the app can't show" };
    await ctx.scheduler.runAfter(0, internal.images.forExperiment, { experimentId: id });
    return { ok: true, id, diagnosis: r.json.diagnosis, lesson: r.json.lesson };
  },
});

export const readTopic = internalQuery({
  args: { topic: v.string() },
  handler: async (ctx, { topic }) => (await ctx.db.query("cache").collect()).find((r) => r.topic === topic && r.level === "new") ?? null,
});
export const readExperiment = internalQuery({ args: { id: v.id("experiments") }, handler: async (ctx, { id }) => ctx.db.get(id) });

// A rewrite the app can't show (8 Oct: B chapter 1s with a "poll" card and no body blanked the screen for half of
// Public speaking's new readers). Checked against the chapter schema before a test starts and before a reader is put on B.
export function unshowable(b: any): string | null {
  return problems("chapter", { title: String(b?.title ?? "chapter 1"), cards: Array.isArray(b?.cards) ? b.cards : [] });
}
export const start = internalMutation({
  args: { topic: v.string(), topicKey: v.string(), level: v.union(v.literal("new"), v.literal("some")), diagnosis: v.string(), lesson: v.string(), evidence: v.any(), b: v.any() },
  handler: async (ctx, a) => {
    const bad = FROZEN.has(a.topic) ? "topic is frozen (shown in a live post or ad)" : unshowable(a.b);
    if (bad) { console.log("doctor: B rejected", a.topic, bad.slice(0, 200)); return null; }
    return ctx.db.insert("experiments", { ...a, status: "running", aStarts: 0, aPasses: 0, bStarts: 0, bPasses: 0, startedAt: Date.now() });
  },
});
// Stop every running test whose B the app can't show, or whose topic is frozen, and put its B readers back on the
// normal chapter 1 (cards, pictures and recall from the cache row). Run: npx convex run --prod doctor:stopBroken '{}'
export const stopBroken = internalMutation({
  args: {},
  handler: async (ctx) => {
    const out: any[] = [];
    const books = await ctx.db.query("handbooks").collect();
    for (const e of await ctx.db.query("experiments").collect()) {
      if (e.status !== "running") continue;
      const why = unshowable(e.b) ? "B has a card the app can't show" : FROZEN.has(e.topic) ? "topic is frozen" : null;
      if (!why) continue;
      await ctx.db.patch(e._id, { status: "stopped", endedAt: Date.now() });
      const cache = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", e.topicKey).eq("level", e.level)).unique();
      const a: any = cache?.chapters.find((c: any) => c.n === 1);
      let moved = 0;
      for (const h of books) {
        if (h.experimentId !== e._id || h.variant !== "b") continue;
        const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id).eq("n", 1)).unique();
        if (ch && a) await ctx.db.patch(ch._id, { cards: a.cards, pictures: a.pictures ?? [], recallCards: a.recallCards, quizTiers: a.quizTiers, recallTiers: a.recallTiers, cacheVersion: cache!.version } as any);
        await ctx.db.patch(h._id, { variant: "a" });
        moved++;
      }
      out.push({ topic: e.topic, why, bReadersMovedToA: moved });
    }
    return out;
  },
});
export const setBPictures = internalMutation({
  args: { id: v.id("experiments"), pictures: v.any() },
  handler: async (ctx, { id, pictures }) => {
    const e = await ctx.db.get(id);
    if (!e) return;
    await ctx.db.patch(id, { b: { ...e.b, pictures } });
    // Readers already on B started before the pictures were drawn: give them the pictures too.
    for (const h of await ctx.db.query("handbooks").collect()) {
      if (h.experimentId !== id || h.variant !== "b") continue;
      const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id).eq("n", 1)).unique();
      if (ch && !(ch.pictures ?? []).length) await ctx.db.patch(ch._id, { pictures });
    }
  },
});

// Called when a reader starts a ready topic: if it has a running test, pick a side (half and half by their phone).
export async function assignVariant(ctx: MutationCtx, topic: string, deviceToken: string): Promise<{ experimentId: Id<"experiments">; variant: "a" | "b"; b: any } | null> {
  // Frozen topics (frozen.ts) never split readers: what a post shows must be what the app shows (8 Oct, 71).
  if (FROZEN.has(topic)) return null;
  const e = (await ctx.db.query("experiments").withIndex("by_topic", (q) => q.eq("topic", topic).eq("level", "new")).collect()).find((x) => x.status === "running" && !unshowable(x.b));
  if (!e) return null;
  let h = 0; for (const c of deviceToken + e._id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const variant = h % 2 === 0 ? "a" : "b";
  await ctx.db.patch(e._id, variant === "a" ? { aStarts: e.aStarts + 1 } : { bStarts: e.bStarts + 1 });
  return { experimentId: e._id, variant, b: e.b };
}

export const countPass = internalMutation({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    const h = await ctx.db.get(handbookId);
    const e = h?.experimentId ? await ctx.db.get(h.experimentId) : null;
    if (!e || e.status !== "running") return;
    await ctx.db.patch(e._id, h!.variant === "b" ? { bPasses: e.bPasses + 1 } : { aPasses: e.aPasses + 1 });
  },
});

async function promote(ctx: MutationCtx, e: Doc<"experiments">) {
  await ctx.runMutation(internal.repairData.replaceCards, { topicKey: e.topicKey, level: e.level, n: 1, cards: e.b.cards });
  await ctx.scheduler.runAfter(0, internal.shelf.syncReadyTopic, { topic: e.topic });
  for (const c of await ctx.db.query("cache").collect()) {
    if (c.topic !== e.topic || c.level !== e.level) continue;
    await ctx.db.patch(c._id, { improvedAt: Date.now(), chapters: c.chapters.map((x: any) => (x.n === 1 ? { ...x, cards: e.b.cards, ...(e.b.pictures ? { pictures: e.b.pictures } : {}) } : x)) });
  }
  await ctx.db.patch(e._id, { status: "promoted", endedAt: Date.now() });
}

// Decide finished tests: B wins only with 8+ readers a side and 10+ points more passing chapter 1.
export const decide = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const e of await ctx.db.query("experiments").collect()) {
      if (e.status !== "running" || e.aStarts < MIN_ARM || e.bStarts < MIN_ARM) continue;
      const a = e.aPasses / e.aStarts, b = e.bPasses / e.bStarts;
      if (b - a >= MARGIN) await promote(ctx, e);
      else await ctx.db.patch(e._id, { status: "stopped", endedAt: Date.now() });
    }
  },
});

// Daily (crons.ts): decide finished tests, then diagnose up to 2 topics that are losing readers.
export const scan = internalAction({
  args: {},
  handler: async (ctx): Promise<any> => {
    await ctx.runMutation(internal.doctor.decide, {});
    const cands: any[] = await ctx.runQuery(internal.doctor.candidates, {});
    for (const c of cands.slice(0, 2)) await ctx.scheduler.runAfter(0, internal.doctor.diagnose, { topic: c.topic, evidence: c });
    return cands.map((c) => `${c.topic}: ${c.quitters.length} of ${c.starts} quit`);
  },
});

// /admin: the tests, their diagnosis and lesson, live numbers; promote or stop by hand.
export const adminList = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isOwner(ctx)).ok) return null;
    return (await ctx.db.query("experiments").collect()).sort((a, b) => b.startedAt - a.startedAt)
      .map((e) => ({ id: e._id, topic: e.topic, status: e.status, diagnosis: e.diagnosis, lesson: e.lesson, aStarts: e.aStarts, aPasses: e.aPasses, bStarts: e.bStarts, bPasses: e.bPasses, startedAt: e.startedAt, quit: (e.evidence?.quitters ?? []).length, starts: e.evidence?.starts ?? null }));
  },
});
export const ownerAction = mutation({
  args: { id: v.id("experiments"), action: v.union(v.literal("promote"), v.literal("stop")) },
  handler: async (ctx, { id, action }) => {
    if (!(await isOwner(ctx)).ok) throw new Error("Owner only");
    const e = await ctx.db.get(id);
    if (!e || e.status !== "running") return;
    if (action === "promote") await promote(ctx, e); else await ctx.db.patch(id, { status: "stopped", endedAt: Date.now() });
  },
});
export const scanNow = mutation({
  args: {},
  handler: async (ctx) => { if (!(await isOwner(ctx)).ok) throw new Error("Owner only"); await ctx.scheduler.runAfter(0, internal.doctor.scan, {}); },
});
