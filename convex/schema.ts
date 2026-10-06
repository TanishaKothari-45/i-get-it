import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export const level = v.union(v.literal("new"), v.literal("some"));
export const voice = v.union(v.literal("friend"), v.literal("straight"), v.literal("stories"));

// Something the learner shared to learn from: a YouTube or Instagram link, or a photo. Read once by Gemini;
// only the notes are kept (a photo is deleted after reading, a video is never stored).
export const sourceV = v.object({
  kind: v.union(v.literal("youtube"), v.literal("instagram"), v.literal("image")),
  url: v.optional(v.string()),
  storageId: v.optional(v.id("_storage")),   // a photo, until it has been read
  status: v.union(v.literal("waiting"), v.literal("reading"), v.literal("read"), v.literal("failed")),
  via: v.optional(v.string()),     // how it was read: "video", "transcript", "caption", "photo"
  title: v.optional(v.string()),   // what it teaches, in a few words
  notes: v.optional(v.string()),   // what it teaches, in detail (server only)
  hook: v.optional(v.string()),    // the payoff it opens with or its caption sells, one sentence (server only)
  error: v.optional(v.string()),
  // Gathered from a creator's profile in one go (server only): read later without fetching the reel again.
  caption: v.optional(v.string()),
  transcript: v.optional(v.string()),
  videoUrl: v.optional(v.string()),
});

// What the learner is after, judged from everything they saved: the brief the plan and chapters are built from.
export const briefV = v.object({
  kind: v.string(),                 // picks | howto | explainer | story | mixed: what they saved
  want: v.optional(v.string()),     // what someone who saves this kind wants next
  intent: v.optional(v.string()),   // that want made specific to these sources, then the hook
  core: v.optional(v.string()),     // the simple idea tying the sources together, at their own level
  examples: v.optional(v.array(v.object({ what: v.string(), from: v.array(v.number()) }))),
  beyond: v.optional(v.array(v.string())),    // more of the same payoff than the sources gave
  assumes: v.optional(v.array(v.string())),   // what the learner clearly already has or does: never taught
  claims: v.optional(v.array(v.string())),    // numbers and promises to treat as the creator's until checked
  fresh: v.optional(v.string()),    // fast | medium | stable: how fast this goes out of date
});

export default defineSchema({
  ...authTables,

  // The shared library: one book per topic, level, language and voice, written once
  // (live by the first person to ask, or pre-written as a seed) and read by everyone after.
  books: defineTable({
    topic: v.string(),            // the plan's own topic line
    level,
    language: v.string(),
    voice,
    plan: v.any(),                // { topic, outcome7, horizon14, horizon28, picture, chapters[7], freshness }
    source: v.union(v.literal("live"), v.literal("seed")),
    createdAt: v.number(),
    // How fast the topic goes stale (the plan says), and when new learners stop being given this book.
    freshness: v.optional(v.union(v.literal("fast"), v.literal("medium"), v.literal("stable"))),
    expiresAt: v.optional(v.number()),
    // A translated book: the English book it was translated from. Its chapters are translated one at
    // a time, as readers reach them, from that book's chapters. Missing on English books.
    sourceBookId: v.optional(v.id("books")),
    // Written from one person's own links or photos: never given to anyone else (no topic keys point to it).
    private: v.optional(v.boolean()),
    sourceNotes: v.optional(v.string()),   // what those sources teach; chapters are written from it
    research: v.optional(v.string()),      // what a web search found (current items and facts, with links); chapters are written from it
  })
    .index("by_source", ["source"])
    .index("by_translation", ["sourceBookId", "language"]),

  // Every normalised line that leads to a book: the typed line, the plan's topic, seed aliases.
  bookKeys: defineTable({
    topicKey: v.string(),
    level,
    language: v.string(),
    voice,
    bookId: v.id("books"),
  })
    .index("by_key", ["topicKey", "level", "language", "voice"])
    .index("by_book", ["bookId"]),

  // A book's chapters, written once and shared. Exercises include answer/whyNot/reteach (never sent raw to the client).
  chapters: defineTable({
    bookId: v.id("books"),
    n: v.number(),
    status: v.union(v.literal("writing"), v.literal("ready"), v.literal("failed")),
    title: v.optional(v.string()),
    cards: v.optional(v.any()),
    outcomeLine: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),   // when the current write began, to spot a stuck one
  }).index("by_book_n", ["bookId", "n"]),

  // Optional bonus lessons on chapter n's idea, written live the first time anyone asks, then shared
  // like chapters. "deeper": unlocked by getting every exercise right first time (one layer deeper).
  // "another": unlocked by missing at least one (the same idea explained another way).
  bonusChapters: defineTable({
    bookId: v.id("books"),
    kind: v.union(v.literal("deeper"), v.literal("another")),
    n: v.number(),
    status: v.union(v.literal("writing"), v.literal("ready"), v.literal("failed")),
    title: v.optional(v.string()),
    cards: v.optional(v.any()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
  }).index("by_book_kind_n", ["bookId", "kind", "n"]),

  // One person's copy: what they typed, which book it points to, and who owns it.
  handbooks: defineTable({
    topic: v.string(),            // the line they typed (plus the clarification answer, if any)
    topicKey: v.string(),
    level,
    language: v.string(),
    voice,
    status: v.union(
      v.literal("planning"),
      v.literal("question"),      // the model asked one clarifying question
      v.literal("ready"),
      v.literal("failed"),
    ),
    question: v.optional(v.string()),
    error: v.optional(v.string()),
    bookId: v.optional(v.id("books")),   // set once the plan exists
    continuesBookId: v.optional(v.id("books")),   // "go further": the book this one is the next level of
    sources: v.optional(v.array(sourceV)),        // started from links or photos instead of (or as well as) a typed line
    // Started from a creator: their handle, and the themes their latest reels fall into (reel numbers per theme).
    creator: v.optional(v.object({ handle: v.string(), themes: v.optional(v.array(v.object({ name: v.string(), reels: v.array(v.number()) }))) })),
    choices: v.optional(v.array(v.string())),     // the question's tap-to-answer options (a creator's themes)
    sourcesIntent: v.optional(v.string()),        // older handbooks: what the learner is after (now in sourcesBrief)
    sourcesBrief: v.optional(briefV),             // from the sources: what the learner is after, and what to build it from
    research: v.optional(v.string()),             // a web search's findings, done before the plan (then kept on the book)
    ownerToken: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_token", ["ownerToken"])
    .index("by_user", ["userId"]),

  progress: defineTable({
    handbookId: v.id("handbooks"),
    currentChapter: v.number(),
    currentCard: v.number(),
    chaptersPassed: v.array(v.number()),
    passedExercises: v.array(v.string()),   // "chapter:cardIndex"
    missedExercises: v.array(v.string()),   // "chapter:cardIndex" that needed a second go or were shown the answer
    tomorrowAt: v.optional(v.string()),     // "21:00"
    deeperUnlocked: v.optional(v.array(v.number())),  // chapters passed with every exercise right first time
    bonusPassed: v.optional(v.array(v.number())),     // chapters whose "go deeper" bonus they finished
    anotherUnlocked: v.optional(v.array(v.number())), // chapters passed with at least one exercise missed
    anotherPassed: v.optional(v.array(v.number())),   // chapters whose "another way" lesson they finished
    lastOpenedAt: v.number(),
    updatedAt: v.number(),
  }).index("by_handbook", ["handbookId"]),

  answers: defineTable({
    handbookId: v.id("handbooks"),
    chapter: v.number(),
    cardIndex: v.number(),
    optionId: v.string(),
    correct: v.boolean(),
    attempt: v.number(),
    recall: v.boolean(),
    bonus: v.optional(v.boolean()),         // an answer in a bonus lesson (never moves the rung)
    bonusKind: v.optional(v.union(v.literal("deeper"), v.literal("another"))),   // which bonus; missing means "deeper"
    at: v.number(),
  }).index("by_handbook", ["handbookId"]),

  reports: defineTable({
    handbookId: v.id("handbooks"),
    chapter: v.number(),
    cardIndex: v.number(),
    optionId: v.optional(v.string()),
    at: v.number(),
  }),

  // A device that said yes to nudges: where to send them (the browser's push address and keys),
  // whose they are, and the device's timezone so "9pm" means their 9pm.
  pushSubscriptions: defineTable({
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    deviceToken: v.string(),
    userId: v.optional(v.id("users")),
    timezone: v.string(),              // e.g. "Asia/Kolkata"
    createdAt: v.number(),
    lastSentDay: v.optional(v.string()),   // the device's local date of the last nudge, "2026-10-05"
    // Kept (not deleted) when nudges stop, so we can see who turned them off and when.
    stoppedAt: v.optional(v.number()),
    stoppedReason: v.optional(v.string()), // "gone (410)": the browser dropped it; "turned off": they did
  })
    .index("by_endpoint", ["endpoint"])
    .index("by_device", ["deviceToken"]),

  // Every model call, so the last 100 can be read.
  aiCalls: defineTable({
    kind: v.string(),
    model: v.string(),
    input: v.string(),
    output: v.string(),
    tokensIn: v.optional(v.number()),
    tokensOut: v.optional(v.number()),
    ms: v.number(),
    ok: v.boolean(),
    error: v.optional(v.string()),
    at: v.number(),
  }),
});
