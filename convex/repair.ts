"use node";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { REPAIR_PROMPT } from "./prompts";

// One-off repair (6 Oct): no answer giveaways in re-teach and whyNot lines, fresh recall quizzes, "Next:" not "Tomorrow:".
// Runs as a server-side queue, one chapter at a time: npx convex run --prod repair:queue '{"targets":[...]}'
const target = v.union(
  v.object({ kind: v.literal("cache"), topicKey: v.string(), level: v.union(v.literal("new"), v.literal("some")), n: v.number() }),
  v.object({ kind: v.literal("chapter"), chapterId: v.id("chapters") }),
);

export const one = internalAction({
  args: { t: target },
  handler: async (ctx, { t }): Promise<{ ok: boolean; fixes?: number; recall?: number; copies?: number; error?: string }> => {
    const ch: any = await ctx.runQuery(internal.repairData.read, { t });
    if (!ch?.cards) return { ok: false, error: "no chapter" };
    const r: any = await ctx.runAction(internal.ai.generate, { kind: "repair", system: REPAIR_PROMPT, user: `Chapter: ${ch.title ?? ""}\nCards:\n${JSON.stringify(ch.cards, null, 1)}` });
    if (!r.ok) return { ok: false, error: r.error };
    const fixes = Array.isArray(r.json?.fixes) ? r.json.fixes : [];
    const recall = (Array.isArray(r.json?.recallQuizzes) ? r.json.recallQuizzes : []).map((e: any) => ({ ...e, type: "exercise", kind: "recall" }))
      .filter((e: any) => Array.isArray(e.options) && e.options.length === 3 && e.options.some((o: any) => o.id === e.answer)).slice(0, 2);
    const res: any = await ctx.runMutation(internal.repairData.apply, { t, fixes, recall });
    return { ok: true, fixes: res.fixed, recall: recall.length, copies: res.copies };
  },
});

export const queue = internalAction({
  args: { targets: v.array(target), done: v.optional(v.number()), failed: v.optional(v.number()) },
  handler: async (ctx, { targets, done = 0, failed = 0 }): Promise<void> => {
    const [head, ...rest] = targets;
    if (!head) { console.log(`repair finished: ${done} ok, ${failed} failed`); return; }
    let ok = false;
    try { const r: any = await ctx.runAction(internal.repair.one, { t: head }); ok = r.ok; console.log("repair", JSON.stringify(head), JSON.stringify(r)); }
    catch (e: any) { console.log("repair error", JSON.stringify(head), String(e?.message ?? e).slice(0, 200)); }
    await ctx.scheduler.runAfter(0, internal.repair.queue, { targets: rest, done: done + (ok ? 1 : 0), failed: failed + (ok ? 0 : 1) });
  },
});
