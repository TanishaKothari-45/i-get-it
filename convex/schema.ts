import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export const level = v.union(v.literal("new"), v.literal("some"));

export default defineSchema({
  ...authTables,

  // One generated handbook per topic per person (or per device before sign-in).
  handbooks: defineTable({
    topic: v.string(),            // the line they typed (plus the clarification answer, if any)
    topicKey: v.string(),         // normalised, for the cache lookup
    level,
    language: v.string(),
    voice: v.optional(v.union(v.literal("friend"), v.literal("straight"), v.literal("stories"))),
    status: v.union(
      v.literal("planning"),
      v.literal("question"),      // the model asked one clarifying question
      v.literal("ready"),
      v.literal("failed"),
    ),
    question: v.optional(v.string()),
    plan: v.optional(v.any()),    // { topic, outcome7, horizon14, horizon28, picture, chapters[7] }
    ownerToken: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    source: v.union(v.literal("live"), v.literal("cache")),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_token", ["ownerToken"])
    .index("by_user", ["userId"]),

  chapters: defineTable({
    handbookId: v.id("handbooks"),
    n: v.number(),
    status: v.union(v.literal("writing"), v.literal("ready"), v.literal("failed")),
    stale: v.optional(v.boolean()),          // preferences changed after this was written and before it was read
    model: v.optional(v.string()),
    variants: v.optional(v.any()),            // masked model comparison: [{ key: "A", model, title, cards, outcomeLine }]
    vote: v.optional(v.string()),             // "A" | "B" | "C" once the person has chosen
    svg: v.optional(v.string()),
    title: v.optional(v.string()),
    cards: v.optional(v.any()),   // array of cards, exercises include answer/whyNot/reteach (never sent raw to the client)
    outcomeLine: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_handbook_n", ["handbookId", "n"]),

  progress: defineTable({
    handbookId: v.id("handbooks"),
    currentChapter: v.number(),
    currentCard: v.number(),
    chaptersPassed: v.array(v.number()),
    passedExercises: v.array(v.string()),   // "chapter:cardIndex"
    missedExercises: v.array(v.string()),   // "chapter:cardIndex" that needed a second go or were shown the answer
    tomorrowAt: v.optional(v.string()),     // "21:00"
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
    at: v.number(),
  }).index("by_handbook", ["handbookId"]),

  reports: defineTable({
    handbookId: v.id("handbooks"),
    chapter: v.number(),
    cardIndex: v.number(),
    optionId: v.optional(v.string()),
    at: v.number(),
  }),

  // How this person wants to be taught. One per signed-in user, or per device before sign-in.
  profiles: defineTable({
    userId: v.optional(v.id("users")),
    deviceToken: v.optional(v.string()),
    persona: v.optional(v.string()),          // "a sharp friend", "a patient teacher", "a dry scientist" ...
    tone: v.optional(v.string()),             // free text, their words: "no fluff", "make me laugh once"
    likes: v.optional(v.array(v.string())),   // chips: stories, metaphors, humour, numbers, straight, examples-from-my-work
    examplesFrom: v.optional(v.string()),     // "my job as a PM", "cricket", "cooking"
    avoid: v.optional(v.string()),            // "no sports examples", "don't quiz me on dates"
    preferredModel: v.optional(v.string()),   // set by the masked comparison
    line: v.string(),                          // the compact rendering sent with every call (about 100 tokens)
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_device", ["deviceToken"]),

  modelVotes: defineTable({
    handbookId: v.id("handbooks"),
    chapter: v.number(),
    userId: v.optional(v.id("users")),
    deviceToken: v.optional(v.string()),
    picked: v.string(),                        // model id behind the letter they tapped
    options: v.array(v.string()),              // the three model ids, in A/B/C order
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

  // Pre-generated handbooks (same prompts, run offline) so the link works
  // for these topics even when the live provider is unavailable.
  cache: defineTable({
    topicKey: v.string(),
    level,
    topic: v.string(),
    plan: v.any(),
    chapters: v.array(v.any()),   // chapter objects for n = 1..k
  }).index("by_key", ["topicKey", "level"]),
});
