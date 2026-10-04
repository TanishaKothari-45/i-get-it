import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export const level = v.union(v.literal("new"), v.literal("some"));
export const voice = v.union(v.literal("friend"), v.literal("straight"), v.literal("stories"));

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
  }).index("by_source", ["source"]),

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

  // "Go deeper": an optional bonus lesson on chapter n's idea, unlocked by getting every exercise
  // right first time. Written live the first time it's asked for, then shared like chapters.
  bonusChapters: defineTable({
    bookId: v.id("books"),
    n: v.number(),
    status: v.union(v.literal("writing"), v.literal("ready"), v.literal("failed")),
    title: v.optional(v.string()),
    cards: v.optional(v.any()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
  }).index("by_book_n", ["bookId", "n"]),

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
    bonus: v.optional(v.boolean()),         // an answer in a "go deeper" bonus lesson (never moves the rung)
    at: v.number(),
  }).index("by_handbook", ["handbookId"]),

  reports: defineTable({
    handbookId: v.id("handbooks"),
    chapter: v.number(),
    cardIndex: v.number(),
    optionId: v.optional(v.string()),
    at: v.number(),
  }),

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
