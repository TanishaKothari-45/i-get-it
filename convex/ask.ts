// The two-way street: ask about one card (answered from the card, with a web search only when needed), and
// "teach it back" (the reader explains the chapter's idea in their own words). Both optional, both capped.
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { ASK_SEARCH_PROMPT, TEACH_PROMPT, askSearchUserMessage, teachUserMessage } from "./prompts";
import { CHAPTERS, limiter, ownedHandbook, ownerKey } from "./handbooks";

// ---------- teach it back (optional) ----------

export const teachBackFor = query({
  args: { handbookId: v.id("handbooks"), chapter: v.number(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, chapter, deviceToken }) => {
    await ownedHandbook(ctx, handbookId, deviceToken);
    const rows = await ctx.db.query("teachBacks").withIndex("by_chapter", (q) => q.eq("handbookId", handbookId).eq("chapter", chapter)).collect();
    const last = rows.sort((a, b) => b.at - a.at)[0];
    return last ? { status: last.status, text: last.text, verdict: last.verdict ?? null, got: last.got ?? null, missed: last.missed ?? null, tip: last.tip ?? null } : null;
  },
});

export const teachBack = mutation({
  args: { handbookId: v.id("handbooks"), chapter: v.number(), text: v.string(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, chapter, text, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > CHAPTERS) throw new Error("No such chapter");
    const t = text.trim().slice(0, 600);
    if (t.length < 10) throw new Error("A sentence or two is enough.");
    const mine = await limiter.limit(ctx, "teachDevice", { key: ownerKey(h) });
    if (!mine.ok || !(await limiter.limit(ctx, "teachAll")).ok) throw new Error("busy");
    const id = await ctx.db.insert("teachBacks", { handbookId, chapter, text: t, status: "thinking", at: Date.now() });
    await ctx.scheduler.runAfter(0, internal.ask.replyToTeachBack, { id });
  },
});

export const readTeachBack = internalQuery({
  args: { id: v.id("teachBacks") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (!row) return null;
    const h = await ctx.db.get(row.handbookId);
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", row.handbookId).eq("n", row.chapter)).unique();
    const teach = (ch?.cards ?? []).filter((c: any) => c?.type === "teach");
    const oneBreath = String((teach.find((c: any) => /one breath/i.test(c.title ?? "")) ?? teach[teach.length - 1])?.body ?? "").slice(0, 900);
    return { row, topic: (h?.plan as any)?.topic ?? h?.topic ?? "", title: ch?.title ?? `Chapter ${row.chapter}`, oneBreath, outcome: ch?.outcomeLine ?? "" };
  },
});

export const setTeachBack = internalMutation({
  args: { id: v.id("teachBacks"), ok: v.boolean(), verdict: v.optional(v.string()), got: v.optional(v.string()), missed: v.optional(v.string()), tip: v.optional(v.string()) },
  handler: async (ctx, { id, ok, verdict, got, missed, tip }) => {
    await ctx.db.patch(id, ok ? { status: "ready", verdict, got, missed, tip } : { status: "failed" });
  },
});

export const replyToTeachBack = internalAction({
  args: { id: v.id("teachBacks") },
  handler: async (ctx, { id }) => {
    const d: any = await ctx.runQuery(internal.ask.readTeachBack, { id });
    if (!d) return;
    const r: any = await ctx.runAction(internal.ai.generate, { kind: "teach", system: TEACH_PROMPT, user: teachUserMessage(d.topic, d.title, d.oneBreath, d.outcome, d.row.text) });
    const j = r.ok ? r.json : null;
    const clean = (x: any) => (typeof x === "string" && x.trim() ? x.trim().slice(0, 300) : undefined);
    await ctx.runMutation(internal.ask.setTeachBack, { id, ok: !!j, verdict: clean(j?.verdict), got: clean(j?.got), missed: clean(j?.missed), tip: clean(j?.tip) });
  },
});

export const questionsFor = query({
  args: { handbookId: v.id("handbooks"), chapter: v.number(), cardIndex: v.number(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, chapter, cardIndex, deviceToken }) => {
    await ownedHandbook(ctx, handbookId, deviceToken);
    const rows = await ctx.db.query("cardQuestions").withIndex("by_card", (q) => q.eq("handbookId", handbookId).eq("chapter", chapter).eq("cardIndex", cardIndex)).collect();
    return rows.sort((a, b) => a.at - b.at).map((r) => ({ _id: r._id, question: r.question, answer: r.answer, sources: r.sources ?? [], status: r.status }));
  },
});

export const ask = mutation({
  args: { handbookId: v.id("handbooks"), chapter: v.number(), cardIndex: v.number(), question: v.string(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, chapter, cardIndex, question, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    const q = question.trim().slice(0, 300);
    if (q.length < 3) throw new Error("Ask in a few words.");
    const mine = await limiter.limit(ctx, "askDevice", { key: ownerKey(h) });
    if (!mine.ok || !(await limiter.limit(ctx, "askAll")).ok) throw new Error("busy");
    const id = await ctx.db.insert("cardQuestions", { handbookId, chapter, cardIndex, question: q, status: "thinking", at: Date.now() });
    await ctx.scheduler.runAfter(0, internal.ask.answerQuestionAboutCard, { questionId: id });
    return id;
  },
});

export const answerQuestionAboutCard = internalAction({
  args: { questionId: v.id("cardQuestions") },
  handler: async (ctx, { questionId }) => {
    const row = await ctx.runQuery(internal.ask.readQuestion, { questionId });
    if (!row) return;
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId: row.handbookId });
    const ch = await ctx.runQuery(internal.handbooks.readChapter, { handbookId: row.handbookId, n: row.chapter });
    const card = ch?.cards?.[row.cardIndex];
    if (!h || !ch || !card) { await ctx.runMutation(internal.ask.setAnswer, { questionId, answer: "", failed: true }); return; }
    const prof = await ctx.runQuery(internal.profile.readProfileLine, { handbookId: row.handbookId });
    const body = card.type === "exercise" ? `${card.prompt}\n${(card.options ?? []).map((o: any) => `${o.id}) ${o.text}`).join("\n")}` : card.type === "watch" ? `${card.who}, ${card.what}. ${card.watchFor}` : card.body;
    const r = await ctx.runAction(internal.ai.askWithSearch, { system: ASK_SEARCH_PROMPT, user: askSearchUserMessage(h.plan?.topic ?? h.topic, ch.title ?? `Chapter ${row.chapter}`, body, row.question, prof.line, h.language), searchKey: String(h.userId ?? h.ownerToken ?? h._id) });
    if (r.ok && r.answer) await ctx.runMutation(internal.ask.setAnswer, { questionId, answer: r.answer, sources: r.sources, failed: false });
    else await ctx.runMutation(internal.ask.setAnswer, { questionId, answer: "", failed: true });
  },
});

export const takeSearchToken = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => (await limiter.limit(ctx, "searchDaily", { key })).ok && (await limiter.limit(ctx, "searchAll")).ok,
});

export const readQuestion = internalQuery({
  args: { questionId: v.id("cardQuestions") },
  handler: async (ctx, { questionId }) => ctx.db.get(questionId),
});

export const setAnswer = internalMutation({
  args: { questionId: v.id("cardQuestions"), answer: v.string(), failed: v.boolean(), sources: v.optional(v.array(v.object({ url: v.string(), title: v.string() }))) },
  handler: async (ctx, { questionId, answer, failed, sources }) => { await ctx.db.patch(questionId, failed ? { status: "failed" } : { status: "ready", answer, sources: sources?.length ? sources : undefined }); },
});
