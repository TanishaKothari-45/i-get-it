import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { inrOf } from "./costs";
import { checkWithVersions, topicKeyOf } from "./handbooks";
import { JUDGE, JUDGE_MODEL } from "./evalModels";

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
  args: { email: v.optional(v.string()), deviceToken: v.optional(v.string()), topics: v.array(v.string()), writers: v.array(v.union(v.string(), v.null())), goal: v.optional(v.string()), mode: v.optional(v.string()) },
  handler: async (ctx, { email, deviceToken, topics, writers, goal, mode }) => {
    const user = email ? (await ctx.db.query("users").collect()).find((u: any) => u.email === email) : null;
    if (!user && !deviceToken) throw new Error("no such account");
    // Shuffle the writers so neither the order nor the topic gives them away.
    const order = writers.map((w) => ({ w, r: Math.random() })).sort((a, b) => a.r - b.r).map((x) => x.w);
    const ids = [];
    const now = Date.now();
    for (let i = 0; i < topics.length; i++) {
      const handbookId = await ctx.db.insert("handbooks", {
        topic: topics[i], topicKey: topicKeyOf(topics[i]), level: "new", language: "English", voice: "friend", status: "planning",
        userId: user?._id, ownerToken: user ? undefined : deviceToken, goal, mode, source: "live", createdAt: now, writer: order[i] ?? undefined, test: { label: `Handbook ${i + 1}` },
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
// End to end (8 Oct): every chapter in the plan after chapter 1, one action each, timed per chapter in test.chNAt.
export const runRest = internalAction({
  args: { handbookId: v.id("handbooks"), n: v.number(), upTo: v.optional(v.number()) },
  handler: async (ctx, { handbookId, n, upTo }) => {
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    const total = Math.min(h?.plan?.chapters?.length ?? 0, upTo ?? 7);
    if (!h?.plan || n > total) { await ctx.scheduler.runAfter(0, internal.abtest.judgeAll, { handbookId, upTo: total }); return; }
    await ctx.runMutation(internal.abtest.mark, { handbookId, field: `ch${n}StartedAt` });
    await ctx.runMutation(internal.handbooks.startChapter, { handbookId, n });
    await ctx.runAction(internal.handbooks.generateChapter, { handbookId, n });
    await ctx.runMutation(internal.abtest.mark, { handbookId, field: `ch${n}At` });
    await ctx.scheduler.runAfter(0, internal.images.forChapter, { handbookId, n });
    await ctx.scheduler.runAfter(0, internal.abtest.runRest, { handbookId, n: n + 1, upTo });
  },
});
export const runAll = internalAction({
  args: { handbookId: v.id("handbooks"), upTo: v.optional(v.number()) },
  handler: async (ctx, { handbookId, upTo }) => {
    await ctx.runMutation(internal.abtest.mark, { handbookId, field: "startedAt" });
    await ctx.runAction(internal.handbooks.generatePlan, { handbookId });
    await ctx.runMutation(internal.abtest.mark, { handbookId, field: "ch1At" });
    await ctx.scheduler.runAfter(0, internal.abtest.runRest, { handbookId, n: 2, upTo });
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
        seconds: { toChapter1: t.ch1At && t.startedAt ? Math.round((t.ch1At - t.startedAt) / 1000) : null, chapter2: t.ch2At && t.ch2StartedAt ? Math.round((t.ch2At - t.ch2StartedAt) / 1000) : null,
          ...Object.fromEntries([3, 4, 5, 6, 7].filter((n) => t[`ch${n}At`] && t[`ch${n}StartedAt`]).map((n) => [`chapter${n}`, Math.round((t[`ch${n}At`] - t[`ch${n}StartedAt`]) / 1000)])) },
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

// Overnight finish (8 Oct, Prateek asleep: "I need this ready by tomorrow morning"). Walks chapters 1..total in order on
// the server, one step per action: waits for a chapter still being written, rewrites a failed one (up to 3 tries),
// fact-checks an unchecked one (the handbook's writer twice, then Claude Sonnet so no chapter is left unchecked), and
// draws pictures where none were drawn. Each outcome goes into test.finish so the morning report can read it.
export const patchChecked = internalMutation({
  args: { id: v.id("chapters"), cards: v.any(), recallCards: v.optional(v.any()), quizTiers: v.optional(v.any()), recallTiers: v.optional(v.any()), factCheck: v.any() },
  handler: async (ctx, { id, ...rest }) => { await ctx.db.patch(id, rest); },
});
export const note = internalMutation({
  args: { handbookId: v.id("handbooks"), line: v.string() },
  handler: async (ctx, { handbookId, line }) => {
    const h = await ctx.db.get(handbookId);
    if (h) await ctx.db.patch(handbookId, { test: { ...(h.test ?? {}), finish: [...((h.test as any)?.finish ?? []), `${new Date().toISOString().slice(11, 19)} ${line}`] } });
  },
});
export const finish = internalAction({
  args: { handbookId: v.id("handbooks"), n: v.number(), tries: v.optional(v.number()) },
  handler: async (ctx, { handbookId, n, tries = 0 }) => {
    const h: any = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    const total = h?.plan?.chapters?.length ?? 0;
    if (!h?.plan || n > total) { await ctx.runMutation(internal.abtest.note, { handbookId, line: "finish: done" }); return; }
    const again = (delayMs: number, t: number) => ctx.scheduler.runAfter(delayMs, internal.abtest.finish, { handbookId, n, tries: t });
    const next = () => ctx.scheduler.runAfter(0, internal.abtest.finish, { handbookId, n: n + 1 });
    let ch: any = await ctx.runQuery(internal.handbooks.readChapterRow, { handbookId, n });

    // Still being written by the earlier chain: look again in a minute (at most 20 minutes).
    if (ch?.status === "writing" && Date.now() - (ch.createdAt ?? 0) < 20 * 60000) { await again(60000, tries); return; }
    // Missing, failed, or stuck: write it.
    if (!ch || ch.status !== "ready") {
      if (tries >= 3) { await ctx.runMutation(internal.abtest.note, { handbookId, line: `ch${n}: gave up after 3 writes` }); await next(); return; }
      await ctx.runMutation(internal.handbooks.startChapter, { handbookId, n });
      await ctx.runAction(internal.handbooks.generateChapter, { handbookId, n });
      ch = await ctx.runQuery(internal.handbooks.readChapterRow, { handbookId, n });
      await ctx.runMutation(internal.abtest.note, { handbookId, line: `ch${n}: write ${tries + 1} -> ${ch?.status}${ch?.error ? ` (${String(ch.error).slice(0, 80)})` : ""}` });
      if (ch?.status !== "ready") { await again(30000, tries + 1); return; }
    }
    // Unchecked: the writer's model twice, then Claude Sonnet (the app's default checker).
    if (ch.factCheck?.status === "unchecked" || !ch.factCheck) {
      for (const model of [h.writer, h.writer, undefined]) {
        const r = await checkWithVersions(ctx, h.plan?.topic ?? h.topic, h.level, ch.title ?? "", ch.cards ?? [], ch.recallCards ?? [], ch.quizTiers, ch.recallTiers, model);
        await ctx.runMutation(internal.abtest.note, { handbookId, line: `ch${n}: check by ${model ?? "claude-sonnet"} -> ${r.report.status}, ${r.report.fixes} fixes` });
        if (r.report.status !== "unchecked") {
          await ctx.runMutation(internal.abtest.patchChecked, { id: ch._id, cards: r.cards, recallCards: ch.recallCards ? r.recallCards : undefined, quizTiers: r.quizTiers, recallTiers: r.recallTiers, factCheck: r.report });
          break;
        }
      }
    }
    // Pictures: Runway draws only chapter 1's cover; the rest are free photos.
    if (!ch.picturesStatus || ch.picturesStatus === "failed") {
      await ctx.runAction(internal.images.forChapter, { handbookId, n });
      const after: any = await ctx.runQuery(internal.handbooks.readChapterRow, { handbookId, n });
      await ctx.runMutation(internal.abtest.note, { handbookId, line: `ch${n}: pictures ${after?.picturesStatus}, ${(after?.pictures ?? []).filter((p: any) => p.storageId).length}` });
    }
    await next();
  },
});

// The 6 Oct judge (evalModels.ts: Claude Opus 5.5, high effort, 12 true/false checks) on stored chapters, so tonight's
// handbooks compare with the 6 Oct table (chapter 1 averages: Opus 9.0, Sonnet 9.0, Haiku 5.2 of 12). Results go
// into test.judge; the judge's own cost is logged as "audit" and is not part of the handbook's cost.
export const saveJudge = internalMutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), result: v.any() },
  handler: async (ctx, { handbookId, n, result }) => {
    const h = await ctx.db.get(handbookId);
    if (h) await ctx.db.patch(handbookId, { test: { ...(h.test ?? {}), judge: { ...((h.test as any)?.judge ?? {}), [n]: result } } });
  },
});
export const judgeAll = internalAction({
  args: { handbookId: v.id("handbooks"), upTo: v.optional(v.number()) },
  handler: async (ctx, { handbookId, upTo = 7 }) => {
    for (let n = 1; n <= upTo; n++) {
      const ch: any = await ctx.runQuery(internal.handbooks.readChapterRow, { handbookId, n });
      if (ch?.status !== "ready") { await ctx.runMutation(internal.abtest.saveJudge, { handbookId, n, result: { error: `chapter ${ch?.status ?? "missing"}` } }); continue; }
      const slim = { title: ch.title, cards: ch.cards, outcomeLine: ch.outcomeLine };
      const r: any = await ctx.runAction(internal.ai.generate, { kind: "audit", system: JUDGE, user: "Chapter JSON:\n" + JSON.stringify(slim), model: JUDGE_MODEL, effort: "high" });
      await ctx.runMutation(internal.abtest.saveJudge, { handbookId, n, result: r.ok ? { score: r.json?.score, checks: r.json?.checks, why: r.json?.why, fix: r.json?.fix, dubious: r.json?.dubious_claims ?? [] } : { error: r.error } });
    }
    await ctx.runMutation(internal.abtest.note, { handbookId, line: "judge: done" });
  },
});
