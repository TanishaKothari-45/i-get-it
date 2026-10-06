import { v } from "convex/values";
import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { getAuthUserId } from "@convex-dev/auth/server";
import { components, internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { SIMPLER_PROMPT, simplerUserMessage } from "./prompts";
import { keepReels, themeFor } from "./sources";
import { MAX_LINKS } from "./links";
import { level } from "./schema";
import { ENGLISH, languageInfo } from "./languages";
import { landingSummary } from "./landing";
import { type SourceStart, startFromCreator, startFromSources } from "./fromSources";

const voiceV = v.union(v.literal("friend"), v.literal("straight"), v.literal("stories"));

export const CHAPTERS = 7;

// A Convex action stops at 10 minutes and a stopped one is never retried, so a write can die and leave "writing…"
// on screen forever. Each write is watched: still going after this long, it's marked failed and "Try again" works.
export const WRITE_TIMEOUT_MS = 12 * 60 * 1000;
const PLAN_TIMEOUT_MS = 20 * 60 * 1000;   // a plan from saved links reads each one first, in steps of their own
const TOOK_TOO_LONG = "took too long";

async function watchChapter(ctx: MutationCtx, id: Id<"chapters">, startedAt: number) {
  await ctx.scheduler.runAfter(WRITE_TIMEOUT_MS, internal.handbooks.expireChapter, { id, startedAt });
}
export async function watchPlan(ctx: MutationCtx, handbookId: Id<"handbooks">, startedAt: number) {
  await ctx.scheduler.runAfter(PLAN_TIMEOUT_MS, internal.handbooks.expirePlan, { handbookId, startedAt });
}
// A plan write starting now, on an existing handbook.
async function restartPlan(ctx: MutationCtx, handbookId: Id<"handbooks">, fields: Partial<Doc<"handbooks">>) {
  const startedAt = Date.now();
  await ctx.db.patch(handbookId, { ...fields, status: "planning", startedAt });
  await watchPlan(ctx, handbookId, startedAt);
}
// A chapter write starting now: mark it writing (or failed when over a cap) and watch it.
export async function markChapterWriting(ctx: MutationCtx, handbookId: Id<"handbooks">, n: number, existing: Doc<"chapters"> | null, ok: boolean) {
  const startedAt = Date.now();
  const fields = ok ? { status: "writing" as const, error: undefined, startedAt } : { status: "failed" as const, error: "busy" };
  const id = existing ? existing._id : await ctx.db.insert("chapters", { handbookId, n, createdAt: startedAt, ...fields });
  if (existing) await ctx.db.patch(id, fields);
  if (ok) await watchChapter(ctx, id, startedAt);
}

// Only the write that was being watched: a newer one started since (a retry) has its own watch.
export const expireChapter = internalMutation({
  args: { id: v.id("chapters"), startedAt: v.number() },
  handler: async (ctx, { id, startedAt }) => {
    const ch = await ctx.db.get(id);
    if (ch?.status === "writing" && ch.startedAt === startedAt) await ctx.db.patch(id, { status: "failed", error: TOOK_TOO_LONG });
  },
});
export const expirePlan = internalMutation({
  args: { handbookId: v.id("handbooks"), startedAt: v.number() },
  handler: async (ctx, { handbookId, startedAt }) => {
    const h = await ctx.db.get(handbookId);
    if (h?.status === "planning" && h.startedAt === startedAt) await ctx.db.patch(handbookId, { status: "failed", error: TOOK_TOO_LONG });
  },
});

// Caps (AGENTS.md section 4): 60 generations an hour across the app, 6 an hour per device.
export const limiter = new RateLimiter(components.rateLimiter, {
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
  // Photos sent before a handbook from what you saved (free to store, deleted once read).
  uploadDevice: { kind: "token bucket", rate: 20, period: HOUR, capacity: 6 },
  uploadAll: { kind: "fixed window", rate: 500, period: HOUR },
});

export function topicKeyOf(topic: string) {
  // Latin script keeps the old rule (only a-z, so cached keys still match); letters, vowel signs and digits of any
  // other script are kept too, so a line typed in Hindi has a key of its own instead of an empty one.
  return topic.toLowerCase().replace(/https?:\/\/\S+/g, " ")
    .replace(/\p{Script=Latin}/gu, (c) => (c >= "a" && c <= "z" ? c : " "))
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ").slice(0, 80);
}


// The model puts the right answer in the middle more often than not. Shuffle each
// exercise's options deterministically (per chapter and card) and remap the ids.
export function shuffleExercises(cards: any[], seed: string): any[] {
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

export async function ownedHandbook(ctx: QueryCtx | MutationCtx, handbookId: Id<"handbooks">, deviceToken?: string) {
  const h = await ctx.db.get(handbookId);
  if (!h) throw new Error("No such handbook");
  if (!owns(h, await viewer(ctx, deviceToken))) throw new Error("Not yours");
  return h;
}

export const readHandbook = internalQuery({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => ctx.db.get(handbookId),
});

// ---------- bonus lessons: shared helpers (the functions live in bonus.ts) ----------

export const bonusKindV = v.union(v.literal("deeper"), v.literal("another"));
export type BonusKind = "deeper" | "another";

export async function bonusChapter(ctx: QueryCtx | MutationCtx, handbookId: Id<"handbooks">, kind: BonusKind, n: number) {
  return ctx.db.query("bonusChapters").withIndex("by_handbookId_and_kind_and_n", (q) => q.eq("handbookId", handbookId).eq("kind", kind).eq("n", n)).unique();
}
// Which chapters' bonus of this kind a person has unlocked, and which they've finished.
export function bonusUnlocked(p: Doc<"progress"> | null, kind: BonusKind): number[] {
  return (kind === "deeper" ? p?.deeperUnlocked : p?.anotherUnlocked) ?? [];
}
export function bonusFinished(p: Doc<"progress"> | null, kind: BonusKind): number[] {
  return (kind === "deeper" ? p?.bonusPassed : p?.anotherPassed) ?? [];
}

// Per-person caps count against whoever owns the handbook (the account, else the phone that made it),
// never against the token sent with the call, which costs nothing to make up.
export function ownerKey(h: Doc<"handbooks">) {
  return h.userId ? String(h.userId) : (h.ownerToken ?? String(h._id));
}

// One plan or chapter write (a chapter includes its fact check): the app-wide cap and the owner's cap.
export async function takeGeneration(ctx: MutationCtx, h: Doc<"handbooks">) {
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

export async function ensureChapter(ctx: MutationCtx, h: Doc<"handbooks">, n: number) {
  if (!Number.isInteger(n) || n < 1 || n > CHAPTERS) return;
  const existing = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id).eq("n", n)).unique();
  if (existing && (existing.status === "ready" || existing.status === "writing")) return;
  const fromCache = await cachedChapter(ctx, h, n);
  // A ready topic in another language: translated when reached (a paid call, so it counts like a write).
  if (fromCache && h.language !== ENGLISH) {
    const ok = await takeGeneration(ctx, h);
    await markChapterWriting(ctx, h._id, n, existing, ok);
    if (ok) await ctx.scheduler.runAfter(0, internal.translations.chapterFromCache, { handbookId: h._id, n });
    return;
  }
  if (fromCache) {
    const row = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", h.topicKey).eq("level", h.level)).unique();
    const doc = { status: "ready" as const, title: fromCache.title, cards: fromCache.cards, outcomeLine: fromCache.outcomeLine, svg: fromCache.svg, pictures: fromCache.pictures, recallCards: fromCache.recallCards, cacheVersion: row?.version ?? 0, error: undefined };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("chapters", { handbookId: h._id, n, createdAt: Date.now(), ...doc });
    return;
  }
  if (!h.plan) return;
  // Over a cap: store it as failed, so the reader sees "try again" instead of a chapter that never comes.
  const ok = await takeGeneration(ctx, h);
  await markChapterWriting(ctx, h._id, n, existing, ok);
  if (ok) await ctx.scheduler.runAfter(0, internal.generate.generateChapter, { handbookId: h._id, n });
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
  for (const p of ch.pictures ?? []) if (p.storageId) { const url = await ctx.storage.getUrl(p.storageId); if (url) pictures[p.card] = url; }
  return { n: ch.n, status: ch.status, title: ch.title, outcomeLine: ch.outcomeLine, cards: publicCards(ch.cards), error: ch.error, svg: (ch as any).svg, stale: ch.stale ?? false, variants, vote: ch.vote, pictures, picturesPending: ch.status === "ready" && !Object.keys(pictures).length && ch.picturesStatus !== "failed" && ch.picturesStatus !== "skipped" && !!ch.cards };
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

// The handbook's words: plan, chapters and bonus lessons. Progress is its own query (progressFor), so turning a card,
// which saves the reader's place, doesn't send every chapter to the phone again.
async function fullView(ctx: QueryCtx, h: Doc<"handbooks">) {
  const chapters = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id)).collect();
  // A bonus row exists only once the reader asked for one they'd unlocked (requestBonus checks), so at most fourteen.
  const bonus = await ctx.db.query("bonusChapters").withIndex("by_handbookId_and_kind_and_n", (q) => q.eq("handbookId", h._id)).collect();
  return {
    bonus: bonus.map((b) => ({ kind: b.kind, n: b.n, status: b.status, title: b.title, cards: publicCards(b.cards), error: b.error })),
    _id: h._id, topic: h.topic, level: h.level, voice: h.voice ?? "friend", language: h.language, status: h.status, question: h.question, plan: h.plan, source: h.source, error: h.error, caution: cautionOf(h), pushback: h.pushback ?? (h.plan as any)?.pushback ?? null, suggestions: h.suggestions ?? [],
    signedIn: !!h.userId,
    // From what they saved: each source's progress (never its notes), the creator, and a question's tap-to-answer options.
    sources: (h.sources ?? []).map((s) => ({ kind: s.kind, url: s.url, status: s.status, title: s.title, error: s.error })),
    creator: h.creator?.handle ?? null,
    choices: h.choices ?? null,
    chapters: await Promise.all(chapters.sort((a, b) => a.n - b.n).map((ch) => publicChapter(ctx, ch))),
  };
}

function progressView(progress: Doc<"progress">) {
  return {
    currentChapter: progress.currentChapter, currentCard: progress.currentCard, currentPart: progress.currentPart ?? 0, chaptersPassed: progress.chaptersPassed,
    passedExercises: progress.passedExercises, missedExercises: progress.missedExercises, tomorrowAt: progress.tomorrowAt,
    deeperUnlocked: bonusUnlocked(progress, "deeper"), bonusPassed: bonusFinished(progress, "deeper"),
    anotherUnlocked: bonusUnlocked(progress, "another"), anotherPassed: bonusFinished(progress, "another"),
  };
}

// Where the reader is in a handbook: small, and the only thing that changes on every card. null when it isn't theirs.
export const progressFor = query({
  args: { handbookId: v.id("handbooks"), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, deviceToken }) => {
    const h = await ctx.db.get(handbookId);
    if (!h || !owns(h, await viewer(ctx, deviceToken))) return null;
    const progress = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    return progress ? progressView(progress) : null;
  },
});

// ---------- queries ----------

// Every key a handbook answers to: the line typed, and the topic its plan settled on (in English and as shown), so
// "public speaking" finds the handbook typed as "learn to speak in public" whose plan is called "Public speaking".
function topicKeysOf(h: Doc<"handbooks">): Set<string> {
  const keys = [h.topicKey, topicKeyOf(String(h.sourcePlan?.topic ?? "")), topicKeyOf(String(h.plan?.topic ?? ""))];
  return new Set(keys.filter(Boolean));
}

// The same thing twice on one shelf (made before "one handbook per topic", or on two devices before sign-in): one key
// per handbook for spotting it. From saved things: the links or creator; otherwise the topic its plan settled on.
function twinKeyOf(h: Doc<"handbooks">): string {
  const lang = h.language ?? ENGLISH;
  if (h.sourcesKey) return `${lang}|saved|${h.sourcesKey}`;
  const planned = topicKeyOf(String(h.sourcePlan?.topic ?? h.plan?.topic ?? ""));
  return `${lang}|topic|${planned || h.topicKey || h._id}`;
}

export async function ownedBooks(ctx: QueryCtx | MutationCtx, userId: Id<"users"> | null, deviceToken?: string) {
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
    const twins = new Map<string, number>();   // twin key -> index in rows
    for (const h of await ownedBooks(ctx, userId, deviceToken)) {
      if (h.status === "declined") continue;   // a topic we won't teach never sits on the shelf
      const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
      const row = { _id: h._id, topic: (h.plan as any)?.topic ?? (h.topic || (h.creator ? `@${h.creator.handle}'s reels` : "What you saved")), status: h.status, passed: p?.chaptersPassed.length ?? 0, current: p?.currentChapter ?? 1, lastAt: p?.updatedAt ?? h.createdAt, outcome: (h.plan as any)?.outcome7 ?? null };
      // The same thing twice on this shelf: show the copy with more chapters passed (then the more recent). Display
      // only: the other stays in the database, like the copies sign-in hides.
      const key = twinKeyOf(h);
      const at = twins.get(key);
      if (at === undefined) { twins.set(key, rows.length); rows.push(row); }
      else if (row.passed > rows[at].passed || (row.passed === rows[at].passed && row.lastAt > rows[at].lastAt)) rows[at] = row;
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
  args: {
    topic: v.string(), level, deviceToken: v.string(), voice: v.optional(voiceV), language: v.optional(v.string()),
    links: v.optional(v.array(v.string())), images: v.optional(v.array(v.id("_storage"))), creator: v.optional(v.string()),
  },
  handler: async (ctx, { topic, level: lvl, deviceToken, voice, language, links, images, creator }) => {
    const clean = topic.trim().slice(0, 200);
    const lang = language ?? ENGLISH;
    if (!languageInfo(lang)) throw new Error("Unknown language");
    // From what they saved: a creator's latest reels, or their own links and photos. The typed line is optional then.
    const start: SourceStart = { clean, level: lvl, voice: voice ?? "friend", language: lang, deviceToken };
    if (creator) return startFromCreator(ctx, start, creator);
    if (links?.length || images?.length) return startFromSources(ctx, start, (links ?? []).slice(0, MAX_LINKS + 1), images ?? []);
    if (clean.length < 2) throw new Error("Type a few words first.");
    const userId = await getAuthUserId(ctx);
    const topicKey = topicKeyOf(clean);
    const now = Date.now();

    const cached = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", topicKey).eq("level", lvl)).unique();

    // One handbook per topic per person (and per language): typing a topic you've already started opens it where you left off.
    // Two copies from before this rule: the one with more chapters passed.
    let already: Doc<"handbooks"> | undefined, best = -1;
    for (const h of (await ownedBooks(ctx, userId, deviceToken)).filter((h) => (h.language ?? ENGLISH) === lang &&
      ((topicKey && topicKeysOf(h).has(topicKey)) || (cached && h.source === "cache" && (h.sourcePlan?.topic ?? h.topic) === cached.topic)))) {
      const passed = await passedCount(ctx, h._id);
      if (passed > best) { already = h; best = passed; }
    }
    if (already) return { handbookId: already._id, fromCache: already.source === "cache", existing: true };

    // A ready topic in another language: its plan is translated now, its chapters as they're reached.
    if (cached && lang !== ENGLISH) {
      const all = await limiter.limit(ctx, "generateAll");
      const mine = await limiter.limit(ctx, "generateDevice", { key: userId ? String(userId) : deviceToken });
      if (!all.ok || !mine.ok) throw new Error("busy");
      const handbookId = await ctx.db.insert("handbooks", {
        topic: cached.topic, topicKey, level: lvl, language: lang, voice: voice ?? "friend", status: "planning",
        ownerToken: deviceToken, userId: userId ?? undefined, source: "cache", createdAt: now, startedAt: now,
      });
      await watchPlan(ctx, handbookId, now);
      await ctx.db.insert("progress", { handbookId, currentChapter: 1, currentCard: 0, chaptersPassed: [], passedExercises: [], missedExercises: [], lastOpenedAt: now, updatedAt: now });
      await ctx.scheduler.runAfter(0, internal.translations.planFromCache, { handbookId });
      return { handbookId, fromCache: true, existing: false };
    }

    if (cached) {
      const handbookId = await ctx.db.insert("handbooks", {
        topic: cached.topic, topicKey, level: lvl, language: lang, voice: voice ?? "friend", status: "ready", plan: cached.plan,
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
      topic: clean, topicKey, level: lvl, language: lang, voice: voice ?? "friend", status: "planning",
      ownerToken: deviceToken, userId: userId ?? undefined, source: "live", createdAt: now, startedAt: now,
    });
    await watchPlan(ctx, handbookId, now);
    await ctx.db.insert("progress", { handbookId, currentChapter: 1, currentCard: 0, chaptersPassed: [], passedExercises: [], missedExercises: [], lastOpenedAt: now, updatedAt: now });
    await ctx.scheduler.runAfter(0, internal.generate.generatePlan, { handbookId });
    return { handbookId, fromCache: false, existing: false };
  },
});

// "Go further": the next level of a handbook they've finished. Starts at "know some" and picks up where the
// last one ended. Typing it again (or a double tap) reopens the one they already have, like any topic.
export const goFurther = mutation({
  args: { handbookId: v.id("handbooks"), deviceToken: v.string() },
  handler: async (ctx, { handbookId, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    if (!h.plan || !p || p.chaptersPassed.length < CHAPTERS) throw new Error("Finish this one first");
    const topic = `${String(h.plan.topic ?? h.topic)}: the next level`.slice(0, 200);
    const topicKey = topicKeyOf(topic);
    const userId = await getAuthUserId(ctx);
    const already = (await ownedBooks(ctx, userId, deviceToken)).find((x) => x.topicKey === topicKey);
    if (already) return { handbookId: already._id, existing: true };
    const all = await limiter.limit(ctx, "generateAll");
    const mine = await limiter.limit(ctx, "generateDevice", { key: ownerKey(h) });
    if (!all.ok || !mine.ok) throw new Error("busy");
    const now = Date.now();
    const id = await ctx.db.insert("handbooks", {
      topic, topicKey, level: "some", language: h.language, voice: h.voice ?? "friend", status: "planning",
      ownerToken: deviceToken, userId: userId ?? undefined, source: "live", continuesHandbookId: h._id, createdAt: now, startedAt: now,
    });
    await watchPlan(ctx, id, now);
    await ctx.db.insert("progress", { handbookId: id, currentChapter: 1, currentCard: 0, chaptersPassed: [], passedExercises: [], missedExercises: [], lastOpenedAt: now, updatedAt: now });
    await ctx.scheduler.runAfter(0, internal.generate.generatePlan, { handbookId: id });
    return { handbookId: id, existing: false };
  },
});

export const answerQuestion = mutation({
  args: { handbookId: v.id("handbooks"), answer: v.string(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, answer, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    if (h.status !== "question") throw new Error("No question open");
    if (!(await takeGeneration(ctx, h))) throw new Error("busy");
    // Started from a creator: the answer is a theme (or what they typed). Its reels are read, then the plan is written.
    if (h.creator && h.sources?.length && !h.plan) {
      const said = answer.trim().slice(0, 300);
      const theme = themeFor(h.creator.themes, said);
      await restartPlan(ctx, handbookId, { question: undefined, choices: undefined, topic: h.topic || theme?.name || said, sources: theme ? keepReels(h.sources, theme.reels) : h.sources });
      await ctx.scheduler.runAfter(0, internal.sourcesRead.combineChosen, { handbookId });
      return;
    }
    // Started from links or photos that couldn't be read or disagree: the answer becomes the line the plan is written for.
    if (h.sources?.length && !h.topic) {
      await restartPlan(ctx, handbookId, { question: undefined, topic: answer.trim().slice(0, 200) });
      await ctx.scheduler.runAfter(0, internal.generate.generatePlan, { handbookId });
      return;
    }
    await restartPlan(ctx, handbookId, { question: undefined });
    await ctx.scheduler.runAfter(0, internal.generate.generatePlan, { handbookId, clarification: answer.trim().slice(0, 300) });
  },
});

export const retry = mutation({
  args: { handbookId: v.id("handbooks"), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    if (!h.plan) {
      if (h.status !== "failed") return;   // a plan is already being written
      if (!(await takeGeneration(ctx, h))) throw new Error("busy");
      await restartPlan(ctx, handbookId, { error: undefined });
      // From a creator, and their reels never came: gather them again.
      if (h.creator && !h.sources?.length) { await ctx.scheduler.runAfter(0, internal.sourcesRead.gatherCreator, { handbookId }); return; }
      // From links or photos: read what isn't read yet (never twice), or go straight to the plan.
      if (h.sources?.length && (h.sources.some((s) => s.status === "waiting" || s.status === "reading") || !h.topic)) {
        await ctx.scheduler.runAfter(0, internal.sourcesRead.readAll, { handbookId });
        return;
      }
      // A ready topic whose translation failed: translate it again, never write a new plan.
      if (h.source === "cache" && h.language !== ENGLISH) await ctx.scheduler.runAfter(0, internal.translations.planFromCache, { handbookId });
      else await ctx.scheduler.runAfter(0, internal.generate.generatePlan, { handbookId });
      return;
    }
    const failed = (await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId)).collect()).filter((c) => c.status === "failed");
    for (const c of failed) await ensureChapter(ctx, h, c.n);
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
    await ctx.db.patch(p._id, { currentChapter: chapter, currentCard: cardIndex, currentPart: Math.max(0, Math.min(20, Math.floor(part ?? 0))), lastOpenedAt: Date.now(), updatedAt: Date.now() });
  },
});

// The check. Returns the feedback the client is allowed to see; the rung moves only on a pass.
export const recordAnswer = mutation({
  args: { handbookId: v.id("handbooks"), chapter: v.number(), cardIndex: v.number(), optionId: v.string(), attempt: v.number(), recall: v.optional(v.boolean()), bonus: v.optional(v.boolean()), bonusKind: v.optional(bonusKindV), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, chapter, cardIndex, optionId, attempt, recall, bonus, bonusKind, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    const kind = bonusKind ?? "deeper";
    const ch = bonus ? await bonusChapter(ctx, handbookId, kind, chapter)
      : await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", handbookId).eq("n", chapter)).unique();
    const card = cardIndex >= RECALL_BASE ? (ch as any)?.recallCards?.[cardIndex - RECALL_BASE] : ch?.cards?.[cardIndex];
    if (!card || card.type !== "exercise") throw new Error("Not an exercise");
    const correct = card.answer === optionId;
    // Passing the chapter's last quiz starts writing the next chapter, so the closing card and the Done
    // screen hide most of the wait. Its writer reads how this chapter went (readingReport).
    const lastQuiz = Math.max(...(ch!.cards as any[]).map((c, i) => (c?.type === "exercise" ? i : -1)));
    if (correct && !recall && !bonus && cardIndex === lastQuiz && chapter < CHAPTERS) await ensureChapter(ctx, h, chapter + 1);
    const key = `${chapter}:${cardIndex}`;
    await ctx.db.insert("answers", { handbookId, chapter, cardIndex, optionId, correct, attempt, recall: !!recall, bonus: !!bonus, bonusKind: bonus ? kind : undefined, at: Date.now() });
    const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    // A bonus answer is recorded but never touches the chapter's rung.
    if (p && !recall && !bonus) {
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
    // Every exercise right first time unlocks "go deeper"; any miss unlocks "another way". Decided once, at the
    // first pass, so a later re-read can't swap or take one away.
    const firstPass = !p.chaptersPassed.includes(n);
    const deeper = bonusUnlocked(p, "deeper");
    const another = bonusUnlocked(p, "another");
    const missedAny = exerciseKeys.some((k) => p.missedExercises.includes(k));
    const deeperUnlocked = firstPass && exerciseKeys.length > 0 && !missedAny && !deeper.includes(n) ? [...deeper, n] : deeper;
    const anotherUnlocked = firstPass && missedAny && !another.includes(n) ? [...another, n] : another;
    await ctx.db.patch(p._id, { chaptersPassed, deeperUnlocked, anotherUnlocked, currentChapter: n < CHAPTERS ? next : n, currentCard: 0, updatedAt: Date.now() });
    // Write the next chapter now if it isn't there yet (cached handbooks may already have it).
    if (n < CHAPTERS) await ensureChapter(ctx, h, next);
  },
});

export const setTomorrow = mutation({
  args: { handbookId: v.id("handbooks"), at: v.string(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, at, deviceToken }) => {
    // "21:00" only: the 9pm nudge reads this time, and anything else would send it at the wrong hour.
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(at)) throw new Error("Pick a time like 21:00");
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
      // Handbooks from what they saved have no topic key: they're twins only if they came from the same links or creator.
      const twin = accountBooks.find((a) => a._id !== h._id && ((h.topicKey && a.topicKey === h.topicKey) || (h.sourcesKey && a.sourcesKey === h.sourcesKey) || (a.source === "cache" && h.source === "cache" && a.topic === h.topic)));
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
    const r = await ctx.runAction(internal.ai.generate, { kind: "simpler", system: SIMPLER_PROMPT, user: simplerUserMessage(h.plan?.topic ?? h.topic, ch.title ?? `Chapter ${chapter}`, card, h.language) });
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
    if (h.source !== "cache" || h.language !== ENGLISH) return { updated: 0 };   // a translated one keeps its translation
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
  args: { topic: v.string(), aliases: v.optional(v.array(v.string())), level, plan: v.any(), chapters: v.array(v.any()) },
  handler: async (ctx, { topic, aliases, level: lvl, plan, chapters }) => {
    const keys = new Set([topicKeyOf(topic), ...(aliases ?? []).map(topicKeyOf)]);
    chapters = chapters.map((ch: any) => ({ ...ch, cards: shuffleExercises(ch.cards ?? [], `${topic}:${ch.n}`) }));
    for (const topicKey of keys) {
      const existing = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", topicKey).eq("level", lvl)).unique();
      if (existing) await ctx.db.patch(existing._id, { topic, plan, chapters, version: Date.now() });
      else await ctx.db.insert("cache", { topicKey, level: lvl, topic, plan, chapters, version: Date.now() });
    }
    await ctx.scheduler.runAfter(0, internal.landing.rebuildLanding, {});
    return [...keys];
  },
});

export const cachedTopics = query({
  args: {},
  handler: async (ctx) => (await landingSummary(ctx)).topics,
});
