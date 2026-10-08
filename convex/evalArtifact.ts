import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Test (8 Oct, Prateek: "why can't we have Claude-like artifacts as our explainers?"): one interactive HTML explainer
// per chapter, written by Sonnet from the chapter's own cards, shown in the app inside a locked iframe (no network, no
// access to the reader's data). Measurement only: nothing is stored. Run on dev:
//   npx convex run evalArtifact:one '{"topic":"...","title":"...","level":"new","cards":[...]}'
export const ARTIFACT_PROMPT = `You build one small interactive explainer for one chapter of a phone handbook. The reader has just read the chapter's cards. Your page lets them DO the chapter's one idea with their thumb, in under a minute.

Rules:
- One idea only: the chapter's central idea, as the cards state it. Nothing the cards don't teach. Every number on screen comes from the cards or from the reader's own input.
- A phone screen: 390 px wide, portrait, everything visible without scrolling in 560 px of height. Large touch targets (at least 44 px). Text at least 16 px. One line of instruction at the top, in plain words.
- 2 to 3 interactions (a tap, a drag, a slider, a choice). Each one changes something the reader can see at once. The last one makes the idea land: a line of text that states what they just saw.
- Self-contained: one HTML document with inline <style> and <script>. No external files, fonts, images, libraries, fetch, storage, cookies, alert or prompt. Draw with CSS, inline SVG or canvas. Under 40 KB.
- Look: paper #FAF7F0 background, ink #1B1A17 text, marigold #F2A93B, green #1F7A4D, indigo #2F3E8C as accents. Rounded corners. System font. No emoji. Respect prefers-reduced-motion.
- When the reader has done the key interaction, run: parent.postMessage({ type: "done" }, "*").
- Works with no mouse hover; everything by tap or drag.

Return JSON only: {"idea": "<one line: what the reader will do and see>", "html": "<the whole HTML document as one JSON string, with quotes and newlines escaped>"}`;

export function artifactUserMessage(topic: string, title: string, level: string, cards: any[]) {
  const text = cards.map((c: any, i: number) => `Card ${i + 1} (${c.type}${c.title ? `: ${c.title}` : ""}): ${c.type === "exercise" ? c.prompt : c.body ?? ""}`).join("\n\n");
  return `Topic: ${topic}\nChapter: ${title}\nLevel: ${level}\n\nThe chapter's cards:\n${text}`;
}

export const one = internalAction({
  args: { topic: v.string(), title: v.string(), level: v.optional(v.string()), cards: v.any() },
  handler: async (ctx, { topic, title, level = "new", cards }): Promise<any> => {
    const t0 = Date.now();
    const r: any = await ctx.runAction(internal.ai.generate, { kind: "artifact", system: ARTIFACT_PROMPT, user: artifactUserMessage(topic, title, level, cards) });
    const ms = Date.now() - t0;
    if (!r.ok) return { ok: false, ms, error: r.error };
    const html: string = String(r.json.html ?? "");
    const external = (html.match(/(src|href)\s*=\s*["']https?:/gi) ?? []).length + (html.match(/\b(fetch|XMLHttpRequest|localStorage|import\()/g) ?? []).length;
    return { ok: true, ms, tokensIn: r.tokensIn, tokensOut: r.tokensOut, idea: r.json.idea, bytes: html.length, external, html };
  },
});
