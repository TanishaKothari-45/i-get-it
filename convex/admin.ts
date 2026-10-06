import { v } from "convex/values";
import { HOUR } from "@convex-dev/rate-limiter";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalQuery, query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// The owner's /admin dashboard (6 Oct): the funnel from visit to sign-up with drop-off at each step, landing scroll
// depth, how handbooks get started, where chapter 1 loses people, waits, sources, topics and the latest visitors.
// Owner only (emails in STATS_OWNER_EMAILS), checked here on the server. Prateek's own phones and accounts are left out.

const IST_MS = 5.5 * HOUR;
const dayOf = (t: number) => new Date(t + IST_MS).toISOString().slice(0, 10);
const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const SECTIONS = ["hero", "saved", "steps", "demo", "path", "shelf", "offer", "final"];

async function isOwner(ctx: QueryCtx) {
  const id = await getAuthUserId(ctx);
  const user = id ? await ctx.db.get(id) : null;
  const owners = (process.env.STATS_OWNER_EMAILS ?? "").toLowerCase().split(",").map((e) => e.trim()).filter(Boolean);
  return { ok: !!user?.email && owners.includes(user.email.toLowerCase()), signedIn: !!user };
}

export const dashboard = query({
  args: { days: v.number() },
  handler: async (ctx, { days }) => {
    const who = await isOwner(ctx);
    if (!who.ok) return { denied: true as const, signedIn: who.signedIn };
    return await build(ctx, days);
  },
});

// The same numbers from a terminal (npx convex run --prod admin:numbers '{"days":1}'), for checking without signing in.
export const numbers = internalQuery({ args: { days: v.number() }, handler: async (ctx, { days }) => build(ctx, days) });

async function build(ctx: QueryCtx, days: number) {
  {

    const since = days > 0 ? dayOf(Date.now() - (days - 1) * 24 * HOUR) : "0000";
    const excluded = await ctx.db.query("statsExcluded").collect();
    const xTokens = new Set(excluded.map((e) => e.deviceToken).filter(Boolean) as string[]);
    const xUsers = new Set(excluded.map((e) => e.userId).filter(Boolean).map(String));
    const allBooks = await ctx.db.query("handbooks").collect();
    for (const h of allBooks) if (h.userId && xUsers.has(String(h.userId)) && h.ownerToken) xTokens.add(h.ownerToken);
    const skip = (t?: string) => !t || xTokens.has(t) || t.startsWith("abuse-");

    // visitors in the window, with the source of their first visit
    const visits = (await ctx.db.query("visits").collect()).filter((x) => x.day >= since && !skip(x.visitor)).sort((a, b) => a.at - b.at);
    const vis = new Map<string, { first: number; source: string }>();
    for (const x of visits) if (!vis.has(x.visitor)) vis.set(x.visitor, { first: x.at, source: x.source ?? "direct" });

    const events = (await ctx.db.query("events").collect()).filter((e) => e.day >= since && !skip(e.visitor));
    const trackingSince = events.length ? Math.min(...events.map((e) => e.at)) : null;
    const ev = new Map<string, Doc<"events">[]>();
    for (const e of events) { if (!ev.has(e.visitor)) ev.set(e.visitor, []); ev.get(e.visitor)!.push(e); }
    for (const e of events) if (!vis.has(e.visitor)) vis.set(e.visitor, { first: e.at, source: "direct" });

    const books = allBooks.filter((h) => !skip(h.ownerToken) && !(h.userId && xUsers.has(String(h.userId))) && dayOf(h.createdAt) >= since);
    const byOwner = new Map<string, Doc<"handbooks">[]>();
    for (const h of books) { const k = h.ownerToken!; if (!byOwner.has(k)) byOwner.set(k, []); byOwner.get(k)!.push(h); }
    const prog = new Map<string, Doc<"progress">>();
    const ch1 = new Map<string, number>();
    for (const h of books) {
      const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
      if (p) prog.set(String(h._id), p);
      const c = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id).eq("n", 1)).unique();
      if (c?.cards) ch1.set(String(h._id), c.cards.length);
    }
    const intents = await ctx.db.query("priceIntents").collect();
    const payTokens = new Set(intents.map((i) => i.deviceToken).filter(Boolean) as string[]);

    type Row = {
      visitor: string; first: number; source: string; landed: boolean; scrolled: boolean; deepest: string | null; focused: boolean; typed: boolean;
      via: string | null; started: boolean; topic: string | null; ready: boolean | null; plan: boolean; openedCh1: boolean; ch1Card: number | null; ch1Of: number | null;
      passed: number; startedCh2: boolean; signedUp: boolean; paid: boolean; planWaitS: number | null; ch1WaitS: number | null; events: number; secs: string[];
    };
    const rows: Row[] = [];
    for (const [visitor, v0] of vis) {
      const es = (ev.get(visitor) ?? []).sort((a, b) => a.at - b.at);
      const has = (n: string, f?: (e: Doc<"events">) => boolean) => es.some((e) => e.name === n && (!f || f(e)));
      const secs = es.filter((e) => e.name === "section").map((e) => String(e.props?.section ?? ""));
      const deepest = secs.length ? SECTIONS.filter((s) => secs.includes(s)).pop() ?? secs[secs.length - 1] : null;
      const hb = (byOwner.get(visitor) ?? []).sort((a, b) => a.createdAt - b.createdAt)[0];
      const p = hb ? prog.get(String(hb._id)) : undefined;
      const passed = p?.chaptersPassed.length ?? 0;
      const submit = es.find((e) => e.name === "submit");
      const planView = es.find((e) => e.name === "plan_view");
      const open1 = es.find((e) => e.name === "ch_open" && Number(e.props?.n) === 1);
      const openedCh1 = !!open1 || passed > 0 || (p ? p.currentCard > 0 || p.currentChapter > 1 : false);
      rows.push({
        visitor: visitor.slice(0, 6), first: v0.first, source: v0.source,
        landed: has("land"), scrolled: secs.some((s) => s !== "hero"), deepest, focused: has("box_focus"), typed: has("box_type"),
        via: submit ? String(submit.props?.via ?? "") : hb ? "yes" : null,
        started: !!hb, topic: hb ? String((hb.plan as any)?.topic ?? hb.topic).slice(0, 60) : null, ready: hb ? hb.source === "cache" : null,
        plan: !!planView || (!!hb?.plan && hb.status !== "planning"), openedCh1,
        ch1Card: p && p.currentChapter === 1 && passed === 0 ? p.currentCard + 1 : null, ch1Of: hb ? ch1.get(String(hb._id)) ?? null : null,
        passed, startedCh2: passed >= 2 || (!!p && p.currentChapter >= 2 && p.currentCard > 0) || has("ch_open", (e) => Number(e.props?.n) === 2),
        signedUp: !!hb?.userId, paid: payTokens.has(visitor),
        planWaitS: hb && planView ? Math.max(0, Math.round((planView.at - hb.createdAt) / 1000)) : null,
        ch1WaitS: planView && open1 ? Math.max(0, Math.round((open1.at - planView.at) / 1000)) : null,
        events: es.length, secs: [...new Set(secs)],
      });
    }

    const tracked = rows.filter((r) => r.events > 0 || (trackingSince !== null && r.first >= trackingSince));
    const count = (xs: Row[], f: (r: Row) => boolean) => xs.filter(f).length;
    const funnel = [
      { step: "Visited", n: rows.length, tracked: false },
      { step: "Saw the landing page", n: count(tracked, (r) => r.landed), of: tracked.length, tracked: true },
      { step: "Scrolled past the top", n: count(tracked, (r) => r.scrolled), of: tracked.length, tracked: true },
      { step: "Tapped the box", n: count(tracked, (r) => r.focused), of: tracked.length, tracked: true },
      { step: "Typed something", n: count(tracked, (r) => r.typed), of: tracked.length, tracked: true },
      { step: "Started a handbook", n: count(rows, (r) => r.started), tracked: false },
      { step: "Saw their plan", n: count(rows, (r) => r.plan), tracked: false },
      { step: "Opened chapter 1", n: count(rows, (r) => r.openedCh1), tracked: false },
      { step: "Passed chapter 1", n: count(rows, (r) => r.passed >= 1), tracked: false },
      { step: "Started chapter 2", n: count(rows, (r) => r.startedCh2), tracked: false },
      { step: "Signed up", n: count(rows, (r) => r.signedUp), tracked: false },
      { step: "Tapped Pay", n: count(rows, (r) => r.paid), tracked: false },
    ];

    const landed = tracked.filter((r) => r.landed);
    const sections = SECTIONS.map((s) => ({ section: s, n: landed.filter((r) => s === "hero" || r.secs.includes(s)).length, of: landed.length }));

    const via: Record<string, number> = {};
    const tapped: Record<string, number> = {};
    for (const e of events) if (e.name === "submit") { const k = String(e.props?.via ?? "box"); via[k] = (via[k] ?? 0) + 1; if (k !== "box" && e.props?.topic) { const t = String(e.props.topic); tapped[t] = (tapped[t] ?? 0) + 1; } }

    const sources: Record<string, { visitors: number; started: number; opened: number; passed: number; signedUp: number }> = {};
    for (const r of rows) {
      const s = (sources[r.source] ??= { visitors: 0, started: 0, opened: 0, passed: 0, signedUp: 0 });
      s.visitors++; if (r.started) s.started++; if (r.openedCh1) s.opened++; if (r.passed >= 1) s.passed++; if (r.signedUp) s.signedUp++;
    }

    const topics: Record<string, { started: number; opened: number; passed: number; ready: boolean }> = {};
    for (const r of rows) if (r.topic) { const t = (topics[r.topic] ??= { started: 0, opened: 0, passed: 0, ready: !!r.ready }); t.started++; if (r.openedCh1) t.opened++; if (r.passed >= 1) t.passed++; }

    // where chapter 1 loses people: the card they're on, among those who opened it and haven't passed
    const stuck = rows.filter((r) => r.openedCh1 && r.passed === 0 && r.ch1Card).map((r) => ({ card: r.ch1Card!, of: r.ch1Of ?? 0 }));

    const daysList: { day: string; visitors: number; started: number; passed: number }[] = [];
    const span = days > 0 ? days : 14;
    for (let i = span - 1; i >= 0; i--) {
      const d = dayOf(Date.now() - i * 24 * HOUR);
      daysList.push({ day: d, visitors: rows.filter((r) => dayOf(r.first) === d).length, started: books.filter((h) => dayOf(h.createdAt) === d).length,
        passed: rows.filter((r) => r.passed >= 1 && dayOf(r.first) === d).length });
    }

    return {
      denied: false as const,
      at: Date.now(),
      trackingSince,
      funnel,
      sections,
      via: Object.entries(via).map(([k, n]) => ({ via: k, n })).sort((a, b) => b.n - a.n),
      tapped: Object.entries(tapped).map(([topic, n]) => ({ topic, n })).sort((a, b) => b.n - a.n),
      sources: Object.entries(sources).map(([source, s]) => ({ source, ...s })).sort((a, b) => b.visitors - a.visitors),
      topics: Object.entries(topics).map(([topic, t]) => ({ topic, ...t })).sort((a, b) => b.started - a.started),
      stuck,
      waits: {
        planLive: median(rows.filter((r) => r.ready === false && r.planWaitS !== null).map((r) => r.planWaitS!)),
        planReady: median(rows.filter((r) => r.ready === true && r.planWaitS !== null).map((r) => r.planWaitS!)),
        toCh1: median(rows.filter((r) => r.ch1WaitS !== null).map((r) => r.ch1WaitS!)),
        leftWhileWriting: rows.filter((r) => r.started && r.ready === false && !r.openedCh1).length,
      },
      days: daysList,
      recent: rows.sort((a, b) => b.first - a.first).slice(0, 50),
    };
  }
}
