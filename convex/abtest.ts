import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { inrOf } from "./costs";
import { topicKeyOf } from "./handbooks";

// Blind writer test (8 Oct, Prateek): two new handbooks in his account, each pinned to one writer (Claude as today, or a
// model at The Inference Company), assigned at random and not shown. Each runs research, plan, chapter 1 (with quiz
// levels and the fact check), then chapter 2, timed. Test handbooks never go to the shared library or the shelf.

// What The Inference Company serves (ids, and prices if it lists them).
export const inferenceModels = internalAction({
  args: {},
  handler: async () => {
    const res = await fetch("https://console.theinferencecompany.si/v1/models", { headers: { Authorization: `Bearer ${process.env.INFERENCE_API_KEY ?? ""}` } });
    const body: any = await res.json().catch(() => ({}));
    const list: any[] = Array.isArray(body?.data) ? body.data : [];
    return list.length ? list.map((m) => ({ id: m.id, ...(m.pricing ? { pricing: m.pricing } : {}) })) : body;
  },
});

export const setup = internalMutation({
  args: { email: v.string(), topics: v.array(v.string()), writers: v.array(v.union(v.string(), v.null())) },
  handler: async (ctx, { email, topics, writers }) => {
    const user = (await ctx.db.query("users").collect()).find((u: any) => u.email === email);
    if (!user) throw new Error("no such account");
    // Shuffle the writers so neither the order nor the topic gives them away.
    const order = writers.map((w) => ({ w, r: Math.random() })).sort((a, b) => a.r - b.r).map((x) => x.w);
    const ids = [];
    const now = Date.now();
    for (let i = 0; i < topics.length; i++) {
      const handbookId = await ctx.db.insert("handbooks", {
        topic: topics[i], topicKey: topicKeyOf(topics[i]), level: "new", language: "English", voice: "friend", status: "planning",
        userId: user._id, source: "live", createdAt: now, writer: order[i] ?? undefined, test: { label: `Handbook ${i + 1}` },
      });
      await ctx.db.insert("progress", { handbookId, currentChapter: 1, currentCard: 0, chaptersPassed: [], passedExercises: [], missedExercises: [], lastOpenedAt: now, updatedAt: now });
      ids.push(handbookId);
    }
    return ids;
  },
});

export const mark = internalMutation({
  args: { handbookId: v.id("handbooks"), field: v.string() },
  handler: async (ctx, { handbookId, field }) => {
    const h = await ctx.db.get(handbookId);
    if (h) await ctx.db.patch(handbookId, { test: { ...(h.test ?? {}), [field]: Date.now() } });
  },
});

// Research, plan and chapter 1, then chapter 2 in a second action (each stays well under the 10-minute action limit).
export const runOne = internalAction({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    await ctx.runMutation(internal.abtest.mark, { handbookId, field: "startedAt" });
    await ctx.runAction(internal.handbooks.generatePlan, { handbookId });
    await ctx.runMutation(internal.abtest.mark, { handbookId, field: "ch1At" });
    await ctx.scheduler.runAfter(0, internal.abtest.runTwo, { handbookId });
  },
});
export const runTwo = internalAction({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    if (!h?.plan) return;
    await ctx.runMutation(internal.abtest.mark, { handbookId, field: "ch2StartedAt" });
    await ctx.runMutation(internal.handbooks.startChapter, { handbookId, n: 2 });
    await ctx.runAction(internal.handbooks.generateChapter, { handbookId, n: 2 });
    await ctx.runMutation(internal.abtest.mark, { handbookId, field: "ch2At" });
    await ctx.scheduler.runAfter(0, internal.images.forChapter, { handbookId, n: 2 });
  },
});

// Times and costs per handbook, from the call log: calls since it started whose input names its topic, plus the
// picture drawings whose prompt holds one of its scenes. Pass reveal: true only after Prateek has picked.
export const report = internalQuery({
  args: { handbookIds: v.array(v.id("handbooks")), reveal: v.optional(v.boolean()) },
  handler: async (ctx, { handbookIds, reveal }) => {
    const calls = await ctx.db.query("aiCalls").order("desc").take(1500);
    const out = [];
    for (const id of handbookIds) {
      const h: any = await ctx.db.get(id);
      if (!h) continue;
      const t = h.test ?? {};
      const chapters = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", id)).collect();
      const scenes = chapters.flatMap((c: any) => (c.pictures ?? []).map((p: any) => p.scene)).filter(Boolean);
      // Chapter calls start with the plan JSON (keys sorted, topic past the logged 2,000 characters): match its first chapter line.
      const names = [h.topic, h.plan?.topic, h.plan?.chapters?.[0]?.covers?.slice(0, 80)].filter(Boolean);
      const mine = calls.filter((c) => c.at >= (t.startedAt ?? h.createdAt) - 1000 &&
        (names.some((n: string) => c.input.includes(n)) || scenes.some((s: string) => c.input.includes(s.slice(0, 80)))));
      const rows = mine.map((c) => ({ kind: c.kind, model: c.model, ok: c.ok, ms: c.ms, tokensIn: c.tokensIn ?? 0, tokensOut: c.tokensOut ?? 0, inr: inrOf(c.model, c.ok, c.tokensIn, c.tokensOut), at: c.at }));
      const byKind: Record<string, { calls: number; inr: number; tokensIn: number; tokensOut: number; ms: number }> = {};
      for (const r of rows) {
        const k = (byKind[r.kind] ??= { calls: 0, inr: 0, tokensIn: 0, tokensOut: 0, ms: 0 });
        k.calls++; k.inr += r.inr; k.tokensIn += r.tokensIn; k.tokensOut += r.tokensOut; k.ms += r.ms;
      }
      out.push({
        label: t.label, topic: h.plan?.topic ?? h.topic, status: h.status, error: h.error ?? null, chaptersInPlan: h.plan?.chapters?.length ?? null,
        ...(reveal ? { writer: h.writer ?? "claude (today's setup)" } : {}),
        seconds: { toChapter1: t.ch1At && t.startedAt ? Math.round((t.ch1At - t.startedAt) / 1000) : null, chapter2: t.ch2At && t.ch2StartedAt ? Math.round((t.ch2At - t.ch2StartedAt) / 1000) : null },
        chapters: chapters.map((c: any) => ({ n: c.n, status: c.status, cards: c.cards?.length ?? 0, quizLevels: !!c.quizTiers, check: c.factCheck?.status ?? null, fixes: c.factCheck?.fixes ?? 0, pictures: (c.pictures ?? []).filter((p: any) => p.storageId).length, error: c.error ?? null, ...(reveal ? { model: c.model } : {}) })),
        byKind: reveal ? byKind : Object.fromEntries(Object.entries(byKind).map(([k, x]) => [k, { calls: x.calls, inr: Math.round(x.inr * 10) / 10, seconds: Math.round(x.ms / 1000) }])),
        totalInr: Math.round(rows.reduce((s, r) => s + r.inr, 0) * 10) / 10,
        unpriced: [...new Set(rows.filter((r) => r.ok && r.inr === 0 && r.tokensOut > 0).map((r) => (reveal ? r.model : "some calls")))],
      });
    }
    return out;
  },
});

// Name two finished test handbooks "A" and "B" in a random order, for a neutral judge. The real topic stays in
// test.realTopic, and the call log is still matched by the plan's first chapter line.
export const blind = internalMutation({
  args: { handbookIds: v.array(v.id("handbooks")), hide: v.optional(v.array(v.id("handbooks"))) },
  handler: async (ctx, { handbookIds, hide }) => {
    const order = handbookIds.map((id) => ({ id, r: Math.random() })).sort((a, b) => a.r - b.r);
    for (let i = 0; i < order.length; i++) {
      const h = await ctx.db.get(order[i].id);
      if (!h) continue;
      const name = String.fromCharCode(65 + i);
      await ctx.db.patch(h._id, { topic: name, plan: h.plan ? { ...h.plan, topic: name } : h.plan, test: { ...(h.test ?? {}), realTopic: h.plan?.topic ?? h.topic, blindName: name } });
    }
    for (const id of hide ?? []) await ctx.db.patch(id, { hiddenAt: Date.now() });
  },
});
