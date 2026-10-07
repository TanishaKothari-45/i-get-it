import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { POLISH_PROMPT } from "./prompts";
import { factCheck } from "./handbooks";

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
