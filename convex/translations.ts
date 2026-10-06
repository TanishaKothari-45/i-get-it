// Translated books: a plan, a chapter or a bonus lesson in the reader's language, translated from the
// English book's. Translated once, the first time someone reaches it, and shared like any book.
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { addKeys, bonusChapter, bookChapter, ensureChapter, topicKeyOf, translationOf } from "./handbooks";
import { chapterFromUnits, chapterUnits, planFromUnits, planUnits, readableGroups, withTranslations } from "./translateShape";

const bonusKindV = v.union(v.literal("deeper"), v.literal("another"));
type Translated = { ok: true; groups: string[][] } | { ok: false; error: string };

// ---------- the plan ----------

export const translatePlan = internalAction({
  args: { handbookId: v.id("handbooks"), sourceBookId: v.id("books") },
  handler: async (ctx, { handbookId, sourceBookId }) => {
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    const english = await ctx.runQuery(internal.handbooks.readBook, { bookId: sourceBookId });
    if (!h) return;
    if (!english?.plan) { await ctx.runMutation(internal.handbooks.setFailed, { handbookId, error: "English plan missing" }); return; }
    const units = planUnits(english.plan);
    const r: Translated = await ctx.runAction(internal.translate.groups, { language: h.language, voice: english.voice, kind: "plan", groups: readableGroups(units) });
    if (!r.ok) { await ctx.runMutation(internal.handbooks.setFailed, { handbookId, error: r.error }); return; }
    const plan = planFromUnits(withTranslations(units, r.groups));
    await ctx.runMutation(internal.translations.saveTranslatedPlan, { handbookId, sourceBookId, plan });
  },
});

// The translated plan becomes the language's book (unless one appeared meanwhile), and the handbook points to it.
export const saveTranslatedPlan = internalMutation({
  args: { handbookId: v.id("handbooks"), sourceBookId: v.id("books"), plan: v.any() },
  handler: async (ctx, { handbookId, sourceBookId, plan }) => {
    const h = await ctx.db.get(handbookId);
    const english = await ctx.db.get(sourceBookId);
    if (!h || !english) return;
    let book: Doc<"books"> | null = await translationOf(ctx, english, h.language);
    if (!book) {
      // Same voice and lifetime as the English it came from.
      const bookId = await ctx.db.insert("books", {
        topic: String(plan.topic ?? english.topic), level: english.level, language: h.language, voice: english.voice, plan, source: "live",
        createdAt: Date.now(), freshness: english.freshness, expiresAt: english.expiresAt, sourceBookId: english._id,
        ...(english.private ? { private: true } : {}),
      });
      book = (await ctx.db.get(bookId))!;
    }
    // A translation of a private book stays private: no topic keys.
    if (!book.private) await addKeys(ctx, book, [h.topicKey, topicKeyOf(String(english.plan?.topic ?? "")), topicKeyOf(String(plan.topic ?? ""))]);
    await ctx.db.patch(handbookId, { status: "ready", bookId: book._id, question: undefined, error: undefined });
    await ensureChapter(ctx, book, 1);
  },
});

// ---------- chapters ----------

export const translateChapter = internalAction({
  args: { bookId: v.id("books"), n: v.number() },
  handler: async (ctx, { bookId, n }) => {
    const book = await ctx.runQuery(internal.handbooks.readBook, { bookId });
    if (!book?.sourceBookId) return;
    const english = await ctx.runQuery(internal.handbooks.readChapter, { bookId: book.sourceBookId, n });
    if (english?.status !== "ready") { await ctx.runMutation(internal.handbooks.setChapterFailed, { bookId, n, error: "English chapter not ready" }); return; }
    const units = chapterUnits(english);
    const r: Translated = await ctx.runAction(internal.translate.groups, { language: book.language, voice: book.voice, kind: "chapter", groups: readableGroups(units) });
    if (!r.ok) { await ctx.runMutation(internal.handbooks.setChapterFailed, { bookId, n, error: r.error }); return; }
    await ctx.runMutation(internal.translations.saveTranslatedChapter, { bookId, n, ...chapterFromUnits(withTranslations(units, r.groups)) });
  },
});

// Saved as translated: the exercises keep the English chapter's option order and answer keys (no reshuffle).
export const saveTranslatedChapter = internalMutation({
  args: { bookId: v.id("books"), n: v.number(), title: v.string(), outcomeLine: v.string(), cards: v.any() },
  handler: async (ctx, { bookId, n, title, outcomeLine, cards }) => {
    const existing = await bookChapter(ctx, bookId, n);
    const doc = { status: "ready" as const, title, cards, outcomeLine, error: undefined };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("chapters", { bookId, n, createdAt: Date.now(), ...doc });
  },
});

// ---------- bonus lessons ----------

export const readBonus = internalQuery({
  args: { bookId: v.id("books"), kind: bonusKindV, n: v.number() },
  handler: async (ctx, { bookId, kind, n }) => bonusChapter(ctx, bookId, kind, n),
});

export const translateBonus = internalAction({
  args: { bookId: v.id("books"), kind: bonusKindV, n: v.number() },
  handler: async (ctx, { bookId, kind, n }) => {
    const book = await ctx.runQuery(internal.handbooks.readBook, { bookId });
    if (!book?.sourceBookId) return;
    const english = await ctx.runQuery(internal.translations.readBonus, { bookId: book.sourceBookId, kind, n });
    if (english?.status !== "ready") { await ctx.runMutation(internal.bonus.setBonusFailed, { bookId, kind, n, error: "English bonus not ready" }); return; }
    const units = chapterUnits(english);
    const r: Translated = await ctx.runAction(internal.translate.groups, { language: book.language, voice: book.voice, kind, groups: readableGroups(units) });
    if (!r.ok) { await ctx.runMutation(internal.bonus.setBonusFailed, { bookId, kind, n, error: r.error }); return; }
    const { title, cards } = chapterFromUnits(withTranslations(units, r.groups));
    await ctx.runMutation(internal.translations.saveTranslatedBonus, { bookId, kind, n, title, cards });
  },
});

export const saveTranslatedBonus = internalMutation({
  args: { bookId: v.id("books"), kind: bonusKindV, n: v.number(), title: v.string(), cards: v.any() },
  handler: async (ctx, { bookId, kind, n, title, cards }) => {
    const existing = await bonusChapter(ctx, bookId, kind, n);
    const doc = { status: "ready" as const, title, cards, error: undefined };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("bonusChapters", { bookId, kind, n, createdAt: Date.now(), ...doc });
  },
});
