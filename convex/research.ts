"use node";
import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { nismBrief } from "./nism";
import { jsonSchema, problems } from "./schemas";

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

const STORY = new Set(["film", "series", "book", "game", "franchise"]);
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

async function geminiOnce(model: string, ask: string) {
  const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_BACKUP].filter(Boolean) as string[];
  if (!keys.length) return { body: null, error: "no Gemini key set" };
  let body: any = null, error: string | undefined;
  for (let i = 0; i < 2 * keys.length; i++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", signal: AbortSignal.timeout(90000),
      headers: { "Content-Type": "application/json", "x-goog-api-key": keys[i % keys.length] },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROMPT }] }, contents: [{ role: "user", parts: [{ text: ask }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 8000, responseMimeType: "application/json", ...(jsonSchema("research") ? { responseJsonSchema: jsonSchema("research") } : {}) },
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

export async function geminiResearch(model: string, ask: string): Promise<Attempt> {
  const started = Date.now();
  let tokensIn = 0, tokensOut = 0, searches = 0, decided: any = null, error: string | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const wrongBefore = attempt ? problems("research", decided) : null;
    const { body, error: e } = await geminiOnce(model, wrongBefore ? `${ask}\n\nYour previous reply did not match the required JSON shape:\n${wrongBefore}\nReturn the whole JSON object again, with these fixed.` : ask);
    if (e || !body) { error = e ?? "no reply"; break; }
    const cand = body.candidates?.[0];
    const u = body.usageMetadata ?? {};
    tokensIn += u.promptTokenCount ?? 0; tokensOut += (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
    searches += (cand?.groundingMetadata?.webSearchQueries ?? []).length;
    decided = parse((cand?.content?.parts ?? []).map((p: any) => p.text ?? "").join(""));
    const wrong = problems("research", decided);
    error = decided ? (wrong ? `schema: ${wrong.replace(/\n/g, " ").slice(0, 200)}` : undefined) : "no JSON";
    if (!error) break;
  }
  // A redirect that can't be resolved is dropped: a reader never gets a Google redirect link (8 Oct).
  if (!error && Array.isArray(decided.sources)) decided.sources = (await Promise.all(decided.sources.slice(0, 8).map(async (s: any) => ({ ...s, url: await realUrl(String(s?.url ?? "")) })))).filter((s: any) => !REDIRECT.test(s.url)).slice(0, 6);
  return { decided: error ? null : decided, searches, tokensIn, tokensOut, error, model, ms: Date.now() - started };
}

export async function claudeResearch(ask: string): Promise<Attempt> {
  const started = Date.now();
  let decided: any = null, searches = 0, error: string | undefined, tokensIn = 0, tokensOut = 0;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const messages: any[] = [{ role: "user", content: ask }];
    let res: any;
    for (let i = 0; i < 4; i++) {
      res = await client.beta.messages.create({ model: CLAUDE_RESEARCHER, max_tokens: 4000, system: PROMPT, messages,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4 } as any], output_config: { effort: "low" } as any } as any);
      searches += res.usage?.server_tool_use?.web_search_requests ?? 0;
      tokensIn += res.usage?.input_tokens ?? 0; tokensOut += res.usage?.output_tokens ?? 0;
      if (res.stop_reason === "pause_turn") { messages.push({ role: "assistant", content: res.content }); continue; }
      decided = parse((res?.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join(""));
      const wrong = decided ? problems("research", decided) : "no JSON object in the reply";
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
export async function researchFor(ctx: any, ask: string, opts: { claudeOnly?: boolean } = {}): Promise<{ used: Attempt | null; attempts: Attempt[] }> {
  const attempts: Attempt[] = [];
  if (!opts.claudeOnly) attempts.push(await geminiResearch(GEMINI_RESEARCHER, ask));
  if (!attempts.length || attempts[attempts.length - 1].error) attempts.push(await claudeResearch(ask));
  for (const a of attempts) await ctx.runMutation(internal.handbooks.logAiCall, { kind: "research", model: a.model, input: ask, output: a.decided ? JSON.stringify(a.decided).slice(0, 4000) : "", tokensIn: a.tokensIn, tokensOut: a.tokensOut, ms: a.ms, ok: !a.error, error: a.error });
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
    const { used, attempts } = await researchFor(ctx, ask);
    const decided: any = used?.decided ?? null;
    const searches = used?.searches ?? 0;
    const error = used ? undefined : attempts.map((a) => `${a.model}: ${a.error}`).join(" | ").slice(0, 400);
    const kind = String(decided?.kind ?? "");
    const format = decided?.format === "quick" ? "quick" : "course";
    const chapters = format === "quick" ? Math.max(1, Math.min(3, Number(decided?.chapters) || 2)) : 7;
    const wiki = decided?.wikipediaTitle ? await wikipedia(String(decided.wikipediaTitle), STORY.has(kind)) : null;
    const recapUrl = STORY.has(kind) && typeof decided?.recapVideo === "string" ? decided.recapVideo : null;
    const recap = recapUrl ? await transcript(recapUrl) : null;
    if (recapUrl) await ctx.runMutation(internal.handbooks.logAiCall, { kind: "transcript", model: "supadata", input: recapUrl, output: recap ? `${recap.length} chars` : "", ms: 0, ok: !!recap });
    const nism = nismBrief(`${h.topic} ${h.goal ?? ""} ${kind === "money" ? "investing" : ""}`);
    const sources = (Array.isArray(decided?.sources) ? decided.sources : []).filter((s: any) => /^https?:\/\//.test(String(s?.url ?? ""))).slice(0, 6)
      .map((s: any) => ({ title: String(s.title ?? s.url).slice(0, 120), url: String(s.url).slice(0, 300) }));
    if (wiki && !sources.some((s: any) => s.url === wiki.url)) sources.unshift({ title: `${wiki.title} (Wikipedia)`, url: wiki.url });
    if (recapUrl && recap && !sources.some((s: any) => s.url === recapUrl)) sources.push({ title: "YouTube recap", url: recapUrl });

    const brief = {
      kind, format, chapters,
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
