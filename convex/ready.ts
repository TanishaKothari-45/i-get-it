import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { CHAPTER_PROMPT, PLAN_PROMPT, chapterUserMessage, planUserMessage } from "./prompts";
import { factCheck, topicKeyOf } from "./handbooks";

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
      const sane = ch && Array.isArray(ch.cards) && ch.cards.length >= 5 && exercises.length >= 2 &&
        exercises.every((e: any) => Array.isArray(e.options) && e.options.length === 3 && e.options.some((o: any) => o.id === e.answer));
      if (!sane) {
        console.log(`ready ${topic}: chapter ${n} not usable (${r.ok ? "shape" : r.error})`);
        if (tries < 2) await again({ tries: tries + 1 });
        else giveUp(`chapter ${n} failed three times`);
        return;
      }
      const title = String(ch.title ?? plan.chapters[n - 1]?.title ?? `Chapter ${n}`);
      const recall = (Array.isArray(ch.recallQuizzes) ? ch.recallQuizzes : []).filter((e: any) => e?.type === "exercise" && Array.isArray(e.options) && e.options.length === 3 && e.options.some((o: any) => o.id === e.answer)).slice(0, 2);
      const checked = await factCheck(ctx, plan.topic ?? topic, "new", title, [...ch.cards, ...recall]);
      const done = { n, title, cards: checked.cards.slice(0, ch.cards.length), recallCards: checked.cards.slice(ch.cards.length), outcomeLine: String(ch.outcomeLine ?? ""), svg: typeof ch.svg === "string" ? ch.svg.slice(0, 2000) : undefined, factCheck: checked.report };
      console.log(`ready ${topic}: chapter ${n} done (${done.cards.length} cards, check ${checked.report.status}, ${checked.report.fixes} fixes)`);
      await again({ chapters: [...chapters, done] });
      return;
    }

    // 3. All seven: store it on the shelf, then draw the pictures one chapter at a time.
    const keys: string[] = await ctx.runMutation(internal.handbooks.seedCache, { topic: plan.topic ?? topic, aliases: [topic, ...(aliases ?? [])], level: "new", plan, chapters, trendingWeek });
    const topicKey = topicKeyOf(plan.topic ?? topic);
    await ctx.scheduler.runAfter(0, internal.images.backfill, { queue: Array.from({ length: CHAPTERS }, (_, i) => ({ topicKey, level: "new" as const, n: i + 1 })) });
    console.log(`ready ${topic}: on the shelf as ${keys.join(", ")}; pictures queued`);
  },
});
