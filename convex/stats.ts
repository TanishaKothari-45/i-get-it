import { v } from "convex/values";
import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { getAuthUserId } from "@convex-dev/auth/server";
import { components } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { recentSocial } from "./social";

// The public /stats page: counts only, never an email, a topic or a name.

const limiter = new RateLimiter(components.rateLimiter, {
  visitsAll: { kind: "fixed window", rate: 3000, period: HOUR },   // a made-up token per call can't flood the count past this
  excludeAll: { kind: "fixed window", rate: 60, period: HOUR },    // "This is my phone" taps app-wide (8 Oct night, audit: the table is read in full by the landing page)
});

const IST_MS = 5.5 * HOUR;
const dayOf = (t: number) => new Date(t + IST_MS).toISOString().slice(0, 10);

function cleanSource(s?: string) {
  const x = (s ?? "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0].replace(/[^a-z0-9.-]/g, "").slice(0, 40);
  return x || undefined;
}

// Left out of every public count (Prateek, 8 Oct): no source ("direct") and LinkedIn may be our own taps, and
// "internal" is the tag for our own visits. "app" as a first visit means the home-screen app was installed
// with no counted visit before it (likely us, from /admin or /stats), and localhost is our own test setup.
// A person counts under the source of their first visit.
export const HIDDEN_SOURCES = new Set(["direct", "linkedin.com", "internal", "app"]);
const hiddenSource = (s: string) => HIDDEN_SOURCES.has(s) || s.startsWith("localhost");

export const recordVisit = mutation({
  args: { visitor: v.string(), source: v.optional(v.string()) },
  handler: async (ctx, { visitor, source }) => {
    if (visitor.length < 8 || visitor.length > 64) return;
    const now = Date.now();
    // ?utm_source=internal (from 8 Oct): this phone is ours, so it stops counting, like "This is my phone"
    if (cleanSource(source) === "internal") {
      const userId = await getAuthUserId(ctx);
      const known = (await ctx.db.query("statsExcluded").collect()).some((e) => e.deviceToken === visitor);
      if (!known) await ctx.db.insert("statsExcluded", { deviceToken: visitor, userId: userId ?? undefined, at: now });
    }
    const day = dayOf(now);
    const seen = await ctx.db.query("visits").withIndex("by_visitor_day", (q) => q.eq("visitor", visitor).eq("day", day)).first();
    if (seen) return;
    if (!(await limiter.limit(ctx, "visitsAll")).ok) return;
    await ctx.db.insert("visits", { visitor, day, source: cleanSource(source), at: now });
  },
});

// "This is my phone": stops counting this phone, and the signed-in account if there is one.
export const excludeMe = mutation({
  args: { deviceToken: v.string() },
  handler: async (ctx, { deviceToken }) => {
    if (deviceToken.length < 8 || deviceToken.length > 64) return;
    // Once per phone, and capped app-wide: every public page collects this table, so it must not grow from a loop
    // (8 Oct night, security audit). A by_token index would be tidier; the table stays small enough to filter for now.
    const already = await ctx.db.query("statsExcluded").filter((q) => q.eq(q.field("deviceToken"), deviceToken)).first();
    if (already) return;
    if (!(await limiter.limit(ctx, "excludeAll")).ok) return;
    const userId = await getAuthUserId(ctx);
    await ctx.db.insert("statsExcluded", { deviceToken, userId: userId ?? undefined, at: Date.now() });
  },
});

export const summary = query({
  args: { deviceToken: v.optional(v.string()) },
  handler: async (ctx, { deviceToken }) => {
    const excluded = await ctx.db.query("statsExcluded").collect();
    const xTokens = new Set(excluded.map((e) => e.deviceToken).filter(Boolean) as string[]);
    const xUsers = new Set(excluded.map((e) => e.userId).filter(Boolean).map(String));

    const handbooks = (await ctx.db.query("handbooks").collect()).filter((h) =>
      !(h.ownerToken && xTokens.has(h.ownerToken)) && !(h.userId && xUsers.has(String(h.userId))) && !h.ownerToken?.startsWith("abuse-"));
    // A signed-in person's phone token is theirs too: drop its visits when the account is excluded.
    for (const h of await ctx.db.query("handbooks").collect()) if (h.userId && xUsers.has(String(h.userId)) && h.ownerToken) xTokens.add(h.ownerToken);

    const visits = (await ctx.db.query("visits").collect()).filter((x) => !xTokens.has(x.visitor)).sort((a, b) => a.at - b.at);
    const first = new Map<string, { source: string; day: string }>();
    for (const x of visits) if (!first.has(x.visitor)) first.set(x.visitor, { source: x.source ?? "direct", day: x.day });
    const counted = (t?: string) => !!t && first.has(t) && !hiddenSource(first.get(t)!.source);
    const people = [...first].filter(([t]) => counted(t));
    const today = dayOf(Date.now());

    // a handbook counts when its phone's first visit came from a counted source (no visit on record: left out)
    const books = handbooks.filter((h) => counted(h.ownerToken));
    const ownerOf = (h: { userId?: unknown; ownerToken?: string }) => (h.userId ? `u:${h.userId}` : `d:${h.ownerToken}`);
    const started = new Set(books.map(ownerOf));
    const passed = new Set<string>(), passedTokens = new Set<string>(), startedTokens = new Set<string>();
    for (const h of books) {
      startedTokens.add(h.ownerToken!);
      const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
      if (p?.chaptersPassed.includes(1)) { passed.add(ownerOf(h)); passedTokens.add(h.ownerToken!); }
    }

    // each day: people who came for the first time, by source, and how many of them have finished chapter 1
    const days: { day: string; visitors: number; passed: number; sources: Record<string, number> }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = dayOf(Date.now() - i * 24 * HOUR);
      const fresh = people.filter(([, f]) => f.day === d);
      const sources: Record<string, number> = {};
      for (const [, f] of fresh) sources[f.source] = (sources[f.source] ?? 0) + 1;
      days.push({ day: d, visitors: fresh.length, passed: fresh.filter(([t]) => passedTokens.has(t)).length, sources });
    }
    const channels: Record<string, { visitors: number; started: number; passed: number }> = {};
    for (const [t, f] of people) {
      const c = (channels[f.source] ??= { visitors: 0, started: 0, passed: 0 });
      c.visitors++; if (startedTokens.has(t)) c.started++; if (passedTokens.has(t)) c.passed++;
    }

    // a sign-up counts when the account owns a counted handbook
    const countedUsers = new Set(books.filter((h) => h.userId).map((h) => String(h.userId)));
    const users = (await ctx.db.query("users").collect()).filter((u) => !xUsers.has(String(u._id)) && countedUsers.has(String(u._id)));
    const intents = (await ctx.db.query("priceIntents").collect()).filter((i) =>
      !(i.userId && xUsers.has(String(i.userId))) && !(i.deviceToken && xTokens.has(i.deviceToken)));
    // Pay numbers are shown only to the owner (emails in STATS_OWNER_EMAILS): a visitor who learns that
    // payments aren't live before tapping Pay would spoil the count of people willing to pay.
    const viewerId = await getAuthUserId(ctx);
    const viewer = viewerId ? await ctx.db.get(viewerId) : null;
    const owners = (process.env.STATS_OWNER_EMAILS ?? "").toLowerCase().split(",").map((e) => e.trim()).filter(Boolean);
    const isOwner = !!viewer?.email && owners.includes(viewer.email.toLowerCase());
    const payers = new Set(intents.map((i) => (i.userId ? `u:${i.userId}` : `d:${i.deviceToken ?? i._id}`)));

    return {
      visitorsToday: new Set(visits.filter((x) => x.day === today && counted(x.visitor)).map((x) => x.visitor)).size,
      visitorsAll: people.length,
      days,
      sources: Object.entries(channels).sort((a, b) => b[1].visitors - a[1].visitors).slice(0, 6).map(([name, c]) => ({ name, n: c.visitors })),
      channels: Object.entries(channels).map(([source, c]) => ({ source, ...c })).sort((a, b) => b.visitors - a.visitors),
      hidden: [...HIDDEN_SOURCES],
      social: await recentSocial(ctx),
      started: started.size,
      passedChapter1: passed.size,
      signups: users.length,
      signupsToday: users.filter((u) => dayOf(u._creationTime) === today).length,
      pay: isOwner ? { tapped: payers.size } : null,
      thisPhoneExcluded: !!deviceToken && xTokens.has(deviceToken),
      at: Date.now(),
    };
  },
});

// Leave out a list of phones (8 Oct: the agent's headless replays made 17 handbooks and about 20 visitors in one day).
// Their handbooks are hidden too. Run: npx convex run --prod stats:excludeTokens '{"tokens":[...]}'
export const excludeTokens = internalMutation({
  args: { tokens: v.array(v.string()) },
  handler: async (ctx, { tokens }) => {
    const known = new Set((await ctx.db.query("statsExcluded").collect()).map((e) => e.deviceToken));
    let added = 0, hidden = 0;
    for (const t of tokens) {
      if (!known.has(t)) { await ctx.db.insert("statsExcluded", { deviceToken: t, at: Date.now() }); added++; }
      for (const h of await ctx.db.query("handbooks").withIndex("by_token", (q) => q.eq("ownerToken", t)).collect()) {
        if (!h.hiddenAt) { await ctx.db.patch(h._id, { hiddenAt: Date.now() }); hidden++; }
      }
    }
    return { added, hidden };
  },
});
