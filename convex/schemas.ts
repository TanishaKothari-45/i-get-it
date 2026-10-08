import { z } from "zod";

// One schema per model job (8 Oct, Prateek: "each output should have a structured output schema so JSON doesn't
// break"). They mirror the shapes the prompts in prompts.ts ask for. ai.generate checks every reply against its job's
// schema and, on a mismatch, gives the model the exact problems and one more try. Where a provider supports it
// (Cheaper Inference, Gemini), the JSON schema also goes with the request, so the reply is held to it at the source.
// Extra fields are allowed: a schema rejects only what the app cannot use.

const str = z.string();
const nullableStr = z.string().nullable().optional();
const option = z.looseObject({ id: z.enum(["a", "b", "c"]), text: str });

export const exercise = z.looseObject({
  type: z.literal("exercise"),
  kind: str.optional(),
  prompt: str,
  options: z.array(option).length(3),
  answer: z.enum(["a", "b", "c"]),
  whyNot: z.record(str, str).optional(),
  reteach: str.optional(),
}).refine((e) => e.options.some((o) => o.id === e.answer), { message: "answer must be the id of one of the 3 options" });

// The card types the app renders (prompts.ts CHAPTER_PROMPT). Two shapes: a quiz card with all its fields, and a text
// card with a body. As a union, the JSON schema sent to a provider carries the quiz fields too (8 Oct: with only
// type/title/body in the schema, Gemini wrote quiz cards with no question and no options).
const CARD_TYPES = ["picture", "teach", "example", "exercise", "mistake", "try", "watch"] as const;
const textCard = z.looseObject({ type: z.enum(["picture", "teach", "example", "mistake", "try"]), title: z.string().optional(), body: str });
const watchCard = z.looseObject({ type: z.literal("watch"), who: z.string().optional(), what: z.string().optional(), url: str, watchFor: z.string().optional() });
const card = z.union([exercise, textCard, watchCard]);

// 8 Oct: held to what the plan prompt promises. A written plan (not declined, no question) has an outcome and a chapter
// count that matches its format, and every chapter has its covers, outcome and hook; the picture is a name and a line.
// A reply that breaks this gets one corrective retry (ai.generate) instead of being saved.
export const plan = z.looseObject({
  needsClarification: z.boolean().optional(),
  question: nullableStr,
  topic: str.optional(),
  mode: z.enum(["skill", "story", "subject", "decision"]).optional(),
  outcome7: nullableStr,
  horizon14: nullableStr,
  horizon28: nullableStr,
  picture: z.looseObject({ name: str, line: str, maps: z.array(z.looseObject({ part: str, is: str })).optional() }).nullable().optional(),   // maps: v6 (8 Oct)
  format: z.enum(["course", "quick"]).optional(),
  framing: nullableStr,
  chapters: z.array(z.looseObject({ title: str, covers: str, outcome: str, hook: str })).max(7),
  sources: z.array(z.looseObject({ who: str.optional(), what: str.optional(), why: str.optional() })).max(3).optional(),
  next: z.array(str).optional(),
  caution: z.enum(["money", "health", "legal", "none"]).optional(),
  pushback: nullableStr,
  declined: z.boolean().optional(),
  suggestions: z.array(str).optional(),
}).superRefine((p, ctx) => {
  if (p.declined || p.needsClarification) return;
  const n = p.chapters.length;
  if (!p.outcome7) ctx.addIssue({ code: "custom", path: ["outcome7"], message: "a written plan needs its outcome" });
  if (p.format === "course" && n !== 7) ctx.addIssue({ code: "custom", path: ["chapters"], message: `a course has exactly 7 chapters, not ${n}` });
  if (p.format === "quick" && (n < 1 || n > 3)) ctx.addIssue({ code: "custom", path: ["chapters"], message: `a quick handbook has 1 to 3 chapters, not ${n}` });
  if (!p.format && n < 1) ctx.addIssue({ code: "custom", path: ["chapters"], message: "a written plan needs its chapters" });
});

// The chapter comes first (8 Oct, Tanisha: "the quiz is an addition, it cannot be a holdup"). The chapter schema only
// guards the text cards and the JSON shape; quizzes stay loose here so one malformed quiz never sends the whole chapter
// back for a retry. generateChapter then keeps only the quizzes that pass goodQuiz and drops the rest.
export const chapter = z.looseObject({
  n: z.number().optional(),
  title: str,
  cards: z.array(card).min(5),
  outcomeLine: str.optional(),
  recallQuizzes: z.array(exercise).max(2).optional(),
  svg: str.optional(),   // the writer no longer draws it from writer v3 (8 Oct); older chapters may still have one
});

// A quiz worth showing: 3 options with the answer among them, a known kind, a "whyNot" for exactly the two wrong
// options, and a "reteach". Used as a filter, not a schema, so a bad quiz is dropped instead of failing the chapter.
const goodQuizShape = z.looseObject({
  type: z.literal("exercise"),
  kind: z.enum(["guess", "apply", "recall"]).optional(),
  prompt: str,
  options: z.array(option).length(3),
  answer: z.enum(["a", "b", "c"]),
  whyNot: z.record(str, str),
  reteach: str,
});
export function goodQuiz(e: unknown): boolean {
  const r = goodQuizShape.safeParse(e);
  if (!r.success) return false;
  const q = r.data;
  if (!q.options.some((o) => o.id === q.answer)) return false;
  const wrong = q.options.map((o) => o.id).filter((id) => id !== q.answer).sort().join(",");
  return Object.keys(q.whyNot).sort().join(",") === wrong;
}

export const check = z.looseObject({
  ok: z.boolean().optional(),
  fixes: z.array(z.looseObject({ card: z.number().int().min(0), problem: str.optional(), fixed: z.looseObject({ type: z.enum(CARD_TYPES) }) })),
  // 8 Oct: the picture scenes come back in the same call when the request asks for them (CHECK_SCENES_PROMPT).
  scenes: z.array(z.looseObject({ card: z.union([z.number(), str]), scene: str, real: z.string().optional() })).optional(),
});

// The shared-library privacy check (library.ts). 8 Oct: it ran under the "intent" schema, which wants goals, so every
// reply failed and nothing typed was ever published. Its own shape now.
export const library = z.looseObject({ share: z.boolean(), why: z.string().optional() });

const versionList = z.array(exercise.and(z.looseObject({ n: z.number().int().min(1) })));
export const versions = z.looseObject({
  quiz: z.looseObject({ easier: versionList, harder: versionList }).optional(),
  recall: z.looseObject({ easier: versionList, harder: versionList }).optional(),
});

export const scenes = z.looseObject({
  scenes: z.array(z.looseObject({ card: z.union([z.number(), str]), scene: str, real: z.string().optional() })),
});

export const intent = z.looseObject({
  question: str.optional(),
  goals: z.array(z.looseObject({ label: str, mode: str.optional() })),
});

export const match = z.looseObject({ match: z.union([z.number(), z.null()]) });

export const teach = z.looseObject({ verdict: str, got: str, missed: z.string().optional(), tip: str });

export const research = z.looseObject({
  kind: z.enum(["film", "series", "book", "game", "franchise", "event", "person", "recipe", "howto", "skill", "subject", "money", "health", "legal", "other"]),
  format: z.enum(["quick", "course"]),
  chapters: z.number().int().min(1).max(7),
  framing: nullableStr,
  wikipediaTitle: nullableStr,
  recapVideo: nullableStr,
  facts: z.array(str).min(3).max(25),
  sources: z.array(z.looseObject({ title: str.optional(), url: str })).max(10),
});

// Research prompt v4 (live from 8 Oct): ten non-overlapping kinds, an outline of the topic's parts, and fewer facts
// allowed rather than invented ones. Framing is left to the planner. ("research" above is v1's.)
export const researchV4 = z.looseObject({
  kind: z.enum(["story", "event", "person", "howto", "skill", "subject", "money", "health", "legal", "other"]),
  format: z.enum(["quick", "course"]),
  chapters: z.number().int().min(1).max(7),
  outline: z.array(str).min(1).max(8),
  framing: nullableStr,
  wikipediaTitle: nullableStr,
  recapVideo: nullableStr,
  facts: z.array(str).min(1).max(25),
  sources: z.array(z.looseObject({ title: str.optional(), url: str })).max(10),
});

export const SCHEMAS: Record<string, z.ZodType> = { plan, chapter, check, versions, scenes, intent, match, teach, research, researchV4, library };

// The problems with a reply, in a few short lines the model can act on; null when it fits.
export function problems(kind: string, json: unknown): string | null {
  const s = SCHEMAS[kind];
  if (!s) return null;
  const r = s.safeParse(json);
  if (r.success) return null;
  return r.error.issues.slice(0, 8).map((i) => `- ${i.path.join(".") || "(top level)"}: ${i.message}`).join("\n");
}

// The JSON Schema form, sent with the request where the provider accepts one. Refinements don't travel; the check above
// still runs on every reply.
export function jsonSchema(kind: string): Record<string, unknown> | null {
  const s = SCHEMAS[kind];
  if (!s) return null;
  try { return z.toJSONSchema(s, { unrepresentable: "any" }) as Record<string, unknown>; } catch { return null; }
}
