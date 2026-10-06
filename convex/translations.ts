// Reading in your language. Every plan, chapter and bonus lesson is written (and fact checked) in English,
// then translated into the handbook's language before the reader sees it: Sarvam for Indian languages,
// Gemini otherwise (translate.ts). A ready (cached) topic is translated a chapter at a time, as it's reached.
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, type ActionCtx } from "./_generated/server";
import { ENGLISH } from "./languages";
import { ensureChapter } from "./handbooks";
import { chapterFromUnits, chapterUnits, planFromUnits, planUnits, readableGroups, withTranslations } from "./translateShape";

type Voice = "friend" | "straight" | "stories";
type Translated = { ok: true; groups: string[][] } | { ok: false; error: string };
type ChapterText = { title: string; outcomeLine: string; cards: any[] };

// A plan in the handbook's language (unchanged for English).
export async function translatePlanText(ctx: ActionCtx, language: string, voice: Voice, plan: any): Promise<{ ok: true; plan: any } | { ok: false; error: string }> {
  if (language === ENGLISH) return { ok: true, plan };
  const units = planUnits(plan);
  const r: Translated = await ctx.runAction(internal.translate.groups, { language, voice, kind: "plan", groups: readableGroups(units) });
  return r.ok ? { ok: true, plan: planFromUnits(withTranslations(units, r.groups)) } : r;
}

// A chapter or bonus lesson in the handbook's language. Ids, answer keys, links and option order never change.
export async function translateChapterText(ctx: ActionCtx, language: string, voice: Voice, kind: string, ch: { title?: string; outcomeLine?: string; cards?: any[] }): Promise<({ ok: true } & ChapterText) | { ok: false; error: string }> {
  if (language === ENGLISH) return { ok: true, title: ch.title ?? "", outcomeLine: ch.outcomeLine ?? "", cards: ch.cards ?? [] };
  const units = chapterUnits(ch);
  const r: Translated = await ctx.runAction(internal.translate.groups, { language, voice, kind, groups: readableGroups(units) });
  return r.ok ? { ok: true, ...chapterFromUnits(withTranslations(units, r.groups)) } : r;
}

// ---------- ready (cached) topics in another language ----------

// The ready topic's plan, translated; the English plan is kept for writing anything later.
export const planFromCache = internalAction({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    if (!h) return;
    const row = await ctx.runQuery(internal.pictures.readCacheChapter, { topicKey: h.topicKey, level: h.level, n: 1 });
    if (!row?.plan) { await ctx.runMutation(internal.generate.setFailed, { handbookId, error: "ready topic missing" }); return; }
    const r = await translatePlanText(ctx, h.language, h.voice ?? "friend", row.plan);
    if (!r.ok) { await ctx.runMutation(internal.generate.setFailed, { handbookId, error: r.error }); return; }
    await ctx.runMutation(internal.translations.savePlanFromCache, { handbookId, plan: r.plan, sourcePlan: row.plan, topic: String(r.plan.topic ?? row.topic) });
  },
});

export const savePlanFromCache = internalMutation({
  args: { handbookId: v.id("handbooks"), plan: v.any(), sourcePlan: v.any(), topic: v.string() },
  handler: async (ctx, { handbookId, plan, sourcePlan, topic }) => {
    const h = await ctx.db.get(handbookId);
    if (!h) return;
    await ctx.db.patch(handbookId, { status: "ready", plan, sourcePlan, topic, question: undefined, error: undefined });
    await ensureChapter(ctx, { ...h, plan, sourcePlan }, 1);
  },
});

// One ready chapter, translated. Its pictures stay: the cards keep their order.
export const chapterFromCache = internalAction({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }) => {
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    if (!h) return;
    const row = await ctx.runQuery(internal.pictures.readCacheChapter, { topicKey: h.topicKey, level: h.level, n });
    const english = row?.chapter;
    if (!english) { await ctx.runMutation(internal.generate.setChapterFailed, { handbookId, n, error: "ready chapter missing" }); return; }
    const r = await translateChapterText(ctx, h.language, h.voice ?? "friend", "chapter", english);
    if (!r.ok) { await ctx.runMutation(internal.generate.setChapterFailed, { handbookId, n, error: r.error }); return; }
    await ctx.runMutation(internal.translations.saveChapterFromCache, { handbookId, n, title: r.title, outcomeLine: r.outcomeLine, cards: r.cards, svg: english.svg, pictures: english.pictures });
  },
});

// Saved as translated: the ready chapter's exercises are already shuffled, so no reshuffle.
export const saveChapterFromCache = internalMutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), title: v.string(), outcomeLine: v.string(), cards: v.any(), svg: v.optional(v.string()), pictures: v.optional(v.any()) },
  handler: async (ctx, { handbookId, n, title, outcomeLine, cards, svg, pictures }) => {
    const existing = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    const doc = { status: "ready" as const, title, cards, outcomeLine, svg, pictures, error: undefined };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("chapters", { handbookId, n, createdAt: Date.now(), ...doc });
  },
});
