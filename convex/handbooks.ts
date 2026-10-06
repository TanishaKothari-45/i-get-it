import { v } from "convex/values";
import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { getAuthUserId } from "@convex-dev/auth/server";
import { components, internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { CHAPTER_PROMPT, PLAN_PROMPT, SIMPLER_PROMPT, briefText, chapterUserMessage, needsResearch, planUserMessage, researchBlock, simplerUserMessage, sourcesBlock, type BonusKind } from "./prompts";
import { buildSources, keepReels, sourceNotesOf, themeFor } from "./sources";
import { parseCreator } from "./links";
import { level, voice as voiceV } from "./schema";
import { ENGLISH, languageInfo } from "./languages";

type Voice = "friend" | "straight" | "stories";
type Level = "new" | "some";

const CHAPTERS = 7;
const DEFAULT_VOICE: Voice = "friend";
// A chapter still "writing" after this long is treated as stuck, and the next reader rewrites it.
export const STUCK_WRITING_MS = 5 * 60 * 1000;

// How long a shared book is given to new learners, by how fast its topic goes stale (the plan says
// which). After that the next person gets a freshly written book; people already reading keep theirs.
type Freshness = "fast" | "medium" | "stable";
const DAY_MS = 24 * 60 * 60 * 1000;
const TTL_MS: Record<Freshness, number> = { fast: 7 * DAY_MS, medium: 90 * DAY_MS, stable: 365 * DAY_MS };
const DEFAULT_FRESHNESS: Freshness = "medium";

function freshnessOf(value: unknown): Freshness {
  return value === "fast" || value === "medium" || value === "stable" ? value : DEFAULT_FRESHNESS;
}

function isExpired(book: Doc<"books">) {
  return book.expiresAt !== undefined && book.expiresAt <= Date.now();
}

// Caps (AGENTS.md section 4): 60 generations an hour across the app, 6 an hour per device.
export const limiter = new RateLimiter(components.rateLimiter, {
  generateAll: { kind: "fixed window", rate: 60, period: HOUR },
  generateDevice: { kind: "token bucket", rate: 6, period: HOUR, capacity: 3 },
  simplerDevice: { kind: "token bucket", rate: 30, period: HOUR, capacity: 10 },
  // Photo uploads (read once, then deleted): per phone and across the app, so storage can't be flooded.
  uploadDevice: { kind: "token bucket", rate: 20, period: HOUR, capacity: 6 },
  uploadAll: { kind: "fixed window", rate: 500, period: HOUR },
});

export function topicKeyOf(topic: string) {
  // Latin script keeps the old rule (only a-z, so keys already in the cache still match); letters, vowel
  // signs and digits of any other script are kept too, so a line typed in Hindi has a key.
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

// ---------- the shared library ----------

async function bookByKey(ctx: QueryCtx | MutationCtx, topicKey: string, lvl: Level, language: string, v: Voice) {
  const key = await ctx.db.query("bookKeys")
    .withIndex("by_key", (q) => q.eq("topicKey", topicKey).eq("level", lvl).eq("language", language).eq("voice", v))
    .first();
  const book = key ? await ctx.db.get(key.bookId) : null;
  return book && !isExpired(book) ? book : null;
}

// The book for this line, if one exists. Pre-written (seed) books exist in the default voice
// only; they're reused for any voice rather than paying for a fresh one.
async function findBook(ctx: QueryCtx | MutationCtx, topicKey: string, lvl: Level, language: string, v: Voice) {
  if (!topicKey) return null;
  const exact = await bookByKey(ctx, topicKey, lvl, language, v);
  if (exact || v === DEFAULT_VOICE) return exact;
  const seed = await bookByKey(ctx, topicKey, lvl, language, DEFAULT_VOICE);
  return seed?.source === "seed" ? seed : null;
}

// Point these lines at this book. A line still pointing at an expired (or deleted) book moves over;
// a line pointing at another live book is left alone.
export async function addKeys(ctx: MutationCtx, book: Doc<"books">, keys: string[]) {
  for (const topicKey of new Set(keys.filter(Boolean))) {
    const existing = await ctx.db.query("bookKeys")
      .withIndex("by_key", (q) => q.eq("topicKey", topicKey).eq("level", book.level).eq("language", book.language).eq("voice", book.voice))
      .first();
    if (!existing) {
      await ctx.db.insert("bookKeys", { topicKey, level: book.level, language: book.language, voice: book.voice, bookId: book._id });
      continue;
    }
    if (existing.bookId === book._id) continue;
    const current = await ctx.db.get(existing.bookId);
    if (!current || isExpired(current)) await ctx.db.patch(existing._id, { bookId: book._id });
  }
}

export async function bookChapter(ctx: QueryCtx | MutationCtx, bookId: Id<"books">, n: number) {
  return ctx.db.query("chapters").withIndex("by_book_n", (q) => q.eq("bookId", bookId).eq("n", n)).unique();
}

export const bonusKindV = v.union(v.literal("deeper"), v.literal("another"));

export async function bonusChapter(ctx: QueryCtx | MutationCtx, bookId: Id<"books">, kind: BonusKind, n: number) {
  return ctx.db.query("bonusChapters").withIndex("by_book_kind_n", (q) => q.eq("bookId", bookId).eq("kind", kind).eq("n", n)).unique();
}

// Which chapters' bonus of this kind a person has unlocked, and which they've finished.
export function bonusUnlocked(p: Doc<"progress"> | null, kind: BonusKind): number[] {
  return (kind === "deeper" ? p?.deeperUnlocked : p?.anotherUnlocked) ?? [];
}
export function bonusFinished(p: Doc<"progress"> | null, kind: BonusKind): number[] {
  return (kind === "deeper" ? p?.bonusPassed : p?.anotherPassed) ?? [];
}

export function exerciseIndexes(cards: any[] | undefined): number[] {
  return (cards ?? []).flatMap((c: any, i: number) => (c?.type === "exercise" ? [i] : []));
}

// Every exercise of chapter n passed, and none of them ever missed: this unlocks "go deeper".
function allRightFirstTime(p: Doc<"progress">, cards: any[] | undefined, n: number) {
  const keys = exerciseIndexes(cards).map((i) => `${n}:${i}`);
  return keys.length > 0 && keys.every((k) => p.passedExercises.includes(k) && !p.missedExercises.includes(k));
}

// At least one exercise of chapter n was missed along the way: this unlocks "another way".
function anyMissed(p: Doc<"progress">, cards: any[] | undefined, n: number) {
  return exerciseIndexes(cards).some((i) => p.missedExercises.includes(`${n}:${i}`));
}

// Make sure chapter n of a book is written or being written. Whoever reaches it first triggers
// the write; everyone after reads the same chapter. A translated book's chapter is translated from
// its English chapter, which is written first if it isn't yet.
export async function ensureChapter(ctx: MutationCtx, book: Doc<"books">, n: number) {
  const existing = await bookChapter(ctx, book._id, n);
  if (existing?.status === "ready") return;
  const now = Date.now();
  if (existing?.status === "writing" && now - (existing.startedAt ?? existing.createdAt) < STUCK_WRITING_MS) return;
  if (existing) await ctx.db.patch(existing._id, { status: "writing", error: undefined, startedAt: now });
  else await ctx.db.insert("chapters", { bookId: book._id, n, status: "writing", createdAt: now, startedAt: now });
  if (!book.sourceBookId) {
    await ctx.scheduler.runAfter(0, internal.handbooks.generateChapter, { bookId: book._id, n });
    return;
  }
  const english = await ctx.db.get(book.sourceBookId);
  if (!english) { await failChapter(ctx, book._id, n, "English book missing"); return; }
  const source = await bookChapter(ctx, english._id, n);
  // Written: translate it now. Not yet: write it; saveChapter starts the translation when it lands.
  if (source?.status === "ready") await ctx.scheduler.runAfter(0, internal.translations.translateChapter, { bookId: book._id, n });
  else await ensureChapter(ctx, english, n);
}

async function failChapter(ctx: MutationCtx, bookId: Id<"books">, n: number, error: string) {
  const existing = await bookChapter(ctx, bookId, n);
  if (existing) await ctx.db.patch(existing._id, { status: "failed", error });
  else await ctx.db.insert("chapters", { bookId, n, status: "failed", error, createdAt: Date.now() });
}

// The translations of an English book (one per language).
export async function translationsOf(ctx: QueryCtx | MutationCtx, bookId: Id<"books">) {
  return ctx.db.query("books").withIndex("by_translation", (q) => q.eq("sourceBookId", bookId)).collect();
}

// This English book in this language, if it has been translated (and hasn't expired with it).
export async function translationOf(ctx: QueryCtx | MutationCtx, english: Doc<"books">, language: string) {
  const book = await ctx.db.query("books").withIndex("by_translation", (q) => q.eq("sourceBookId", english._id).eq("language", language)).first();
  return book && !isExpired(book) ? book : null;
}

// A handbook in another language, from its English book: the plan is translated now, and chapter 1
// is written in English meanwhile (if it isn't already) so its translation can follow straight after.
async function translateFrom(ctx: MutationCtx, handbookId: Id<"handbooks">, english: Doc<"books">) {
  await ensureChapter(ctx, english, 1);
  await ctx.scheduler.runAfter(0, internal.translations.translatePlan, { handbookId, sourceBookId: english._id });
}

async function newProgress(ctx: MutationCtx, handbookId: Id<"handbooks">) {
  const now = Date.now();
  await ctx.db.insert("progress", { handbookId, currentChapter: 1, currentCard: 0, chaptersPassed: [], passedExercises: [], missedExercises: [], lastOpenedAt: now, updatedAt: now });
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
  return { n: ch.n, status: ch.status, title: ch.title, outcomeLine: ch.outcomeLine, cards: publicCards(ch.cards), error: ch.error };
}

async function fullView(ctx: QueryCtx, h: Doc<"handbooks">) {
  const book = h.bookId ? await ctx.db.get(h.bookId) : null;
  const chapters = book ? await ctx.db.query("chapters").withIndex("by_book_n", (q) => q.eq("bookId", book._id)).collect() : [];
  const progress = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
  // Only the bonus lessons this person has unlocked, of either kind.
  const bonus: Doc<"bonusChapters">[] = [];
  for (const kind of ["deeper", "another"] as const) {
    const unlocked = bonusUnlocked(progress, kind);
    if (!book || unlocked.length === 0) continue;
    const rows = await ctx.db.query("bonusChapters").withIndex("by_book_kind_n", (q) => q.eq("bookId", book._id).eq("kind", kind)).collect();
    bonus.push(...rows.filter((b) => unlocked.includes(b.n)));
  }
  return {
    bonus: bonus.map((b) => ({ kind: b.kind, n: b.n, status: b.status, title: b.title, cards: publicCards(b.cards), error: b.error })),
    sources: (h.sources ?? []).map((s) => ({ kind: s.kind, url: s.url, status: s.status, via: s.via, title: s.title, error: s.error })),
    creator: h.creator ? h.creator.handle : null, choices: h.choices ?? null,
    _id: h._id, topic: h.topic, level: h.level, voice: h.voice, language: h.language, bookVoice: book?.voice ?? null, source: book?.source ?? null,
    status: h.status, question: h.question, plan: book?.plan ?? null, error: h.error,
    signedIn: !!h.userId,
    chapters: chapters.sort((a, b) => a.n - b.n).map(publicChapter),
    progress: progress ? {
      currentChapter: progress.currentChapter, currentCard: progress.currentCard, chaptersPassed: progress.chaptersPassed,
      passedExercises: progress.passedExercises, missedExercises: progress.missedExercises, tomorrowAt: progress.tomorrowAt,
      deeperUnlocked: bonusUnlocked(progress, "deeper"), bonusPassed: bonusFinished(progress, "deeper"),
      anotherUnlocked: bonusUnlocked(progress, "another"), anotherPassed: bonusFinished(progress, "another"),
    } : null,
  };
}

// Every handbook this person can open: the signed-in account's and this device's, newest first.
async function myHandbooks(ctx: QueryCtx, deviceToken?: string) {
  const userId = await getAuthUserId(ctx);
  const byUser = userId ? await ctx.db.query("handbooks").withIndex("by_user", (q) => q.eq("userId", userId)).collect() : [];
  const byDevice = deviceToken ? await ctx.db.query("handbooks").withIndex("by_token", (q) => q.eq("ownerToken", deviceToken)).collect() : [];
  const seen = new Map<Id<"handbooks">, Doc<"handbooks">>();
  for (const h of [...byUser, ...byDevice]) seen.set(h._id, h);
  return [...seen.values()].sort((a, b) => b.createdAt - a.createdAt);
}

// ---------- queries ----------

// Where the bare link should land: the most recent handbook, on the card they left.
export const current = query({
  args: { deviceToken: v.optional(v.string()) },
  handler: async (ctx, { deviceToken }) => {
    const [h] = await myHandbooks(ctx, deviceToken);
    if (!h) return null;
    const progress = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
    const midChapter = h.status === "ready" && progress && progress.currentCard > 0 && progress.chaptersPassed.length < CHAPTERS;
    return { handbookId: h._id, resumeChapter: midChapter ? progress.currentChapter : null };
  },
});

// The library: one line per handbook, enough to list and pick one.
export const mine = query({
  args: { deviceToken: v.optional(v.string()) },
  handler: async (ctx, { deviceToken }) => {
    const list = await myHandbooks(ctx, deviceToken);
    return Promise.all(list.map(async (h) => {
      const book = h.bookId ? await ctx.db.get(h.bookId) : null;
      const progress = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
      return {
        _id: h._id, topic: book?.plan?.topic ?? h.topic, status: h.status,
        currentChapter: progress?.currentChapter ?? 1, chaptersPassed: progress?.chaptersPassed ?? [],
        createdAt: h.createdAt,
      };
    }));
  },
});

// One handbook. Someone else's link answers with just its topic, so they can start their own.
export const get = query({
  args: { handbookId: v.string(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, deviceToken }) => {
    const id = ctx.db.normalizeId("handbooks", handbookId);
    const h = id ? await ctx.db.get(id) : null;
    if (!h) return { kind: "missing" as const };
    if (!owns(h, await viewer(ctx, deviceToken))) {
      const book = h.bookId ? await ctx.db.get(h.bookId) : null;
      return { kind: "notMine" as const, topic: book?.plan?.topic ?? h.topic, level: h.level, voice: h.voice, language: h.language };
    }
    return { kind: "mine" as const, handbook: await fullView(ctx, h) };
  },
});

// Two or three exercises from chapters already passed, for the start of night N.
export const recallFor = query({
  args: { handbookId: v.id("handbooks"), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    if (!h.bookId) return [];
    const bookId = h.bookId;
    const progress = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
    if (!progress || progress.chaptersPassed.length === 0) return [];
    const picks: { chapter: number; cardIndex: number; card: any }[] = [];
    const passed = [...progress.chaptersPassed].sort((a, b) => b - a); // most recent first
    for (const n of passed) {
      const ch = await bookChapter(ctx, bookId, n);
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

type StartArgs = { topic: string; level: Level; voice?: Voice; language?: string; deviceToken: string; continuesBookId?: Id<"books">; links?: string[]; images?: Id<"_storage">[]; creator?: string };
type HandbookBase = Omit<Doc<"handbooks">, "_id" | "_creationTime" | "topic" | "status">;

// A handbook pointing to a book that already exists: nothing is written or copied.
async function handbookOnBook(ctx: MutationCtx, base: HandbookBase, book: Doc<"books">) {
  const handbookId = await ctx.db.insert("handbooks", { ...base, topic: book.topic, status: "ready", bookId: book._id });
  await newProgress(ctx, handbookId);
  await ensureChapter(ctx, book, 1);
  return { handbookId, fromCache: true };
}

// Started from links or photos: always written fresh for this person (their own sources, never a shared book).
// The sources are read first (sourcesRead.readAll), then the plan is written from what they teach.
async function startFromSources(ctx: MutationCtx, a: { clean: string; level: Level; voice: Voice; language: string; deviceToken: string; links: string[]; images: Id<"_storage">[] }) {
  const sources = buildSources(a.links, a.images);
  if (!sources.length) throw new Error("Add a link or a photo first.");
  const all = await limiter.limit(ctx, "generateAll");
  const mine = await limiter.limit(ctx, "generateDevice", { key: a.deviceToken });
  if (!all.ok || !mine.ok) throw new Error("busy");
  const userId = await getAuthUserId(ctx);
  const handbookId = await ctx.db.insert("handbooks", {
    topic: a.clean, topicKey: "", level: a.level, language: a.language, voice: a.voice, status: "planning", sources,
    ownerToken: a.deviceToken, userId: userId ?? undefined, createdAt: Date.now(),
  });
  await newProgress(ctx, handbookId);
  await ctx.scheduler.runAfter(0, internal.sourcesRead.readAll, { handbookId });
  return { handbookId, fromCache: false };
}

// Started from a creator: their latest public reels are gathered and sorted into themes (sourcesRead.gatherCreator),
// the learner picks one, and the handbook is written from that theme's reels. Private, like any handbook from sources.
async function startFromCreator(ctx: MutationCtx, a: { clean: string; level: Level; voice: Voice; language: string; deviceToken: string; creator: string }) {
  const handle = parseCreator(a.creator);
  if (!handle) throw new Error("That doesn't look like an Instagram handle.");
  const all = await limiter.limit(ctx, "generateAll");
  const mine = await limiter.limit(ctx, "generateDevice", { key: a.deviceToken });
  if (!all.ok || !mine.ok) throw new Error("busy");
  const userId = await getAuthUserId(ctx);
  const handbookId = await ctx.db.insert("handbooks", {
    topic: a.clean, topicKey: "", level: a.level, language: a.language, voice: a.voice, status: "planning", sources: [], creator: { handle },
    ownerToken: a.deviceToken, userId: userId ?? undefined, createdAt: Date.now(),
  });
  await newProgress(ctx, handbookId);
  await ctx.scheduler.runAfter(0, internal.sourcesRead.gatherCreator, { handbookId });
  return { handbookId, fromCache: false };
}

// A new handbook for this line: reopen one they already have, point to a shared book if one exists,
// translate the English book if only that exists, otherwise write it (within the caps).
async function startHandbook(ctx: MutationCtx, { topic, level: lvl, voice, language, deviceToken, continuesBookId, links, images, creator }: StartArgs) {
  const clean = topic.trim().slice(0, 200);
  const lang = language ?? ENGLISH;
  if (!languageInfo(lang)) throw new Error("Unknown language");
  if (creator) return startFromCreator(ctx, { clean, level: lvl, voice: voice ?? DEFAULT_VOICE, language: lang, deviceToken, creator });
  if (links?.length || images?.length) return startFromSources(ctx, { clean, level: lvl, voice: voice ?? DEFAULT_VOICE, language: lang, deviceToken, links: links ?? [], images: images ?? [] });
  if (clean.length < 2) throw new Error("Type a few words first.");
  const userId = await getAuthUserId(ctx);
  const topicKey = topicKeyOf(clean);
  const v = voice ?? DEFAULT_VOICE;
  const base: HandbookBase = { topicKey, level: lvl, language: lang, voice: v, ownerToken: deviceToken, userId: userId ?? undefined, continuesBookId, createdAt: Date.now() };
  const book = await findBook(ctx, topicKey, lvl, lang, v);

  // Asking again for something they already have (or a double tap): reopen it, never a second copy.
  const owned = await myHandbooks(ctx, deviceToken);
  const again = owned.find((h) => (book ? h.bookId === book._id : h.status === "planning" && h.topicKey === topicKey && h.level === lvl && h.voice === v && h.language === lang));
  if (again) return { handbookId: again._id, fromCache: !!book };

  // Someone already has this book in this language: point to it.
  if (book) return handbookOnBook(ctx, base, book);

  // Written in English already: reuse its translation if there is one, else translate it.
  const english = lang === ENGLISH ? null : await findBook(ctx, topicKey, lvl, ENGLISH, v);
  const translated = english ? await translationOf(ctx, english, lang) : null;
  if (translated) {
    await addKeys(ctx, translated, [topicKey]);
    return handbookOnBook(ctx, base, translated);
  }

  // A new write or a new translation: the caps are checked here, in the kitchen.
  const all = await limiter.limit(ctx, "generateAll");
  const mine = await limiter.limit(ctx, "generateDevice", { key: deviceToken });
  if (!all.ok || !mine.ok) throw new Error("busy");

  const handbookId = await ctx.db.insert("handbooks", { ...base, topic: clean, status: "planning" });
  await newProgress(ctx, handbookId);
  if (english) await translateFrom(ctx, handbookId, english);
  else await ctx.scheduler.runAfter(0, internal.handbooks.generatePlan, { handbookId });
  return { handbookId, fromCache: !!english };
}

export const create = mutation({
  args: { topic: v.string(), level, deviceToken: v.string(), voice: v.optional(voiceV), language: v.optional(v.string()), links: v.optional(v.array(v.string())), images: v.optional(v.array(v.id("_storage"))), creator: v.optional(v.string()) },
  handler: async (ctx, { topic, level: lvl, deviceToken, voice, language, links, images, creator }) => startHandbook(ctx, { topic, level: lvl, voice, language, deviceToken, links, images, creator }),
});

// "Go further": the next level of a handbook they've finished. Starts at "know some", picks up where
// the last one ended, and is shared like any book (the next person to finish gets it straight away).
export const goFurther = mutation({
  args: { handbookId: v.id("handbooks"), deviceToken: v.string() },
  handler: async (ctx, { handbookId, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    const book = h.bookId ? await ctx.db.get(h.bookId) : null;
    const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    if (!book || !p || p.chaptersPassed.length < CHAPTERS) throw new Error("Finish this one first");
    // A translated handbook goes further from its English book, and stays in the reader's language.
    const english = book.sourceBookId ? await ctx.db.get(book.sourceBookId) : book;
    if (!english) throw new Error("No such book");
    const title = String(english.plan?.topic ?? english.topic);
    return startHandbook(ctx, { topic: `${title}: the next level`, level: "some", voice: h.voice, language: h.language, deviceToken, continuesBookId: english._id });
  },
});

export const answerQuestion = mutation({
  args: { handbookId: v.id("handbooks"), answer: v.string(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, answer, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    if (h.status !== "question") throw new Error("No question open");
    const clarification = answer.trim().slice(0, 300);
    // Started from a creator: the answer is a theme (or what they typed). Its reels are read, then the plan is written.
    if (h.creator && h.sources?.length) {
      const mine = await limiter.limit(ctx, "generateDevice", { key: deviceToken ?? String(h.userId) });
      if (!mine.ok) throw new Error("busy");
      const theme = themeFor(h.creator.themes, clarification);
      await ctx.db.patch(handbookId, { status: "planning", question: undefined, choices: undefined, topic: h.topic || theme?.name || clarification, sources: theme ? keepReels(h.sources, theme.reels) : h.sources });
      await ctx.scheduler.runAfter(0, internal.sourcesRead.combineChosen, { handbookId });
      return;
    }
    // Started from links or photos: no shared book to find; the answer steers the plan.
    if (h.sources?.length) {
      const mine = await limiter.limit(ctx, "generateDevice", { key: deviceToken ?? String(h.userId) });
      if (!mine.ok) throw new Error("busy");
      await ctx.db.patch(handbookId, { status: "planning", question: undefined, topic: h.topic || clarification });
      await ctx.scheduler.runAfter(0, internal.handbooks.generatePlan, { handbookId, clarification });
      return;
    }
    // The answered line may already have a book (in this language, or in English to translate).
    const key = topicKeyOf(`${h.topic} (${clarification})`);
    const book = await findBook(ctx, key, h.level, h.language, h.voice);
    if (book) {
      await ctx.db.patch(handbookId, { status: "ready", bookId: book._id, topic: book.topic, question: undefined });
      await ensureChapter(ctx, book, 1);
      return;
    }
    const mine = await limiter.limit(ctx, "generateDevice", { key: deviceToken ?? String(h.userId) });
    if (!mine.ok) throw new Error("busy");
    await ctx.db.patch(handbookId, { status: "planning", question: undefined });
    const english = h.language === ENGLISH ? null : await findBook(ctx, key, h.level, ENGLISH, h.voice);
    if (english) await translateFrom(ctx, handbookId, english);
    else await ctx.scheduler.runAfter(0, internal.handbooks.generatePlan, { handbookId, clarification });
  },
});

export const retry = mutation({
  args: { handbookId: v.id("handbooks"), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    const mine = await limiter.limit(ctx, "generateDevice", { key: deviceToken ?? String(h.userId) });
    if (!mine.ok) throw new Error("busy");
    const book = h.bookId ? await ctx.db.get(h.bookId) : null;
    if (!book && h.creator && !h.sources?.length) {
      await ctx.db.patch(handbookId, { status: "planning", error: undefined });
      await ctx.scheduler.runAfter(0, internal.sourcesRead.gatherCreator, { handbookId });
      return;
    }
    if (!book && h.sources?.length) {
      await ctx.db.patch(handbookId, { status: "planning", error: undefined });
      const unread = h.sources.some((s) => s.status !== "read" && s.status !== "failed");
      if (unread || !sourceNotesOf(h)) await ctx.scheduler.runAfter(0, internal.sourcesRead.readAll, { handbookId });
      else await ctx.scheduler.runAfter(0, internal.handbooks.generatePlan, { handbookId });
      return;
    }
    if (!book) {
      await ctx.db.patch(handbookId, { status: "planning", error: undefined });
      // The English book may already be written and only its translation failed: translate again, don't rewrite.
      const english = h.language === ENGLISH ? null : await findBook(ctx, h.topicKey, h.level, ENGLISH, h.voice);
      if (english) await translateFrom(ctx, handbookId, english);
      else await ctx.scheduler.runAfter(0, internal.handbooks.generatePlan, { handbookId });
      return;
    }
    const failed = (await ctx.db.query("chapters").withIndex("by_book_n", (q) => q.eq("bookId", book._id)).collect()).filter((c) => c.status === "failed");
    for (const c of failed) await ensureChapter(ctx, book, c.n);
  },
});

// ---------- generation (internal) ----------

export const generatePlan = internalAction({
  args: { handbookId: v.id("handbooks"), clarification: v.optional(v.string()) },
  handler: async (ctx, { handbookId, clarification }) => {
    const h = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    if (!h) return;
    // "Go further": tell the plan what they just finished, so it picks up from there.
    const prev = h.continuesBookId ? await ctx.runQuery(internal.handbooks.readBook, { bookId: h.continuesBookId }) : null;
    const previous = prev?.plan ? {
      topic: String(prev.plan.topic ?? prev.topic), outcome7: prev.plan.outcome7 ?? undefined, horizon14: prev.plan.horizon14 ?? undefined,
      chapterTitles: (prev.plan.chapters ?? []).map((c: any) => String(c.title ?? "")),
    } : undefined;
    // Always written in English (translated after); only a clarifying question is asked in their language.
    const reader = h.language === ENGLISH ? "" : `\nThe learner reads ${h.language}. Write everything in English, except the clarifying question, if you ask one: write that in ${h.language}.`;
    const notes = sourceNotesOf(h);
    // From saved picks, or about something that changes fast: search the web once, before the plan (kept for the chapters).
    let found = h.research;
    if (notes && found === undefined && h.sourcesBrief && needsResearch(h.sourcesBrief)) {
      found = (await ctx.runAction(internal.research.run, { topic: h.topic, brief: briefText(h.sourcesBrief) })) ?? "";
      await ctx.runMutation(internal.handbooks.setResearch, { handbookId, research: found });
    }
    const grounding = (notes ? sourcesBlock(notes, "plan") : "") + (found ? researchBlock(found) : "");
    const r = await ctx.runAction(internal.ai.generate, { kind: "plan", system: PLAN_PROMPT, user: planUserMessage(h.topic, h.level, ENGLISH, h.voice, clarification, previous) + reader + grounding });
    if (!r.ok) { await ctx.runMutation(internal.handbooks.setFailed, { handbookId, error: r.error }); return; }
    const plan = r.json;
    if (plan.needsClarification && plan.question && !clarification && !previous && !notes) {
      await ctx.runMutation(internal.handbooks.setQuestion, { handbookId, question: String(plan.question) });
      return;
    }
    if (!Array.isArray(plan.chapters) || plan.chapters.length !== CHAPTERS) {
      await ctx.runMutation(internal.handbooks.setFailed, { handbookId, error: `plan had ${plan.chapters?.length ?? 0} chapters` });
      return;
    }
    await ctx.runMutation(internal.handbooks.savePlan, { handbookId, plan, clarification });
  },
});

// A new plan becomes a shared book (unless one appeared meanwhile), and the handbook points to it.
export const savePlan = internalMutation({
  args: { handbookId: v.id("handbooks"), plan: v.any(), clarification: v.optional(v.string()) },
  handler: async (ctx, { handbookId, plan, clarification }) => {
    const h = await ctx.db.get(handbookId);
    if (!h) return;
    const line = clarification ? `${h.topic} (${clarification})` : h.topic;
    const keys = [topicKeyOf(line), topicKeyOf(String(plan.topic ?? ""))];
    let book: Doc<"books"> | null = null;
    const notes = sourceNotesOf(h);
    if (!notes) for (const k of keys) { book = await findBook(ctx, k, h.level, ENGLISH, h.voice); if (book) break; }
    if (!book) {
      const freshness = freshnessOf(plan.freshness);
      const now = Date.now();
      const bookId = await ctx.db.insert("books", {
        topic: String(plan.topic ?? line), level: h.level, language: ENGLISH, voice: h.voice, plan, source: "live",
        createdAt: now, freshness, expiresAt: now + TTL_MS[freshness],
        ...(notes ? { private: true, sourceNotes: notes, ...(h.research ? { research: h.research } : {}) } : {}),
      });
      book = (await ctx.db.get(bookId))!;
    }
    // A private book (from someone's own sources) is never given a topic key, so no one else lands on it.
    if (!book.private) await addKeys(ctx, book, keys);
    // Another language: the handbook stays "planning" until the plan's translation lands.
    if (h.language !== ENGLISH) {
      await ctx.db.patch(handbookId, { topic: line, topicKey: keys[0], question: undefined, error: undefined });
      await translateFrom(ctx, handbookId, book);
      return;
    }
    await ctx.db.patch(handbookId, { status: "ready", bookId: book._id, topic: line, topicKey: keys[0], question: undefined, error: undefined });
    await ensureChapter(ctx, book, 1);
  },
});

export const generateChapter = internalAction({
  args: { bookId: v.id("books"), n: v.number() },
  handler: async (ctx, { bookId, n }) => {
    const book = await ctx.runQuery(internal.handbooks.readBook, { bookId });
    if (!book?.plan) return;
    // A typed topic that changes fast: search the web once, before its first chapter; the book keeps the findings for all
    // seven chapters (and for everyone else who gets this book).
    let research = book.research;
    if (research === undefined && !book.sourceNotes && n === 1 && needsResearch(undefined, book.freshness)) {
      research = (await ctx.runAction(internal.research.run, { topic: String(book.plan.topic ?? book.topic), chapters: (book.plan.chapters ?? []).map((c: any) => String(c.title ?? "")) })) ?? "";
      await ctx.runMutation(internal.handbooks.setBookResearch, { bookId, research });
    }
    const r = await ctx.runAction(internal.ai.generate, { kind: "chapter", system: CHAPTER_PROMPT, user: chapterUserMessage(book.plan, book.level, book.language, book.voice, n, book.sourceNotes, research || undefined) });
    if (!r.ok) { await ctx.runMutation(internal.handbooks.setChapterFailed, { bookId, n, error: r.error }); return; }
    const ch = r.json;
    const exercises = (ch.cards ?? []).filter((c: any) => c.type === "exercise");
    const sane = Array.isArray(ch.cards) && ch.cards.length >= 5 && exercises.length >= 2 &&
      exercises.every((e: any) => Array.isArray(e.options) && e.options.length === 3 && e.options.some((o: any) => o.id === e.answer));
    if (!sane) { await ctx.runMutation(internal.handbooks.setChapterFailed, { bookId, n, error: "chapter failed the shape check" }); return; }
    await ctx.runMutation(internal.handbooks.saveChapter, { bookId, n, title: String(ch.title ?? book.plan.chapters[n - 1]?.title ?? `Chapter ${n}`), cards: ch.cards, outcomeLine: String(ch.outcomeLine ?? "") });
  },
});

export const readHandbook = internalQuery({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => ctx.db.get(handbookId),
});

export const readBook = internalQuery({
  args: { bookId: v.id("books") },
  handler: async (ctx, { bookId }) => ctx.db.get(bookId),
});

// Research findings ("" when searched and nothing found, so it isn't searched again).
export const setResearch = internalMutation({
  args: { handbookId: v.id("handbooks"), research: v.string() },
  handler: async (ctx, { handbookId, research }) => { await ctx.db.patch(handbookId, { research }); },
});
export const setBookResearch = internalMutation({
  args: { bookId: v.id("books"), research: v.string() },
  handler: async (ctx, { bookId, research }) => { await ctx.db.patch(bookId, { research }); },
});

export const setQuestion = internalMutation({
  args: { handbookId: v.id("handbooks"), question: v.string() },
  handler: async (ctx, { handbookId, question }) => { await ctx.db.patch(handbookId, { status: "question", question }); },
});
export const setFailed = internalMutation({
  args: { handbookId: v.id("handbooks"), error: v.string() },
  handler: async (ctx, { handbookId, error }) => { await ctx.db.patch(handbookId, { status: "failed", error }); },
});
export const saveChapter = internalMutation({
  args: { bookId: v.id("books"), n: v.number(), title: v.string(), cards: v.any(), outcomeLine: v.string() },
  handler: async (ctx, { bookId, n, title, cards, outcomeLine }) => {
    const existing = await bookChapter(ctx, bookId, n);
    const shuffled = shuffleExercises(cards, `${bookId}:${n}`);
    const doc = { status: "ready" as const, title, cards: shuffled, outcomeLine, error: undefined };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("chapters", { bookId, n, createdAt: Date.now(), ...doc });
    // Translations waiting on this chapter can go now.
    for (const t of await translationsOf(ctx, bookId)) {
      if ((await bookChapter(ctx, t._id, n))?.status === "writing") await ctx.scheduler.runAfter(0, internal.translations.translateChapter, { bookId: t._id, n });
    }
  },
});
export const setChapterFailed = internalMutation({
  args: { bookId: v.id("books"), n: v.number(), error: v.string() },
  handler: async (ctx, { bookId, n, error }) => {
    await failChapter(ctx, bookId, n, error);
    // Translations waiting on it fail with it; "Try again" on one rewrites the English first.
    for (const t of await translationsOf(ctx, bookId)) {
      if ((await bookChapter(ctx, t._id, n))?.status === "writing") await failChapter(ctx, t._id, n, `English chapter failed: ${error}`);
    }
  },
});
export const logAiCall = internalMutation({
  args: { kind: v.string(), model: v.string(), input: v.string(), output: v.string(), tokensIn: v.optional(v.number()), tokensOut: v.optional(v.number()), ms: v.number(), ok: v.boolean(), error: v.optional(v.string()) },
  handler: async (ctx, args) => { await ctx.db.insert("aiCalls", { ...args, at: Date.now() }); },
});

// ---------- reading and answering ----------

// The card they're on, for the chapter they're on. Re-reading an earlier chapter doesn't move it.
export const setPosition = mutation({
  args: { handbookId: v.id("handbooks"), chapter: v.number(), cardIndex: v.number(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, chapter, cardIndex, deviceToken }) => {
    await ownedHandbook(ctx, handbookId, deviceToken);
    const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    if (!p || p.currentChapter !== chapter) return;
    await ctx.db.patch(p._id, { currentCard: cardIndex, lastOpenedAt: Date.now(), updatedAt: Date.now() });
  },
});

// The check. Returns the feedback the client is allowed to see; the rung moves only on a pass.
export const recordAnswer = mutation({
  args: { handbookId: v.id("handbooks"), chapter: v.number(), cardIndex: v.number(), optionId: v.string(), attempt: v.number(), recall: v.optional(v.boolean()), bonus: v.optional(v.boolean()), bonusKind: v.optional(bonusKindV), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, chapter, cardIndex, optionId, attempt, recall, bonus, bonusKind, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    const kind = bonusKind ?? "deeper";
    const ch = !h.bookId ? null : bonus ? await bonusChapter(ctx, h.bookId, kind, chapter) : await bookChapter(ctx, h.bookId, chapter);
    const card = ch?.cards?.[cardIndex];
    if (!card || card.type !== "exercise") throw new Error("Not an exercise");
    const correct = card.answer === optionId;
    const key = `${chapter}:${cardIndex}`;
    await ctx.db.insert("answers", { handbookId, chapter, cardIndex, optionId, correct, attempt, recall: !!recall, bonus: !!bonus, bonusKind: bonus ? kind : undefined, at: Date.now() });
    const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    // A bonus answer is recorded but never touches the chapter's rung.
    if (p && !recall && !bonus) {
      const passed = new Set(p.passedExercises); const missed = new Set(p.missedExercises);
      if (correct) passed.add(key);
      else missed.add(key);
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
    const book = h.bookId ? await ctx.db.get(h.bookId) : null;
    const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", handbookId)).unique();
    if (!book || !p) return;
    const ch = await bookChapter(ctx, book._id, n);
    const exerciseKeys: string[] = (ch?.cards ?? []).map((c: any, i: number) => (c.type === "exercise" ? `${n}:${i}` : null)).filter(Boolean);
    const allPassed = exerciseKeys.every((k) => p.passedExercises.includes(k));
    if (!allPassed) throw new Error("Finish the exercises first");
    const chaptersPassed = p.chaptersPassed.includes(n) ? p.chaptersPassed : [...p.chaptersPassed, n];
    // Finishing a chapter re-read from earlier doesn't move them back.
    const advancing = n === p.currentChapter && n < CHAPTERS;
    // Every exercise right first time unlocks "go deeper"; any miss unlocks "another way". Decided once,
    // when the chapter is first passed, so a later re-read can't swap or take one away.
    const firstPass = !p.chaptersPassed.includes(n);
    const deeper = bonusUnlocked(p, "deeper");
    const another = bonusUnlocked(p, "another");
    const allRight = allRightFirstTime(p, ch?.cards, n);
    const deeperUnlocked = firstPass && allRight && !deeper.includes(n) ? [...deeper, n] : deeper;
    const anotherUnlocked = firstPass && !allRight && anyMissed(p, ch?.cards, n) && !another.includes(n) ? [...another, n] : another;
    await ctx.db.patch(p._id, { chaptersPassed, deeperUnlocked, anotherUnlocked, ...(advancing ? { currentChapter: n + 1, currentCard: 0 } : {}), updatedAt: Date.now() });
    // Write the next chapter now if it isn't there yet (a shared book may already have it).
    if (n < CHAPTERS) await ensureChapter(ctx, book, n + 1);
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

// After sign-in: the anonymous nights attach to the person. Nothing is re-asked.
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

// Rewrites one teaching card in plainer words, once per book: everyone reading it gets the rewrite.
export const requestSimpler = mutation({
  args: { handbookId: v.id("handbooks"), chapter: v.number(), cardIndex: v.number(), deviceToken: v.optional(v.string()) },
  handler: async (ctx, { handbookId, chapter, cardIndex, deviceToken }) => {
    const h = await ownedHandbook(ctx, handbookId, deviceToken);
    const ch = h.bookId ? await bookChapter(ctx, h.bookId, chapter) : null;
    const card = ch?.cards?.[cardIndex];
    if (!ch || !card || card.type === "exercise") throw new Error("Not a teaching card");
    if (card.simpler) return { ready: true as const };
    const mine = await limiter.limit(ctx, "simplerDevice", { key: deviceToken ?? String(h.userId) });
    if (!mine.ok) throw new Error("busy");
    await ctx.scheduler.runAfter(0, internal.handbooks.writeSimpler, { bookId: ch.bookId, chapter, cardIndex });
    return { ready: false as const };
  },
});

export const writeSimpler = internalAction({
  args: { bookId: v.id("books"), chapter: v.number(), cardIndex: v.number() },
  handler: async (ctx, { bookId, chapter, cardIndex }) => {
    const book = await ctx.runQuery(internal.handbooks.readBook, { bookId });
    const ch = await ctx.runQuery(internal.handbooks.readChapter, { bookId, n: chapter });
    const card = ch?.cards?.[cardIndex];
    if (!book || !ch || !card) return;
    const r = await ctx.runAction(internal.ai.generate, { kind: "simpler", system: SIMPLER_PROMPT, user: simplerUserMessage(book.plan?.topic ?? book.topic, ch.title ?? `Chapter ${chapter}`, card, book.language) });
    const text = r.ok && typeof r.json?.simpler === "string" ? r.json.simpler.trim() : null;
    await ctx.runMutation(internal.handbooks.setSimpler, { bookId, chapter, cardIndex, simpler: text ?? "", failed: !text });
  },
});

export const readChapter = internalQuery({
  args: { bookId: v.id("books"), n: v.number() },
  handler: async (ctx, { bookId, n }) => bookChapter(ctx, bookId, n),
});

export const setSimpler = internalMutation({
  args: { bookId: v.id("books"), chapter: v.number(), cardIndex: v.number(), simpler: v.string(), failed: v.boolean() },
  handler: async (ctx, { bookId, chapter, cardIndex, simpler, failed }) => {
    const ch = await bookChapter(ctx, bookId, chapter);
    if (!ch?.cards?.[cardIndex]) return;
    const cards = [...ch.cards];
    cards[cardIndex] = failed ? { ...cards[cardIndex], simplerFailedAt: Date.now() } : { ...cards[cardIndex], simpler };
    await ctx.db.patch(ch._id, { cards });
  },
});

// ---------- pre-written (seed) books ----------

export const seedCache = internalMutation({
  args: { topic: v.string(), aliases: v.optional(v.array(v.string())), level, plan: v.any(), chapters: v.array(v.any()) },
  handler: async (ctx, { topic, aliases, level: lvl, plan, chapters }) => {
    const keys = [topicKeyOf(topic), topicKeyOf(String(plan.topic ?? "")), ...(aliases ?? []).map(topicKeyOf)];
    // Pre-written books were read by a person: stable, and refreshed by re-running the seed, not automatically.
    const now = Date.now();
    const freshness: Freshness = "stable";
    const life = { freshness, expiresAt: now + TTL_MS[freshness] };
    let book = await findBook(ctx, keys[0], lvl, ENGLISH, DEFAULT_VOICE);
    if (book) await ctx.db.patch(book._id, { plan, topic, ...life });
    else {
      const bookId = await ctx.db.insert("books", { topic, level: lvl, language: ENGLISH, voice: DEFAULT_VOICE, plan, source: "seed", createdAt: now, ...life });
      book = (await ctx.db.get(bookId))!;
    }
    await addKeys(ctx, book, keys);
    for (const ch of chapters) {
      const doc = { status: "ready" as const, title: ch.title, cards: shuffleExercises(ch.cards ?? [], `${topic}:${ch.n}`), outcomeLine: ch.outcomeLine, error: undefined };
      const existing = await bookChapter(ctx, book._id, ch.n);
      if (existing) await ctx.db.patch(existing._id, doc);
      else await ctx.db.insert("chapters", { bookId: book._id, n: ch.n, createdAt: Date.now(), ...doc });
    }
    return [...new Set(keys.filter(Boolean))];
  },
});

// ---------- taking a bad book out of the cache ----------

// Books with "Report this question" flags, most reported first, so a bad one is easy to spot.
// Run: npx convex run handbooks:reportedBooks
export const reportedBooks = internalQuery({
  args: {},
  handler: async (ctx) => {
    const counts = new Map<Id<"books">, number>();
    for (const r of await ctx.db.query("reports").order("desc").take(500)) {
      const h = await ctx.db.get(r.handbookId);
      if (h?.bookId) counts.set(h.bookId, (counts.get(h.bookId) ?? 0) + 1);
    }
    const rows = await Promise.all([...counts].map(async ([bookId, reports]) => {
      const book = await ctx.db.get(bookId);
      return { bookId, topic: book?.topic, level: book?.level, voice: book?.voice, source: book?.source, reports };
    }));
    return rows.sort((a, b) => b.reports - a.reports);
  },
});

// New requests stop landing on this book (the next person gets a fresh write); people already
// reading it keep their handbook and progress. Run: npx convex run handbooks:retireBook '{"bookId":"..."}'
export const retireBook = internalMutation({
  args: { bookId: v.id("books") },
  handler: async (ctx, { bookId }) => {
    const book = await ctx.db.get(bookId);
    if (!book) throw new Error("No such book");
    let removed = 0;
    for (const k of await ctx.db.query("bookKeys").withIndex("by_book", (q) => q.eq("bookId", bookId)).collect()) {
      await ctx.db.delete(k._id);
      removed++;
    }
    return { topic: book.topic, keysRemoved: removed };
  },
});

// Tonight's ready handbooks, for the first screen's examples. Only the pre-written ones, a few.
export const cachedTopics = query({
  args: {},
  handler: async (ctx) => {
    const seeds = await ctx.db.query("books").withIndex("by_source", (q) => q.eq("source", "seed")).take(12);
    return seeds.map((b) => b.plan?.topic ?? b.topic);
  },
});
