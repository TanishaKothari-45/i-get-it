import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { factCheck } from "./handbooks";

// D29 (Prateek, 9 Oct 02:1x: "a proper story that usually people would not have heard"): every ready handbook gets three
// true, little-known stories written once, from its own chapters and sources (nothing invented), checked by the same fact
// check as a chapter, and kept on its cache row (waitStories) so the Shelf's syncReady carries them to the wait screen.
// Picture: the handbook's own chapter pictures (one per story), never a new draw. About ₹3 a story on Opus medium.
// Build all: npx convex run --prod stories:buildAll '{}'   One: npx convex run --prod stories:buildFor '{"topic":"Chess"}'
export const STORY_PROMPT = `You write three short true stories for people waiting a minute while their own handbook is written. Each is a TEASER STORY, never a summary: the kind of thing a friend tells you and you say "wait, what?"

Shape, every story:
- Frame 1 opens INSIDE a moment: a person, a place and a date, where something is about to go wrong or is already strange. Never "In 1944, X happened"; start where the reader can see and hear it.
- Frames 2 to 4 raise ONE question and hold it, one turn per frame, with concrete details: a number, a name, an object, a time of day.
- Frame 5 pays it off with the surprising true thing.
- The last frame is one line that points at the handbook ("That's chapter 3 of World War II: the bet Hitler lost in a week") and names the source.
- 40 to 60 words a frame; 5 or 6 frames. Short sentences. Present tense allowed. No "fascinatingly", no "incredible"; no adjective does the work a fact should do. No emoji, no headings.

Truth: only events, names, numbers and dates that the handbook's chapters, its research facts or a source you can name support. You may use well-established history you can cite by name (a standard reference, an official body, a well-known book), and you name it. If you are not sure of a detail, leave it out. Never invent a person, a quote, a number or a date.

Variety: the three stories come from three DIFFERENT chapters of the handbook, not three retellings of the cover fact. Pick the three most surprising true moments the material holds. If the material has fewer, write fewer, or none.

Return JSON only: {"stories":[{"title":"<under 8 words>","chapter":"<the chapter it points at>","frames":["...","...","...","...","..."],"source":"<the named source>"}]}`;

export const readReady = internalQuery({
  args: { topic: v.string() },
  handler: async (ctx, { topic }) => {
    const rows = await ctx.db.query("cache").withIndex("by_topic", (q) => q.eq("topic", topic)).collect();
    const r: any = rows.find((x) => x.level === "new") ?? rows[0];
    if (!r) return null;
    const text = (r.chapters as any[]).map((ch: any) => `## ${ch.title ?? `Chapter ${ch.n}`}\n` + (ch.cards ?? []).filter((c: any) => typeof c?.body === "string").map((c: any) => c.body).join("\n\n")).join("\n\n").slice(0, 16000);
    const pictures: string[] = [];
    for (const ch of r.chapters as any[]) for (const p of (ch.pictures ?? []) as any[]) if (p.storageId && !pictures.includes(p.storageId)) pictures.push(p.storageId);
    return { id: r._id, topic: r.topic, plan: r.plan, text, pictures, have: Array.isArray(r.waitStories) ? r.waitStories.length : 0 };
  },
});
export const save = internalMutation({
  args: { id: v.id("cache"), topic: v.string(), stories: v.any() },
  handler: async (ctx, { id, topic, stories }) => { await ctx.db.patch(id, { waitStories: stories }); await ctx.scheduler.runAfter(0, internal.shelf.syncReadyTopic, { topic }); },
});
export const buildFor = internalAction({
  args: { topic: v.string(), force: v.optional(v.boolean()) },
  handler: async (ctx, { topic, force }): Promise<any> => {
    const r: any = await ctx.runQuery(internal.stories.readReady, { topic });
    if (!r) return { ok: false, error: "no ready handbook with that topic" };
    if (r.have && !force) return { ok: true, skipped: "already has stories" };
    const sources = (r.plan?.sources ?? []).map((s: any) => `- ${s.who}: ${s.what}`).join("\n");
    const user = `Handbook: ${r.topic}\nOutcome: ${r.plan?.outcome7 ?? ""}\nListed sources:\n${sources || "(none)"}\n\nChapters:\n${r.text}\n\nWrite the three stories.`;
    const g: any = await ctx.runAction(internal.ai.generate, { kind: "stories", system: STORY_PROMPT, user, logAs: "stories" });
    if (!g.ok) return { ok: false, error: g.error };
    const raw: any[] = (g.json?.stories ?? []).filter((s: any) => Array.isArray(s?.frames) && s.frames.length >= 3).slice(0, 3);
    // The same fact check as a chapter, frame by frame (each frame as a teach card); a corrected frame replaces its original.
    const cards = raw.flatMap((s: any) => s.frames.map((f: string) => ({ type: "teach", title: s.title, body: f })));
    // Level "some": the check's beginner-term rule (explain every term of art) is not a truth test; only false claims count.
    const checked = await factCheck(ctx, r.topic, "some", "Wait stories", cards, { effort: "low" });
    let k = 0;
    // D29a: a story with a claim the check could not stand behind is dropped, never softened. The check's own notes say
    // when a claim is false or unsupported ("not true", "no evidence", "not established", "invented"…); a note that only
    // confirms or rewords ("correct", "no change needed") keeps the story as written.
    const BAD = /\b(false|not true|untrue|incorrect|wrong|no evidence|not established|unsupported|cannot be verified|unverified|invented|made up|fabricated|did not happen|never happened|misattribut|no record)\b/i;
    const badIdx = new Set((checked.report.notes ?? []).filter((x: string) => BAD.test(String(x)) && !/no false claim|no change needed|is (accurate|correct|true)/i.test(String(x))).map((x: string) => Number(String(x).match(/card (\d+)/)?.[1])).filter((x: number) => Number.isInteger(x)));
    const stories: any[] = [];
    raw.forEach((s: any, i: number) => {
      const start = k; k += s.frames.length;
      const frames = s.frames.map((f: string) => String(f)).filter(Boolean);   // the original words, never the softened ones
      const bad = Array.from({ length: s.frames.length }, (_, j) => start + j).some((idx) => badIdx.has(idx));
      if (bad || frames.length < 4) return;
      stories.push({ title: String(s.title).slice(0, 80), chapter: String(s.chapter ?? "").slice(0, 120), frames, source: String(s.source ?? "").slice(0, 120), storageId: r.pictures[i % Math.max(1, r.pictures.length)] ?? undefined });
    });
    await ctx.runMutation(internal.stories.save, { id: r.id, topic: r.topic, stories });
    return { ok: true, stories: stories.map((s: any) => ({ title: s.title, chapter: s.chapter, frames: s.frames, source: s.source })), dropped: raw.length - stories.length, fixes: checked.report.fixes, notes: checked.report.notes, candidates: raw.map((s: any) => ({ title: s.title, chapter: s.chapter, frames: s.frames, source: s.source })) };
  },
});
export const readyTopics = internalQuery({ args: {}, handler: async (ctx) => [...new Set((await ctx.db.query("cache").collect()).filter((r) => r.level === "new").map((r) => r.topic))] });
export const buildAll = internalAction({
  args: { topics: v.optional(v.array(v.string())), done: v.optional(v.number()) },
  handler: async (ctx, { topics, done = 0 }): Promise<void> => {
    // Hold switch (dc, 9 Oct): a settings row "stories:hold" stops the chain between topics.
    const hold: string | null = await ctx.runQuery(internal.repairData.shrunkFor, { from: "stories:hold" });
    if (hold) { console.log("stories: held"); return; }
    const list: string[] = topics ?? (await ctx.runQuery(internal.stories.readyTopics, {}));
    const [head, ...rest] = list;
    if (!head) { console.log(`stories: ${done} topics done`); return; }
    const r = await ctx.runAction(internal.stories.buildFor, { topic: head }).catch((e: any) => ({ ok: false, error: String(e?.message ?? e) }));
    console.log("stories", head, JSON.stringify(r).slice(0, 200));
    await ctx.scheduler.runAfter(0, internal.stories.buildAll, { topics: rest, done: done + 1 });
  },
});
