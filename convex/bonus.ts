// Bonus lessons: "go deeper" (every exercise right first time) and "another way" (one was missed).
// Written once per book and shared; a translated book translates the English bonus.
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, mutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ANOTHER_PROMPT, DEEPER_PROMPT, bonusUserMessage, type BonusKind } from "./prompts";
import {
  STUCK_WRITING_MS, bonusChapter, bonusFinished, bonusKindV, bonusUnlocked, exerciseIndexes, limiter, ownedHandbook,
  shuffleExercises, translationsOf,
} from "./handbooks";

const BONUS_PROMPT: Record<BonusKind, string> = { deeper: DEEPER_PROMPT, another: ANOTHER_PROMPT };
const BONUS_FALLBACK_TITLE: Record<BonusKind, (n: number) => string> = {
  deeper: (n) => `Going deeper on chapter ${n}`,
  another: (n) => `Chapter ${n}, another way`,
};

function isWriting(row: { status: string; startedAt?: number; createdAt: number } | null) {
  return row?.status === "writing" && Date.now() - (row.startedAt ?? row.createdAt) < STUCK_WRITING_MS;
}

async function markBonusWriting(ctx: MutationCtx, bookId: Id<"books">, kind: BonusKind, n: number) {
  const now = Date.now();
  const existing = await bonusChapter(ctx, bookId, kind, n);
  if (existing) await ctx.db.patch(existing._id, { status: "writing", error: undefined, startedAt: now });
  else await ctx.db.insert("bonusChapters", { bookId, kind, n, status: "writing", createdAt: now, startedAt: now });
}

async function failBonus(ctx: MutationCtx, bookId: Id<"books">, kind: BonusKind, n: number, error: string) {
  const existing = await bonusChapter(ctx, bookId, kind, n);
  if (existing) await ctx.db.patch(existing._id, { status: "failed", error });
  else await ctx.db.insert("bonusChapters", { bookId, kind, n, status: "failed", error, createdAt: Date.now() });
}

// Ask for chapter n's bonus of this kind. Only one they've unlocked; written once per book and
// shared, so the second person to unlock it gets it straight away.
export const requestBonus = mutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), kind: bonusKindV, deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, n, kind, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    const book = h.bookId ? await ctx.db.get(h.bookId) : null;
    if (!book || !bonusUnlocked(p, kind).includes(n)) throw new Error("Not unlocked");
    const existing = await bonusChapter(ctx, book._id, kind, n);
    if (existing?.status === "ready") return { ready: true as const };
    if (isWriting(existing)) return { ready: false as const };
    const all = await limiter.limit(ctx, "generateAll");
    const mine = await limiter.limit(ctx, "generateDevice", { key: deviceToken ?? String(h.userId) });
    if (!all.ok || !mine.ok) throw new Error("busy");
    await markBonusWriting(ctx, book._id, kind, n);
    if (!book.sourceBookId) {
      await ctx.scheduler.runAfter(0, internal.bonus.generateBonus, { bookId: book._id, kind, n });
      return { ready: false as const };
    }
    // A translated book: translate the English bonus, writing it first if no one has yet.
    const english = await bonusChapter(ctx, book.sourceBookId, kind, n);
    if (english?.status === "ready") await ctx.scheduler.runAfter(0, internal.translations.translateBonus, { bookId: book._id, kind, n });
    else if (!isWriting(english)) {
      await markBonusWriting(ctx, book.sourceBookId, kind, n);
      await ctx.scheduler.runAfter(0, internal.bonus.generateBonus, { bookId: book.sourceBookId, kind, n });
    }
    return { ready: false as const };
  },
});

export const generateBonus = internalAction({
  args: { bookId: v.id("books"), kind: bonusKindV, n: v.number() },
  handler: async (ctx, { bookId, kind, n }) => {
    const book = await ctx.runQuery(internal.handbooks.readBook, { bookId });
    const chapter = await ctx.runQuery(internal.handbooks.readChapter, { bookId, n });
    if (!book?.plan || chapter?.status !== "ready") {
      await ctx.runMutation(internal.bonus.setBonusFailed, { bookId, kind, n, error: "chapter not ready" });
      return;
    }
    const r = await ctx.runAction(internal.ai.generate, {
      kind, system: BONUS_PROMPT[kind],
      user: bonusUserMessage(kind, book.plan, book.level, book.language, book.voice, n, { title: chapter.title, cards: chapter.cards }),
    });
    if (!r.ok) { await ctx.runMutation(internal.bonus.setBonusFailed, { bookId, kind, n, error: r.error }); return; }
    const cards = r.json?.cards;
    const exercises = Array.isArray(cards) ? cards.filter((c: any) => c.type === "exercise") : [];
    const sane = Array.isArray(cards) && cards.length >= 4 && exercises.length >= 1 &&
      exercises.every((e: any) => Array.isArray(e.options) && e.options.length === 3 && e.options.some((o: any) => o.id === e.answer));
    if (!sane) { await ctx.runMutation(internal.bonus.setBonusFailed, { bookId, kind, n, error: "bonus failed the shape check" }); return; }
    await ctx.runMutation(internal.bonus.saveBonus, { bookId, kind, n, title: String(r.json.title ?? BONUS_FALLBACK_TITLE[kind](n)), cards });
  },
});

export const saveBonus = internalMutation({
  args: { bookId: v.id("books"), kind: bonusKindV, n: v.number(), title: v.string(), cards: v.any() },
  handler: async (ctx, { bookId, kind, n, title, cards }) => {
    const existing = await bonusChapter(ctx, bookId, kind, n);
    const doc = { status: "ready" as const, title, cards: shuffleExercises(cards, `${bookId}:${kind}:${n}`), error: undefined };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("bonusChapters", { bookId, kind, n, createdAt: Date.now(), ...doc });
    // Translations waiting on this bonus can go now.
    for (const t of await translationsOf(ctx, bookId)) {
      if ((await bonusChapter(ctx, t._id, kind, n))?.status === "writing") await ctx.scheduler.runAfter(0, internal.translations.translateBonus, { bookId: t._id, kind, n });
    }
  },
});

export const setBonusFailed = internalMutation({
  args: { bookId: v.id("books"), kind: bonusKindV, n: v.number(), error: v.string() },
  handler: async (ctx, { bookId, kind, n, error }) => {
    await failBonus(ctx, bookId, kind, n, error);
    for (const t of await translationsOf(ctx, bookId)) {
      if ((await bonusChapter(ctx, t._id, kind, n))?.status === "writing") await failBonus(ctx, t._id, kind, n, `English bonus failed: ${error}`);
    }
  },
});

// A bonus is done once each of its exercises has been answered right (at any attempt).
export const finishBonus = mutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), kind: bonusKindV, deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, n, kind, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    const bonus = h.bookId ? await bonusChapter(ctx, h.bookId, kind, n) : null;
    if (!p || bonus?.status !== "ready") throw new Error("No bonus to finish");
    const answers = await ctx.db.query("answers").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).collect();
    const rightOnes = new Set(answers.filter((a) => a.bonus && (a.bonusKind ?? "deeper") === kind && a.chapter === n && a.correct).map((a) => a.cardIndex));
    if (!exerciseIndexes(bonus.cards).every((i) => rightOnes.has(i))) throw new Error("Finish the exercises first");
    const done = bonusFinished(p, kind);
    if (done.includes(n)) return;
    await ctx.db.patch(p._id, { ...(kind === "deeper" ? { bonusPassed: [...done, n] } : { anotherPassed: [...done, n] }), updatedAt: Date.now() });
  },
});
