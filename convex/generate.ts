// Writing a handbook: the plan, each chapter (fact checked, then translated), and what the writer learns from how the
// reader did. Internal only: started by handbooks.ts (create, retry, ensureChapter) and by the source readers.
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { CHAPTER_PROMPT, CHECK_PROMPT, PLAN_PROMPT, briefText, chapterUserMessage, checkUserMessage, needsResearch, planUserMessage, researchBlock, sourcesBlock } from "./prompts";
import { sourceNotesOf } from "./sources";
import { ENGLISH } from "./languages";
import { translateChapterText, translatePlanText } from "./translations";
import { CHAPTERS, markChapterWriting, shuffleExercises } from "./handbooks";

export const generatePlan = internalAction({
  args: { handbookId: v.id("handbooks"), clarification: v.optional(v.string()) },
  handler: async (ctx, { handbookId, clarification }) => {
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    if (!h) return;
    // "Go further": tell the plan what they just finished, so it picks up from there.
    const prev = h.continuesHandbookId ? await ctx.runQuery(internal.handbooks.readHandbook, { handbookId: h.continuesHandbookId }) : null;
    const previous = prev?.plan ? {
      topic: String(prev.plan.topic ?? prev.topic), outcome7: prev.plan.outcome7 ?? undefined, horizon14: prev.plan.horizon14 ?? undefined,
      chapterTitles: (prev.plan.chapters ?? []).map((c: any) => String(c.title ?? "")),
    } : undefined;
    // Always written in English (translated after); only a clarifying question is asked in their language.
    const reader = h.language === ENGLISH ? "" : `\nThe learner reads ${h.language}. Write everything in English, except the clarifying question, if you ask one: write that in ${h.language}.`;
    const grounding = await groundingFor(ctx, h, "plan");
    const r = await ctx.runAction(internal.ai.generate, { kind: "plan", system: PLAN_PROMPT, user: planUserMessage(h.topic, h.level, ENGLISH, h.voice ?? "friend", clarification, previous) + reader + grounding });
    // Claude's own safety check said no: say so plainly, never "try again".
    if (!r.ok && /^declined/.test(r.error)) {
      const ready: any[] = await ctx.runQuery(internal.pictures.listCache, {});
      const picks = [...new Set(ready.map((x) => String(x.topic)))].sort(() => Math.random() - 0.5).slice(0, 3);
      await ctx.runMutation(internal.generate.setDeclined, { handbookId, pushback: "That's not something I Get It will teach. Pick something that helps you or the people around you, and we'll go all in.", suggestions: picks });
      return;
    }
    if (!r.ok) { await ctx.runMutation(internal.generate.setFailed, { handbookId, error: r.error }); return; }
    const plan = r.json;
    if (plan.declined) {
      await ctx.runMutation(internal.generate.setDeclined, { handbookId, pushback: String(plan.pushback ?? "That's not something I Get It will teach."), suggestions: (Array.isArray(plan.suggestions) ? plan.suggestions : []).map(String).slice(0, 3) });
      return;
    }
    if (plan.needsClarification && plan.question && !clarification && !previous && !h.sources?.length) {
      await ctx.runMutation(internal.generate.setQuestion, { handbookId, question: String(plan.question) });
      return;
    }
    if (!Array.isArray(plan.chapters) || plan.chapters.length !== CHAPTERS) {
      await ctx.runMutation(internal.generate.setFailed, { handbookId, error: `plan had ${plan.chapters?.length ?? 0} chapters` });
      return;
    }
    const translated = await translatePlanText(ctx, h.language, h.voice ?? "friend", plan);
    if (!translated.ok) { await ctx.runMutation(internal.generate.setFailed, { handbookId, error: translated.error }); return; }
    await ctx.runMutation(internal.generate.setPlan, { handbookId, plan: translated.plan, sourcePlan: h.language === ENGLISH ? undefined : plan, topic: clarification ? `${h.topic} (${clarification})` : h.topic });
    // Chapter 1 in an action of its own, so the plan's time and the chapter's don't add up against one 10-minute limit.
    await ctx.runMutation(internal.generate.startChapter, { handbookId, n: 1 });
  },
});

// Fact check a freshly written chapter before the reader sees it. Applies the checker's corrected cards only when they
// keep the card's type and, for exercises, a valid three-option shape. A failed check never blocks the chapter.
type FactReport = { status: string; fixes: number; notes: string[]; model?: string; at: number };
function validFix(orig: any, fixed: any): boolean {
  if (!fixed || typeof fixed !== "object" || fixed.type !== orig?.type) return false;
  if (orig.type !== "exercise") return typeof fixed.body === "string" || typeof fixed.prompt === "string";
  return Array.isArray(fixed.options) && fixed.options.length === 3 && fixed.options.some((o: any) => o.id === fixed.answer);
}
export async function factCheck(ctx: any, topic: string, level: string, title: string, cards: any[], opts: { model?: string; effort?: "low" | "medium" | "high" | "xhigh" | "max" } = {}): Promise<{ cards: any[]; report: FactReport }> {
  const r = await ctx.runAction(internal.ai.generate, { kind: "check", system: CHECK_PROMPT, user: checkUserMessage(topic, level, { title, cards }), ...opts });
  if (!r.ok) return { cards, report: { status: "unchecked", fixes: 0, notes: [r.error], at: Date.now() } };
  const out = cards.slice();
  const notes: string[] = [];
  for (const f of Array.isArray(r.json?.fixes) ? r.json.fixes : []) {
    const i = Number(f?.card);
    if (!Number.isInteger(i) || i < 0 || i >= out.length) continue;
    if (!validFix(out[i], f.fixed)) { notes.push(`card ${i}: fix skipped (shape) - ${String(f.problem ?? "").slice(0, 200)}`); continue; }
    out[i] = f.fixed;
    notes.push(`card ${i}: ${String(f.problem ?? "").slice(0, 300)}`);
  }
  const applied = notes.filter((x) => !x.includes("fix skipped")).length;
  return { cards: out, report: { status: applied > 0 ? "fixed" : "passed", fixes: applied, notes, model: r.model, at: Date.now() } };
}

export const generateChapter = internalAction({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }) => {
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    if (!h?.plan) return;
    const prof = await ctx.runQuery(internal.profile.readProfileLine, { handbookId });
    // Written in English from the English plan, fact checked in English, then translated (handbook in another language).
    const plan = h.sourcePlan ?? h.plan;
    const howTheyDid: string | null = await ctx.runQuery(internal.generate.readingReport, { handbookId, n });
    const grounding = await groundingFor(ctx, h, "chapter");
    const r = await ctx.runAction(internal.ai.generate, { kind: "chapter", system: CHAPTER_PROMPT, user: chapterUserMessage(plan, h.level, ENGLISH, h.voice ?? "friend", n, prof.line, howTheyDid ?? undefined, grounding), model: prof.model });
    if (!r.ok) { await ctx.runMutation(internal.generate.setChapterFailed, { handbookId, n, error: r.error }); return; }
    const ch = r.json;
    const exercises = (ch.cards ?? []).filter((c: any) => c.type === "exercise");
    const sane = Array.isArray(ch.cards) && ch.cards.length >= 5 && exercises.length >= 2 &&
      exercises.every((e: any) => Array.isArray(e.options) && e.options.length === 3 && e.options.some((o: any) => o.id === e.answer));
    if (!sane) { await ctx.runMutation(internal.generate.setChapterFailed, { handbookId, n, error: "chapter failed the shape check" }); return; }
    const englishTitle = String(ch.title ?? plan.chapters[n - 1]?.title ?? `Chapter ${n}`);
    // Fresh recall quizzes (new examples) are checked and translated in the same pass as the cards, then split off.
    const recall = (Array.isArray(ch.recallQuizzes) ? ch.recallQuizzes : []).filter((e: any) => e?.type === "exercise" && Array.isArray(e.options) && e.options.length === 3 && e.options.some((o: any) => o.id === e.answer)).slice(0, 2);
    const checked = await factCheck(ctx, plan?.topic ?? h.topic, h.level, englishTitle, [...ch.cards, ...recall]);
    const t = await translateChapterText(ctx, h.language, h.voice ?? "friend", "chapter", { title: englishTitle, outcomeLine: String(ch.outcomeLine ?? ""), cards: checked.cards });
    if (!t.ok) { await ctx.runMutation(internal.generate.setChapterFailed, { handbookId, n, error: t.error }); return; }
    const title = t.title;
    const cards = t.cards.slice(0, ch.cards.length), recallCards = t.cards.slice(ch.cards.length);
    await ctx.runMutation(internal.generate.setChapter, { handbookId, n, title, cards, recallCards, outcomeLine: t.outcomeLine, svg: typeof ch.svg === "string" ? ch.svg.slice(0, 2000) : undefined, model: r.model, factCheck: checked.report });
    // Pictures come after the words: the chapter opens now, each picture fades in when it's drawn.
    await ctx.scheduler.runAfter(0, internal.images.forChapter, { handbookId, n });
  },
});

// A handbook from the learner's own sources is written from what they saved: the notes on each source, the brief
// (what they're after, and how to shape it), and for saved picks or fast-changing subjects, one web search done before
// the plan and kept on the handbook for every chapter. A typed topic has none of this: "".
async function groundingFor(ctx: any, h: Doc<"handbooks">, part: "plan" | "chapter"): Promise<string> {
  const notes = sourceNotesOf(h);
  if (!notes) return "";
  let found = h.research;
  if (found === undefined && h.sourcesBrief && needsResearch(h.sourcesBrief)) {
    found = (await ctx.runAction(internal.ai.research, { topic: h.topic, brief: briefText(h.sourcesBrief) })) ?? "";
    await ctx.runMutation(internal.generate.setResearch, { handbookId: h._id, research: found });
  }
  return sourcesBlock(notes, part) + (found ? researchBlock(found) : "");
}

export const setResearch = internalMutation({
  args: { handbookId: v.id("handbooks"), research: v.string() },
  handler: async (ctx, { handbookId, research }) => { await ctx.db.patch(handbookId, { research }); },
});

export const setPlan = internalMutation({
  args: { handbookId: v.id("handbooks"), plan: v.any(), sourcePlan: v.optional(v.any()), topic: v.string() },
  handler: async (ctx, { handbookId, plan, sourcePlan, topic }) => { await ctx.db.patch(handbookId, { status: "ready", plan, sourcePlan, topic, question: undefined, error: undefined }); },
});
export const setQuestion = internalMutation({
  args: { handbookId: v.id("handbooks"), question: v.string() },
  handler: async (ctx, { handbookId, question }) => { await ctx.db.patch(handbookId, { status: "question", question }); },
});
export const setDeclined = internalMutation({
  args: { handbookId: v.id("handbooks"), pushback: v.string(), suggestions: v.array(v.string()) },
  handler: async (ctx, { handbookId, pushback, suggestions }) => { await ctx.db.patch(handbookId, { status: "declined", pushback: pushback.slice(0, 400), suggestions: suggestions.map((x) => x.slice(0, 80)) }); },
});
export const setFailed = internalMutation({
  args: { handbookId: v.id("handbooks"), error: v.string() },
  handler: async (ctx, { handbookId, error }) => { await ctx.db.patch(handbookId, { status: "failed", error }); },
});
export const startChapter = internalMutation({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }) => {
    const existing = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    if (existing && existing.status !== "failed") return;
    await markChapterWriting(ctx, handbookId, n, existing, true);
    await ctx.scheduler.runAfter(0, internal.generate.generateChapter, { handbookId, n });
  },
});
export const setChapter = internalMutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), title: v.string(), cards: v.any(), recallCards: v.optional(v.any()), outcomeLine: v.string(), svg: v.optional(v.string()), model: v.optional(v.string()), factCheck: v.optional(v.any()) },
  handler: async (ctx, { handbookId, n, title, cards, recallCards, outcomeLine, svg, model, factCheck }) => {
    const existing = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    const shuffled = shuffleExercises(cards, `${handbookId}:${n}`);
    const recall = recallCards?.length ? shuffleExercises(recallCards, `${handbookId}:${n}:recall`) : undefined;
    if (existing) await ctx.db.patch(existing._id, { status: "ready", title, cards: shuffled, recallCards: recall, outcomeLine, svg, model, factCheck, stale: false, error: undefined });
    else await ctx.db.insert("chapters", { handbookId, n, status: "ready", title, cards: shuffled, recallCards: recall, outcomeLine, svg, model, factCheck, createdAt: Date.now() });
  },
});
// ---------- adapting to the reader ----------

// What the writer of chapter n learns about chapter n-1: missed quizzes (what they picked and what it was
// confused with), the first-try score, and a step up (1 to 3) for each perfect chapter in a row.
export const readingReport = internalQuery({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }): Promise<string | null> => {
    if (n <= 1) return null;
    const answers = (await ctx.db.query("answers").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).collect()).filter((a) => !a.recall);
    const chapterStats = async (m: number) => {
      const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", m)).unique();
      const rows = answers.filter((a) => a.chapter === m).sort((a, b) => a.at - b.at);
      const byCard = new Map<number, typeof rows>();
      for (const r of rows) byCard.set(r.cardIndex, [...(byCard.get(r.cardIndex) ?? []), r]);
      const quizzes = [...byCard.entries()].map(([cardIndex, rs]) => ({ cardIndex, first: rs[0], card: ch?.cards?.[cardIndex] }));
      return { ch, rows, quizzes, right: quizzes.filter((q) => q.first.correct).length };
    };
    const last = await chapterStats(n - 1);
    if (!last.quizzes.length) return null;
    let streak = 0;
    for (let m = n - 1; m >= 1; m--) {
      const s = await chapterStats(m);
      if (s.quizzes.length && s.right === s.quizzes.length) streak++; else break;
    }
    const lines: string[] = [];
    const minutes = last.rows.length > 1 ? Math.max(1, Math.round((last.rows[last.rows.length - 1].at - last.rows[0].at) / 60000)) : null;
    lines.push(`Chapter ${n - 1}: ${last.right} of ${last.quizzes.length} quizzes right on the first try${minutes ? `, quizzes done in about ${minutes} minute${minutes === 1 ? "" : "s"}` : ""}.`);
    const missed = last.quizzes.filter((q) => !q.first.correct && q.card?.type === "exercise");
    if (missed.length) {
      lines.push("Missed (re-teach these first):");
      for (const q of missed.slice(0, 3)) {
        const picked = q.card.options?.find((o: any) => o.id === q.first.optionId)?.text ?? "";
        const why = q.card.whyNot?.[q.first.optionId] ?? "";
        lines.push(`- Quiz: "${String(q.card.prompt ?? "").slice(0, 220)}" They picked "${String(picked).slice(0, 140)}". ${String(why).slice(0, 220)}`);
      }
    } else if (streak > 0) {
      lines.push(`Step up: ${Math.min(3, streak)} of 3.`);
    }
    return lines.join("\n");
  },
});

export const setChapterFailed = internalMutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), error: v.string() },
  handler: async (ctx, { handbookId, n, error }) => {
    const existing = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    if (existing) await ctx.db.patch(existing._id, { status: "failed", error });
    else await ctx.db.insert("chapters", { handbookId, n, status: "failed", error, createdAt: Date.now() });
  },
});

// Re-run the fact check on a chapter already in the database (for chapters written before the check existed).
export const recheckChapter = internalAction({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }) => {
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    const ch = await ctx.runQuery(internal.generate.readChapterRow, { handbookId, n });
    if (!h || !ch?.cards) return { ok: false };
    const checked = await factCheck(ctx, h.plan?.topic ?? h.topic, h.level, ch.title ?? "", ch.cards);
    await ctx.runMutation(internal.generate.patchCheckedCards, { id: ch._id, cards: checked.cards, factCheck: checked.report });
    return checked.report;
  },
});
export const readChapterRow = internalQuery({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }) => ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique(),
});
export const patchCheckedCards = internalMutation({
  args: { id: v.id("chapters"), cards: v.any(), factCheck: v.any() },
  handler: async (ctx, { id, cards, factCheck }) => { await ctx.db.patch(id, { cards, factCheck }); },
});
// Dry run: check cards without saving anything (for testing the checker).
export const checkCardsDry = internalAction({
  args: { topic: v.string(), level: v.string(), title: v.string(), cards: v.any(), model: v.optional(v.string()), effort: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))) },
  handler: async (ctx, { topic, level, title, cards, model, effort }) => {
    const started = Date.now();
    const r = await factCheck(ctx, topic, level, title, cards, { model, effort });
    return { report: r.report, ms: Date.now() - started, cards: r.cards };
  },
});
