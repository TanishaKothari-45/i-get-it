import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export const level = v.union(v.literal("new"), v.literal("some"));

// One thing the learner saved: a YouTube or Instagram link, or a photo, and how far reading it has got.
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

// One picture on a chapter's teaching card: the scene asked for, and the drawing once it's stored.
export const pictureV = v.object({ card: v.number(), scene: v.string(), storageId: v.optional(v.id("_storage")), failed: v.optional(v.boolean()) });

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
      v.literal("declined"),      // we won't teach this (6 Oct, Prateek: be a good person, push back)
    ),
    question: v.optional(v.string()),
    pushback: v.optional(v.string()),          // one plain, kind sentence: what we won't teach, why, and what instead
    suggestions: v.optional(v.array(v.string())),
    plan: v.optional(v.any()),    // { topic, outcome7, horizon14, horizon28, picture, chapters[7] }, in the handbook's language
    sourcePlan: v.optional(v.any()),   // the English plan, when the handbook is in another language: chapters are written from it
    ownerToken: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    source: v.union(v.literal("live"), v.literal("cache")),
    error: v.optional(v.string()),
    hiddenAt: v.optional(v.number()),   // a duplicate topic found when two devices merged at sign-in; kept, not deleted
    continuesHandbookId: v.optional(v.id("handbooks")),   // "go further": the finished handbook this one is the next level of
    // Started from what the learner saved (links, photos) instead of, or as well as, a typed line. Such a handbook is the
    // learner's alone like any other, and never goes into the shared cache.
    sources: v.optional(v.array(sourceV)),
    // Started from a creator: their handle, and the themes their latest reels fall into (reel numbers per theme).
    creator: v.optional(v.object({ handle: v.string(), themes: v.optional(v.array(v.object({ name: v.string(), reels: v.array(v.number()) }))) })),
    sourcesKey: v.optional(v.string()),           // the links (or creator) it started from, so sharing the same ones again reopens it
    choices: v.optional(v.array(v.string())),     // the question's tap-to-answer options (a creator's themes)
    sourcesBrief: v.optional(briefV),             // from the sources: what the learner is after, and what to build it from
    research: v.optional(v.string()),             // a web search's findings ("" when searched and nothing found)
    startedAt: v.optional(v.number()),            // when the current plan write began, to spot one that died
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
    pictures: v.optional(v.array(pictureV)),
    picturesStatus: v.optional(v.string()),   // "drawing" | "done" | "failed" | "skipped"
    factCheck: v.optional(v.object({ status: v.string(), fixes: v.number(), notes: v.array(v.string()), model: v.optional(v.string()), at: v.number() })),  // live chapters: "passed" | "fixed" | "unchecked"
    cacheVersion: v.optional(v.number()),
    title: v.optional(v.string()),
    recallCards: v.optional(v.any()),   // 2 fresh quizzes on this chapter's idea, new examples; shown at the start of a later chapter
    cards: v.optional(v.any()),   // array of cards, exercises include answer/whyNot/reteach (never sent raw to the client)
    outcomeLine: v.optional(v.string()),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),   // when the current write began, to spot one that died
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
    currentPart: v.optional(v.number()),   // which frame of that card (a long card is 2 or 3 frames), so a reload lands on the same frame
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
  // Teach it back (optional, 6 Oct): the reader explains the chapter's idea in their own words; a short reply.
  teachBacks: defineTable({
    handbookId: v.id("handbooks"),
    chapter: v.number(),
    text: v.string(),
    status: v.union(v.literal("thinking"), v.literal("ready"), v.literal("failed")),
    verdict: v.optional(v.string()),   // "nailed" | "close" | "not yet"
    got: v.optional(v.string()),
    missed: v.optional(v.string()),
    tip: v.optional(v.string()),
    at: v.number(),
  }).index("by_chapter", ["handbookId", "chapter"]),

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

  // What people do on the page, for the owner-only /admin funnel (6 Oct): landing seen, sections scrolled into view,
  // box tapped and typed in, how a handbook was started, plan seen, chapter opened. A device token, never a name;
  // typed topics stay in handbooks, never copied here.
  events: defineTable({
    visitor: v.string(),
    name: v.string(),
    props: v.optional(v.record(v.string(), v.union(v.string(), v.number()))),
    day: v.string(),
    at: v.number(),
  })
    .index("by_day", ["day"])
    .index("by_visitor", ["visitor"]),

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

  // Small documents built from bigger tables, so a page everyone opens reads one row instead of a whole table.
  // "landing": the ready topics for the first screen (rebuilt when the cache changes, and every 15 minutes);
  // "stats": the /stats numbers (rebuilt every 15 minutes). Never the source of truth: rebuilt from it.
  summaries: defineTable({
    name: v.string(),
    data: v.any(),
    at: v.number(),
  }).index("by_name", ["name"]),
});
