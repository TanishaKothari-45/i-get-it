import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { isOwner } from "./admin";
import { inrOf, providerOf } from "./costs";

// The admin dashboard's "AI pipeline" section (8 Oct): every AI and media call, from the goal question to the last
// picture, read from the small callStats rows (written with every aiCalls row). Owner only, like the rest of /admin.
// Groups: "reader" calls belong to a reader's handbook; "maintenance" are background jobs with no handbook (ready
// topics, polish, doctor, repair, audits, A/B variants); "eval" are the prompt and model tests.

const DAY = 24 * 60 * 60 * 1000;
const IST = 5.5 * 60 * 60 * 1000;
const CAP = 20000;   // rows read at most; plenty for the dev deployment, and the window can be narrowed

type Row = Doc<"callStats">;
const groupOf = (r: Row) => (r.kind.startsWith("eval") ? "eval" : r.handbookId ? "reader" : "maintenance");

// Nearest-rank percentile, p in 0..100; null for an empty list.
function pct(xs: number[], p: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.max(0, Math.ceil((p / 100) * s.length) - 1)];
}
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function steps(rows: Row[]) {
  const by = new Map<string, Row[]>();
  for (const r of rows) { const k = `${groupOf(r)}\u0000${r.kind}\u0000${r.model}`; by.set(k, [...(by.get(k) ?? []), r]); }
  return [...by.entries()].map(([k, rs]) => {
    const [group, kind, model] = k.split("\u0000");
    const ok = rs.filter((r) => r.ok), ms = ok.map((r) => r.ms);
    return {
      group, kind, model, provider: providerOf(model), calls: rs.length, failed: rs.length - ok.length,
      retried: rs.filter((r) => (r.attempts ?? 1) > 1).length,
      p50: pct(ms, 50), p95: pct(ms, 95), p99: pct(ms, 99),
      tokensIn: ok.length ? Math.round(sum(ok.map((r) => r.tokensIn)) / ok.length) : 0,
      tokensOut: ok.length ? Math.round(sum(ok.map((r) => r.tokensOut)) / ok.length) : 0,
      cachedIn: sum(rs.map((r) => r.cachedIn ?? 0)),
      inr: sum(rs.map((r) => r.inr)),
    };
  }).sort((a, b) => b.inr - a.inr);
}

// One handbook's journey: when it was typed, when the reader settled on a goal, and when the plan and chapter 1 were
// ready (chapter 1 is ready once it is written and checked; quiz versions come later, in the background).
function journey(h: Doc<"handbooks">, rs: Row[]) {
  const end = (f: (r: Row) => boolean) => { const xs = rs.filter((r) => r.ok && f(r)).map((r) => r.at); return xs.length ? Math.max(...xs) : null; };
  const plan = end((r) => r.kind === "plan");
  const ch1 = end((r) => r.chapter === 1 && (r.kind === "chapter" || r.kind === "check"));
  const goalAt = (h as any).goalChosenAt as number | undefined;
  const from = goalAt ?? h.createdAt;
  return {
    id: h._id as string, topic: h.plan?.topic ?? h.topic, createdAt: h.createdAt, status: h.status,
    kind: h.source === "cache" ? "ready topic" : (h as any).fromLibrary ? "shared copy" : "typed",
    goal: (h as any).goal ?? null,
    pickGoal: goalAt ? goalAt - h.createdAt : null,      // the reader's time on the goal question
    toPlan: plan ? plan - from : null,                    // machine time from the goal to the plan
    toChapter1: ch1 ? ch1 - from : null,                  // machine time from the goal to chapter 1
    calls: rs.length, failed: rs.filter((r) => !r.ok).length, retried: rs.filter((r) => (r.attempts ?? 1) > 1).length,
    inr: sum(rs.map((r) => r.inr)),
  };
}

export const dashboard = query({
  args: { days: v.number() },
  handler: async (ctx, { days }) => {
    const who = await isOwner(ctx);
    if (!who.ok) return { denied: true as const };
    return build(ctx, days);
  },
});
// The same numbers from the CLI (no owner sign-in): npx convex run pipeline:numbers '{"days":7}'
export const numbers = internalQuery({ args: { days: v.number() }, handler: async (ctx, { days }) => build(ctx, days) });

async function build(ctx: QueryCtx, days: number) {
    const now = Date.now();
    const since = days ? now - days * DAY : 0;
    const rows = await ctx.db.query("callStats").withIndex("by_at", (q) => q.gte("at", since)).order("desc").take(CAP);
    const reader = rows.filter((r) => groupOf(r) === "reader");
    const todayStart = Math.floor((now + IST) / DAY) * DAY - IST;

    const ids = [...new Set(reader.map((r) => r.handbookId as Id<"handbooks">))];
    const docs = (await Promise.all(ids.map((id) => ctx.db.get(id)))).filter((h): h is Doc<"handbooks"> => !!h);
    const journeys = docs.map((h) => journey(h, reader.filter((r) => r.handbookId === h._id))).sort((a, b) => b.createdAt - a.createdAt);
    const typed = journeys.filter((j) => j.kind === "typed");
    const times = (f: (j: (typeof typed)[number]) => number | null) => typed.flatMap((j) => { const x = f(j); return x === null ? [] : [x]; });

    return {
      denied: false as const,
      capped: rows.length >= CAP,
      summary: {
        calls: reader.length,
        failedShare: reader.length ? reader.filter((r) => !r.ok).length / reader.length : 0,
        retriedShare: reader.length ? reader.filter((r) => (r.attempts ?? 1) > 1).length / reader.length : 0,
        inr: sum(reader.map((r) => r.inr)),
        inrToday: sum(rows.filter((r) => r.at >= todayStart && groupOf(r) !== "eval").map((r) => r.inr)),
        handbooks: typed.length,
        inrPerHandbook: { p50: pct(typed.map((j) => j.inr), 50), p95: pct(typed.map((j) => j.inr), 95) },
        toChapter1: { p50: pct(times((j) => j.toChapter1), 50), p95: pct(times((j) => j.toChapter1), 95) },
        pickGoal: { p50: pct(times((j) => j.pickGoal), 50) },
        maintenanceInr: sum(rows.filter((r) => groupOf(r) === "maintenance").map((r) => r.inr)),
        evalInr: sum(rows.filter((r) => groupOf(r) === "eval").map((r) => r.inr)),
      },
      steps: steps(rows),
      handbooks: journeys.slice(0, 40),
    };
}

// Every call for one handbook, in order, with its time from the moment the handbook was typed.
export const handbookCalls = query({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    const who = await isOwner(ctx);
    if (!who.ok) return null;
    const h = await ctx.db.get(handbookId);
    if (!h) return null;
    const rows = await ctx.db.query("callStats").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).take(500);
    return rows.map((r) => ({
      kind: r.kind, model: r.model, provider: providerOf(r.model), chapter: r.chapter ?? null, ok: r.ok, attempts: r.attempts ?? 1,
      startedAfter: r.at - r.ms - h.createdAt, ms: r.ms, tokensIn: r.tokensIn, tokensOut: r.tokensOut, cachedIn: r.cachedIn ?? 0, inr: r.inr,
    }));
  },
});

// One-off (8 Oct): copy the call log from before callStats existed, oldest first, 100 rows a page (the full rows carry
// prompt and reply text, so small pages stay under the read limit). Only rows older than the first callStats row, so
// running it twice adds nothing. Run: npx convex run pipeline:backfill '{}'
export const backfillPage = internalMutation({
  args: { cursor: v.union(v.string(), v.null()), before: v.number() },
  handler: async (ctx, { cursor, before }) => {
    const page = await ctx.db.query("aiCalls").withIndex("by_at", (q) => q.lt("at", before)).paginate({ cursor, numItems: 100 });
    for (const c of page.page) {
      await ctx.db.insert("callStats", {
        at: c.at, kind: c.kind, model: c.model, ms: c.ms, ok: c.ok, tokensIn: c.tokensIn ?? 0, tokensOut: c.tokensOut ?? 0,
        cachedIn: c.cachedIn, attempts: c.attempts, handbookId: c.handbookId, chapter: c.chapter, inr: inrOf(c.model, c.ok, c.tokensIn ?? 0, c.tokensOut ?? 0),
      });
    }
    return { cursor: page.continueCursor, done: page.isDone, n: page.page.length };
  },
});
export const firstStatAt = internalQuery({ args: {}, handler: async (ctx) => (await ctx.db.query("callStats").withIndex("by_at").order("asc").first())?.at ?? Date.now() });
export const backfill = internalAction({
  args: {},
  handler: async (ctx): Promise<number> => {
    const before: number = await ctx.runQuery(internal.pipeline.firstStatAt, {});
    let cursor: string | null = null, total = 0;
    for (;;) {
      const r: { cursor: string; done: boolean; n: number } = await ctx.runMutation(internal.pipeline.backfillPage, { cursor, before });
      total += r.n; cursor = r.cursor;
      if (r.done) return total;
    }
  },
});
