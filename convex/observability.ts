// Observability (8 Oct): latency, tokens, retries and cost per step and per handbook, from the AI call log.
// Reads only timings, token counts, models and ids: never prompts, replies or what a reader typed.
// Run: npx convex run observability:report '{"days":7}'   (add --prod only with Prateek's go-ahead)
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { inrOf, providerOf } from "./costs";

const PAGE = 300;
const DAY = 24 * 60 * 60 * 1000;

type Call = {
  kind: string; model: string; ms: number; ok: boolean; at: number; tokensIn: number; tokensOut: number;
  attempts: number; handbookId?: Id<"handbooks">; chapter?: number;
};

// One page of the call log since a time, without the prompt and reply text.
export const page = internalQuery({
  args: { since: v.number(), cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { since, cursor }) => {
    const r = await ctx.db.query("aiCalls").withIndex("by_at", (q) => q.gte("at", since)).paginate({ cursor, numItems: PAGE });
    const rows: Call[] = r.page.map((c) => ({
      kind: c.kind, model: c.model, ms: c.ms, ok: c.ok, at: c.at, tokensIn: c.tokensIn ?? 0, tokensOut: c.tokensOut ?? 0,
      attempts: c.attempts ?? 1, handbookId: c.handbookId, chapter: c.chapter,
    }));
    return { rows, cursor: r.continueCursor, done: r.isDone };
  },
});

// When each handbook was started and what kind it is (typed and written live, a ready topic, or a shared copy).
export const handbookKinds = internalQuery({
  args: { ids: v.array(v.id("handbooks")) },
  handler: async (ctx, { ids }) => {
    const out: { id: Id<"handbooks">; createdAt: number; kind: string }[] = [];
    for (const id of ids) {
      const h = await ctx.db.get(id);
      if (!h) continue;
      const kind = h.source === "cache" ? "ready topic" : (h as any).fromLibrary ? "shared copy" : "typed, written live";
      out.push({ id, createdAt: h.createdAt, kind });
    }
    return out;
  },
});

// Nearest-rank percentile (p in 0..100); null for an empty list.
function pct(xs: number[], p: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.max(0, Math.ceil((p / 100) * s.length) - 1)];
}
const secs = (ms: number | null) => (ms === null ? "–" : `${(ms / 1000).toFixed(1)} s`);
const inr = (x: number | null) => (x === null ? "–" : `₹${x.toFixed(2)}`);
const share = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "–");
const costOf = (c: Call) => inrOf(c.model, c.ok, c.tokensIn, c.tokensOut);

// The steps a reader waits on before chapter 1 opens: written, given its quiz versions, fact checked.
const CHAPTER1_KINDS = new Set(["chapter", "versions", "check"]);

function byStep(calls: Call[]) {
  const groups = new Map<string, Call[]>();
  for (const c of calls) {
    const key = `${c.kind}\u0000${c.model}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return [...groups.entries()].map(([key, cs]) => {
    const [kind, model] = key.split("\u0000");
    const ok = cs.filter((c) => c.ok);
    const ms = ok.map((c) => c.ms);
    const cost = cs.reduce((t, c) => t + costOf(c), 0);
    const avg = (f: (c: Call) => number) => (ok.length ? Math.round(ok.reduce((t, c) => t + f(c), 0) / ok.length) : 0);
    return {
      kind, model, provider: providerOf(model), calls: cs.length, failed: cs.length - ok.length,
      retried: cs.filter((c) => c.attempts > 1).length,
      p50: pct(ms, 50), p95: pct(ms, 95), p99: pct(ms, 99),
      tokensIn: avg((c) => c.tokensIn), tokensOut: avg((c) => c.tokensOut),
      inr: cost, inrPerCall: cs.length ? cost / cs.length : 0,
    };
  }).sort((a, b) => b.inr - a.inr);
}

// Per handbook: from its start to the plan and to chapter 1. "From start" includes the reader choosing a goal;
// "after the plan" is machine time only.
function journey(cs: Call[], createdAt: number) {
  const planEnd = cs.filter((c) => c.kind === "plan" && c.ok).map((c) => c.at).sort((a, b) => a - b)[0];
  const ch1End = cs.filter((c) => c.chapter === 1 && c.ok && CHAPTER1_KINDS.has(c.kind)).map((c) => c.at).sort((a, b) => b - a)[0];
  const research = cs.filter((c) => c.kind === "research").reduce((t, c) => t + c.ms, 0);
  return {
    calls: cs.length, inr: cs.reduce((t, c) => t + costOf(c), 0),
    toPlan: planEnd ? planEnd - createdAt : null,
    toChapter1: ch1End ? ch1End - createdAt : null,
    chapter1AfterPlan: planEnd && ch1End ? ch1End - planEnd : null,
    research: research || null,
  };
}

export const report = internalAction({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days = 7 }): Promise<{ markdown: string; steps: any[]; journeys: Record<string, any> }> => {
    const since = Date.now() - days * DAY;
    const calls: Call[] = [];
    let cursor: string | null = null;
    for (;;) {
      const p: { rows: Call[]; cursor: string; done: boolean } = await ctx.runQuery(internal.observability.page, { since, cursor });
      calls.push(...p.rows);
      cursor = p.cursor;
      if (p.done) break;
    }
    const steps = byStep(calls);

    const byHandbook = new Map<string, Call[]>();
    for (const c of calls) if (c.handbookId) byHandbook.set(c.handbookId, [...(byHandbook.get(c.handbookId) ?? []), c]);
    const ids = [...byHandbook.keys()] as Id<"handbooks">[];
    const kinds: { id: Id<"handbooks">; createdAt: number; kind: string }[] = [];
    for (let i = 0; i < ids.length; i += 100) kinds.push(...(await ctx.runQuery(internal.observability.handbookKinds, { ids: ids.slice(i, i + 100) })));
    const rows = kinds.map((h) => ({ kind: h.kind, ...journey(byHandbook.get(h.id) ?? [], h.createdAt) }));

    const journeys: Record<string, any> = {};
    for (const kind of [...new Set(rows.map((r) => r.kind))]) {
      const js = rows.filter((r) => r.kind === kind);
      const spread = (f: (r: typeof js[number]) => number | null) => {
        const xs = js.map(f).filter((x): x is number => x !== null);
        return { p50: pct(xs, 50), p95: pct(xs, 95) };
      };
      journeys[kind] = {
        handbooks: js.length, toPlan: spread((r) => r.toPlan), toChapter1: spread((r) => r.toChapter1),
        chapter1AfterPlan: spread((r) => r.chapter1AfterPlan), research: spread((r) => r.research),
        inr: spread((r) => r.inr), calls: spread((r) => r.calls),
      };
    }

    const untagged = calls.filter((c) => !c.handbookId).length;
    const total = calls.reduce((t, c) => t + costOf(c), 0);
    const markdown = [
      `# Latency and cost, last ${days} day${days === 1 ? "" : "s"}`,
      "",
      `${calls.length} AI calls, ${inr(total)} estimated (Prateek's price table in costs.ts; a provider's bill is the truth). ${untagged} carry no handbook (one-off tools, or logged before the tags).`,
      "",
      "## Each step",
      "",
      "| Step | Model | Calls | Failed | Retried | p50 | p95 | p99 | Tokens in / out | ₹ a call | ₹ total |",
      "|---|---|---|---|---|---|---|---|---|---|---|",
      ...steps.map((s) => `| ${s.kind} | ${s.model} | ${s.calls} | ${share(s.failed, s.calls)} | ${share(s.retried, s.calls)} | ${secs(s.p50)} | ${secs(s.p95)} | ${secs(s.p99)} | ${s.tokensIn} / ${s.tokensOut} | ${inr(s.inrPerCall)} | ${inr(s.inr)} |`),
      "",
      "## Each handbook, start to chapter 1",
      "",
      "\"Start\" is when the handbook was made, so it includes the reader choosing a goal; \"after the plan\" is machine time only.",
      "",
      "| Kind | Handbooks | Start to plan p50 / p95 | Start to chapter 1 p50 / p95 | Chapter 1 after the plan p50 / p95 | Research p50 / p95 | Calls p50 | ₹ p50 / p95 |",
      "|---|---|---|---|---|---|---|---|",
      ...Object.entries(journeys).map(([k, j]) => `| ${k} | ${j.handbooks} | ${secs(j.toPlan.p50)} / ${secs(j.toPlan.p95)} | ${secs(j.toChapter1.p50)} / ${secs(j.toChapter1.p95)} | ${secs(j.chapter1AfterPlan.p50)} / ${secs(j.chapter1AfterPlan.p95)} | ${secs(j.research.p50)} / ${secs(j.research.p95)} | ${j.calls.p50 ?? "–"} | ${inr(j.inr.p50)} / ${inr(j.inr.p95)} |`),
      "",
    ].join("\n");
    return { markdown, steps, journeys };
  },
});
