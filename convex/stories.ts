import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { factCheck } from "./handbooks";

// D29 (Prateek, 9 Oct 02:1x: "a proper story that usually people would not have heard"): every ready handbook gets three
// true, little-known stories written once, from its own chapters and sources (nothing invented), checked by the same fact
// check as a chapter, and kept on its cache row (waitStories) so the Shelf's syncReady carries them to the wait screen.
// Picture: the handbook's own chapter pictures (one per story), never a new draw. About ₹3 a story on Opus medium.
// Build all: npx convex run --prod stories:buildAll '{}'   One: npx convex run --prod stories:buildFor '{"topic":"Chess"}'
export const STORY_PROMPT = `You write three short true stories for people waiting a minute while their own handbook is written. Each story is something most people have not heard: a real moment, a real person's decision, a surprising fact with its consequence, drawn ONLY from the handbook material you are given (its chapters and its listed sources). Never invent a person, a number, a date or a quote. If the material has no such story, write fewer, or none.

Each story: a title (under 8 words), 4 to 6 frames of 40 to 60 words each (a frame is one phone screen), opening on the surprising fact itself, told plainly like a friend who knows the subject, ending with one frame that names where it comes from (the chapter or the listed source). Plain words, short sentences, no emoji, no headings.

Return JSON only: {"stories":[{"title":"...","frames":["...","...","...","..."],"source":"<the chapter title or the listed source it comes from>"}]}`;

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
    const checked = await factCheck(ctx, r.topic, "new", "Wait stories", cards, { effort: "low" });
    let k = 0;
    const stories = raw.map((s: any, i: number) => ({ title: String(s.title).slice(0, 80), frames: s.frames.map(() => String(checked.cards[k++]?.body ?? "")).filter(Boolean), source: String(s.source ?? "").slice(0, 120), storageId: r.pictures[i % Math.max(1, r.pictures.length)] ?? undefined }));
    await ctx.runMutation(internal.stories.save, { id: r.id, topic: r.topic, stories });
    return { ok: true, stories: stories.map((s: any) => ({ title: s.title, frames: s.frames.length, source: s.source })), fixes: checked.report.fixes };
  },
});
export const readyTopics = internalQuery({ args: {}, handler: async (ctx) => [...new Set((await ctx.db.query("cache").collect()).filter((r) => r.level === "new").map((r) => r.topic))] });
export const buildAll = internalAction({
  args: { topics: v.optional(v.array(v.string())), done: v.optional(v.number()) },
  handler: async (ctx, { topics, done = 0 }): Promise<void> => {
    const list: string[] = topics ?? (await ctx.runQuery(internal.stories.readyTopics, {}));
    const [head, ...rest] = list;
    if (!head) { console.log(`stories: ${done} topics done`); return; }
    const r = await ctx.runAction(internal.stories.buildFor, { topic: head }).catch((e: any) => ({ ok: false, error: String(e?.message ?? e) }));
    console.log("stories", head, JSON.stringify(r).slice(0, 200));
    await ctx.scheduler.runAfter(0, internal.stories.buildAll, { topics: rest, done: done + 1 });
  },
});
