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
const CARD_TYPES = ["picture", "teach", "example", "exercise", "mistake", "try", "watch", "move", "doit"] as const;
const textCard = z.looseObject({ type: z.enum(["picture", "teach", "example", "mistake", "try"]), title: z.string().optional(), body: str });
const watchCard = z.looseObject({ type: z.literal("watch"), who: z.string().optional(), what: z.string().optional(), url: str, watchFor: z.string().optional() });
// Body skills (8 Oct): the move shown moving, with cues; and "do it", a counter, a timer or a checklist that logs a set.
const moveCard = z.looseObject({ type: z.literal("move"), title: z.string().optional(), body: z.string().optional(), cues: z.array(str).min(1).max(4), html: z.string().optional() });
const doitCard = z.looseObject({ type: z.literal("doit"), title: z.string().optional(), instruction: str, kind: z.enum(["reps", "timer", "checklist"]), target: z.number().optional(), items: z.array(str).optional() });
const card = z.union([exercise, textCard, watchCard, moveCard, doitCard]);

export const plan = z.looseObject({
  needsClarification: z.boolean().optional(),
  question: nullableStr,
  topic: str.optional(),
  mode: z.enum(["skill", "story", "subject", "decision"]).optional(),
  outcome7: nullableStr,
  format: z.enum(["course", "quick"]).optional(),
  framing: nullableStr,
  chapters: z.array(z.looseObject({ title: str, covers: str.optional(), outcome: str.optional(), hook: str.optional() })).max(7),
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

export const SCHEMAS: Record<string, z.ZodType> = { plan, chapter, check, versions, scenes, intent, match, teach, research, artifact, move };

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
