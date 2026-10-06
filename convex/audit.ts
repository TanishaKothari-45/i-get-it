"use node";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { AUDIT_PROMPT, checkUserMessage } from "./prompts";

// Measurement (Shaktimaan, 6 Oct: "measure, don't feel"): read a finished chapter 1 after the fact check
// and list what slipped through. Run by hand on dev only; never part of the reader's path.
export const chapter = internalAction({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }): Promise<any> => {
    const h: any = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    const ch: any = await ctx.runQuery(internal.handbooks.readChapter, { handbookId, n });
    if (!h || !ch?.cards) return { ok: false, error: "no chapter" };
    const r: any = await ctx.runAction(internal.ai.generate, { kind: "audit", system: AUDIT_PROMPT, user: checkUserMessage(h.plan?.topic ?? h.topic, h.level, { title: ch.title, cards: ch.cards }) });
    if (!r.ok) return { ok: false, error: r.error };
    return { ok: true, topic: h.plan?.topic ?? h.topic, caution: h.plan?.caution ?? null, factCheck: ch.factCheck ? { status: ch.factCheck.status, fixes: ch.factCheck.fixes } : null, slips: r.json?.slips ?? [] };
  },
});
