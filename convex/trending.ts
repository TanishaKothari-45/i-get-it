"use node";
import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// This week's trending handbooks (6 Oct, Prateek: "handbooks for topics popular on social media this week").
// Every Monday (crons.ts), Claude searches the web for what's trending on Indian social media that makes a good 7-night
// handbook, then up to 3 new ready topics are written (plan, 7 checked chapters, chapter 1 polish, pictures) and tagged.
const PROMPT = `You pick handbook topics for I Get It, an app that teaches anything in seven 20-minute chapters. First run at least 2 web searches (for example "trending in India this week Instagram", "top YouTube trends India this week", "biggest releases this week India"), then answer only from what the searches show. Find what is trending on social media in India this week (Instagram, YouTube, X): a film or series release, a sports event, a tech or product launch, a cultural moment, a skill or hobby wave.
Choose topics a curious adult would enjoy learning about in 7 short nights because of this week's buzz. Each must be evergreen enough to stay true for months (the film's story and world, the sport's rules and history, how the technology works), not a news update.
Never pick politics, wars or conflicts, crimes, disasters or tragedies, gossip about private people, or anything unkind.
Skip anything already on the shelf (given).
Return JSON only: {"topics": [{"line": "<the topic as a learner would type it, under 10 words>", "goal": "<the reason this week, under 10 words>", "mode": "skill|story|subject", "why": "<one line: what is trending and where, from the search results>"}]} with 5 topics, best first. If the searches show nothing usable, return {"topics": []}.`;

function weekStartIST(t = Date.now()): string {
  const d = new Date(t + 5.5 * 3600000);
  const day = (d.getUTCDay() + 6) % 7;   // Monday = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export const refresh = internalAction({
  args: { max: v.optional(v.number()) },
  handler: async (ctx, { max = 3 }): Promise<any> => {
    const shelf: any[] = await ctx.runQuery(internal.handbooks.listCache, {});
    const topics = [...new Set(shelf.map((r) => String(r.topic)))];
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const messages: any[] = [{ role: "user", content: `Already on the shelf: ${topics.join("; ")}\nToday: ${new Date().toISOString().slice(0, 10)}` }];
    let res: any, searches = 0;
    for (let i = 0; i < 4; i++) {
      res = await client.beta.messages.create({ model: "claude-sonnet-5-5", max_tokens: 4000, system: PROMPT, messages,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 } as any], output_config: { effort: "low" } as any } as any);
      searches += res.usage?.server_tool_use?.web_search_requests ?? 0;
      if (res.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: res.content });
    }
    const text = (res?.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    // Trending means searched: no searches, no new handbooks.
    const picks = m && searches > 0 ? (JSON.parse(m[0]).topics ?? []) : [];
    const lower = topics.map((t) => t.toLowerCase());
    const week = weekStartIST();
    const chosen = picks.filter((p: any) => p?.line && !lower.some((t) => t.includes(String(p.line).toLowerCase()) || String(p.line).toLowerCase().includes(t))).slice(0, max);
    for (const p of chosen) {
      await ctx.scheduler.runAfter(0, internal.ready.build, { topic: String(p.line).slice(0, 120), goal: String(p.goal ?? "").slice(0, 120) || undefined,
        mode: ["skill", "story", "subject"].includes(p.mode) ? p.mode : undefined, trendingWeek: week, aliases: [] });
    }
    console.log("trending", week, JSON.stringify(picks.map((p: any) => `${p.line} (${p.why})`)), "building:", JSON.stringify(chosen.map((p: any) => p.line)));
    return { week, searches, stop: res?.stop_reason, picks, building: chosen.map((p: any) => p.line), raw: searches ? undefined : text.slice(0, 400) };
  },
});
