// Bonus lessons: "go deeper" (every exercise of a chapter right first time) and "another way" (one was
// missed). Written for this handbook the first time the reader asks, with the reader's profile line, and
// fact checked like a chapter before it's shown. Never required, never moves the rung.
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, mutation, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { ANOTHER_PROMPT, DEEPER_PROMPT, bonusUserMessage } from "./prompts";
import { ENGLISH } from "./languages";
import { translateChapterText } from "./translations";
import { type BonusKind, bonusChapter, bonusFinished, bonusKindV, bonusUnlocked, factCheck, ownedHandbook, shuffleExercises, takeGeneration } from "./handbooks";

const BONUS_PROMPT: Record<BonusKind, string> = { deeper: DEEPER_PROMPT, another: ANOTHER_PROMPT };
const BONUS_FALLBACK_TITLE: Record<BonusKind, (n: number) => string> = {
  deeper: (n) => `Going deeper on chapter ${n}`,
  another: (n) => `Chapter ${n}, another way`,
};
// A bonus still "writing" after this long is treated as stuck, and asking again rewrites it.
const STUCK_WRITING_MS = 5 * 60 * 1000;

function isWriting(row: Doc<"bonusChapters"> | null) {
  return row?.status === "writing" && Date.now() - (row.startedAt ?? row.createdAt) < STUCK_WRITING_MS;
}

async function setStatus(ctx: MutationCtx, handbookId: Id<"handbooks">, kind: BonusKind, n: number, fields: { status: "writing" | "failed"; error?: string }) {
  const now = Date.now();
  const existing = await bonusChapter(ctx, handbookId, kind, n);
  const doc = { ...fields, error: fields.error, ...(fields.status === "writing" ? { startedAt: now } : {}) };
  if (existing) await ctx.db.patch(existing._id, doc);
  else await ctx.db.insert("bonusChapters", { handbookId, kind, n, createdAt: now, ...doc });
}

// Every card has the words it needs to be shown: a body, or for an exercise a prompt and three options with
// one marked answer. A card without them would break the chapter screen, so the lesson is refused instead.
function wellFormed(cards: unknown): cards is any[] {
  if (!Array.isArray(cards) || cards.length < 4) return false;
  const exercises = cards.filter((c: any) => c?.type === "exercise");
  if (exercises.length < 1) return false;
  return cards.every((c: any) => c?.type === "exercise"
    ? typeof c.prompt === "string" && Array.isArray(c.options) && c.options.length === 3 && c.options.every((o: any) => typeof o?.text === "string") && c.options.some((o: any) => o.id === c.answer)
    : typeof c?.body === "string" && c.body.trim().length > 0);
}

// Ask for chapter n's bonus of this kind. Only one they've unlocked; counted against the same caps as a chapter.
export const requestBonus = mutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), kind: bonusKindV, deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, n, kind, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    if (!h.plan || !bonusUnlocked(p, kind).includes(n)) throw new Error("Not unlocked");
    const existing = await bonusChapter(ctx, handbookId, kind, n);
    if (existing?.status === "ready") return { ready: true as const };
    if (isWriting(existing)) return { ready: false as const };
    if (!(await takeGeneration(ctx, h))) throw new Error("busy");
    await setStatus(ctx, handbookId, kind, n, { status: "writing" });
    await ctx.scheduler.runAfter(0, internal.bonus.generateBonus, { handbookId, kind, n });
    return { ready: false as const };
  },
});

export const generateBonus = internalAction({
  args: { handbookId: v.id("handbooks"), kind: bonusKindV, n: v.number() },
  handler: async (ctx, { handbookId, kind, n }) => {
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    const chapter = await ctx.runQuery(internal.handbooks.readChapter, { handbookId, n });
    if (!h?.plan || chapter?.status !== "ready") {
      await ctx.runMutation(internal.bonus.setBonusFailed, { handbookId, kind, n, error: "chapter not ready" });
      return;
    }
    const prof = await ctx.runQuery(internal.handbooks.readProfileLine, { handbookId });
    // Written in English from the English plan (the chapter's cards as the reader read them), then translated.
    const r = await ctx.runAction(internal.ai.generate, {
      kind, system: BONUS_PROMPT[kind],
      user: bonusUserMessage(kind, h.sourcePlan ?? h.plan, h.level, ENGLISH, h.voice ?? "friend", n, { title: chapter.title, cards: chapter.cards }, prof.line),
    });
    if (!r.ok) { await ctx.runMutation(internal.bonus.setBonusFailed, { handbookId, kind, n, error: r.error }); return; }
    const cards = r.json?.cards;
    if (!wellFormed(cards)) { await ctx.runMutation(internal.bonus.setBonusFailed, { handbookId, kind, n, error: "bonus failed the shape check" }); return; }
    const title = String(r.json.title ?? BONUS_FALLBACK_TITLE[kind](n));
    // Same rule as a live chapter: checked before the reader sees it; a failed check never blocks it.
    const checked = await factCheck(ctx, (h.sourcePlan ?? h.plan)?.topic ?? h.topic, h.level, title, cards);
    const t = await translateChapterText(ctx, h.language, h.voice ?? "friend", kind, { title, cards: checked.cards });
    if (!t.ok) { await ctx.runMutation(internal.bonus.setBonusFailed, { handbookId, kind, n, error: t.error }); return; }
    await ctx.runMutation(internal.bonus.saveBonus, { handbookId, kind, n, title: t.title, cards: t.cards, factCheck: checked.report });
  },
});

export const saveBonus = internalMutation({
  args: { handbookId: v.id("handbooks"), kind: bonusKindV, n: v.number(), title: v.string(), cards: v.any(), factCheck: v.optional(v.any()) },
  handler: async (ctx, { handbookId, kind, n, title, cards, factCheck }) => {
    const existing = await bonusChapter(ctx, handbookId, kind, n);
    const doc = { status: "ready" as const, title, cards: shuffleExercises(cards, `${handbookId}:${kind}:${n}`), factCheck, error: undefined };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("bonusChapters", { handbookId, kind, n, createdAt: Date.now(), ...doc });
  },
});

export const setBonusFailed = internalMutation({
  args: { handbookId: v.id("handbooks"), kind: bonusKindV, n: v.number(), error: v.string() },
  handler: async (ctx, { handbookId, kind, n, error }) => { await setStatus(ctx, handbookId, kind, n, { status: "failed", error }); },
});

export const readBonus = internalQuery({
  args: { handbookId: v.id("handbooks"), kind: bonusKindV, n: v.number() },
  handler: async (ctx, { handbookId, kind, n }) => bonusChapter(ctx, handbookId, kind, n),
});

// A bonus is done once each of its exercises has been answered right (at any attempt).
export const finishBonus = mutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), kind: bonusKindV, deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, n, kind, deviceToken }) => {
    await ownedHandbook(ctx, handbookId, deviceToken);
    const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    const bonus = await bonusChapter(ctx, handbookId, kind, n);
    if (!p || bonus?.status !== "ready") throw new Error("No bonus to finish");
    // Bounded: a handbook's answers are a few hundred at most (7 chapters, a handful of tries each).
    const answers = await ctx.db.query("answers").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).take(2000);
    const rightOnes = new Set(answers.filter((a) => a.bonus && (a.bonusKind ?? "deeper") === kind && a.chapter === n && a.correct).map((a) => a.cardIndex));
    const exercises = (bonus.cards ?? []).flatMap((c: any, i: number) => (c?.type === "exercise" ? [i] : []));
    if (!exercises.every((i: number) => rightOnes.has(i))) throw new Error("Finish the exercises first");
    const done = bonusFinished(p, kind);
    if (done.includes(n)) return;
    await ctx.db.patch(p._id, { ...(kind === "deeper" ? { bonusPassed: [...done, n] } : { anotherPassed: [...done, n] }), updatedAt: Date.now() });
  },
});
