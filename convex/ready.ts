import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { CHAPTER_PROMPT, PLAN_PROMPT, chapterUserMessage, planUserMessage } from "./prompts";
import { checkWithVersions, drawMoves, noQuizzes, topicKeyOf, writeVersions } from "./handbooks";

// Writes a new ready topic for the shelf, the same way a reader's handbook is written (plan on the plan model,
// each chapter on the chapter model, every chapter fact-checked), then stores it in the cache and queues its pictures.
// One step per call, each step schedules the next, so nothing runs long and nothing waits on a terminal.
// Start it with: npx convex run --prod ready:build '{"topic":"...","aliases":["..."]}'
const CHAPTERS = 7;

export const build = internalAction({
  args: {
    topic: v.string(),
    aliases: v.optional(v.array(v.string())),
    plan: v.optional(v.any()),
    chapters: v.optional(v.array(v.any())),
    tries: v.optional(v.number()),
    goal: v.optional(v.string()),
    mode: v.optional(v.string()),
    trendingWeek: v.optional(v.string()),
  },
  handler: async (ctx, { topic, aliases, plan, chapters = [], tries = 0, goal, mode, trendingWeek }): Promise<void> => {
    const again = (next: { plan?: unknown; chapters?: unknown[]; tries?: number }) =>
      ctx.scheduler.runAfter(0, internal.ready.build, { topic, aliases, goal, mode, trendingWeek, plan: next.plan ?? plan, chapters: (next.chapters ?? chapters) as any[], tries: next.tries ?? 0 });
    const giveUp = (why: string) => console.log(`ready ${topic}: stopped, ${why}`);

    // 1. The plan.
    if (!plan) {
      const r = await ctx.runAction(internal.ai.generate, { kind: "plan", system: PLAN_PROMPT, user: planUserMessage(topic, "new", "English", "friend", undefined, goal, mode) });
      const p = r.ok ? r.json : null;
      const fine = p && !p.declined && !p.needsClarification && Array.isArray(p.chapters) && p.chapters.length === CHAPTERS;
      if (!fine) {
        console.log(`ready ${topic}: plan not usable (${r.ok ? "shape" : r.error})`);
        if (tries < 1) await ctx.scheduler.runAfter(0, internal.ready.build, { topic, aliases, goal, mode, trendingWeek, tries: tries + 1 });
        else giveUp("plan failed twice");
        return;
      }
      if (!p.mode && mode) p.mode = mode;
      if (goal) p.goal = goal;
      console.log(`ready ${topic}: plan done, ${p.chapters.map((c: any) => c.title).join(" / ")}`);
      await again({ plan: p, chapters: [] });
      return;
    }

    // 2. The next chapter, written and fact-checked.
    const n = chapters.length + 1;
    if (n <= CHAPTERS) {
      const r = await ctx.runAction(internal.ai.generate, { kind: "chapter", system: CHAPTER_PROMPT, user: chapterUserMessage(plan, "new", "English", "friend", n) });
      const ch = r.ok ? r.json : null;
      const exercises = (ch?.cards ?? []).filter((c: any) => c.type === "exercise");
      const sane = ch && Array.isArray(ch.cards) && ch.cards.length >= 5 && exercises.length >= (n === 1 || noQuizzes(plan) ? 0 : 2) &&
        exercises.every((e: any) => Array.isArray(e.options) && e.options.length === 3 && e.options.some((o: any) => o.id === e.answer));
      if (!sane) {
        console.log(`ready ${topic}: chapter ${n} not usable (${r.ok ? "shape" : r.error})`);
        if (tries < 2) await again({ tries: tries + 1 });
        else giveUp(`chapter ${n} failed three times`);
        return;
      }
      const title = String(ch.title ?? plan.chapters[n - 1]?.title ?? `Chapter ${n}`);
      const recall = (Array.isArray(ch.recallQuizzes) ? ch.recallQuizzes : []).filter((e: any) => e?.type === "exercise" && Array.isArray(e.options) && e.options.length === 3 && e.options.some((o: any) => o.id === e.answer)).slice(0, 2);
      // Quiz versions (easier, harder), checked in the same pass (7 Oct).
      const { qv, rv } = await writeVersions(ctx, plan, plan.topic ?? topic, title, ch.cards, recall);
      const checked = await checkWithVersions(ctx, plan.topic ?? topic, "new", title, ch.cards, recall, qv, rv);
      const { recallCards, quizTiers, recallTiers } = checked;
      const done = { n, title, cards: checked.cards, recallCards, quizTiers, recallTiers, outcomeLine: String(ch.outcomeLine ?? ""), svg: typeof ch.svg === "string" ? ch.svg.slice(0, 2000) : undefined, factCheck: checked.report };
      console.log(`ready ${topic}: chapter ${n} done (${done.cards.length} cards, check ${checked.report.status}, ${checked.report.fixes} fixes)`);
      await again({ chapters: [...chapters, done] });
      return;
    }

    // 3. All seven: store it on the shelf, then draw the pictures one chapter at a time.
    const keys: string[] = await ctx.runMutation(internal.handbooks.seedCache, { topic: plan.topic ?? topic, aliases: [topic, ...(aliases ?? [])], level: "new", plan, chapters, trendingWeek });
    const topicKey = topicKeyOf(plan.topic ?? topic);
    // Chapter 1 gets the 'would they keep swiping?' polish before its pictures are drawn.
    await ctx.scheduler.runAfter(0, internal.polish.queue, { topicKeys: [topicKey] });
    // Every chapter of a ready topic is drawn (8 Oct, Prateek): it sits on the shelf for everyone. Typed topics still
    // draw chapters 2 onward only when a reader first opens them (handbooks.openChapter).
    await ctx.scheduler.runAfter(120000, internal.images.backfill, { queue: plan.chapters.map((_: any, i: number) => ({ topicKey, level: "new" as const, n: i + 1 })) });
    console.log(`ready ${topic}: on the shelf as ${keys.join(", ")}; pictures queued for ${plan.chapters.length} chapters`);
  },
});

// Rewrite one chapter of a ready topic in the current shape (8 Oct: Pool swimming chapter 1 as a body-skill lesson).
// The plan is read as mode "skill" when it has none. Pictures are reset and redrawn; the shelf cover follows.
// Run: npx convex run --prod ready:rewriteChapter '{"topicKey":"swim","n":1,"mode":"skill"}'
export const rewriteChapter = internalAction({
  args: { topicKey: v.string(), n: v.number(), mode: v.optional(v.string()) },
  handler: async (ctx, { topicKey, n, mode }): Promise<any> => {
    const row: any = await ctx.runQuery(internal.handbooks.readCacheChapter, { topicKey, level: "new", n });
    if (!row?.chapter) return { ok: false, error: "no such cached chapter" };
    const plan = { ...row.plan, mode: row.plan?.mode ?? mode ?? "skill" };
    const topic = plan.topic ?? row.topic;
    const r = await ctx.runAction(internal.ai.generate, { kind: "chapter", system: CHAPTER_PROMPT, user: chapterUserMessage(plan, "new", "English", "friend", n) });
    const ch = r.ok ? r.json : null;
    if (!ch || !Array.isArray(ch.cards) || ch.cards.length < 5) return { ok: false, error: r.ok ? "shape" : r.error };
    const title = String(ch.title ?? plan.chapters[n - 1]?.title ?? `Chapter ${n}`);
    const recall = (Array.isArray(ch.recallQuizzes) ? ch.recallQuizzes : []).filter((e: any) => e?.type === "exercise" && Array.isArray(e.options) && e.options.length === 3 && e.options.some((o: any) => o.id === e.answer)).slice(0, 2);
    const { qv, rv } = await writeVersions(ctx, plan, topic, title, ch.cards, recall);
    const checked = await checkWithVersions(ctx, topic, "new", title, ch.cards, recall, qv, rv);
    await drawMoves(ctx, topic, title, checked.cards);
    const res: any = await ctx.runMutation(internal.repairData.replaceCards, { topicKey, level: "new", n, cards: checked.cards, recallCards: checked.recallCards, resetPictures: true });
    await ctx.scheduler.runAfter(0, internal.images.forCache, { topicKey, level: "new", n });
    return { ok: true, title, cards: checked.cards.map((c: any) => c.type), moves: checked.cards.filter((c: any) => c.type === "move" && c.html).length, check: checked.report.status, ...res };
  },
});
