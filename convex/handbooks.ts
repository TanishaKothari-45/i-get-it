import { v } from "convex/values";
import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { getAuthUserId } from "@convex-dev/auth/server";
import { components, internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { ASK_PROMPT, CHAPTER_PROMPT, PLAN_PROMPT, SIMPLER_PROMPT, askUserMessage, chapterUserMessage, planUserMessage, simplerUserMessage } from "./prompts";
import { level } from "./schema";

const voiceV = v.union(v.literal("friend"), v.literal("straight"), v.literal("stories"));

const CHAPTERS = 7;
const LANGUAGE = "English";

// Caps (AGENTS.md section 4): 60 generations an hour across the app, 6 an hour per device.
const limiter = new RateLimiter(components.rateLimiter, {
  generateAll: { kind: "fixed window", rate: 60, period: HOUR },
  generateDevice: { kind: "token bucket", rate: 6, period: HOUR, capacity: 3 },
  simplerDevice: { kind: "token bucket", rate: 30, period: HOUR, capacity: 10 },
  askDevice: { kind: "token bucket", rate: 40, period: HOUR, capacity: 8 },
  compareAll: { kind: "fixed window", rate: 10, period: HOUR },   // three expensive-model calls each: hard cap across the app
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


// A pre-generated chapter for this topic, if the cache has it. Used before any model call.
async function cachedChapter(ctx: MutationCtx, h: Doc<"handbooks">, n: number) {
  const row = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", h.topicKey).eq("level", h.level)).unique();
  const ch = row?.chapters?.find((c: any) => c.n === n);
  return ch ?? null;
}

async function ensureChapter(ctx: MutationCtx, h: Doc<"handbooks">, n: number) {
  const existing = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id).eq("n", n)).unique();
  if (existing && existing.status === "ready") return;
  const fromCache = await cachedChapter(ctx, h, n);
  if (fromCache) {
    const row = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", h.topicKey).eq("level", h.level)).unique();
    const doc = { status: "ready" as const, title: fromCache.title, cards: fromCache.cards, outcomeLine: fromCache.outcomeLine, svg: fromCache.svg, cacheVersion: row?.version ?? 0, error: undefined };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("chapters", { handbookId: h._id, n, createdAt: Date.now(), ...doc });
    return;
  }
  if (!h.plan) return;
  if (existing) await ctx.db.patch(existing._id, { status: "writing", error: undefined });
  else await ctx.db.insert("chapters", { handbookId: h._id, n, status: "writing", createdAt: Date.now() });
  await ctx.scheduler.runAfter(0, internal.handbooks.generateChapter, { handbookId: h._id, n });
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

function publicChapter(ch: Doc<"chapters">) {
  const variants = ch.variants?.map((vnt: any) => ({ key: vnt.key, status: vnt.status, title: vnt.title, outcomeLine: vnt.outcomeLine, svg: vnt.svg, cards: publicCards(vnt.cards) }));
  return { n: ch.n, status: ch.status, title: ch.title, outcomeLine: ch.outcomeLine, cards: publicCards(ch.cards), error: ch.error, svg: (ch as any).svg, stale: ch.stale ?? false, variants, vote: ch.vote };
}

async function fullView(ctx: QueryCtx, h: Doc<"handbooks">) {
  const chapters = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id)).collect();
  const progress = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
  return {
    _id: h._id, topic: h.topic, level: h.level, voice: h.voice ?? "friend", status: h.status, question: h.question, plan: h.plan, source: h.source, error: h.error,
    signedIn: !!h.userId,
    chapters: chapters.sort((a, b) => a.n - b.n).map(publicChapter),
    progress: progress ? {
      currentChapter: progress.currentChapter, currentCard: progress.currentCard, chaptersPassed: progress.chaptersPassed,
      passedExercises: progress.passedExercises, missedExercises: progress.missedExercises, tomorrowAt: progress.tomorrowAt,
    } : null,
  };
}

// ---------- queries ----------

export const current = query({
  args: { deviceToken: v.optional(v.string()) },
  handler: async (ctx, { deviceToken }) => {
    const userId = await getAuthUserId(ctx);
    let h: Doc<"handbooks"> | null = null;
    if (userId) h = await ctx.db.query("handbooks").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").first();
    if (!h && deviceToken) h = await ctx.db.query("handbooks").withIndex("by_token", (q) => q.eq("ownerToken", deviceToken)).order("desc").first();
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
    if (cached) {
      const handbookId = await ctx.db.insert("handbooks", {
        topic: cached.topic, topicKey, level: lvl, language: LANGUAGE, voice: voice ?? "friend", status: "ready", plan: cached.plan,
        ownerToken: deviceToken, userId: userId ?? undefined, source: "cache", createdAt: now,
      });
      for (const ch of cached.chapters) {
        await ctx.db.insert("chapters", { handbookId, n: ch.n, status: "ready", title: ch.title, cards: ch.cards, outcomeLine: ch.outcomeLine, svg: ch.svg, cacheVersion: cached.version ?? 0, createdAt: now });
      }
      await ctx.db.insert("progress", { handbookId, currentChapter: 1, currentCard: 0, chaptersPassed: [], passedExercises: [], missedExercises: [], lastOpenedAt: now, updatedAt: now });
      return { handbookId, fromCache: true };
    }

    // Live generation: the caps are checked here, in the kitchen.
    const all = await limiter.limit(ctx, "generateAll");
    const mine = await limiter.limit(ctx, "generateDevice", { key: deviceToken });
    if (!all.ok || !mine.ok) throw new Error("busy");

    const handbookId = await ctx.db.insert("handbooks", {
      topic: clean, topicKey, level: lvl, language: LANGUAGE, voice: voice ?? "friend", status: "planning",
      ownerToken: deviceToken, userId: userId ?? undefined, source: "live", createdAt: now,
    });
    await ctx.db.insert("progress", { handbookId, currentChapter: 1, currentCard: 0, chaptersPassed: [], passedExercises: [], missedExercises: [], lastOpenedAt: now, updatedAt: now });
    await ctx.scheduler.runAfter(0, internal.handbooks.generatePlan, { handbookId });
    return { handbookId, fromCache: false };
  },
});

export const answerQuestion = mutation({
  args: { handbookId: v.id("handbooks"), answer: v.string(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, answer, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    if (h.status !== "question") throw new Error("No question open");
    const mine = await limiter.limit(ctx, "generateDevice", { key: deviceToken ?? String(h.userId) });
    if (!mine.ok) throw new Error("busy");
    await ctx.db.patch(handbookId, { status: "planning", question: undefined });
    await ctx.scheduler.runAfter(0, internal.handbooks.generatePlan, { handbookId, clarification: answer.trim().slice(0, 300) });
  },
});

export const retry = mutation({
  args: { handbookId: v.id("handbooks"), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    const mine = await limiter.limit(ctx, "generateDevice", { key: deviceToken ?? String(h.userId) });
    if (!mine.ok) throw new Error("busy");
    if (!h.plan) {
      await ctx.db.patch(handbookId, { status: "planning", error: undefined });
      await ctx.scheduler.runAfter(0, internal.handbooks.generatePlan, { handbookId });
      return;
    }
    const failed = (await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId)).collect()).filter((c) => c.status === "failed");
    for (const c of failed) await ensureChapter(ctx, h, c.n);
  },
});

// ---------- generation (internal) ----------

export const generatePlan = internalAction({
  args: { handbookId: v.id("handbooks"), clarification: v.optional(v.string()) },
  handler: async (ctx, { handbookId, clarification }) => {
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    if (!h) return;
    const r = await ctx.runAction(internal.ai.generate, { kind: "plan", system: PLAN_PROMPT, user: planUserMessage(h.topic, h.level, h.language, h.voice ?? "friend", clarification) });
    if (!r.ok) { await ctx.runMutation(internal.handbooks.setFailed, { handbookId, error: r.error }); return; }
    const plan = r.json;
    if (plan.needsClarification && plan.question && !clarification) {
      await ctx.runMutation(internal.handbooks.setQuestion, { handbookId, question: String(plan.question) });
      return;
    }
    if (!Array.isArray(plan.chapters) || plan.chapters.length !== CHAPTERS) {
      await ctx.runMutation(internal.handbooks.setFailed, { handbookId, error: `plan had ${plan.chapters?.length ?? 0} chapters` });
      return;
    }
    await ctx.runMutation(internal.handbooks.setPlan, { handbookId, plan, topic: clarification ? `${h.topic} (${clarification})` : h.topic });
    await ctx.runMutation(internal.handbooks.startChapter, { handbookId, n: 1 });
    await ctx.runAction(internal.handbooks.generateChapter, { handbookId, n: 1 });
  },
});

export const generateChapter = internalAction({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }) => {
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    if (!h?.plan) return;
    const prof = await ctx.runQuery(internal.handbooks.readProfileLine, { handbookId });
    const r = await ctx.runAction(internal.ai.generate, { kind: "chapter", system: CHAPTER_PROMPT, user: chapterUserMessage(h.plan, h.level, h.language, h.voice ?? "friend", n, prof.line), model: prof.model });
    if (!r.ok) { await ctx.runMutation(internal.handbooks.setChapterFailed, { handbookId, n, error: r.error }); return; }
    const ch = r.json;
    const exercises = (ch.cards ?? []).filter((c: any) => c.type === "exercise");
    const sane = Array.isArray(ch.cards) && ch.cards.length >= 5 && exercises.length >= 2 &&
      exercises.every((e: any) => Array.isArray(e.options) && e.options.length === 3 && e.options.some((o: any) => o.id === e.answer));
    if (!sane) { await ctx.runMutation(internal.handbooks.setChapterFailed, { handbookId, n, error: "chapter failed the shape check" }); return; }
    await ctx.runMutation(internal.handbooks.setChapter, { handbookId, n, title: String(ch.title ?? h.plan.chapters[n - 1]?.title ?? `Chapter ${n}`), cards: ch.cards, outcomeLine: String(ch.outcomeLine ?? ""), svg: typeof ch.svg === "string" ? ch.svg.slice(0, 2000) : undefined, model: r.model });
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
  args: { handbookId: v.id("handbooks"), n: v.number(), title: v.string(), cards: v.any(), outcomeLine: v.string(), svg: v.optional(v.string()), model: v.optional(v.string()) },
  handler: async (ctx, { handbookId, n, title, cards, outcomeLine, svg, model }) => {
    const existing = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
    const shuffled = shuffleExercises(cards, `${handbookId}:${n}`);
    if (existing) await ctx.db.patch(existing._id, { status: "ready", title, cards: shuffled, outcomeLine, svg, model, stale: false, error: undefined });
    else await ctx.db.insert("chapters", { handbookId, n, status: "ready", title, cards: shuffled, outcomeLine, svg, model, createdAt: Date.now() });
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
  args: { handbookId: v.id("handbooks"), chapter: v.number(), cardIndex: v.number(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, chapter, cardIndex, deviceToken }) => {
    await ownedHandbook(ctx, handbookId, deviceToken);
    const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    if (!p) return;
    await ctx.db.patch(p._id, { currentChapter: chapter, currentCard: cardIndex, lastOpenedAt: Date.now(), updatedAt: Date.now() });
  },
});

// The check. Returns the feedback the client is allowed to see; the rung moves only on a pass.
export const recordAnswer = mutation({
  args: { handbookId: v.id("handbooks"), chapter: v.number(), cardIndex: v.number(), optionId: v.string(), attempt: v.number(), recall: v.optional(v.boolean()), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, chapter, cardIndex, optionId, attempt, recall, deviceToken }) => {
    await ownedHandbook(ctx, handbookId, deviceToken);
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", chapter)).unique();
    const card = ch?.cards?.[cardIndex];
    if (!card || card.type !== "exercise") throw new Error("Not an exercise");
    const correct = card.answer === optionId;
    const key = `${chapter}:${cardIndex}`;
    await ctx.db.insert("answers", { handbookId, chapter, cardIndex, optionId, correct, attempt, recall: !!recall, at: Date.now() });
    const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    if (p && !recall) {
      const passed = new Set(p.passedExercises); const missed = new Set(p.missedExercises);
      if (correct && attempt === 1) passed.add(key);
      if (!correct) missed.add(key);
      if (correct && attempt > 1) { passed.add(key); }
      await ctx.db.patch(p._id, { passedExercises: [...passed], missedExercises: [...missed], updatedAt: Date.now() });
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
    const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    if (!p) return;
    const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", n)).unique();
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
    const mine = await ctx.db.query("handbooks").withIndex("by_token", (q) => q.eq("ownerToken", deviceToken)).collect();
    for (const h of mine) if (!h.userId) await ctx.db.patch(h._id, { userId });
    return mine.length;
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
    const mine = await limiter.limit(ctx, "simplerDevice", { key: deviceToken ?? String(h.userId) });
    if (!mine.ok) throw new Error("busy");
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
      await ctx.db.patch(ch._id, { status: "ready", title: fresh.title, cards: fresh.cards, outcomeLine: fresh.outcomeLine, svg: fresh.svg, cacheVersion: row.version, stale: false, error: undefined });
      updated++;
    }
    // the plan too (hooks, sources), only if the person hasn't started reading at all
    if (!started && (progress?.chaptersPassed.length ?? 0) === 0 && row.plan) await ctx.db.patch(handbookId, { plan: row.plan });
    return { updated };
  },
});

// ---------- the cache (pre-generated handbooks) ----------

export const seedCache = internalMutation({
  args: { topic: v.string(), aliases: v.optional(v.array(v.string())), level, plan: v.any(), chapters: v.array(v.any()) },
  handler: async (ctx, { topic, aliases, level: lvl, plan, chapters }) => {
    const keys = new Set([topicKeyOf(topic), ...(aliases ?? []).map(topicKeyOf)]);
    chapters = chapters.map((ch: any) => ({ ...ch, cards: shuffleExercises(ch.cards ?? [], `${topic}:${ch.n}`) }));
    for (const topicKey of keys) {
      const existing = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", topicKey).eq("level", lvl)).unique();
      if (existing) await ctx.db.patch(existing._id, { topic, plan, chapters, version: Date.now() });
      else await ctx.db.insert("cache", { topicKey, level: lvl, topic, plan, chapters, version: Date.now() });
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
    const mine = await limiter.limit(ctx, "generateDevice", { key: deviceToken ?? String(h.userId) });
    if (!mine.ok) { await ctx.db.patch(ch._id, { stale: false }); return { rewriting: false }; }
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
    const all = await limiter.limit(ctx, "generateAll");
    const mine = await limiter.limit(ctx, "generateDevice", { key: deviceToken ?? String(h.userId) });
    if (!cmp.ok || !all.ok || !mine.ok) throw new Error("busy");
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

export const questionsFor = query({
  args: { handbookId: v.id("handbooks"), chapter: v.number(), cardIndex: v.number(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, chapter, cardIndex, deviceToken }) => {
    await ownedHandbook(ctx, handbookId, deviceToken);
    const rows = await ctx.db.query("cardQuestions").withIndex("by_card", (q) => q.eq("handbookId", handbookId).eq("chapter", chapter).eq("cardIndex", cardIndex)).collect();
    return rows.sort((a, b) => a.at - b.at).map((r) => ({ _id: r._id, question: r.question, answer: r.answer, status: r.status }));
  },
});

export const ask = mutation({
  args: { handbookId: v.id("handbooks"), chapter: v.number(), cardIndex: v.number(), question: v.string(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, chapter, cardIndex, question, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    const q = question.trim().slice(0, 300);
    if (q.length < 3) throw new Error("Ask in a few words.");
    const mine = await limiter.limit(ctx, "askDevice", { key: deviceToken ?? String(h.userId) });
    if (!mine.ok) throw new Error("busy");
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
    const body = card.type === "exercise" ? `${card.prompt}\n${(card.options ?? []).map((o: any) => `${o.id}) ${o.text}`).join("\n")}` : card.body;
    const r = await ctx.runAction(internal.ai.generate, { kind: "ask", system: ASK_PROMPT, user: askUserMessage(h.plan?.topic ?? h.topic, ch.title ?? `Chapter ${row.chapter}`, { type: card.type, title: card.title, body }, row.question, prof.line) });
    const text = r.ok && typeof r.json?.answer === "string" ? r.json.answer.trim() : "";
    await ctx.runMutation(internal.handbooks.setAnswer, { questionId, answer: text, failed: !text });
  },
});

export const readQuestion = internalQuery({
  args: { questionId: v.id("cardQuestions") },
  handler: async (ctx, { questionId }) => ctx.db.get(questionId),
});

export const setAnswer = internalMutation({
  args: { questionId: v.id("cardQuestions"), answer: v.string(), failed: v.boolean() },
  handler: async (ctx, { questionId, answer, failed }) => { await ctx.db.patch(questionId, failed ? { status: "failed" } : { status: "ready", answer }); },
});
