// The shape benchmark (9 Oct, feat/handbook-shape): typed handbooks run through the real pipeline (research, plan with
// its checks, chapters with the fact check), on the dev deployment only, to see whether the shape framework fixed the
// short, squeezed handbooks without pushing simple topics into long courses. Rows are marked as a test handbook
// ("test"), which is never shared, and owned by the token "eval-shape". Driven by scripts/shape-bench.mjs.
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { inrOf } from "./costs";
import { internal } from "./_generated/api";

const OWNER = "eval-shape";

// A handbook as it is after the reader picked a goal; the script then runs handbooks:generatePlan on it.
export const create = internalMutation({
  // flashOnly (9 Oct): no Opus or Claude backup at any step; planOnly: stop after the plan, no chapters.
  args: { topic: v.string(), level: v.union(v.literal("new"), v.literal("some")), goal: v.optional(v.string()), mode: v.optional(v.string()), flashOnly: v.optional(v.boolean()), planOnly: v.optional(v.boolean()), noVersions: v.optional(v.boolean()) },
  handler: async (ctx, { topic, level, goal, mode, flashOnly, planOnly, noVersions }) => {
    const now = Date.now();
    const handbookId = await ctx.db.insert("handbooks", {
      topic, topicKey: `eval-shape:${topic.toLowerCase()}`, level, language: "English", voice: "friend", status: "planning",
      ...(goal ? { goal } : {}), ...(mode ? { mode } : {}), goalChosenAt: now,
      ownerToken: OWNER, source: "live", test: { label: "shape-bench", startedAt: now, ...(flashOnly ? { flashOnly: true } : {}), ...(planOnly ? { planOnly: true } : {}), ...(noVersions ? { noVersions: true } : {}) }, createdAt: now,
    } as any);
    await ctx.db.insert("progress", { handbookId, currentChapter: 1, currentCard: 0, chaptersPassed: [], passedExercises: [], missedExercises: [], lastOpenedAt: now, updatedAt: now });
    return handbookId;
  },
});

// What the benchmark reads back: the brief (without the long Wikipedia and recap texts), the plan, and every chapter.
export const read = internalQuery({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    const h: any = await ctx.db.get(handbookId);
    if (!h) return null;
    const { wiki, recap, ...brief } = h.brief ?? {};
    const chapters = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId)).collect();
    return {
      status: h.status, error: h.error ?? null, test: h.test ?? null, question: h.question ?? null, topic: h.topic, goal: h.goal ?? null, level: h.level,
      brief: h.brief ? brief : null, plan: h.plan ?? null,
      chapters: chapters.sort((a, b) => a.n - b.n).map((c: any) => ({
        n: c.n, status: c.status, error: c.error ?? null, model: c.model ?? null, title: c.title ?? null, outcomeLine: c.outcomeLine ?? null,
        cards: c.cards ?? [], paragraphs: c.paragraphs ?? null, words: c.words ?? null, factCheck: c.factCheck ?? null, ledger: c.ledger ?? null,
      })),
    };
  },
});

// Cost and calls for one handbook, from the call log.
export const cost = internalQuery({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    const rows = await ctx.db.query("callStats").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).take(200);
    return {
      calls: rows.length, failed: rows.filter((r) => !r.ok).length,
      inr: rows.reduce((a, r) => a + (r.inr ?? inrOf(r.model, r.ok, r.tokensIn, r.tokensOut)), 0),
      byKind: Object.fromEntries([...new Set(rows.map((r) => r.kind))].map((k) => [k, rows.filter((r) => r.kind === k).map((r) => `${r.model}${r.ok ? "" : " (failed)"}`)])),
    };
  },
});

// Every call for one handbook, for the benchmark's cost breakdown.
export const steps = internalQuery({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => (await ctx.db.query("callStats").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).take(300))
    .map((r) => ({ kind: r.kind, model: r.model, ok: r.ok, inr: r.inr ?? 0, tokensIn: r.tokensIn, tokensOut: r.tokensOut, chapter: r.chapter ?? null })),
});

// What the plan step saw on a Flash-only benchmark run: the faults of Flash's first plan, and those left at the end.
export const noteTest = internalMutation({
  args: { handbookId: v.id("handbooks"), note: v.any() },
  handler: async (ctx, { handbookId, note }) => {
    const h: any = await ctx.db.get(handbookId);
    if (h) await ctx.db.patch(handbookId, { test: { ...(h.test ?? {}), ...note } } as any);
  },
});

// Before a benchmark retries a failed plan on Flash: back to "planning", and a failed research brief cleared so research
// runs again (a good brief is kept).
export const resetForRetry = internalMutation({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    const h: any = await ctx.db.get(handbookId);
    if (!h) return;
    await ctx.db.patch(handbookId, { status: "planning", error: undefined, ...(h.brief?.failed ? { brief: undefined } : {}) } as any);
  },
});

// Long steps run in the background (9 Oct): under a busy Gemini, a plan step can take 3 to 6 minutes, longer than the
// CLI will wait on a call. The scripts start the step here, then read the handbook until it lands.
export const runPlan = internalMutation({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => { await ctx.scheduler.runAfter(0, internal.handbooks.generatePlan, { handbookId }); },
});
export const runChapter = internalMutation({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }) => {
    const c = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    if (c) await ctx.db.patch(c._id, { status: "writing", error: undefined });
    else await ctx.db.insert("chapters", { handbookId, n, status: "writing", createdAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.handbooks.generateChapter, { handbookId, n });
  },
});
