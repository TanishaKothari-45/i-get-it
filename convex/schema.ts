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
    hiddenAt: v.optional(v.number()),   // a duplicate topic found when two devices merged at sign-in; kept, not deleted
    continuesHandbookId: v.optional(v.id("handbooks")),   // "go further": the finished handbook this one is the next level of
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
    // Runway pictures, one per teaching card (design/style-anchor.md). Drawn after the chapter is ready.
    pictures: v.optional(v.array(v.object({ card: v.number(), scene: v.string(), storageId: v.optional(v.id("_storage")) }))),
    picturesStatus: v.optional(v.string()),   // "drawing" | "done" | "failed" | "skipped"
    factCheck: v.optional(v.object({ status: v.string(), fixes: v.number(), notes: v.array(v.string()), model: v.optional(v.string()), at: v.number() })),  // live chapters: "passed" | "fixed" | "unchecked"
    cacheVersion: v.optional(v.number()),
    title: v.optional(v.string()),
    cards: v.optional(v.any()),   // array of cards, exercises include answer/whyNot/reteach (never sent raw to the client)
    outcomeLine: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_handbook_n", ["handbookId", "n"]),

  // Optional bonus lessons on chapter n's idea, written for this handbook the first time the reader asks.
  // "deeper": unlocked by getting every exercise right first time. "another": unlocked by missing at least one.
  bonusChapters: defineTable({
    handbookId: v.id("handbooks"),
    kind: v.union(v.literal("deeper"), v.literal("another")),
    n: v.number(),
    status: v.union(v.literal("writing"), v.literal("ready"), v.literal("failed")),
    title: v.optional(v.string()),
    cards: v.optional(v.any()),
    factCheck: v.optional(v.object({ status: v.string(), fixes: v.number(), notes: v.array(v.string()), model: v.optional(v.string()), at: v.number() })),
    error: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),   // when the current write began, to spot a stuck one
  }).index("by_handbookId_and_kind_and_n", ["handbookId", "kind", "n"]),

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
    bonusKind: v.optional(v.union(v.literal("deeper"), v.literal("another"))),
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

  // The two-way street: one question about one card, answered from that card and the chapter title only.
  cardQuestions: defineTable({
    handbookId: v.id("handbooks"),
    chapter: v.number(),
    cardIndex: v.number(),
    question: v.string(),
    answer: v.optional(v.string()),
    sources: v.optional(v.array(v.object({ url: v.string(), title: v.string() }))),
    status: v.union(v.literal("thinking"), v.literal("ready"), v.literal("failed")),
    at: v.number(),
  }).index("by_card", ["handbookId", "chapter", "cardIndex"]),

  // Willingness to pay, week 1: no payment taken, just "keep me going at this price".
  // One row per phone per day it opened the app (India time), for the public /stats page.
  visits: defineTable({
    visitor: v.string(),           // the phone's device token
    day: v.string(),               // "2026-10-05", India time
    source: v.optional(v.string()), // utm_source, else the referring site's name
    at: v.number(),
  })
    .index("by_visitor_day", ["visitor", "day"])
    .index("by_day", ["day"]),

  // Phones and accounts their owner asked us not to count (Prateek's own). Anyone can only exclude themselves.
  statsExcluded: defineTable({
    deviceToken: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    at: v.number(),
  }),

  priceIntents: defineTable({
    userId: v.optional(v.id("users")),
    deviceToken: v.optional(v.string()),
    handbookId: v.optional(v.id("handbooks")),
    price: v.number(),
    at: v.number(),
    freeMonths: v.optional(v.number()),   // 3 for the first FREE_SPOTS people who tapped Pay and signed in
    claimedAt: v.optional(v.number()),
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
    .index("by_deviceToken", ["deviceToken"]),

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
    version: v.optional(v.number()),
  }).index("by_key", ["topicKey", "level"]),
});
