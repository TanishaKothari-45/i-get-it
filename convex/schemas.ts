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
const CARD_TYPES = ["picture", "teach", "example", "exercise", "mistake", "try", "watch", "move", "doit", "steps", "tryit"] as const;
const textCard = z.looseObject({ type: z.enum(["picture", "teach", "example", "mistake", "try"]), title: z.string().optional(), body: str });
const watchCard = z.looseObject({ type: z.literal("watch"), who: z.string().optional(), what: z.string().optional(), url: str, watchFor: z.string().optional() });
// Body skills (8 Oct): the move shown moving, with cues; and "do it", a counter, a timer or a checklist that logs a set.
const moveCard = z.looseObject({ type: z.literal("move"), title: z.string().optional(), body: z.string().optional(), cues: z.array(str).min(1).max(4), html: z.string().optional() });
const doitCard = z.looseObject({ type: z.literal("doit"), title: z.string().optional(), instruction: str, kind: z.enum(["reps", "timer", "checklist"]), target: z.number().optional(), items: z.array(str).optional() });
// Tool skills and ideas (8 Oct, block 2): numbered steps in a real tool; a small interactive page for the chapter's idea.
const stepsCard = z.looseObject({ type: z.literal("steps"), title: z.string().optional(), steps: z.array(z.looseObject({ do: str, see: z.string().optional() })).min(2).max(8) });
const tryitCard = z.looseObject({ type: z.literal("tryit"), title: z.string().optional(), idea: str, html: z.string().optional() });
const card = z.union([exercise, textCard, watchCard, moveCard, doitCard, stepsCard, tryitCard]);

export const plan = z.looseObject({
  needsClarification: z.boolean().optional(),
  question: nullableStr,
  topic: str.optional(),
  mode: z.enum(["skill", "story", "subject", "decision"]).optional(),
  body: z.boolean().optional(),
  pictureWhyNot: nullableStr.optional(),   // plan v8 (9 Oct): why there is no analogy, when there is none   // plan v8 (9 Oct): learned by moving one's own body; the code reads it for move and doit cards
  outcome7: nullableStr,
  format: z.enum(["course", "quick"]).optional(),
  framing: nullableStr,
  // minutes (plan v8, 9 Oct): the reading and doing time this chapter needs, from the weight of what it covers.
  chapters: z.array(z.looseObject({ title: str, covers: str.optional(), outcome: str.optional(), hook: str.optional(), minutes: z.number().optional(), readMinutes: z.number().optional(), pieces: z.array(z.string()).optional(), needs: z.array(z.string()).optional(), assumes: z.array(z.string()).optional(), blocks: z.array(str).max(12).optional(), proof: z.string().optional() })).max(7),
  sources: z.array(z.looseObject({ who: str.optional(), what: str.optional(), why: str.optional() })).optional(),
  next: z.array(str).optional(),
  caution: z.enum(["money", "health", "legal", "none"]).optional(),
  pushback: nullableStr,
  declined: z.boolean().optional(),
  suggestions: z.array(str).optional(),
});

export const chapter = z.looseObject({
  n: z.number().optional(),
  title: str,
  cards: z.array(card).min(5),
  outcomeLine: str.optional(),
  recallQuizzes: z.array(exercise).max(2).optional(),
  svg: str.optional(),
});

export const check = z.looseObject({
  ok: z.boolean().optional(),
  fixes: z.array(z.looseObject({ card: z.number().int().min(0), problem: str.optional(), fixed: z.looseObject({ type: z.enum(CARD_TYPES) }) })),
});

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

// One interactive explainer per chapter (8 Oct test, evalArtifact.ts): a self-contained HTML page.
export const artifact = z.looseObject({ idea: str, html: str.min(300) });
export const move = z.looseObject({ html: str.min(300) });

// Research prompt v4/v5 (8 Oct, Tanisha; live from 8 Oct night): ten non-overlapping kinds, an outline of the topic's parts,
// and fewer facts allowed rather than invented ones. Framing is left to the planner. ("research" above is v1's.)
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

// Research v6 (9 Oct): v4's keys plus the handbook's shape for this reader: where they start, and each outline part
// weighed for this reader and goal. The chapter count is worked out from those weights (1 to 7, either format).
export const researchV6 = researchV4.extend({
  start: str,
  parts: z.array(z.looseObject({ part: str, weight: z.enum(["light", "normal", "heavy"]), why: z.string().optional() })).min(1).max(8),
});

// The shared-library privacy check (8 Oct): its own schema, so a reply is judged on its own keys.
export const library = z.looseObject({ share: z.boolean(), why: z.string().optional() });

// D29 (9 Oct): three true, little-known stories for the writing-wait screen, 4 to 6 frames each.
export const stories = z.looseObject({ stories: z.array(z.looseObject({ title: str, chapter: z.string().optional(), frames: z.array(str).min(4).max(10), source: str })).min(1).max(5) });

// Research v7 (9 Oct): the neutral shape spec. What the reader walks away with, the pieces with their depth, 3 to 7 chapters.
export const researchV7 = researchV4.extend({
  deliverable: str,
  start: str,
  parts: z.array(z.looseObject({ part: str, depth: z.enum(["light", "medium", "deep"]), why: z.string().optional() })).min(1).max(8),
  chapters: z.number().int().min(3).max(7),
});

// Research v8 (9 Oct, the 26 changes): each piece lists its must-haves ("needs"), and each fact names the piece it
// belongs to, so a chapter gets its own facts. Up to 40 facts, by depth.
export const researchV8 = researchV7.extend({
  parts: z.array(z.looseObject({ part: str, depth: z.enum(["light", "medium", "deep"]), why: z.string().optional(), needs: z.array(str).max(10).optional() })).min(1).max(8),
  facts: z.array(z.looseObject({ part: str, fact: str })).min(1).max(40),
});

export const SCHEMAS: Record<string, z.ZodType> = { plan, chapter, check, versions, scenes, intent, match, teach, research, artifact, move, researchV4, researchV6, researchV7, researchV8, library, stories };

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
