"use node";
import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Trace } from "./trace";
import { nismBrief } from "./nism";
import { jsonSchema, problems } from "./schemas";
import { edited } from "./prompts";

// Research before writing (Prateek, 7 Oct: "be more agentic"; a film recap needs no quizzes and no weeks; stock topics
// should draw on the NISM syllabus). For a typed topic, before the plan:
//   1. The researcher (Gemini, Claude as backup; prompt v4 from 8 Oct) runs up to 3 web searches, maps the parts of the
//      topic the reader's goal needs, and decides what the handbook should be: a 7-chapter course, or a quick 1 to 3
//      chapter one, with the outline, the facts it must get right and the sources it read.
//   2. For films, series, books and games: the plot from Wikipedia, and the transcript of one YouTube recap the search
//      found (Supadata, key SUPADATA in Convex env). Only the topic's own words go to either; nothing about the reader.
//   3. For Indian money topics: the matching NISM certification syllabus (nism.ts, chapter titles only).
// The brief is stored on the handbook; the plan and every chapter are written from it. A failed step is skipped,
// never fatal: the plan is written without it.
export const PROMPT = `You are the researcher for I Get It, which writes a short handbook for one person who typed what they want to learn. Before anything is written, decide what kind of handbook this request needs and gather the facts it must rest on.

Run 1 to 4 web searches. Choose sources on their merits for this topic and this reader: whatever is most accurate, clear and current. No kind of source is preferred or required. Use only what the searches show plus facts you are certain of.

Decide:
- "kind": film | series | book | game | franchise | event | person | recipe | howto | skill | subject | money | health | legal | other.
- "format": "quick" when this doesn't need days of practice: a recap of a film, series, book, game or franchise, catching up before a release, one recipe, a single how-to, one event or person. "course" when it is a skill or subject worth practising over days (a language, coding, trading, public speaking).
- "chapters": quick = 1 to 3 (one film is usually 1 or 2; a whole franchise or a long series 3); course = 7.
- "framing": for quick, one friendly line in your own words telling them this doesn't need weeks, e.g. "This doesn't need weeks of study. Let's run through it quickly and get you going." For course, null.
- "wikipediaTitle": the exact English Wikipedia article title of the main work or subject, if one clearly exists, else null.
- "recapVideo": null, unless a YouTube video in your results is genuinely the best account of a story's events (then its https://www.youtube.com/watch?v=... URL). Don't search for one specially. Only a URL you actually saw.
- "facts": 8 to 20 one-line facts the handbook must get right: names and who they are, the order of events, numbers, dates, rules. Specific, checkable, from the searches.
- "sources": up to 6 {"title","url"} you actually saw in the results. Never invent a URL.

Writing (facts and framing): write about 80% of the way to ASD-STE100 Simplified Technical English. One statement per sentence, at most 20 words. Active voice. Present tense where it fits. Common words, each with one meaning. Keep "a" and "the". No idioms, no slang, no filler. Keep names, numbers, dates and terms of art exactly as the sources give them. Stop short of stiff or awkward wording: the text must still read naturally.

Return JSON only: {"kind":"...","format":"quick|course","chapters":1,"framing":null,"wikipediaTitle":null,"recapVideo":null,"facts":[],"sources":[]}`;

// Research prompt v4, live from 8 Oct. Tested against v1 (above, kept for comparison) on 6 topics with Claude Sonnet as
// a blind judge (evals/research-v1-v2/, evals/research-v1-v2-v3/). What it keeps and why:
// - It reads the goal, mode, level and date (v1 got them but had no rule for them).
// - No examples to copy (v1's framing example came back nearly word for word); the planner writes the framing line.
// - It first maps the parts of the topic the goal needs (v3 beat v1 on breadth and goal fit), with at least 3 facts a
//   part, each carrying a detail a reader could look up (v1's strength: specific names, numbers, dates).
// - Up to 3 searches: the first maps the topic, the others go to its thinnest part.
// - Sources by authority, each one used (v1's sources scored better than the overview pages v3 drew on).
// - Never bends a fact to fit the goal (a goal rule alone did, in v2).
export const PROMPT_V4 = `You are the researcher for I Get It. I Get It writes a short handbook for one reader. Your job: map what the handbook must cover, and collect the facts it must rest on. A planner uses your work to plan the chapters. A writer uses it to write them. You do not write the handbook.

INPUT (in the user message)
- Typed: the words the reader typed.
- Goal: why the reader wants this. It can be absent.
- Mode: what the reader wants to do: skill (do it), story (follow a story), subject (understand it), decision (a money, health or legal choice). It can be absent.
- Level: what the reader knows now.
- Today: the current date.
The goal decides which parts of the topic matter and how deep to go. If the goal and the typed words do not agree, follow the goal.

MAP THE TOPIC
List the main parts of the topic that the reader needs to reach the goal. A part is an area that one section of the handbook could teach. Cover the whole path from what the reader knows now (Level) to the goal. Do not leave out a part that the goal needs. Do not add a part that the goal does not need.

SEARCH (at most 3 searches)
1. Search the topic as the reader means it. Find sources that explain it with authority.
2. Then find the most important gap: the part with the fewest specific facts, a fact that sources disagree on, or a fact that can change with time (compare with Today). Search for that gap. Get the exact names, numbers and dates from an authoritative source.
3. If an important gap remains, do one more search for it. If there is no gap, do not search again.
For each part, use the most authoritative source you find: the original body, official documents, standard references, recognised experts or established publishers. Use a general overview only if nothing better covers the part. No single type of source is required.
If sources disagree, use the newer or more authoritative one. If you cannot support a fact, do not use it.

DECIDE
- kind: story | event | person | howto | skill | subject | money | health | legal | other. Use the one that fits best. If two fit, use money, health or legal first; then story; then the others. If Mode is story, kind is story. If Mode is decision, kind is money, health or legal.
- format: "quick" if the reader can get it in one sitting. "course" if the reader must practise over many days.
- chapters: quick 1 to 3, by how much there is to cover. course 7. The planner groups the outline parts into these chapters.
- outline: the main parts from your map, in the order a reader should learn them. 3 to 6 short names.
- facts: 12 to 20 facts, at least 3 for each part of the outline, in the same order as the outline. A fact is one checkable statement. Each fact carries at least one specific detail that a reader could look up: a name, a term, a number, a date, a place or a named step. A fact without such a detail does not count. Give each part enough detail that a writer can teach it without guessing. Each fact comes from your results. Choose the facts that serve the goal. Never change what a source says to make it fit the goal. If your results do not support enough facts, return fewer. Never add a fact to reach a number.
- framing: null.
- wikipediaTitle: the exact title of the English Wikipedia article on the main subject, if it exists. Else null.
- recapVideo: story only. A YouTube watch URL from your results that tells the events best. Do not search for it. Else null.
- sources: up to 6 {"title","url"} that you saw in your results. Each source supports at least one fact. Never make a URL.

HOW TO WRITE (facts and outline)
One statement in each sentence. At most 20 words. Active voice. Present tense when possible. Common words, each with one meaning. Keep names, numbers, dates and technical terms exactly as the sources give them. No idioms, slang or filler. The text must read naturally.

OUTPUT
JSON only, with these keys: kind, format, chapters, outline, facts, framing, wikipediaTitle, recapVideo, sources.`;

// Research prompt v5 (8 Oct; live from 8 Oct night until v6): v4 plus one sentence in the facts rule. The writer must
// never invent, so the human material that makes a chapter worth reading (a surprise, a real mistake, an irony) has to
// come from research. Stated for any topic; when the results have none, none are added.
export const PROMPT_V5 = PROMPT_V4.replace(
  `Choose the facts that serve the goal. Never change what a source says to make it fit the goal.`,
  `Choose the facts that serve the goal. Never change what a source says to make it fit the goal. Among them, include up to 3 true details a curious reader would retell to a friend: a common surprise, a well-known mistake, a real person's moment, or an irony. Put each with its part. If your results have none, add none.`,
);
if (PROMPT_V5 === PROMPT_V4) throw new Error("research v5 edit no longer matches v4");

// Research prompt v6 (9 Oct, Tanisha; the shape framework): v5 plus the handbook's shape for this reader. Flash judged
// most topics "quick" and squeezed them into 3 chapters, and the length was a fixed pair (1 to 3, or exactly 7). Now
// research says where this reader starts, weighs each outline part for this reader and goal (light, normal, heavy), and
// counts chapters from those weights, 1 to 7 for either format; the format is the pace (over days, or one sitting), not
// the length. A foundation the reader lacks is heavy even when it is "basic"; a prep step is light even when it comes
// first. Built from v5 by exact edits, so every other word stays v5's.
export const PROMPT_V6 = edited(PROMPT_V5, [
  [`- format: "quick" if the reader can get it in one sitting. "course" if the reader must practise over many days.
- chapters: quick 1 to 3, by how much there is to cover. course 7. The planner groups the outline parts into these chapters.
- outline: the main parts from your map, in the order a reader should learn them. 3 to 6 short names.`,
  `- outline: the main parts from your map, in the order a reader should learn them. 1 to 6 short names. A single task or one idea can be one part.
- start: one sentence. Where this reader's knowledge stops, from Level and the goal. Chapter 1 starts there.
- parts: one item for each outline part, in the same order: {"part": the outline name, "weight": "light", "normal" or "heavy", "why": a short reason}. Weigh each part for this reader and this goal, not for the topic in general.
  - light: a step the reader can do by following one line, or a thing they know already. It goes inside a nearby part.
  - normal: it needs some explanation or one worked case.
  - heavy: the rest of the topic depends on it and this reader does not know it yet, or it needs practice or several worked cases. A part can be heavy even if experts call it basic.
- chapters: count them from the parts and the goal. One chapter is one sitting. It ends when the reader can do or explain one new thing. A heavy part usually needs its own chapter, sometimes two. Normal parts can share a chapter. A light part goes into a chapter next to it. A single task done once (one dish, one knot, one repair) or one idea is usually 1 chapter, or 2 if it has separate stages. Leave out the parts this reader already knows (Level). The count is 1 to 7. Do not cut the handbook short to keep it quick. Do not add chapters to fill days. Then check the count: would this reader get lost where a part has too little room? Would they get bored where a part has too much?
- format: the goal decides it, not the topic. Ask two questions. 1. Must the reader practise, or act in the real world, between sittings? 2. Is there more to read than one or two sittings can hold (about 40 minutes in all)? If either answer is yes: "course", one chapter a day. If both answers are no: "quick", read in one or two sittings. A goal with a near time ("tonight", "tomorrow", "this weekend") points to "quick". The number of chapters does not decide the format.`],
  [`JSON only, with these keys: kind, format, chapters, outline, facts,`, `JSON only, with these keys: kind, outline, start, parts, chapters, format, facts,`],
  // 9 Oct, after the chapter reviews: a stock-market handbook for an Indian reader taught two American exchanges and the
  // US settlement date. The reader's country is India unless the line says otherwise.
  [`- Today: the current date.`, `- Today: the current date.\n- Country: India, unless the typed words or the goal name another place. Search this country's institutions, rules, prices and sources first.`],
  // 9 Oct (outside reviews): "12 to 20 facts, at least 3 for each part" pushed a fast model to fill gaps from memory
  // and stretched a one-task topic into several parts. A ceiling now: as many as the results support.
  [`- facts: 12 to 20 facts, at least 3 for each part of the outline, in the same order as the outline.`, `- facts: up to 20 facts, as many as your results support, in the same order as the outline.`],
]);

// Research prompt v7 (9 Oct, Tanisha; the neutral shape spec). v6 weighed "parts" but never asked what the reader walks
// away with, so a request for several recipes and a request to understand a war got the same kind of lesson, and depth
// had no say in chapter length. v7 asks four questions of every request, from the goal and level and never from the topic
// alone: what the reader walks away with, which pieces that needs (breadth), how much each piece needs (depth), and whether
// they need time between sittings (pace). Chapters are 3 to 7 (Tanisha: even a quick request gets three chapters, each
// straight to the point). Built from v5 by exact edits, like v6; v6 stays for comparison.
export const PROMPT_V7 = edited(PROMPT_V5, [
  [`- Today: the current date.`, `- Today: the current date.\n- Country: India, unless the typed words or the goal name another place. Search this country's institutions, rules, prices and sources first.`],
  [`MAP THE TOPIC`, `THE SHAPE: FOUR QUESTIONS
Answer these for this reader, from the goal and Level. Do not answer them for the topic in general: the same topic can need a very different handbook for a different goal.
1. What does the reader walk away with? An ability (they can do it), an understanding (they can explain it), a result (something made, fixed or decided), a story they can follow, or a resource they keep and come back to. Or name another.
2. Breadth: which separate pieces does that need? A piece is one thing the reader can use on its own: one technique, one idea, one event or period, one option, one step of a fix, one item of a collection.
3. Depth: how much does each piece need, for this reader? "light": a few minutes. "medium": a proper sitting. "deep": a long sitting, or more than one.
4. Pace: must the reader practise, act in the real world, or let ideas settle between sittings?

MAP THE TOPIC`],
  [`- format: "quick" if the reader can get it in one sitting. "course" if the reader must practise over many days.
- chapters: quick 1 to 3, by how much there is to cover. course 7. The planner groups the outline parts into these chapters.
- outline: the main parts from your map, in the order a reader should learn them. 3 to 6 short names.`,
  `- deliverable: one sentence: what the reader walks away with (question 1).
- start: one sentence. Where this reader's knowledge stops, from Level and the goal. Chapter 1 starts there.
- parts: the pieces (question 2), in the order the reader should get them: {"part": a short name, "depth": "light", "medium" or "deep", "why": a short reason}. Leave out pieces this reader already has (Level). Do not add a piece the goal does not need.
- outline: the same piece names, in the same order.
- chapters: 3 to 7. One chapter is one sitting. It holds whole pieces and goes straight to them. A deep piece gets its own chapter, sometimes two. One or two medium pieces share a chapter. Several light pieces share a chapter. A small request still gets 3 chapters, each direct and useful on its own: no padding, and no chapter of background. Do not add chapters to fill days. Then check the count: would this reader get lost where a piece has too little room? Would they get bored where a piece has too much?
- format: the pace (question 4) decides it, not the topic and not the count. "course": the reader must practise, act in the real world, or let ideas settle between sittings, or there is more to read than one or two sittings can hold (about 40 minutes in all); they read one chapter a day. "quick": neither; they read every chapter in one or two sittings. A goal with a near time ("tonight", "tomorrow", "this weekend") points to "quick".`],
  [`- facts: 12 to 20 facts, at least 3 for each part of the outline, in the same order as the outline.`, `- facts: up to 20 facts, as many as your results support, in the same order as the pieces.`],
  [`JSON only, with these keys: kind, format, chapters, outline, facts,`, `JSON only, with these keys: kind, deliverable, start, parts, outline, chapters, format, facts,`],
]);

// Research prompt v8 (9 Oct, the 26 changes after the reviews). v7 plus: each piece lists its must-haves ("needs"), each
// fact names its piece (so a chapter gets its own facts, and facts are not retold across chapters), up to 40 facts by
// depth instead of a flat 20, and one more search for each deep piece (at most 5). Built from v7 by exact edits.
export const PROMPT_V8 = edited(PROMPT_V7, [
  [`SEARCH (at most 3 searches)`, `SEARCH (3 searches, plus one for each deep piece; at most 5)`],
  [`{"part": a short name, "depth": "light", "medium" or "deep", "why": a short reason}.`, `{"part": a short name, "depth": "light", "medium" or "deep", "why": a short reason, "needs": [what the reader cannot use this piece without: the steps, amounts, commands, events or options, a few words each]}.`],
  [`- facts: up to 20 facts, as many as your results support, in the same order as the pieces. A fact is one checkable statement.`, `- facts: objects {"part": the piece it belongs to, "fact": one checkable statement}, in the same order as the pieces, as many as your results support, up to 40 in all; a deep piece gets more than a light one. A fact is one checkable statement.`],
]);

// Which research prompt, with its own output check and search cap. Live handbooks use LIVE; v1 stays for comparison.
export type Version = "v1" | "v4" | "v5" | "v6" | "v7" | "v8";
// 8 Oct: research v5 (v4 plus up to 3 true details a reader would retell) is live. v1 (PROMPT) and v4 stay here.
// 9 Oct (feat/handbook-shape): v6, the shape framework, is live on this branch. Switch back: "v5".
export const LIVE: Version = "v8";   // 9 Oct: v8 (must-haves and facts by piece). Switch back: "v7", "v6" or "v5".
const SETUP: Record<Version, { prompt: () => string; schema: string; maxSearches: number }> = {
  v1: { prompt: () => PROMPT, schema: "research", maxSearches: 4 },
  v4: { prompt: () => PROMPT_V4, schema: "researchV4", maxSearches: 3 },
  v5: { prompt: () => PROMPT_V5, schema: "researchV4", maxSearches: 3 },
  v6: { prompt: () => PROMPT_V6, schema: "researchV6", maxSearches: 3 },
  v7: { prompt: () => PROMPT_V7, schema: "researchV7", maxSearches: 3 },
  v8: { prompt: () => PROMPT_V8, schema: "researchV8", maxSearches: 5 },
};

const STORY = new Set(["film", "series", "book", "game", "franchise", "story"]);   // v1's story kinds, and v4's one
const UA = "IGetIt/1.0 (https://sensible-mongoose-624.convex.site; prateekksubs@gmail.com)";

async function wikipedia(title: string, plot: boolean): Promise<{ title: string; url: string; text: string } | null> {
  try {
    const u = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(title)}`;
    const r = await fetch(u, { headers: { "User-Agent": UA } });
    if (!r.ok) return null;
    const j: any = await r.json();
    const page: any = Object.values(j?.query?.pages ?? {})[0];
    const full: string = page?.extract ?? "";
    if (!full) return null;
    let text = full.slice(0, 2500);   // the lead: what it is
    if (plot) {
      const m = full.match(/\n==\s*(Plot|Synopsis|Plot summary|Story|Premise)\s*==\n([\s\S]*?)(\n==\s[^=]|$)/i);
      if (m) text = `${full.slice(0, 1200)}\n\nPlot:\n${m[2]}`;
    }
    return { title: page.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(String(page.title).replace(/ /g, "_"))}`, text: text.slice(0, 9000) };
  } catch { return null; }
}

async function transcript(url: string): Promise<string | null> {
  const key = process.env.SUPADATA ?? process.env.SUPADATA_API_KEY;
  if (!key || !/^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/.test(url)) return null;
  try {
    const r = await fetch(`https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(url)}&text=true`, { headers: { "x-api-key": key } });
    if (!r.ok) return null;
    const j: any = await r.json();
    const text = typeof j?.content === "string" ? j.content : Array.isArray(j?.content) ? j.content.map((c: any) => c.text).join(" ") : "";
    return text ? text.slice(0, 9000) : null;
  } catch { return null; }
}

// Research runs on Gemini 3.8 Flash with Google Search, direct from Google (Prateek, 8 Oct night: "move the research to
// Gemini Flash; as a backup, Claude"). Keys: GEMINI_API_KEY, then GEMINI_API_KEY_BACKUP (the main key got 503 "high
// demand" 3 of 3 on 8 Oct; the backup worked 3 of 3). Gemini gets the research JSON schema with the request (search
// and a fixed schema work in one call, tested 8 Oct), and every reply is checked against schemas.ts "research" with
// one corrective retry. If Gemini still fails, Claude Sonnet 5.5 with Anthropic web search (the researcher until 8 Oct)
// does it, under the same schema check. Grounded links are Google redirects that expire, so each is resolved first.
export const GEMINI_RESEARCHER = "gemini-3.8-flash";
export const CLAUDE_RESEARCHER = "claude-sonnet-5-5";
export const GEMINI_FALLBACK = "gemini-3.1-pro-preview";   // tests only (geminiOnly)
// How hard Gemini thinks before answering (8 Oct). Uncapped, one run spent 15,413 thinking tokens; "medium" bounds cost
// and latency. "low" and the uncapped default were measured against it: evals/research-thinking/.
export type Thinking = "low" | "medium" | "high" | "default";
export const GEMINI_THINKING: Thinking = "medium";
// Time budget (8 Oct): every Gemini try for one research step (both keys, the wait between rounds, the schema retry)
// shares 120 s. Past it, Claude takes over, so a busy Gemini never keeps a reader waiting minutes for a plan.
// 9 Oct: 180 s and longer waits between tries: a 503 "high demand" from Google can last a minute or more.
const GEMINI_RESEARCH_BUDGET = 180000;
type Attempt = { decided: any; searches: number; grounded?: number; queries?: string[]; tokensIn: number; tokensOut: number; error?: string; model: string; ms: number };

const REDIRECT = /vertexaisearch\.cloud\.google\.com\/grounding-api-redirect/;
async function realUrl(u: string): Promise<string> {
  if (!REDIRECT.test(u)) return u;
  try { const r = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(8000) }); const loc = r.headers.get("location"); if (loc) return loc; } catch { /* next way */ }
  try { const r = await fetch(u, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(8000) }); return r.url || u; } catch { return u; }
}
const parse = (text: string) => { const m = text.match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch { return null; } };

async function geminiOnce(model: string, ask: string, version: Version = LIVE, structured = true, thinking: Thinking = GEMINI_THINKING, deadline = Date.now() + GEMINI_RESEARCH_BUDGET) {
  const { prompt, schema } = SETUP[version];
  const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_BACKUP].filter(Boolean) as string[];
  if (!keys.length) return { body: null, error: "no Gemini key set" };
  let body: any = null, error: string | undefined;
  const dead = new Set<number>();
  for (let i = 0; i < 2 * keys.length; i++) {
    if (dead.has(i % keys.length)) continue;
    const left = deadline - Date.now();
    if (left < 5000) { error = `Gemini time budget used up (${GEMINI_RESEARCH_BUDGET / 1000} s)`; break; }
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", signal: AbortSignal.timeout(Math.min(90000, left)),
      headers: { "Content-Type": "application/json", "x-goog-api-key": keys[i % keys.length] },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: prompt() }] }, contents: [{ role: "user", parts: [{ text: ask }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 8000, ...(thinking === "default" ? {} : { thinkingConfig: { thinkingLevel: thinking } }), ...(structured ? { responseMimeType: "application/json", ...(jsonSchema(schema) ? { responseJsonSchema: jsonSchema(schema) } : {}) } : {}) },
      }),
    }).catch((e: any) => ({ ok: false, status: 0, json: async () => ({ error: String(e?.message ?? e) }) }) as any);
    body = await res.json().catch(() => ({}));
    if (res.ok) { error = undefined; break; }
    error = `Gemini ${res.status} (${i % keys.length ? "backup key" : "main key"}): ${JSON.stringify(body).slice(0, 200)}`;
    // 9 Oct: a key out of credit (402) is dropped and the other key carries on. Before, the backup's 402 ended the call
    // even when the main key had only been busy for a moment (503), and the error read "credits depleted".
    if (res.status === 402 && dead.size + 1 < keys.length) dead.add(i % keys.length);
    else if (res.status !== 503 && res.status !== 429 && res.status !== 0) break;
    if (i % keys.length === keys.length - 1 && deadline - Date.now() > 40000) await new Promise((x) => setTimeout(x, 20000));   // both keys tried: wait, then again
  }
  return { body, error };
}

export async function geminiResearch(model: string, ask: string, version: Version = LIVE, structured = true, thinking: Thinking = GEMINI_THINKING): Promise<Attempt> {
  const started = Date.now();
  const deadline = started + GEMINI_RESEARCH_BUDGET;
  const { schema } = SETUP[version];
  let tokensIn = 0, tokensOut = 0, searches = 0, grounded = 0, decided: any = null, error: string | undefined;
  const queries: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt && deadline - Date.now() < 10000) break;   // no time left for the schema retry: Claude takes over
    const wrongBefore = attempt ? problems(schema, decided) : null;
    const { body, error: e } = await geminiOnce(model, wrongBefore ? `${ask}\n\nYour previous reply did not match the required JSON shape:\n${wrongBefore}\nReturn the whole JSON object again, with these fixed.` : ask, version, structured, thinking, deadline);
    if (e || !body) { error = e ?? "no reply"; break; }
    const cand = body.candidates?.[0];
    const u = body.usageMetadata ?? {};
    tokensIn += u.promptTokenCount ?? 0; tokensOut += (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
    searches += (cand?.groundingMetadata?.webSearchQueries ?? []).length;
    grounded += (cand?.groundingMetadata?.groundingChunks ?? []).length;   // web results the reply actually rests on
    queries.push(...(cand?.groundingMetadata?.webSearchQueries ?? []).map(String));
    decided = parse((cand?.content?.parts ?? []).map((p: any) => p.text ?? "").join(""));
    const wrong = problems(schema, decided);
    error = decided ? (wrong ? `schema: ${wrong.replace(/\n/g, " ").slice(0, 200)}` : undefined) : "no JSON";
    if (!error) break;
  }
  // A redirect that can't be resolved is dropped: a reader never gets a Google redirect link (8 Oct).
  if (!error && Array.isArray(decided.sources)) decided.sources = (await Promise.all(decided.sources.slice(0, 8).map(async (s: any) => ({ ...s, url: await realUrl(String(s?.url ?? "")) })))).filter((s: any) => !REDIRECT.test(s.url)).slice(0, 6);
  return { decided: error ? null : decided, searches, grounded, queries, tokensIn, tokensOut, error, model, ms: Date.now() - started };
}

export async function claudeResearch(ask: string, version: Version = LIVE): Promise<Attempt> {
  const started = Date.now();
  const { prompt, schema, maxSearches } = SETUP[version];
  let decided: any = null, searches = 0, error: string | undefined, tokensIn = 0, tokensOut = 0;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const messages: any[] = [{ role: "user", content: ask }];
    let res: any;
    for (let i = 0; i < 4; i++) {
      res = await client.beta.messages.create({ model: CLAUDE_RESEARCHER, max_tokens: 4000, system: prompt(), messages,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: maxSearches } as any], output_config: { effort: "low" } as any } as any);
      searches += res.usage?.server_tool_use?.web_search_requests ?? 0;
      tokensIn += res.usage?.input_tokens ?? 0; tokensOut += res.usage?.output_tokens ?? 0;
      if (res.stop_reason === "pause_turn") { messages.push({ role: "assistant", content: res.content }); continue; }
      decided = parse((res?.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join(""));
      const wrong = decided ? problems(schema, decided) : "no JSON object in the reply";
      if (!wrong) { error = undefined; break; }
      error = `schema: ${wrong.replace(/\n/g, " ").slice(0, 200)}`;
      if (i >= 2) break;
      // One corrective turn: the same conversation, told exactly what to fix.
      messages.push({ role: "assistant", content: res.content }, { role: "user", content: `Your reply did not match the required JSON shape:\n${wrong}\nReturn only the whole JSON object again, with these fixed.` });
    }
  } catch (e: any) { error = String(e?.message ?? e).slice(0, 300); }
  return { decided: error ? null : decided, searches, tokensIn, tokensOut, error, model: CLAUDE_RESEARCHER, ms: Date.now() - started };
}

// Gemini first, Claude when Gemini fails. Every attempt is logged with its own model, so costs stay true.
export async function researchFor(ctx: any, ask: string, opts: { claudeOnly?: boolean; geminiOnly?: boolean; trace?: Trace } = {}): Promise<{ used: Attempt | null; attempts: Attempt[] }> {
  const attempts: Attempt[] = [];
  if (!opts.claudeOnly) attempts.push(await geminiResearch(GEMINI_RESEARCHER, ask));
  // geminiOnly (9 Oct): a benchmark handbook stays on Gemini: its fallback is Gemini 3.1 Pro (which can also search), never Claude.
  if ((!attempts.length || attempts[attempts.length - 1].error)) attempts.push(opts.geminiOnly ? await geminiResearch(GEMINI_FALLBACK, ask) : await claudeResearch(ask));
  for (const a of attempts) await ctx.runMutation(internal.handbooks.logAiCall, { ...(opts.trace ?? {}), attempts: attempts.indexOf(a) + 1, kind: "research", model: a.model, input: ask, output: a.decided ? JSON.stringify(a.decided).slice(0, 4000) : "", tokensIn: a.tokensIn, tokensOut: a.tokensOut, ms: a.ms, ok: !a.error, error: a.error });
  const used = attempts.find((a) => !a.error) ?? null;
  return { used, attempts };
}

export function askFor(h: { topic: string; goal?: string; mode?: string; level: string }) {
  return `Typed: "${h.topic}"${h.goal ? `\nGoal: "${h.goal}"` : ""}${h.mode ? `\nMode: ${h.mode}` : ""}\nLevel: ${h.level}\nToday: ${new Date().toISOString().slice(0, 10)}`;
}

export const run = internalAction({
  // goal and force (9 Oct): a clarifying answer reruns research with the answer as the goal (generatePlan).
  args: { handbookId: v.id("handbooks"), goal: v.optional(v.string()), force: v.optional(v.boolean()) },
  handler: async (ctx, { handbookId, goal, force }): Promise<void> => {
    const h: any = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    if (!h || (h.brief && !force)) return;
    const ask = askFor(goal ? { ...h, goal } : h);
    const { used, attempts } = await researchFor(ctx, ask, { trace: { handbookId }, ...(h.test?.flashOnly ? { geminiOnly: true } : {}) });
    const decided: any = used?.decided ?? null;
    const searches = used?.searches ?? 0;
    const error = used ? undefined : attempts.map((a) => `${a.model}: ${a.error}`).join(" | ").slice(0, 400);
    // 9 Oct (outside reviews): when every attempt failed, store that, not a default "course, 7 chapters" brief.
    if (!decided) {
      await ctx.runMutation(internal.handbooks.setBrief, { handbookId, brief: { failed: true, kind: "", facts: [], sources: [], outline: [], parts: [], searches, error: error ?? "no reply", at: Date.now() } });
      return;
    }
    const kind = String(decided?.kind ?? "");
    const format = decided?.format === "quick" ? "quick" : "course";
    // v6 counts chapters from the weighed parts, 1 to 7 for either format; v1 to v5 still give 1 to 3 or 7.
    const chapters = Math.max(1, Math.min(7, Math.round(Number(decided?.chapters)) || (format === "quick" ? 2 : 7)));
    const wiki = decided?.wikipediaTitle ? await wikipedia(String(decided.wikipediaTitle), STORY.has(kind)) : null;
    const recapUrl = STORY.has(kind) && typeof decided?.recapVideo === "string" ? decided.recapVideo : null;
    const recap = recapUrl ? await transcript(recapUrl) : null;
    if (recapUrl) await ctx.runMutation(internal.handbooks.logAiCall, { handbookId, kind: "transcript", model: "supadata", input: recapUrl, output: recap ? `${recap.length} chars` : "", ms: 0, ok: !!recap });
    const nism = nismBrief(`${h.topic} ${h.goal ?? ""} ${kind === "money" ? "investing" : ""}`);
    const sources = (Array.isArray(decided?.sources) ? decided.sources : []).filter((s: any) => /^https?:\/\//.test(String(s?.url ?? ""))).slice(0, 6)
      .map((s: any) => ({ title: String(s.title ?? s.url).slice(0, 120), url: String(s.url).slice(0, 300) }));
    if (wiki && !sources.some((s: any) => s.url === wiki.url)) sources.unshift({ title: `${wiki.title} (Wikipedia)`, url: wiki.url });
    if (recapUrl && recap && !sources.some((s: any) => s.url === recapUrl)) sources.push({ title: "YouTube recap", url: recapUrl });

    const brief = {
      kind, format, chapters,
      outline: (Array.isArray(decided?.outline) ? decided.outline : []).map((p: any) => String(p).slice(0, 80)).slice(0, 6),
      deliverable: typeof decided?.deliverable === "string" ? decided.deliverable.slice(0, 300) : null,
      start: typeof decided?.start === "string" ? decided.start.slice(0, 300) : null,
      // v7 gives each piece a depth (light, medium, deep); v6 gave a weight (light, normal, heavy). Both are kept as given.
      parts: (Array.isArray(decided?.parts) ? decided.parts : []).slice(0, 8).map((p: any) => ({ part: String(p?.part ?? "").slice(0, 80), ...(["light", "medium", "deep"].includes(p?.depth) ? { depth: p.depth } : { weight: ["light", "normal", "heavy"].includes(p?.weight) ? p.weight : "normal" }), why: String(p?.why ?? "").slice(0, 160), ...(Array.isArray(p?.needs) ? { needs: p.needs.map((x: any) => String(x).slice(0, 100)).slice(0, 10) } : {}) })),
      framing: format === "quick" && decided?.framing ? String(decided.framing).slice(0, 200) : null,
      // v8 facts carry their piece: the flat list stays (plan, older readers of the brief) and factsByPart gives each
      // chapter its own facts. v7 and older facts are plain strings.
      facts: (Array.isArray(decided?.facts) ? decided.facts : []).map((f: any) => String(typeof f === "object" && f ? f.fact ?? "" : f).slice(0, 240)).filter(Boolean).slice(0, 40),
      factsByPart: (Array.isArray(decided?.facts) ? decided.facts : []).reduce((m: Record<string, string[]>, f: any) => { if (f && typeof f === "object" && f.part && f.fact) (m[String(f.part).slice(0, 80)] ??= []).push(String(f.fact).slice(0, 240)); return m; }, {}),
      sources,
      wiki: wiki ? { title: wiki.title, url: wiki.url, text: wiki.text } : null,
      recap: recapUrl && recap ? { url: recapUrl, text: recap } : null,
      nism, searches, error: error ?? null, at: Date.now(),
      researcher: used?.model ?? null, fellBack: attempts.length > 1 ? String(attempts[0].error ?? "").slice(0, 200) : null,
    };
    await ctx.runMutation(internal.handbooks.setBrief, { handbookId, brief });
    // (each research attempt was logged in researchFor)
  },
});

// Test the research step on a topic without a handbook (8 Oct). Nothing is stored except the call log.
// npx convex run --prod research:preview '{"topic":"...","claudeOnly":false}'
export const preview = internalAction({
  args: { topic: v.string(), goal: v.optional(v.string()), mode: v.optional(v.string()), level: v.optional(v.string()), claudeOnly: v.optional(v.boolean()) },
  handler: async (ctx, { topic, goal, mode, level = "new", claudeOnly }) => {
    const { used, attempts } = await researchFor(ctx, askFor({ topic, goal, mode, level }), { claudeOnly });
    return {
      used: used?.model ?? null,
      attempts: attempts.map((a) => ({ model: a.model, ms: a.ms, searches: a.searches, tokensIn: a.tokensIn, tokensOut: a.tokensOut, error: a.error ?? null })),
      brief: used?.decided ?? null,
    };
  },
});
