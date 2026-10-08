import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { CHAPTER_PROMPT, POLISH_PROMPT, chapterUserMessage } from "./prompts";
import { factCheck } from "./handbooks";
import { FROZEN as KEEP } from "./frozen";   // chapter 1 shown in a live post or ad

// Chapter 1 polish for ready topics (6 Oct): Claude scores each card on "would they keep swiping?", rewrites the weak ones,
// then the fact check re-reads the whole chapter. Every spelling of the topic and every reader's unread copy get it.
// Run: npx convex run --prod polish:queue '{"topicKeys":["public speaking", ...]}'
export const one = internalAction({
  args: { topicKey: v.string() },
  handler: async (ctx, { topicKey }): Promise<any> => {
    const row: any = await ctx.runQuery(internal.handbooks.readCacheChapter, { topicKey, level: "new", n: 1 });
    const ch = row?.chapter;
    if (!ch?.cards) return { ok: false, error: "no chapter 1" };
    const plan = row.plan ?? {};
    const r: any = await ctx.runAction(internal.ai.generate, { kind: "repair", system: POLISH_PROMPT,
      user: `Topic: ${plan.topic ?? row.topic}\nMode: ${plan.mode ?? "subject"}${plan.goal ? `\nReader's goal: ${plan.goal}` : ""}\nChapter 1: ${ch.title ?? ""}\nCards:\n${JSON.stringify(ch.cards, null, 1)}` });
    if (!r.ok) return { ok: false, error: r.error };
    const scores = Array.isArray(r.json?.scores) ? r.json.scores : [];
    const cards = ch.cards.slice();
    for (const f of Array.isArray(r.json?.fixes) ? r.json.fixes : []) {
      const i = Number(f?.card);
      if (Number.isInteger(i) && i >= 0 && i < cards.length && f.fixed?.type === cards[i].type) cards[i] = { ...f.fixed, ...(cards[i].type === "exercise" ? { answer: cards[i].answer, kind: cards[i].kind } : {}) };
    }
    const checked = await factCheck(ctx, plan.topic ?? row.topic, "new", ch.title ?? "", cards);
    const rewritten = checked.cards.filter((c: any, i: number) => JSON.stringify(c) !== JSON.stringify(ch.cards[i])).length;
    const res: any = rewritten ? await ctx.runMutation(internal.repairData.replaceCards, { topicKey, level: "new", n: 1, cards: checked.cards }) : { rows: 0, copies: 0 };
    const avg = scores.length ? Math.round((scores.reduce((s: number, x: any) => s + Number(x.score || 0), 0) / scores.length) * 10) / 10 : null;
    return { ok: true, before: avg, weak: scores.filter((x: any) => Number(x.score) <= 3).map((x: any) => `${x.card}: ${x.why}`), rewritten, rows: res.rows, copies: res.copies, check: checked.report.status, checkNotes: checked.report.notes.slice(0, 4) };
  },
});

export const queue = internalAction({
  args: { topicKeys: v.array(v.string()) },
  handler: async (ctx, { topicKeys }): Promise<void> => {
    const [head, ...rest] = topicKeys;
    if (!head) { console.log("polish finished"); return; }
    try { const r = await ctx.runAction(internal.polish.one, { topicKey: head }); console.log("polish", head, JSON.stringify(r)); }
    catch (e: any) { console.log("polish error", head, String(e?.message ?? e).slice(0, 200)); }
    await ctx.scheduler.runAfter(0, internal.polish.queue, { topicKeys: rest });
  },
});

// The 6-card chapter 1 (Prateek, 7 Oct): rewrite a ready topic's chapter 1 from its plan with today's chapter prompt,
// fact-check it, keep the title, then swap it into every spelling of the topic and every unread copy, with fresh
// recall questions for chapter 2 and the pictures redrawn. Run: npx convex run --prod polish:sixQueue '{"topicKeys":[...]}'

export const six = internalAction({
  args: { topicKey: v.string() },
  handler: async (ctx, { topicKey }): Promise<any> => {
    const row: any = await ctx.runQuery(internal.handbooks.readCacheChapter, { topicKey, level: "new", n: 1 });
    const old = row?.chapter;
    if (!old?.cards || !row.plan) return { ok: false, error: "no chapter 1" };
    if (old.cards.length <= 6) return { ok: true, skipped: "already short" };
    // A chapter 1 that a live post shows card by card stays as it is, so the post and chapter 2's recall still match
    // (7 Oct: Public speaking is the Instagram carousel instagram.com/p/DeKVxKJEsHL).
    if (KEEP.has(String(row.topic))) return { ok: true, skipped: "shown in a live post" };
    let ch: any = null, error = "";
    for (let t = 0; t < 2 && !ch; t++) {
      const r: any = await ctx.runAction(internal.ai.generate, { kind: "chapter", system: CHAPTER_PROMPT, user: chapterUserMessage(row.plan, "new", "English", "friend", 1) });
      const c = r.ok ? r.json : null;
      if (c && Array.isArray(c.cards) && c.cards.length >= 5 && c.cards.length <= 7 && !c.cards.some((k: any) => k?.type === "exercise")) ch = c;
      else error = r.ok ? `shape: ${c?.cards?.length ?? 0} cards` : r.error;
    }
    if (!ch) return { ok: false, error };
    const recall = (Array.isArray(ch.recallQuizzes) ? ch.recallQuizzes : []).filter((e: any) => e?.type === "exercise" && Array.isArray(e.options) && e.options.length === 3 && e.options.some((o: any) => o.id === e.answer)).slice(0, 2);
    const story = row.plan?.mode === "story";
    const checked = await factCheck(ctx, row.plan.topic ?? row.topic, "new", old.title ?? "", [...ch.cards, ...(story ? [] : recall)]);
    const cards = checked.cards.slice(0, ch.cards.length);
    const recallCards = story ? [] : checked.cards.slice(ch.cards.length);
    const res: any = await ctx.runMutation(internal.repairData.replaceCards, { topicKey, level: "new", n: 1, cards, recallCards, resetPictures: true });
    await ctx.scheduler.runAfter(0, internal.images.backfill, { queue: [{ topicKey, level: "new" as const, n: 1 }] });
    return { ok: true, before: old.cards.length, after: cards.length, rows: res.rows, copies: res.copies, check: checked.report.status, fixes: checked.report.fixes };
  },
});

export const sixQueue = internalAction({
  args: { topicKeys: v.array(v.string()) },
  handler: async (ctx, { topicKeys }): Promise<void> => {
    const [head, ...rest] = topicKeys;
    if (!head) { console.log("six finished"); return; }
    try { const r = await ctx.runAction(internal.polish.six, { topicKey: head }); console.log("six", head, JSON.stringify(r)); }
    catch (e: any) { console.log("six error", head, String(e?.message ?? e).slice(0, 200)); }
    await ctx.scheduler.runAfter(0, internal.polish.sixQueue, { topicKeys: rest });
  },
});
