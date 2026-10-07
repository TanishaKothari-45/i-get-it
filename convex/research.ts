"use node";
import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { nismBrief } from "./nism";

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
const PROMPT = `You are the researcher for I Get It, which writes a short handbook for one person who typed what they want to learn. Before anything is written, decide what kind of handbook this request needs and gather the facts it must rest on.

Run 1 to 4 web searches (Wikipedia, IMDb, official sites, reputable explainers, YouTube recaps for stories). Use only what the searches show plus facts you are certain of.

Decide:
- "kind": film | series | book | game | franchise | event | person | recipe | howto | skill | subject | money | health | legal | other.
- "format": "quick" when this doesn't need days of practice: a recap of a film, series, book, game or franchise, catching up before a release, one recipe, a single how-to, one event or person. "course" when it is a skill or subject worth practising over days (a language, coding, trading, public speaking).
- "chapters": quick = 1 to 3 (one film is usually 1 or 2; a whole franchise or a long series 3); course = 7.
- "framing": for quick, one friendly line in your own words telling them this doesn't need weeks, e.g. "This doesn't need weeks of study. Let's run through it quickly and get you going." For course, null.
- "wikipediaTitle": the exact English Wikipedia article title of the main work or subject, if one clearly exists, else null.
- "recapVideo": for film, series, book, game or franchise, the URL of one YouTube recap or explainer you saw in the results (https://www.youtube.com/watch?v=...), else null. Only a URL you actually saw.
- "facts": 8 to 20 one-line facts the handbook must get right: names and who they are, the order of events, numbers, dates, rules. Specific, checkable, from the searches.
- "sources": up to 6 {"title","url"} you actually saw in the results. Never invent a URL.

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

export const run = internalAction({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }): Promise<void> => {
    const h: any = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    if (!h || h.brief) return;
    const started = Date.now();
    const ask = `Typed: "${h.topic}"${h.goal ? `\nTheir goal: "${h.goal}"` : ""}${h.mode ? `\nMode they picked: ${h.mode}` : ""}\nLevel: ${h.level}\nToday: ${new Date().toISOString().slice(0, 10)}`;
    let decided: any = null, searches = 0, error: string | undefined, tokensIn = 0, tokensOut = 0;
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const messages: any[] = [{ role: "user", content: ask }];
      let res: any;
      for (let i = 0; i < 3; i++) {
        res = await client.beta.messages.create({ model: "claude-sonnet-5-5", max_tokens: 4000, system: PROMPT, messages,
          tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4 } as any], output_config: { effort: "low" } as any } as any);
        searches += res.usage?.server_tool_use?.web_search_requests ?? 0;
        tokensIn += res.usage?.input_tokens ?? 0; tokensOut += res.usage?.output_tokens ?? 0;
        if (res.stop_reason !== "pause_turn") break;
        messages.push({ role: "assistant", content: res.content });
      }
      const text = (res?.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
      const m = text.match(/\{[\s\S]*\}/);
      decided = m ? JSON.parse(m[0]) : null;
      if (!decided) error = "no JSON";
    } catch (e: any) { error = String(e?.message ?? e).slice(0, 300); }

    const kind = String(decided?.kind ?? "");
    const format = decided?.format === "quick" ? "quick" : "course";
    const chapters = format === "quick" ? Math.max(1, Math.min(3, Number(decided?.chapters) || 2)) : 7;
    const wiki = decided?.wikipediaTitle ? await wikipedia(String(decided.wikipediaTitle), STORY.has(kind)) : null;
    const recapUrl = STORY.has(kind) && typeof decided?.recapVideo === "string" ? decided.recapVideo : null;
    const recap = recapUrl ? await transcript(recapUrl) : null;
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
    };
    await ctx.runMutation(internal.handbooks.setBrief, { handbookId, brief });
    await ctx.runMutation(internal.handbooks.logAiCall, { kind: "research", model: "claude-sonnet-5-5", input: ask, output: JSON.stringify({ ...brief, wiki: wiki ? { title: wiki.title, chars: wiki.text.length } : null, recap: recap ? { url: recapUrl, chars: recap.length } : null, nism: nism ? `${nism.length} chars` : null }).slice(0, 4000), tokensIn, tokensOut, ms: Date.now() - started, ok: !error, error });
  },
});
