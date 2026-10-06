import { v } from "convex/values";
import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { getAuthUserId } from "@convex-dev/auth/server";
import { components, internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { INTENT_PROMPT, intentUserMessage, TEACH_PROMPT, teachUserMessage, ASK_SEARCH_PROMPT, askSearchUserMessage, CHAPTER_PROMPT, CHECK_PROMPT, checkUserMessage, PLAN_PROMPT, SIMPLER_PROMPT, chapterUserMessage, planUserMessage, simplerUserMessage } from "./prompts";
import { level } from "./schema";
import { matchForIntent } from "./library";

const voiceV = v.union(v.literal("friend"), v.literal("straight"), v.literal("stories"));

const CHAPTERS = 7;
const LANGUAGE = "English";

// Caps (AGENTS.md section 4): 60 generations an hour across the app, 6 an hour per device.
const limiter = new RateLimiter(components.rateLimiter, {
  generateAll: { kind: "fixed window", rate: 60, period: HOUR },
  generateDevice: { kind: "token bucket", rate: 6, period: HOUR, capacity: 3 },
  simplerDevice: { kind: "token bucket", rate: 30, period: HOUR, capacity: 10 },
  askDevice: { kind: "token bucket", rate: 40, period: HOUR, capacity: 8 },
  searchDaily: { kind: "fixed window", rate: 3, period: 24 * HOUR },   // web-searched answers per person per day (~₹9.5 each)
  compareAll: { kind: "fixed window", rate: 10, period: HOUR },   // three expensive-model calls each: hard cap across the app
  // App-wide backstops for the cheaper paid calls: a made-up device token gets a fresh per-device bucket, never a fresh app bucket.
  askAll: { kind: "fixed window", rate: 200, period: HOUR },      // ~₹0.5 each
  searchAll: { kind: "fixed window", rate: 20, period: HOUR },    // ~₹9.4 each
  simplerAll: { kind: "fixed window", rate: 300, period: HOUR },  // ~₹0.06 each
  picturesAll: { kind: "fixed window", rate: 400, period: HOUR }, // Runway pictures, 1 credit (~₹0.85) each
  teachDevice: { kind: "token bucket", rate: 20, period: HOUR, capacity: 6 },
  teachAll: { kind: "fixed window", rate: 300, period: HOUR },     // ~₹0.2 each
});

export function topicKeyOf(topic: string) {
  return topic.toLowerCase().replace(/https?:\/\/\S+/g, " ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ").slice(0, 80);
}


// The model puts the right answer in the middle more often than not. Shuffle each
// exercise's options deterministically (per chapter and card) and remap the ids.
function shuffleExercises(cards: any[], seed: string): any[] {
  let h = 2166136261;
  for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const rnd = () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
  return cards.map((c) => {
    if (c?.type !== "exercise" || !Array.isArray(c.options) || c.options.length !== 3) return c;
    const order = [0, 1, 2];
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const ids = ["a", "b", "c"];
    const options = order.map((oldIdx, newIdx) => ({ id: ids[newIdx], text: c.options[oldIdx].text }));
    const oldIdOf = (newIdx: number) => c.options[order[newIdx]].id;
    const answer = ids[order.findIndex((oldIdx) => c.options[oldIdx].id === c.answer)];
    const whyNot: Record<string, string> = {};
    for (let newIdx = 0; newIdx < 3; newIdx++) { const oldId = oldIdOf(newIdx); if (c.whyNot?.[oldId]) whyNot[ids[newIdx]] = c.whyNot[oldId]; }
    return { ...c, options, answer, whyNot };
  });
}

// ---------- ownership ----------

async function viewer(ctx: QueryCtx | MutationCtx, deviceToken?: string) {
  const userId = await getAuthUserId(ctx);
  return { userId, deviceToken };
}

function owns(h: Doc<"handbooks">, who: { userId: Id<"users"> | null; deviceToken?: string }) {
  if (who.userId && h.userId && h.userId === who.userId) return true;
  if (who.deviceToken && h.ownerToken && h.ownerToken === who.deviceToken) return true;
  return false;
}

async function ownedHandbook(ctx: QueryCtx | MutationCtx, handbookId: Id<"handbooks">, deviceToken?: string) {
  const h = await ctx.db.get(handbookId);
  if (!h) throw new Error("No such handbook");
  if (!owns(h, await viewer(ctx, deviceToken))) throw new Error("Not yours");
  return h;
}

// Per-person caps count against whoever owns the handbook (the account, else the phone that made it),
// never against the token sent with the call, which costs nothing to make up.
function ownerKey(h: Doc<"handbooks">) {
  return h.userId ? String(h.userId) : (h.ownerToken ?? String(h._id));
}

// One plan or chapter write (a chapter includes its fact check): the app-wide cap and the owner's cap.
async function takeGeneration(ctx: MutationCtx, h: Doc<"handbooks">) {
  const mine = await limiter.limit(ctx, "generateDevice", { key: ownerKey(h) });
  if (!mine.ok) return false;
  return (await limiter.limit(ctx, "generateAll")).ok;
}


// A pre-generated chapter for this topic, if the cache has it. Used before any model call.
async function cachedChapter(ctx: MutationCtx, h: Doc<"handbooks">, n: number) {
  const row = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", h.topicKey).eq("level", h.level)).unique();
  const ch = row?.chapters?.find((c: any) => c.n === n);
  return ch ?? null;
}

async function ensureChapter(ctx: MutationCtx, h: Doc<"handbooks">, n: number) {
  if (!Number.isInteger(n) || n < 1 || n > CHAPTERS) return;
  const existing = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id).eq("n", n)).unique();
  if (existing && (existing.status === "ready" || existing.status === "writing")) return;
  const fromCache = await cachedChapter(ctx, h, n);
  if (fromCache) {
    const row = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", h.topicKey).eq("level", h.level)).unique();
    const doc = { status: "ready" as const, title: fromCache.title, cards: fromCache.cards, outcomeLine: fromCache.outcomeLine, svg: fromCache.svg, pictures: fromCache.pictures, recallCards: fromCache.recallCards, cacheVersion: row?.version ?? 0, error: undefined };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("chapters", { handbookId: h._id, n, createdAt: Date.now(), ...doc });
    return;
  }
  if (!h.plan) return;
  // Over a cap: store it as failed, so the reader sees "try again" instead of a chapter that never comes.
  const status = (await takeGeneration(ctx, h)) ? "writing" as const : "failed" as const;
  const error = status === "failed" ? "busy" : undefined;
  if (existing) await ctx.db.patch(existing._id, { status, error });
  else await ctx.db.insert("chapters", { handbookId: h._id, n, status, error, createdAt: Date.now() });
  if (status === "writing") await ctx.scheduler.runAfter(0, internal.handbooks.generateChapter, { handbookId: h._id, n });
}

// ---------- what the client is allowed to see ----------

// Exercises go out without their answers; the check happens in recordAnswer.
function publicCards(cards: any[] | undefined) {
  if (!cards) return undefined;
  return cards.map((c) => {
    if (c.type !== "exercise") return c;
    const { answer: _a, whyNot: _w, reteach: _r, ...rest } = c;
    return rest;
  });
}

async function publicChapter(ctx: QueryCtx, ch: Doc<"chapters">) {
  const variants = ch.variants?.map((vnt: any) => ({ key: vnt.key, status: vnt.status, title: vnt.title, outcomeLine: vnt.outcomeLine, svg: vnt.svg, cards: publicCards(vnt.cards) }));
  const pictures: Record<number, string> = {};
  const credits: Record<number, { credit: string; source?: string }> = {};
  for (const p of ch.pictures ?? []) if (p.storageId) { const url = await ctx.storage.getUrl(p.storageId); if (url) pictures[p.card] = url; if (p.credit) credits[p.card] = { credit: p.credit, source: p.source }; }
  return { n: ch.n, status: ch.status, title: ch.title, outcomeLine: ch.outcomeLine, cards: publicCards(ch.cards), error: ch.error, svg: (ch as any).svg, stale: ch.stale ?? false, variants, vote: ch.vote, pictures, credits, picturesPending: ch.status === "ready" && !Object.keys(pictures).length && ch.picturesStatus !== "failed" && ch.picturesStatus !== "skipped" && !!ch.cards };
}

// Money, health and legal topics carry a fixed line on every chapter: "Study aid, verify before you act."
// (Shaktimaan, 6 Oct: covers the slips no checker catches.) New plans are tagged by Opus; older ones by keywords.
const CAUTION_WORDS: [string, RegExp][] = [
  ["money", /\b(stock|share market|invest|trading|trader|options?|futures|f&o|nifty|sensex|crypto|bitcoin|forex|mutual fund|sip\b|tax|loan|mortgage|insurance|personal finance|finance|financial|balance sheet|retire|wealth|money)/i],
  ["health", /\b(health|diet|nutrition|calorie|protein|weight loss|fitness|strength training|workout|medic|medicine|symptom|disease|drug|supplement|mental health|anxiety|depression|therapy|pregnan|sleep)/i],
  ["legal", /\b(law|legal|contract|court|visa|immigration|tenan|lease|divorce|will and|patent|trademark|gdpr|compliance)/i],
];
function cautionOf(h: Doc<"handbooks">): string | null {
  const tag = (h.plan as any)?.caution;
  if (tag === "money" || tag === "health" || tag === "legal") return tag;
  if (tag === "none") return null;
  const text = `${h.topic} ${(h.plan as any)?.topic ?? ""}`;
  for (const [kind, re] of CAUTION_WORDS) if (re.test(text)) return kind;
  return null;
}

async function fullView(ctx: QueryCtx, h: Doc<"handbooks">) {
  const chapters = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id)).collect();
  const progress = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
  return {
    _id: h._id, topic: h.topic, level: h.level, voice: h.voice ?? "friend", status: h.status, question: h.question, intents: h.intents ?? null, plan: h.plan, source: h.source, error: h.error, caution: cautionOf(h), pushback: h.pushback ?? (h.plan as any)?.pushback ?? null, suggestions: h.suggestions ?? [],
    signedIn: !!h.userId,
    chapters: await Promise.all(chapters.sort((a, b) => a.n - b.n).map((ch) => publicChapter(ctx, ch))),
    progress: progress ? {
      currentChapter: progress.currentChapter, currentCard: progress.currentCard, currentPart: progress.currentPart ?? 0, chaptersPassed: progress.chaptersPassed,
      passedExercises: progress.passedExercises, missedExercises: progress.missedExercises, tomorrowAt: progress.tomorrowAt,
    } : null,
  };
}

// ---------- queries ----------

async function ownedBooks(ctx: QueryCtx | MutationCtx, userId: Id<"users"> | null, deviceToken?: string) {
  const out = new Map<string, Doc<"handbooks">>();
  if (userId) for (const h of await ctx.db.query("handbooks").withIndex("by_user", (q) => q.eq("userId", userId)).collect()) out.set(h._id, h);
  if (deviceToken) for (const h of await ctx.db.query("handbooks").withIndex("by_token", (q) => q.eq("ownerToken", deviceToken)).collect()) out.set(h._id, h);
  return [...out.values()].filter((h) => !h.hiddenAt);
}

async function passedCount(ctx: QueryCtx | MutationCtx, handbookId: Id<"handbooks">) {
  const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
  return (p?.chaptersPassed.length ?? 0) * 100 + (p?.currentCard ?? 0);
}

// Every handbook this person has, newest activity first, for the library.
export const library = query({
  args: { deviceToken: v.optional(v.string()) },
  handler: async (ctx, { deviceToken }) => {
    const userId = await getAuthUserId(ctx);
    const rows = [];
    for (const h of await ownedBooks(ctx, userId, deviceToken)) {
      if (h.status === "declined") continue;   // a topic we won't teach never sits on the shelf
      const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
      rows.push({ _id: h._id, topic: (h.plan as any)?.topic ?? h.topic, status: h.status, passed: p?.chaptersPassed.length ?? 0, current: p?.currentChapter ?? 1, lastAt: p?.updatedAt ?? h.createdAt, outcome: (h.plan as any)?.outcome7 ?? null });
    }
    return { signedIn: !!userId, handbooks: rows.sort((a, b) => b.lastAt - a.lastAt) };
  },
});

export const current = query({
  args: { deviceToken: v.optional(v.string()), handbookId: v.optional(v.id("handbooks")) },
  handler: async (ctx, { deviceToken, handbookId }) => {
    const userId = await getAuthUserId(ctx);
    if (handbookId) {
      const pinned = await ctx.db.get(handbookId);
      if (pinned && owns(pinned, { userId, deviceToken })) return { userId, handbook: await fullView(ctx, pinned) };
    }
    const all = await ownedBooks(ctx, userId, deviceToken);
    const h: Doc<"handbooks"> | null = all.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
    return { userId, handbook: h ? await fullView(ctx, h) : null };
  },
});

export const get = query({
  args: { handbookId: v.id("handbooks"), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    return fullView(ctx, h);
  },
});

// Two or three exercises from chapters already passed, for the start of night N.
const RECALL_BASE = 100;   // recall quizzes are addressed as cardIndex 100, 101 on their chapter

export const recallFor = query({
  args: { handbookId: v.id("handbooks"), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    const progress = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
    if (!progress || progress.chaptersPassed.length === 0) return [];
    const picks: { chapter: number; cardIndex: number; card: any }[] = [];
    const passed = [...progress.chaptersPassed].sort((a, b) => b - a); // most recent first
    for (const n of passed) {
      const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id).eq("n", n)).unique();
      if (!ch?.cards) continue;
      // Fresh quizzes on the same idea with new examples (cardIndex 100+), so the reader recalls the idea, not which button.
      if (Array.isArray(ch.recallCards) && ch.recallCards.length) {
        const fresh = n === passed[0] ? ch.recallCards.slice(0, 2) : ch.recallCards.slice(0, 1);
        fresh.forEach((c: any, k: number) => picks.push({ chapter: n, cardIndex: RECALL_BASE + k, card: publicCards([c])![0] }));
        if (picks.length >= 3) break;
        continue;
      }
      const ex = ch.cards.map((c: any, i: number) => ({ c, i })).filter((x: any) => x.c.type === "exercise");
      // the "apply" and "recall" ones from the latest chapter, then one from the chapter before
      const wanted = n === passed[0] ? ex.filter((x: any) => x.c.kind !== "guess").slice(0, 2) : ex.filter((x: any) => x.c.kind === "recall").slice(0, 1);
      for (const x of wanted) picks.push({ chapter: n, cardIndex: x.i, card: publicCards([x.c])![0] });
      if (picks.length >= 3) break;
    }
    return picks.slice(0, 3);
  },
});

// ---------- creating a handbook ----------

export const create = mutation({
  args: { topic: v.string(), level, deviceToken: v.string(), voice: v.optional(voiceV) },
  handler: async (ctx, { topic, level: lvl, deviceToken, voice }) => {
    const clean = topic.trim().slice(0, 200);
    if (clean.length < 2) throw new Error("Type a few words first.");
    const userId = await getAuthUserId(ctx);
    const topicKey = topicKeyOf(clean);
    const now = Date.now();

    const cached = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", topicKey).eq("level", lvl)).unique();

    // One handbook per topic per person: typing a topic you've already started opens it where you left off.
    const already = (await ownedBooks(ctx, userId, deviceToken)).find((h) =>
      h.topicKey === topicKey || (cached && h.source === "cache" && h.topic === cached.topic));
    if (already) return { handbookId: already._id, fromCache: already.source === "cache", existing: true };

    if (cached) {
      const handbookId = await ctx.db.insert("handbooks", {
        topic: cached.topic, topicKey, level: lvl, language: LANGUAGE, voice: voice ?? "friend", status: "ready", plan: cached.plan,
        ownerToken: deviceToken, userId: userId ?? undefined, source: "cache", createdAt: now,
      });
      for (const ch of cached.chapters) {
        await ctx.db.insert("chapters", { handbookId, n: ch.n, status: "ready", title: ch.title, cards: ch.cards, outcomeLine: ch.outcomeLine, svg: ch.svg, pictures: ch.pictures, recallCards: ch.recallCards, cacheVersion: cached.version ?? 0, createdAt: now });
      }
      await ctx.db.insert("progress", { handbookId, currentChapter: 1, currentCard: 0, chaptersPassed: [], passedExercises: [], missedExercises: [], lastOpenedAt: now, updatedAt: now });
      return { handbookId, fromCache: true, existing: false };
    }

    // Live generation: the caps are checked here, in the kitchen.
    const all = await limiter.limit(ctx, "generateAll");
    const mine = await limiter.limit(ctx, "generateDevice", { key: userId ? String(userId) : deviceToken });
    if (!all.ok || !mine.ok) throw new Error("busy");

    const handbookId = await ctx.db.insert("handbooks", {
      topic: clean, topicKey, level: lvl, language: LANGUAGE, voice: voice ?? "friend", status: "intent",
      ownerToken: deviceToken, userId: userId ?? undefined, source: "live", createdAt: now,
    });
    await ctx.db.insert("progress", { handbookId, currentChapter: 1, currentCard: 0, chaptersPassed: [], passedExercises: [], missedExercises: [], lastOpenedAt: now, updatedAt: now });
    await ctx.scheduler.runAfter(0, internal.handbooks.generateIntents, { handbookId });
    return { handbookId, fromCache: false, existing: false };
  },
});

export const answerQuestion = mutation({
  args: { handbookId: v.id("handbooks"), answer: v.string(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, answer, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    if (h.status !== "question") throw new Error("No question open");
    if (!(await takeGeneration(ctx, h))) throw new Error("busy");
    await ctx.db.patch(handbookId, { status: "planning", question: undefined });
    await ctx.scheduler.runAfter(0, internal.handbooks.generatePlan, { handbookId, clarification: answer.trim().slice(0, 300) });
  },
});

export const retry = mutation({
  args: { handbookId: v.id("handbooks"), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    if (!h.plan) {
      if (h.status !== "failed") return;   // a plan is already being written
      if (!(await takeGeneration(ctx, h))) throw new Error("busy");
      await ctx.db.patch(handbookId, { status: "planning", error: undefined });
      await ctx.scheduler.runAfter(0, internal.handbooks.generatePlan, { handbookId });
      return;
    }
    const failed = (await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId)).collect()).filter((c) => c.status === "failed");
    for (const c of failed) await ensureChapter(ctx, h, c.n);
  },
});

// ---------- generation (internal) ----------

// "What's it for?" (6 Oct): three goals in about a second. If the model can't offer them, go straight to the plan.
export const generateIntents = internalAction({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    if (!h || h.status !== "intent") return;
    const r = await ctx.runAction(internal.ai.generate, { kind: "intent", system: INTENT_PROMPT, user: intentUserMessage(h.topic) });
    const goals = r.ok && Array.isArray(r.json?.goals) ? r.json.goals.filter((g: any) => typeof g?.label === "string" && g.label.trim()).slice(0, 3).map((g: any) => ({ label: String(g.label).slice(0, 60), mode: ["skill", "story", "subject", "decision"].includes(g.mode) ? g.mode : "subject" })) : [];
    if (goals.length >= 2) await ctx.runMutation(internal.handbooks.setIntents, { handbookId, intents: { question: String((r as any).json?.question ?? "What's it for?").slice(0, 80), goals } });
    else await ctx.runMutation(internal.handbooks.skipIntent, { handbookId });
  },
});
export const setIntents = internalMutation({
  args: { handbookId: v.id("handbooks"), intents: v.any() },
  handler: async (ctx, { handbookId, intents }) => {
    const h = await ctx.db.get(handbookId);
    if (h?.status === "intent") await ctx.db.patch(handbookId, { intents });
  },
});
export const skipIntent = internalMutation({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    const h = await ctx.db.get(handbookId);
    if (h?.status !== "intent") return;
    await ctx.db.patch(handbookId, { status: "planning" });
    await ctx.scheduler.runAfter(0, internal.handbooks.generatePlan, { handbookId });
  },
});
// The reader taps a goal, types their own, or skips. Then the plan is written for that goal.
export const chooseIntent = mutation({
  args: { handbookId: v.id("handbooks"), goal: v.optional(v.string()), mode: v.optional(v.string()), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, goal, mode, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    if (h.status !== "intent") return;
    const m = mode && ["skill", "story", "subject", "decision"].includes(mode) ? mode : undefined;
    await ctx.db.patch(handbookId, { status: "planning", goal: goal?.trim().slice(0, 120) || undefined, mode: m });
    // Someone already made this topic for the same kind of goal: reuse their plan and chapter 1 (instant, no tokens).
    if (await matchForIntent(ctx, (await ctx.db.get(handbookId))!, m)) return;
    await ctx.scheduler.runAfter(0, internal.handbooks.generatePlan, { handbookId });
  },
});

export const generatePlan = internalAction({
  args: { handbookId: v.id("handbooks"), clarification: v.optional(v.string()) },
  handler: async (ctx, { handbookId, clarification }) => {
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    if (!h) return;
    const r = await ctx.runAction(internal.ai.generate, { kind: "plan", system: PLAN_PROMPT, user: planUserMessage(h.topic, h.level, h.language, h.voice ?? "friend", clarification, h.goal, h.mode) });
    // Claude's own safety check said no: say so plainly, never "try again".
    if (!r.ok && /^declined/.test(r.error)) {
      const ready: any[] = await ctx.runQuery(internal.handbooks.listCache, {});
      const picks = [...new Set(ready.map((x) => String(x.topic)))].sort(() => Math.random() - 0.5).slice(0, 3);
      await ctx.runMutation(internal.handbooks.setDeclined, { handbookId, pushback: "That's not something I Get It will teach. Pick something that helps you or the people around you, and we'll go all in.", suggestions: picks });
      return;
    }
    if (!r.ok) { await ctx.runMutation(internal.handbooks.setFailed, { handbookId, error: r.error }); return; }
    const plan = r.json;
    if (plan.declined) {
      await ctx.runMutation(internal.handbooks.setDeclined, { handbookId, pushback: String(plan.pushback ?? "That's not something I Get It will teach."), suggestions: (Array.isArray(plan.suggestions) ? plan.suggestions : []).map(String).slice(0, 3) });
      return;
    }
    if (plan.needsClarification && plan.question && !clarification) {
      await ctx.runMutation(internal.handbooks.setQuestion, { handbookId, question: String(plan.question) });
      return;
    }
    if (!Array.isArray(plan.chapters) || plan.chapters.length !== CHAPTERS) {
      await ctx.runMutation(internal.handbooks.setFailed, { handbookId, error: `plan had ${plan.chapters?.length ?? 0} chapters` });
      return;
    }
    if (!plan.mode && h.mode) plan.mode = h.mode;
    if (h.goal) plan.goal = h.goal;
    await ctx.runMutation(internal.handbooks.setPlan, { handbookId, plan, topic: clarification ? `${h.topic} (${clarification})` : h.topic });
    await ctx.runMutation(internal.handbooks.startChapter, { handbookId, n: 1 });
    await ctx.runAction(internal.handbooks.generateChapter, { handbookId, n: 1 });
  },
});

// Fact check a freshly written chapter before the reader sees it. Applies the checker's corrected cards only when they
// keep the card's type and, for exercises, a valid three-option shape. A failed check never blocks the chapter.
type FactReport = { status: string; fixes: number; notes: string[]; model?: string; at: number };
function validFix(orig: any, fixed: any): boolean {
  if (!fixed || typeof fixed !== "object" || fixed.type !== orig?.type) return false;
  if (orig.type !== "exercise") return typeof fixed.body === "string" || typeof fixed.prompt === "string";
  return Array.isArray(fixed.options) && fixed.options.length === 3 && fixed.options.some((o: any) => o.id === fixed.answer);
}
export async function factCheck(ctx: any, topic: string, level: string, title: string, cards: any[], opts: { model?: string; effort?: "low" | "medium" | "high" | "xhigh" | "max" } = {}): Promise<{ cards: any[]; report: FactReport }> {
  const r = await ctx.runAction(internal.ai.generate, { kind: "check", system: CHECK_PROMPT, user: checkUserMessage(topic, level, { title, cards }), ...opts });
  if (!r.ok) return { cards, report: { status: "unchecked", fixes: 0, notes: [r.error], at: Date.now() } };
  const out = cards.slice();
  const notes: string[] = [];
  for (const f of Array.isArray(r.json?.fixes) ? r.json.fixes : []) {
    const i = Number(f?.card);
    if (!Number.isInteger(i) || i < 0 || i >= out.length) continue;
    if (!validFix(out[i], f.fixed)) { notes.push(`card ${i}: fix skipped (shape) - ${String(f.problem ?? "").slice(0, 200)}`); continue; }
    out[i] = f.fixed;
    notes.push(`card ${i}: ${String(f.problem ?? "").slice(0, 300)}`);
  }
  const applied = notes.filter((x) => !x.includes("fix skipped")).length;
  return { cards: out, report: { status: applied > 0 ? "fixed" : "passed", fixes: applied, notes, model: r.model, at: Date.now() } };
}

export const generateChapter = internalAction({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }) => {
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    if (!h?.plan) return;
    const prof = await ctx.runQuery(internal.handbooks.readProfileLine, { handbookId });
    const howTheyDid: string | null = await ctx.runQuery(internal.handbooks.readingReport, { handbookId, n });
    const r = await ctx.runAction(internal.ai.generate, { kind: "chapter", system: CHAPTER_PROMPT, user: chapterUserMessage(h.plan, h.level, h.language, h.voice ?? "friend", n, prof.line, howTheyDid ?? undefined), model: prof.model });
    if (!r.ok) { await ctx.runMutation(internal.handbooks.setChapterFailed, { handbookId, n, error: r.error }); return; }
    const ch = r.json;
    const exercises = (ch.cards ?? []).filter((c: any) => c.type === "exercise");
    const sane = Array.isArray(ch.cards) && ch.cards.length >= 5 && exercises.length >= 2 &&
      exercises.every((e: any) => Array.isArray(e.options) && e.options.length === 3 && e.options.some((o: any) => o.id === e.answer));
    if (!sane) { await ctx.runMutation(internal.handbooks.setChapterFailed, { handbookId, n, error: "chapter failed the shape check" }); return; }
    const title = String(ch.title ?? h.plan.chapters[n - 1]?.title ?? `Chapter ${n}`);
    // Fresh recall quizzes (new examples) are checked in the same pass, then split off.
    const recall = (Array.isArray(ch.recallQuizzes) ? ch.recallQuizzes : []).filter((e: any) => e?.type === "exercise" && Array.isArray(e.options) && e.options.length === 3 && e.options.some((o: any) => o.id === e.answer)).slice(0, 2);
    const checked = await factCheck(ctx, h.plan?.topic ?? h.topic, h.level, title, [...ch.cards, ...recall]);
    const cards = checked.cards.slice(0, ch.cards.length), recallCards = checked.cards.slice(ch.cards.length);
    await ctx.runMutation(internal.handbooks.setChapter, { handbookId, n, title, cards, recallCards, outcomeLine: String(ch.outcomeLine ?? ""), svg: typeof ch.svg === "string" ? ch.svg.slice(0, 2000) : undefined, model: r.model, factCheck: checked.report });
    // Pictures come after the words: the chapter opens now, each picture fades in when it's drawn.
    await ctx.scheduler.runAfter(0, internal.images.forChapter, { handbookId, n });
    // A typed topic's chapter 1 may go into the shared library (plan and chapter 1 only, after a privacy check).
    if (n === 1 && h.source === "live" && !h.fromLibrary) await ctx.scheduler.runAfter(0, internal.library.consider, { handbookId });
  },
});

export const readHandbook = internalQuery({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => ctx.db.get(handbookId),
});

export const setPlan = internalMutation({
  args: { handbookId: v.id("handbooks"), plan: v.any(), topic: v.string() },
  handler: async (ctx, { handbookId, plan, topic }) => { await ctx.db.patch(handbookId, { status: "ready", plan, topic, question: undefined, error: undefined }); },
});
export const setQuestion = internalMutation({
  args: { handbookId: v.id("handbooks"), question: v.string() },
  handler: async (ctx, { handbookId, question }) => { await ctx.db.patch(handbookId, { status: "question", question }); },
});
export const setDeclined = internalMutation({
  args: { handbookId: v.id("handbooks"), pushback: v.string(), suggestions: v.array(v.string()) },
  handler: async (ctx, { handbookId, pushback, suggestions }) => { await ctx.db.patch(handbookId, { status: "declined", pushback: pushback.slice(0, 400), suggestions: suggestions.map((x) => x.slice(0, 80)) }); },
});
export const setFailed = internalMutation({
  args: { handbookId: v.id("handbooks"), error: v.string() },
  handler: async (ctx, { handbookId, error }) => { await ctx.db.patch(handbookId, { status: "failed", error }); },
});
export const startChapter = internalMutation({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }) => {
    const existing = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    if (existing) { if (existing.status === "failed") await ctx.db.patch(existing._id, { status: "writing", error: undefined }); return; }
    await ctx.db.insert("chapters", { handbookId, n, status: "writing", createdAt: Date.now() });
  },
});
export const setChapter = internalMutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), title: v.string(), cards: v.any(), recallCards: v.optional(v.any()), outcomeLine: v.string(), svg: v.optional(v.string()), model: v.optional(v.string()), factCheck: v.optional(v.any()) },
  handler: async (ctx, { handbookId, n, title, cards, recallCards, outcomeLine, svg, model, factCheck }) => {
    const existing = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    const shuffled = shuffleExercises(cards, `${handbookId}:${n}`);
    const recall = recallCards?.length ? shuffleExercises(recallCards, `${handbookId}:${n}:recall`) : undefined;
    if (existing) await ctx.db.patch(existing._id, { status: "ready", title, cards: shuffled, recallCards: recall, outcomeLine, svg, model, factCheck, stale: false, error: undefined });
    else await ctx.db.insert("chapters", { handbookId, n, status: "ready", title, cards: shuffled, recallCards: recall, outcomeLine, svg, model, factCheck, createdAt: Date.now() });
  },
});
// ---------- adapting to the reader ----------

// What the writer of chapter n learns about chapter n-1: missed quizzes (what they picked and what it was
// confused with), the first-try score, and a step up (1 to 3) for each perfect chapter in a row.
export const readingReport = internalQuery({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }): Promise<string | null> => {
    if (n <= 1) return null;
    const answers = (await ctx.db.query("answers").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).collect()).filter((a) => !a.recall);
    const chapterStats = async (m: number) => {
      const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", m)).unique();
      const rows = answers.filter((a) => a.chapter === m).sort((a, b) => a.at - b.at);
      const byCard = new Map<number, typeof rows>();
      for (const r of rows) byCard.set(r.cardIndex, [...(byCard.get(r.cardIndex) ?? []), r]);
      const quizzes = [...byCard.entries()].map(([cardIndex, rs]) => ({ cardIndex, first: rs[0], card: ch?.cards?.[cardIndex] })).filter((q) => q.card?.kind !== "poll");
      return { ch, rows, quizzes, right: quizzes.filter((q) => q.first.correct).length };
    };
    const last = await chapterStats(n - 1);
    if (!last.quizzes.length && !(await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique())?.feedback?.[String(n - 1)]) return null;
    let streak = 0;
    for (let m = n - 1; m >= 1; m--) {
      const s = await chapterStats(m);
      if (s.quizzes.length && s.right === s.quizzes.length) streak++; else break;
    }
    const lines: string[] = [];
    const minutes = last.rows.length > 1 ? Math.max(1, Math.round((last.rows[last.rows.length - 1].at - last.rows[0].at) / 60000)) : null;
    lines.push(`Chapter ${n - 1}: ${last.right} of ${last.quizzes.length} quizzes right on the first try${minutes ? `, quizzes done in about ${minutes} minute${minutes === 1 ? "" : "s"}` : ""}.`);
    const missed = last.quizzes.filter((q) => !q.first.correct && q.card?.type === "exercise");
    if (missed.length) {
      lines.push("Missed (re-teach these first):");
      for (const q of missed.slice(0, 3)) {
        const picked = q.card.options?.find((o: any) => o.id === q.first.optionId)?.text ?? "";
        const why = q.card.whyNot?.[q.first.optionId] ?? "";
        lines.push(`- Quiz: "${String(q.card.prompt ?? "").slice(0, 220)}" They picked "${String(picked).slice(0, 140)}". ${String(why).slice(0, 220)}`);
      }
    } else if (streak > 0) {
      lines.push(`Step up: ${Math.min(3, streak)} of 3.`);
    }
    const prog = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    const said = prog?.feedback?.[String(n - 1)];
    if (said === "lost_me") lines.push(`The reader said chapter ${n - 1} lost them. Slow down: shorter cards, plainer words, one more worked example, and an easier first quiz. No step up.`);
    if (said === "too_easy") lines.push(`The reader said chapter ${n - 1} was too easy. Step up: assume the basics, go one level deeper, and make the quizzes apply the idea to trickier cases.`);
    return lines.join("\n");
  },
});

// ---------- pictures ----------

export const takePictureBudget = internalMutation({
  args: { count: v.number() },
  handler: async (ctx, { count }) => (await limiter.limit(ctx, "picturesAll", { count })).ok,
});

export const setPictures = internalMutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), status: v.string(), pictures: v.optional(v.array(v.object({ card: v.number(), scene: v.string(), storageId: v.optional(v.id("_storage")), credit: v.optional(v.string()), source: v.optional(v.string()) }))) },
  handler: async (ctx, { handbookId, n, status, pictures }) => {
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    if (ch) await ctx.db.patch(ch._id, { picturesStatus: status, ...(pictures ? { pictures } : {}) });
    if (n === 1 && pictures) await ctx.scheduler.runAfter(0, internal.library.syncPictures, { handbookId });
  },
});

export const readCacheChapter = internalQuery({
  args: { topicKey: v.string(), level, n: v.number() },
  handler: async (ctx, { topicKey, level: lvl, n }) => {
    const row = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", topicKey).eq("level", lvl)).unique();
    return row ? { topic: row.topic, plan: row.plan, chapter: row.chapters.find((c: any) => c.n === n) ?? null } : null;
  },
});

export const listCache = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query("cache").collect()).map((r) => ({ topicKey: r.topicKey, level: r.level, topic: r.topic, chapters: r.chapters.map((c: any) => ({ n: c.n, pictures: (c.pictures ?? []).length })) })),
});

// Store a ready topic's pictures on the cache row and on every other spelling of the same topic
// ("ww2", "wwii"... are separate rows with the same chapters), then give them to every reader's copy
// of that chapter that has none yet (same title only: a copy rewritten for a reader keeps its own).
export const setCachePictures = internalMutation({
  args: { topicKey: v.string(), level, n: v.number(), pictures: v.array(v.object({ card: v.number(), scene: v.string(), storageId: v.optional(v.id("_storage")), credit: v.optional(v.string()), source: v.optional(v.string()) })) },
  handler: async (ctx, { topicKey, level: lvl, n, pictures }) => {
    const row = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", topicKey).eq("level", lvl)).unique();
    const title = row?.chapters.find((c: any) => c.n === n)?.title;
    if (!row || !title) return { rows: 0, copies: 0 };
    const keys = new Set<string>();
    for (const r of await ctx.db.query("cache").collect()) {
      if (r.level !== lvl || r.topic !== row.topic) continue;
      const c = r.chapters.find((x: any) => x.n === n);
      if (!c || c.title !== title || (r.topicKey !== topicKey && c.pictures?.length)) continue;
      await ctx.db.patch(r._id, { chapters: r.chapters.map((x: any) => (x.n === n ? { ...x, pictures } : x)) });
      keys.add(r.topicKey);
    }
    let copies = 0;
    for (const h of await ctx.db.query("handbooks").collect()) {
      if (h.source !== "cache" || !keys.has(h.topicKey) || h.level !== lvl) continue;
      const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id).eq("n", n)).unique();
      if (!ch || ch.pictures?.length || ch.title !== title) continue;
      await ctx.db.patch(ch._id, { pictures, picturesStatus: "done" });
      copies++;
    }
    return { rows: keys.size, copies };
  },
});

export const setChapterFailed = internalMutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), error: v.string() },
  handler: async (ctx, { handbookId, n, error }) => {
    const existing = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    if (existing) await ctx.db.patch(existing._id, { status: "failed", error });
    else await ctx.db.insert("chapters", { handbookId, n, status: "failed", error, createdAt: Date.now() });
  },
});
export const logAiCall = internalMutation({
  args: { kind: v.string(), model: v.string(), input: v.string(), output: v.string(), tokensIn: v.optional(v.number()), tokensOut: v.optional(v.number()), ms: v.number(), ok: v.boolean(), error: v.optional(v.string()) },
  handler: async (ctx, args) => { await ctx.db.insert("aiCalls", { ...args, at: Date.now() }); },
});

// ---------- reading and answering ----------

export const setPosition = mutation({
  args: { handbookId: v.id("handbooks"), chapter: v.number(), cardIndex: v.number(), part: v.optional(v.number()), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, chapter, cardIndex, part, deviceToken }) => {
    await ownedHandbook(ctx, handbookId, deviceToken);
    const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    if (!p) return;
    if (p.chaptersPassed.includes(chapter) && p.currentChapter > chapter) { await ctx.db.patch(p._id, { lastOpenedAt: Date.now() }); return; }
    await ctx.db.patch(p._id, { currentChapter: chapter, currentCard: cardIndex, currentPart: Math.max(0, Math.min(20, Math.floor(part ?? 0))), lastOpenedAt: Date.now(), updatedAt: Date.now() });
  },
});

// The check. Returns the feedback the client is allowed to see; the rung moves only on a pass.
export const recordAnswer = mutation({
  args: { handbookId: v.id("handbooks"), chapter: v.number(), cardIndex: v.number(), optionId: v.string(), attempt: v.number(), recall: v.optional(v.boolean()), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, chapter, cardIndex, optionId, attempt, recall, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", chapter)).unique();
    const card = cardIndex >= RECALL_BASE ? ch?.recallCards?.[cardIndex - RECALL_BASE] : ch?.cards?.[cardIndex];
    if (!card || card.type !== "exercise") throw new Error("Not an exercise");
    const correct = card.kind === "poll" ? true : card.answer === optionId;   // story mode polls have no wrong answer
    // Passing the chapter's last quiz starts writing the next chapter, so the closing card and the Done
    // screen hide most of the wait. Its writer reads how this chapter went (readingReport).
    const lastQuiz = Math.max(...(ch!.cards as any[]).map((c, i) => (c?.type === "exercise" ? i : -1)));
    if (correct && !recall && cardIndex === lastQuiz && chapter < CHAPTERS) await ensureChapter(ctx, h, chapter + 1);
    const key = `${chapter}:${cardIndex}`;
    await ctx.db.insert("answers", { handbookId, chapter, cardIndex, optionId, correct, attempt, recall: !!recall, at: Date.now() });
    const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    if (p && !recall) {
      const passed = new Set(p.passedExercises); const missed = new Set(p.missedExercises);
      if (correct && attempt === 1) passed.add(key);
      if (!correct) missed.add(key);
      if (correct && attempt > 1) { passed.add(key); }
      // The chapter is passed the moment its last quiz is, with every quiz in it passed (6 Oct, from /admin: 4 readers
      // reached the last cards and never tapped finish). The cards after it are a bonus; the reader's place moves on.
      const exerciseKeys = (ch!.cards as any[]).map((c, i) => (c?.type === "exercise" ? `${chapter}:${i}` : null)).filter(Boolean) as string[];
      const passesNow = correct && cardIndex === lastQuiz && exerciseKeys.every((k) => passed.has(k)) && !p.chaptersPassed.includes(chapter);
      await ctx.db.patch(p._id, {
        passedExercises: [...passed], missedExercises: [...missed], updatedAt: Date.now(),
        ...(passesNow ? { chaptersPassed: [...p.chaptersPassed, chapter], currentChapter: chapter < CHAPTERS ? chapter + 1 : chapter, currentCard: 0, currentPart: 0 } : {}),
      });
      if (passesNow) {
        if (chapter === 1) await ctx.scheduler.runAfter(0, internal.library.countPass, { handbookId });
        const right = card.options.find((o: any) => o.id === optionId);
        return { correct: true as const, text: right?.text ?? "", why: card.whyRight ?? null, chapterPassed: true as const };
      }
    }
    if (correct) {
      const right = card.options.find((o: any) => o.id === optionId);
      return { correct: true as const, text: right?.text ?? "", why: card.whyRight ?? null };
    }
    const whyNot = card.whyNot?.[optionId] ?? "Not that one.";
    if (attempt >= 2) {
      const right = card.options.find((o: any) => o.id === card.answer);
      return { correct: false as const, whyNot, reteach: card.reteach ?? "", reveal: { id: card.answer, text: right?.text ?? "" } };
    }
    return { correct: false as const, whyNot, reteach: card.reteach ?? "", reveal: null };
  },
});

export const finishChapter = mutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, n, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    if (!Number.isInteger(n) || n < 1 || n > CHAPTERS) throw new Error("No such chapter");
    const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    if (!p) return;
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    if (!ch || ch.status !== "ready") throw new Error("Chapter not ready");
    const exerciseKeys: string[] = (ch?.cards ?? []).map((c: any, i: number) => (c.type === "exercise" ? `${n}:${i}` : null)).filter(Boolean);
    const allPassed = exerciseKeys.every((k) => p.passedExercises.includes(k));
    if (!allPassed) throw new Error("Finish the exercises first");
    const chaptersPassed = p.chaptersPassed.includes(n) ? p.chaptersPassed : [...p.chaptersPassed, n];
    const next = Math.min(n + 1, CHAPTERS);
    await ctx.db.patch(p._id, { chaptersPassed, currentChapter: n < CHAPTERS ? next : n, currentCard: 0, updatedAt: Date.now() });
    // Write the next chapter now if it isn't there yet (cached handbooks may already have it).
    if (n < CHAPTERS) await ensureChapter(ctx, h, next);
  },
});

// "How was chapter N?" on the Done screen (optional; Prateek, 6 Oct): Too easy, Just right, Lost me.
// On a typed topic, "Lost me" or "Too easy" marks the next chapter for a rewrite when it's opened, so it can adapt
// (it was already being written when the last quiz passed). Ready topics are pre-written and only record the answer.
export const rateChapter = mutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), rating: v.union(v.literal("too_easy"), v.literal("just_right"), v.literal("lost_me")), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, n, rating, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    if (!Number.isInteger(n) || n < 1 || n > CHAPTERS) throw new Error("No such chapter");
    const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    if (!p || !p.chaptersPassed.includes(n)) return;
    await ctx.db.patch(p._id, { feedback: { ...(p.feedback ?? {}), [String(n)]: rating }, updatedAt: Date.now() });
    if (rating === "just_right" || h.source !== "live" || n >= CHAPTERS) return;
    const next = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n + 1)).unique();
    const unread = p.currentChapter <= n + 1 && !(p.currentChapter === n + 1 && p.currentCard > 0);
    if (next && next.status === "ready" && unread && !next.stale) await ctx.db.patch(next._id, { stale: true });
  },
});

export const setTomorrow = mutation({
  args: { handbookId: v.id("handbooks"), at: v.string(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, at, deviceToken }) => {
    await ownedHandbook(ctx, handbookId, deviceToken);
    const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    if (p) await ctx.db.patch(p._id, { tomorrowAt: at, updatedAt: Date.now() });
  },
});

export const report = mutation({
  args: { handbookId: v.id("handbooks"), chapter: v.number(), cardIndex: v.number(), optionId: v.optional(v.string()), deviceToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ownedHandbook(ctx, args.handbookId, args.deviceToken);
    await ctx.db.insert("reports", { handbookId: args.handbookId, chapter: args.chapter, cardIndex: args.cardIndex, optionId: args.optionId, at: Date.now() });
  },
});

// After sign-in: the anonymous night attaches to the person. Nothing is re-asked.
export const attachToMe = mutation({
  args: { deviceToken: v.string() },
  handler: async (ctx, { deviceToken }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first");
    // 1. Handbooks and their progress. If the account already has the same topic from another device,
    //    keep the copy with more progress visible and hide the other (kept, not deleted).
    const accountBooks = (await ctx.db.query("handbooks").withIndex("by_user", (q) => q.eq("userId", userId)).collect()).filter((h) => !h.hiddenAt);
    const deviceBooks = (await ctx.db.query("handbooks").withIndex("by_token", (q) => q.eq("ownerToken", deviceToken)).collect()).filter((h) => !h.hiddenAt && !h.userId);
    let attached = 0, hidden = 0;
    for (const h of deviceBooks) {
      await ctx.db.patch(h._id, { userId }); attached++;
      const twin = accountBooks.find((a) => a._id !== h._id && (a.topicKey === h.topicKey || (a.source === "cache" && h.source === "cache" && a.topic === h.topic)));
      if (twin) {
        const loser = (await passedCount(ctx, h._id)) >= (await passedCount(ctx, twin._id)) ? twin : h;
        await ctx.db.patch(loser._id, { hiddenAt: Date.now() }); hidden++;
      }
    }
    // 2. "Make it yours" settings: the account keeps whichever was saved most recently.
    const deviceProfile = await ctx.db.query("profiles").withIndex("by_device", (q) => q.eq("deviceToken", deviceToken)).unique();
    const accountProfile = await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    if (deviceProfile && !deviceProfile.userId) {
      if (!accountProfile) await ctx.db.patch(deviceProfile._id, { userId });
      else if (deviceProfile.updatedAt > accountProfile.updatedAt) {
        const { _id, _creationTime, userId: _u, deviceToken: _d, ...fields } = deviceProfile;
        await ctx.db.patch(accountProfile._id, { ...fields, preferredModel: fields.preferredModel ?? accountProfile.preferredModel });
      }
    }
    // 3. The price spot: the earliest one wins.
    const deviceIntent = await ctx.db.query("priceIntents").withIndex("by_device", (q) => q.eq("deviceToken", deviceToken)).first();
    const accountIntent = await ctx.db.query("priceIntents").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (deviceIntent && !deviceIntent.userId && !accountIntent) await ctx.db.patch(deviceIntent._id, { userId });
    return { attached, hidden };
  },
});


// ---------- "Say it simpler" ----------

// Rewrites one teaching card in plainer words. Pre-generated for cached topics; live otherwise.
export const requestSimpler = mutation({
  args: { handbookId: v.id("handbooks"), chapter: v.number(), cardIndex: v.number(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, chapter, cardIndex, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", chapter)).unique();
    const card = ch?.cards?.[cardIndex];
    if (!ch || !card || card.type === "exercise") throw new Error("Not a teaching card");
    if (card.simpler) return { ready: true as const };
    const mine = await limiter.limit(ctx, "simplerDevice", { key: ownerKey(h) });
    if (!mine.ok || !(await limiter.limit(ctx, "simplerAll")).ok) throw new Error("busy");
    await ctx.scheduler.runAfter(0, internal.handbooks.writeSimpler, { handbookId, chapter, cardIndex });
    return { ready: false as const };
  },
});

export const writeSimpler = internalAction({
  args: { handbookId: v.id("handbooks"), chapter: v.number(), cardIndex: v.number() },
  handler: async (ctx, { handbookId, chapter, cardIndex }) => {
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    const ch = await ctx.runQuery(internal.handbooks.readChapter, { handbookId, n: chapter });
    const card = ch?.cards?.[cardIndex];
    if (!h || !ch || !card) return;
    const r = await ctx.runAction(internal.ai.generate, { kind: "simpler", system: SIMPLER_PROMPT, user: simplerUserMessage(h.plan?.topic ?? h.topic, ch.title ?? `Chapter ${chapter}`, card) });
    const text = r.ok && typeof r.json?.simpler === "string" ? r.json.simpler.trim() : null;
    await ctx.runMutation(internal.handbooks.setSimpler, { handbookId, chapter, cardIndex, simpler: text ?? "", failed: !text });
  },
});

export const readChapter = internalQuery({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }) => ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique(),
});

export const setSimpler = internalMutation({
  args: { handbookId: v.id("handbooks"), chapter: v.number(), cardIndex: v.number(), simpler: v.string(), failed: v.boolean() },
  handler: async (ctx, { handbookId, chapter, cardIndex, simpler, failed }) => {
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", chapter)).unique();
    if (!ch?.cards?.[cardIndex]) return;
    const cards = [...ch.cards];
    cards[cardIndex] = failed ? { ...cards[cardIndex], simplerFailedAt: Date.now() } : { ...cards[cardIndex], simpler };
    await ctx.db.patch(ch._id, { cards });
  },
});


// When the cache has a newer version of a chapter this person hasn't started, swap it in.
// Never touches a chapter that was personalised (has a model), voted on, or already started.
export const syncFromCache = mutation({
  args: { handbookId: v.id("handbooks"), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    if (h.source !== "cache") return { updated: 0 };
    const row = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", h.topicKey).eq("level", h.level)).unique();
    if (!row?.version) return { updated: 0 };
    const progress = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    const current = progress?.currentChapter ?? 1;
    const started = (progress?.currentCard ?? 0) > 0;
    const chapters = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId)).collect();
    let updated = 0;
    for (const ch of chapters) {
      const unread = ch.n > current || (ch.n === current && !started);
      if (!unread || ch.model || ch.vote || (ch.cacheVersion ?? 0) >= row.version) continue;
      const fresh = row.chapters.find((c: any) => c.n === ch.n);
      if (!fresh) continue;
      await ctx.db.patch(ch._id, { status: "ready", title: fresh.title, cards: fresh.cards, outcomeLine: fresh.outcomeLine, svg: fresh.svg, pictures: fresh.pictures, recallCards: fresh.recallCards, cacheVersion: row.version, stale: false, error: undefined });
      updated++;
    }
    // the plan too (hooks, sources), only if the person hasn't started reading at all
    if (!started && (progress?.chaptersPassed.length ?? 0) === 0 && row.plan) await ctx.db.patch(handbookId, { plan: row.plan });
    return { updated };
  },
});

// ---------- the cache (pre-generated handbooks) ----------

export const seedCache = internalMutation({
  args: { topic: v.string(), aliases: v.optional(v.array(v.string())), level, plan: v.any(), chapters: v.array(v.any()), trendingWeek: v.optional(v.string()) },
  handler: async (ctx, { topic, aliases, level: lvl, plan, chapters, trendingWeek }) => {
    const keys = new Set([topicKeyOf(topic), ...(aliases ?? []).map(topicKeyOf)]);
    chapters = chapters.map((ch: any) => ({ ...ch, cards: shuffleExercises(ch.cards ?? [], `${topic}:${ch.n}`) }));
    for (const topicKey of keys) {
      const existing = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", topicKey).eq("level", lvl)).unique();
      if (existing) await ctx.db.patch(existing._id, { topic, plan, chapters, version: Date.now(), ...(trendingWeek ? { trendingWeek } : {}) });
      else await ctx.db.insert("cache", { topicKey, level: lvl, topic, plan, chapters, version: Date.now(), addedAt: Date.now(), ...(trendingWeek ? { trendingWeek } : {}) });
    }
    return [...keys];
  },
});

export const cachedTopics = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("cache").collect();
    const seen = new Map<string, string>();
    for (const r of rows) if (!seen.has(r.topic)) seen.set(r.topic, r.plan?.topic ?? r.topic);
    return [...seen.values()];
  },
});

// ---------- the reader's profile: how they want to be taught ----------

const MODELS: Record<string, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-5-5",
  opus: "claude-opus-5-5",
  fable: "claude-fable-5-1",
};

function renderProfileLine(p: { persona?: string; tone?: string; likes?: string[]; examplesFrom?: string; avoid?: string }) {
  // About 100 tokens, in a fixed order, so the prompt cache stays warm and the model reads it the same way every time.
  const parts: string[] = [];
  if (p.persona) parts.push(`taught by ${p.persona.trim().slice(0, 80)}`);
  if (p.likes?.length) parts.push(`likes ${p.likes.slice(0, 6).join(", ")}`);
  if (p.examplesFrom) parts.push(`examples from ${p.examplesFrom.trim().slice(0, 80)}`);
  if (p.tone) parts.push(`in their words: "${p.tone.trim().slice(0, 160)}"`);
  if (p.avoid) parts.push(`avoid ${p.avoid.trim().slice(0, 100)}`);
  return parts.join("; ").slice(0, 500);
}

async function profileFor(ctx: QueryCtx | MutationCtx, userId: Id<"users"> | null, deviceToken?: string) {
  if (userId) {
    const byUser = await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    if (byUser) return byUser;
  }
  if (deviceToken) return await ctx.db.query("profiles").withIndex("by_device", (q) => q.eq("deviceToken", deviceToken)).unique();
  return null;
}

export const myProfile = query({
  args: { deviceToken: v.optional(v.string()) },
  handler: async (ctx, { deviceToken }) => {
    const userId = await getAuthUserId(ctx);
    const p = await profileFor(ctx, userId, deviceToken);
    if (!p) return null;
    // The writer stays masked: the client only learns that a pick exists, never which model it is.
    return { persona: p.persona, tone: p.tone, likes: p.likes ?? [], examplesFrom: p.examplesFrom, avoid: p.avoid, preferredModel: p.preferredModel ? "chosen" : null, updatedAt: p.updatedAt };
  },
});

// Save how they want to be taught. Unread chapters across all their handbooks are marked stale and
// rewritten only when opened; nothing already read is touched; plans are never regenerated.
export const saveProfile = mutation({
  args: { deviceToken: v.string(), persona: v.optional(v.string()), tone: v.optional(v.string()), likes: v.optional(v.array(v.string())), examplesFrom: v.optional(v.string()), avoid: v.optional(v.string()) },
  handler: async (ctx, { deviceToken, ...prefs }) => {
    const userId = await getAuthUserId(ctx);
    const existing = await profileFor(ctx, userId, deviceToken);
    const merged = { persona: prefs.persona ?? existing?.persona, tone: prefs.tone ?? existing?.tone, likes: prefs.likes ?? existing?.likes, examplesFrom: prefs.examplesFrom ?? existing?.examplesFrom, avoid: prefs.avoid ?? existing?.avoid };
    const line = renderProfileLine(merged);
    const now = Date.now();
    if (existing) await ctx.db.patch(existing._id, { ...merged, line, userId: userId ?? existing.userId, deviceToken: existing.deviceToken ?? deviceToken, updatedAt: now });
    else await ctx.db.insert("profiles", { ...merged, line, userId: userId ?? undefined, deviceToken, updatedAt: now });

    // Mark unread, already-written chapters stale on every handbook this person owns.
    const mine: Doc<"handbooks">[] = [];
    if (userId) mine.push(...(await ctx.db.query("handbooks").withIndex("by_user", (q) => q.eq("userId", userId)).collect()));
    mine.push(...(await ctx.db.query("handbooks").withIndex("by_token", (q) => q.eq("ownerToken", deviceToken)).collect()));
    const seen = new Set<string>();
    let staled = 0;
    for (const h of mine) {
      if (seen.has(h._id)) continue; seen.add(h._id);
      const progress = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
      const current = progress?.currentChapter ?? 1;
      const started = (progress?.currentCard ?? 0) > 0;
      const chapters = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id)).collect();
      for (const ch of chapters) {
        const unread = ch.n > current || (ch.n === current && !started);
        if (unread && ch.status === "ready" && !ch.stale) { await ctx.db.patch(ch._id, { stale: true }); staled++; }
      }
    }
    return { line, staled };
  },
});

// Called when a chapter is opened: if preferences changed after it was written, rewrite it first.
export const refreshIfStale = mutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, n, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    if (!ch || !ch.stale || !h.plan) return { rewriting: false };
    if (!(await takeGeneration(ctx, h))) { await ctx.db.patch(ch._id, { stale: false }); return { rewriting: false }; }
    await ctx.db.patch(ch._id, { status: "writing", stale: false, error: undefined });
    await ctx.scheduler.runAfter(0, internal.handbooks.generateChapter, { handbookId, n });
    return { rewriting: true };
  },
});

export const readProfileLine = internalQuery({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    const h = await ctx.db.get(handbookId);
    if (!h) return { line: undefined as string | undefined, model: undefined as string | undefined };
    const p = await profileFor(ctx, h.userId ?? null, h.ownerToken);
    return { line: p?.line || undefined, model: p?.preferredModel || undefined };
  },
});

// ---------- the masked model comparison ----------

// Writes the current chapter three ways (Sonnet, Opus, Fable), masked as A, B, C in a shuffled order.
export const compareModels = mutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, n, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    if (!h.plan) throw new Error("No plan yet");
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    if (ch?.variants && ch.variants.length === 3) return { started: false };
    const cmp = await limiter.limit(ctx, "compareAll");
    if (!cmp.ok || !(await takeGeneration(ctx, h))) throw new Error("busy");
    const order = ["sonnet", "opus", "fable"].sort(() => Math.random() - 0.5);
    const variants = order.map((k, i) => ({ key: ["A", "B", "C"][i], model: MODELS[k], status: "writing" }));
    if (ch) await ctx.db.patch(ch._id, { variants });
    else await ctx.db.insert("chapters", { handbookId, n, status: "writing", createdAt: Date.now(), variants });
    for (const vnt of variants) await ctx.scheduler.runAfter(0, internal.handbooks.writeVariant, { handbookId, n, key: vnt.key, model: vnt.model });
    return { started: true };
  },
});

export const writeVariant = internalAction({
  args: { handbookId: v.id("handbooks"), n: v.number(), key: v.string(), model: v.string() },
  handler: async (ctx, { handbookId, n, key, model }) => {
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    if (!h?.plan) return;
    const prof = await ctx.runQuery(internal.handbooks.readProfileLine, { handbookId });
    const r = await ctx.runAction(internal.ai.generate, { kind: "chapter", system: CHAPTER_PROMPT, user: chapterUserMessage(h.plan, h.level, h.language, h.voice ?? "friend", n, prof.line), model });
    const ok = r.ok && Array.isArray(r.json?.cards) && r.json.cards.length >= 5;
    await ctx.runMutation(internal.handbooks.setVariant, { handbookId, n, key, model, chapter: ok ? r.json : null, error: ok ? undefined : (r.ok ? "shape" : r.error) });
  },
});

export const setVariant = internalMutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), key: v.string(), model: v.string(), chapter: v.any(), error: v.optional(v.string()) },
  handler: async (ctx, { handbookId, n, key, model, chapter, error }) => {
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    if (!ch?.variants) return;
    const variants = ch.variants.map((vnt: any) => vnt.key !== key ? vnt : (chapter
      ? { key, model, status: "ready", title: chapter.title, cards: shuffleExercises(chapter.cards, `${handbookId}:${n}:${key}`), outcomeLine: chapter.outcomeLine, svg: chapter.svg }
      : { key, model, status: "failed", error }));
    await ctx.db.patch(ch._id, { variants });
  },
});

// The person taps the one that read best. That model becomes their default; the chosen text becomes the chapter.
export const voteModel = mutation({
  args: { handbookId: v.id("handbooks"), n: v.number(), key: v.string(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, n, key, deviceToken }) => {
    await ownedHandbook(ctx, handbookId, deviceToken);
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    const picked = ch?.variants?.find((vnt: any) => vnt.key === key && vnt.status === "ready");
    if (!ch || !picked) throw new Error("That version isn't ready");
    const userId = await getAuthUserId(ctx);
    await ctx.db.insert("modelVotes", { handbookId, chapter: n, userId: userId ?? undefined, deviceToken, picked: picked.model, options: ch.variants.map((vnt: any) => vnt.model), at: Date.now() });
    await ctx.db.patch(ch._id, { vote: key, status: "ready", title: picked.title, cards: picked.cards, outcomeLine: picked.outcomeLine, model: picked.model, stale: false });
    const existing = await profileFor(ctx, userId, deviceToken);
    if (existing) await ctx.db.patch(existing._id, { preferredModel: picked.model, updatedAt: Date.now() });
    else await ctx.db.insert("profiles", { userId: userId ?? undefined, deviceToken, preferredModel: picked.model, line: "", updatedAt: Date.now() });
    return { model: picked.model };
  },
});

// Read-only, for the LLM-judge run: the three writers' versions of a chapter (internal; run from the CLI).
export const readVariants = internalQuery({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }) => {
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    return ch?.variants ?? [];
  },
});

// ---------- the two-way street: ask about this card ----------

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
    await ctx.scheduler.runAfter(0, internal.handbooks.replyToTeachBack, { id });
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
    const d: any = await ctx.runQuery(internal.handbooks.readTeachBack, { id });
    if (!d) return;
    const r: any = await ctx.runAction(internal.ai.generate, { kind: "teach", system: TEACH_PROMPT, user: teachUserMessage(d.topic, d.title, d.oneBreath, d.outcome, d.row.text) });
    const j = r.ok ? r.json : null;
    const clean = (x: any) => (typeof x === "string" && x.trim() ? x.trim().slice(0, 300) : undefined);
    await ctx.runMutation(internal.handbooks.setTeachBack, { id, ok: !!j, verdict: clean(j?.verdict), got: clean(j?.got), missed: clean(j?.missed), tip: clean(j?.tip) });
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
    await ctx.scheduler.runAfter(0, internal.handbooks.answerQuestionAboutCard, { questionId: id });
    return id;
  },
});

export const answerQuestionAboutCard = internalAction({
  args: { questionId: v.id("cardQuestions") },
  handler: async (ctx, { questionId }) => {
    const row = await ctx.runQuery(internal.handbooks.readQuestion, { questionId });
    if (!row) return;
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId: row.handbookId });
    const ch = await ctx.runQuery(internal.handbooks.readChapter, { handbookId: row.handbookId, n: row.chapter });
    const card = ch?.cards?.[row.cardIndex];
    if (!h || !ch || !card) { await ctx.runMutation(internal.handbooks.setAnswer, { questionId, answer: "", failed: true }); return; }
    const prof = await ctx.runQuery(internal.handbooks.readProfileLine, { handbookId: row.handbookId });
    const body = card.type === "exercise" ? `${card.prompt}\n${(card.options ?? []).map((o: any) => `${o.id}) ${o.text}`).join("\n")}` : card.type === "watch" ? `${card.who}, ${card.what}. ${card.watchFor}` : card.body;
    const r = await ctx.runAction(internal.ai.askWithSearch, { system: ASK_SEARCH_PROMPT, user: askSearchUserMessage(h.plan?.topic ?? h.topic, ch.title ?? `Chapter ${row.chapter}`, body, row.question, prof.line), searchKey: String(h.userId ?? h.ownerToken ?? h._id) });
    if (r.ok && r.answer) await ctx.runMutation(internal.handbooks.setAnswer, { questionId, answer: r.answer, sources: r.sources, failed: false });
    else await ctx.runMutation(internal.handbooks.setAnswer, { questionId, answer: "", failed: true });
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

// Re-run the fact check on a chapter already in the database (for chapters written before the check existed).
export const recheckChapter = internalAction({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }) => {
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    const ch = await ctx.runQuery(internal.handbooks.readChapterRow, { handbookId, n });
    if (!h || !ch?.cards) return { ok: false };
    const checked = await factCheck(ctx, h.plan?.topic ?? h.topic, h.level, ch.title ?? "", ch.cards);
    await ctx.runMutation(internal.handbooks.patchCheckedCards, { id: ch._id, cards: checked.cards, factCheck: checked.report });
    return checked.report;
  },
});
export const readChapterRow = internalQuery({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }) => ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique(),
});
export const patchCheckedCards = internalMutation({
  args: { id: v.id("chapters"), cards: v.any(), factCheck: v.any() },
  handler: async (ctx, { id, cards, factCheck }) => { await ctx.db.patch(id, { cards, factCheck }); },
});
// Dry run: check cards without saving anything (for testing the checker).
export const checkCardsDry = internalAction({
  args: { topic: v.string(), level: v.string(), title: v.string(), cards: v.any(), model: v.optional(v.string()), effort: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))) },
  handler: async (ctx, { topic, level, title, cards, model, effort }) => {
    const started = Date.now();
    const r = await factCheck(ctx, topic, level, title, cards, { model, effort });
    return { report: r.report, ms: Date.now() - started, cards: r.cards };
  },
});
