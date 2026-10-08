"use node";
import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { nismBrief } from "./nism";
import { jsonSchema, problems } from "./schemas";
import type { Trace } from "./trace";

// Research before writing (Prateek, 7 Oct: "be more agentic"; a film recap needs no quizzes and no weeks; stock topics
// should draw on the NISM syllabus). For a typed topic, before the plan:
//   1. Claude (Sonnet, low effort) runs 1 to 4 web searches and decides what the handbook should be: a 7-chapter course,
//      or a quick 1 to 3 chapter one (a recap, one recipe, a one-off how-to), with the facts it must get right and the
//      sources it read.
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

// Research prompt v4 (8 Oct, Tanisha). Tested against v1 (above, kept for comparison) on 6 topics with Claude Sonnet as a
// blind judge (her evals/research-v1-v2 and research-v1-v2-v3). What it keeps and why:
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
- format: "quick" ONLY for a recap of a named film, series, book, game or franchise, one recipe, one single how-to or one-off task, one event or one person. A skill, a subject, a money, health or legal topic, and any line with "learn", "basics", "how X works", "understand" or "get better at" is "course" (D27, 9 Oct). But one dish or one task ("how to make dal", "how to change a tyre") is kind howto and quick, even though cooking or car care in general would be a skill. "course" if the reader must practise over many days.
- chapters: quick is 1 for a recipe, a single how-to, one event, one person or any one-off task: everything the reader needs in that one sitting, in one chapter. Quick is 2 or 3 only for a recap of a long series, a franchise or a long book. course 7. The planner groups the outline parts into these chapters.
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

// Research prompt v5 (8 Oct, Tanisha; live from 8 Oct night, Prateek: "hers"): v4 plus one sentence in the facts rule.
// The writer must never invent, so the human material that makes a chapter worth reading (a surprise, a real mistake,
// an irony) has to come from research. Stated for any topic; when the results have none, none are added.
export const PROMPT_V5 = PROMPT_V4.replace(
  `Choose the facts that serve the goal. Never change what a source says to make it fit the goal.`,
  `Choose the facts that serve the goal. Never change what a source says to make it fit the goal. Among them, include up to 3 true details a curious reader would retell to a friend: a common surprise, a well-known mistake, a real person's moment, or an irony. Put each with its part. If your results have none, add none.`,
);
if (PROMPT_V5 === PROMPT_V4) throw new Error("research v5 edit no longer matches v4");

// Which research prompt, with its own output check and search cap. Live handbooks use LIVE; v1 stays for comparison.
export type Version = "v1" | "v4" | "v5";
export const LIVE: Version = "v5";
const SETUP: Record<Version, { prompt: () => string; schema: string; maxSearches: number }> = {
  v1: { prompt: () => PROMPT, schema: "research", maxSearches: 4 },
  v4: { prompt: () => PROMPT_V4, schema: "researchV4", maxSearches: 3 },
  v5: { prompt: () => PROMPT_V5, schema: "researchV4", maxSearches: 3 },
};
// Gemini's thinking on research (8 Oct, Tanisha): uncapped, one run spent 15,413 thinking tokens; medium is 30 s and about
// ₹1.16; low was cheaper but its quality was not judged, so not adopted.
export const GEMINI_THINKING = "medium";

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
type Attempt = { decided: any; searches: number; tokensIn: number; tokensOut: number; error?: string; model: string; ms: number };

const REDIRECT = /vertexaisearch\.cloud\.google\.com\/grounding-api-redirect/;
async function realUrl(u: string): Promise<string> {
  if (!REDIRECT.test(u)) return u;
  try { const r = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(8000) }); const loc = r.headers.get("location"); if (loc) return loc; } catch { /* next way */ }
  try { const r = await fetch(u, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(8000) }); return r.url || u; } catch { return u; }
}
const parse = (text: string) => { const m = text.match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch { return null; } };

async function geminiOnce(model: string, ask: string, version: Version = LIVE) {
  const setup = SETUP[version];
  const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_BACKUP].filter(Boolean) as string[];
  if (!keys.length) return { body: null, error: "no Gemini key set" };
  let body: any = null, error: string | undefined;
  for (let i = 0; i < 2 * keys.length; i++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", signal: AbortSignal.timeout(90000),
      headers: { "Content-Type": "application/json", "x-goog-api-key": keys[i % keys.length] },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: setup.prompt() }] }, contents: [{ role: "user", parts: [{ text: ask }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 8000, responseMimeType: "application/json", ...(jsonSchema(setup.schema) ? { responseJsonSchema: jsonSchema(setup.schema) } : {}), thinkingConfig: { thinkingLevel: GEMINI_THINKING } },
      }),
    }).catch((e: any) => ({ ok: false, status: 0, json: async () => ({ error: String(e?.message ?? e) }) }) as any);
    body = await res.json().catch(() => ({}));
    if (res.ok) { error = undefined; break; }
    error = `Gemini ${res.status} (${i % keys.length ? "backup key" : "main key"}): ${JSON.stringify(body).slice(0, 200)}`;
    if (res.status !== 503 && res.status !== 429 && res.status !== 0) break;
    if (i % keys.length === keys.length - 1) await new Promise((x) => setTimeout(x, 10000));   // both keys tried: wait, then again
  }
  return { body, error };
}

export async function geminiResearch(model: string, ask: string, version: Version = LIVE): Promise<Attempt> {
  const schema = SETUP[version].schema;
  const started = Date.now();
  let tokensIn = 0, tokensOut = 0, searches = 0, decided: any = null, error: string | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const wrongBefore = attempt ? problems(schema, decided) : null;
    const { body, error: e } = await geminiOnce(model, wrongBefore ? `${ask}\n\nYour previous reply did not match the required JSON shape:\n${wrongBefore}\nReturn the whole JSON object again, with these fixed.` : ask);
    if (e || !body) { error = e ?? "no reply"; break; }
    const cand = body.candidates?.[0];
    const u = body.usageMetadata ?? {};
    tokensIn += u.promptTokenCount ?? 0; tokensOut += (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
    searches += (cand?.groundingMetadata?.webSearchQueries ?? []).length;
    decided = parse((cand?.content?.parts ?? []).map((p: any) => p.text ?? "").join(""));
    const wrong = problems(schema, decided);
    error = decided ? (wrong ? `schema: ${wrong.replace(/\n/g, " ").slice(0, 200)}` : undefined) : "no JSON";
    if (!error) break;
  }
  // A redirect that can't be resolved is dropped: a reader never gets a Google redirect link (8 Oct).
  if (!error && Array.isArray(decided.sources)) decided.sources = (await Promise.all(decided.sources.slice(0, 8).map(async (s: any) => ({ ...s, url: await realUrl(String(s?.url ?? "")) })))).filter((s: any) => !REDIRECT.test(s.url)).slice(0, 6);
  return { decided: error ? null : decided, searches, tokensIn, tokensOut, error, model, ms: Date.now() - started };
}

export async function claudeResearch(ask: string, version: Version = LIVE): Promise<Attempt> {
  const setup = SETUP[version];
  const started = Date.now();
  let decided: any = null, searches = 0, error: string | undefined, tokensIn = 0, tokensOut = 0;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const messages: any[] = [{ role: "user", content: ask }];
    let res: any;
    for (let i = 0; i < 4; i++) {
      res = await client.beta.messages.create({ model: CLAUDE_RESEARCHER, max_tokens: 4000, system: setup.prompt(), messages,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: setup.maxSearches } as any], output_config: { effort: "low" } as any } as any);
      searches += res.usage?.server_tool_use?.web_search_requests ?? 0;
      tokensIn += res.usage?.input_tokens ?? 0; tokensOut += res.usage?.output_tokens ?? 0;
      if (res.stop_reason === "pause_turn") { messages.push({ role: "assistant", content: res.content }); continue; }
      decided = parse((res?.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join(""));
      const wrong = decided ? problems(setup.schema, decided) : "no JSON object in the reply";
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
export async function researchFor(ctx: any, ask: string, opts: { claudeOnly?: boolean; version?: Version; trace?: Trace } = {}): Promise<{ used: Attempt | null; attempts: Attempt[] }> {
  const attempts: Attempt[] = [];
  const version = opts.version ?? LIVE;
  if (!opts.claudeOnly) attempts.push(await geminiResearch(GEMINI_RESEARCHER, ask, version));
  if (!attempts.length || attempts[attempts.length - 1].error) attempts.push(await claudeResearch(ask, version));
  for (const a of attempts) await ctx.runMutation(internal.handbooks.logAiCall, { ...(opts.trace ?? {}), attempts: attempts.indexOf(a) + 1, kind: "research", model: a.model, input: ask, output: a.decided ? JSON.stringify(a.decided).slice(0, 4000) : "", tokensIn: a.tokensIn, tokensOut: a.tokensOut, ms: a.ms, ok: !a.error, error: a.error });
  const used = attempts.find((a) => !a.error) ?? null;
  return { used, attempts };
}

export function askFor(h: { topic: string; goal?: string; mode?: string; level: string }) {
  return `Typed: "${h.topic}"${h.goal ? `\nTheir goal: "${h.goal}"` : ""}${h.mode ? `\nMode they picked: ${h.mode}` : ""}\nLevel: ${h.level}\nToday: ${new Date().toISOString().slice(0, 10)}`;
}

export const run = internalAction({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }): Promise<void> => {
    const h: any = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    if (!h || h.brief) return;
    const ask = askFor(h);
    const { used, attempts } = await researchFor(ctx, ask, { trace: { handbookId } });
    const decided: any = used?.decided ?? null;
    const searches = used?.searches ?? 0;
    const error = used ? undefined : attempts.map((a) => `${a.model}: ${a.error}`).join(" | ").slice(0, 400);
    const kind = String(decided?.kind ?? "");
    const format = decided?.format === "quick" ? "quick" : "course";
    const chapters = format === "quick" ? Math.max(1, Math.min(3, Number(decided?.chapters) || 2)) : 7;
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
      framing: format === "quick" && decided?.framing ? String(decided.framing).slice(0, 200) : null,
      facts: (Array.isArray(decided?.facts) ? decided.facts : []).map((f: any) => String(f).slice(0, 240)).slice(0, 20),
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
