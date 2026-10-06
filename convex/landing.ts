import { v } from "convex/values";
import { internalMutation, query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { readSummary, saveSummary } from "./summaries";

// Public content for the landing page, all from the ready topics: a tappable demo of
// Public speaking chapter 1, its seven-night path, and a shelf of ready topics with cover pictures.
const DEMO_TOPIC = "public speaking";
// The order of the "start one tonight" row under the box (Prateek, 6 Oct): timely and pop-culture topics first.
// Matched against each ready topic's name; anything not listed follows.
const FEATURED = ["odyssey", "iliad", "homer", "avengers", "marvel", "k-pop", "us stock", "abroad", "philosophy", "public speaking", "indian stock", "vibe coding", "swimming"];
const rank = (topic: string) => { const t = topic.toLowerCase(); const i = FEATURED.findIndex((f) => t.includes(f)); return i < 0 ? FEATURED.length : i; };

const firstPara = (s: string) => s.split(/\n\n+/)[0]?.trim() ?? "";

// Everything the first screen needs from the ready topics, with pictures as storage ids (turned into links when read).
// Built from the whole cache table, so it's stored as a summary: rebuilt when the cache changes and every 15
// minutes (crons.ts), never once per visitor. A waiting story is kept as where it is, not its text.
type StoryRef = { topicKey: string; level: "new" | "some"; n: number; card: number };
type Landing = {
  shelf: { topic: string; outcome: string; cover: Id<"_storage"> | null }[];
  demo: { topic: string; title: string; total: number; frames: any[] } | null;
  path: { topic: string; outcome: string; chapters: { n: number; title: string; hook: string }[] } | null;
  stories: StoryRef[];
  topics: string[];   // every ready topic's name, for the examples under the box
};

async function buildLanding(ctx: QueryCtx): Promise<Landing> {
  const all = await ctx.db.query("cache").collect();
  const rows = all.filter((r) => r.level === "new");
  const pictureId = (ch: any, card: number): Id<"_storage"> | null => ch?.pictures?.find((p: any) => p.card === card)?.storageId ?? null;

  // One shelf entry per real topic (several spellings share one row's content).
  const seen = new Map<string, any>();
  for (const r of rows) if (!seen.has(r.topic)) seen.set(r.topic, r);
  const shelf = [...seen.values()].map((r) => ({
    topic: r.plan?.topic ?? r.topic,
    outcome: String(r.plan?.outcome7 ?? "").split(/(?<=\.)\s/)[0],
    cover: pictureId(r.chapters.find((c: any) => c.n === 1), 0),
  }));

  const demoRow = rows.find((r) => r.topicKey === DEMO_TOPIC);
  const ch = demoRow?.chapters.find((c: any) => c.n === 1);
  const frames: any[] = [];
  if (ch) {
    for (const [i, c] of (ch.cards ?? []).entries()) {
      if (frames.length >= 6) break;
      if (c.type === "exercise") {
        if (frames.some((f) => f.kind === "exercise")) continue;
        frames.push({ kind: "exercise", prompt: c.prompt, options: c.options, answer: c.answer, whyNot: c.whyNot ?? {} });
      } else if (c.type !== "watch" && typeof c.body === "string") {
        frames.push({ kind: c.type, title: c.title, text: firstPara(c.body), picture: pictureId(ch, i) });
      }
    }
  }

  // A story to read while a new plan is written: every "example" card with a picture, from each real topic.
  const stories: StoryRef[] = [];
  for (const r of seen.values()) for (const c of r.chapters) (c.cards ?? []).forEach((card: any, i: number) => {
    if (card?.type === "example" && typeof card.body === "string" && c.pictures?.some((p: any) => p.card === i && p.storageId)) stories.push({ topicKey: r.topicKey, level: r.level, n: c.n, card: i });
  });

  const names = new Map<string, string>();
  for (const r of all) if (!names.has(r.topic)) names.set(r.topic, r.plan?.topic ?? r.topic);

  return {
    shelf: shelf.sort((x, y) => rank(x.topic) - rank(y.topic) || Number(!x.cover) - Number(!y.cover)),
    demo: ch ? { topic: demoRow!.plan?.topic ?? demoRow!.topic, title: ch.title, frames, total: (ch.cards ?? []).length } : null,
    path: demoRow?.plan ? { topic: demoRow.plan.topic, outcome: demoRow.plan.outcome7, chapters: (demoRow.plan.chapters ?? []).map((c: any) => ({ n: c.n, title: c.title, hook: c.hook })) } : null,
    stories,
    topics: [...names.values()],
  };
}

// The stored summary, or (before the first rebuild) built on the spot.
export async function landingSummary(ctx: QueryCtx): Promise<Landing> {
  return ((await readSummary(ctx, "landing"))?.data as Landing | undefined) ?? (await buildLanding(ctx));
}

export const rebuildLanding = internalMutation({
  args: {},
  handler: async (ctx) => { await saveSummary(ctx, "landing", await buildLanding(ctx)); },
});

export const content = query({
  args: {},
  handler: async (ctx) => {
    const l = await landingSummary(ctx);
    const url = async (id: Id<"_storage"> | null | undefined) => (id ? await ctx.storage.getUrl(id) : null);
    return {
      demo: l.demo ? { ...l.demo, frames: await Promise.all(l.demo.frames.map(async (f) => (f.kind === "exercise" ? f : { ...f, picture: await url(f.picture) }))) } : null,
      path: l.path,
      shelf: await Promise.all(l.shelf.map(async (x) => ({ ...x, cover: await url(x.cover) }))),
    };
  },
});

// A story to read while a new plan is written (Prateek, 6 Oct): one "Story time" card with its picture from a
// ready handbook, so the wait is worth something and the reader can add that handbook too. The seed picks which.
export const waitStory = query({
  args: { seed: v.number() },
  handler: async (ctx, { seed }) => {
    const { stories } = await landingSummary(ctx);
    if (!stories.length) return null;
    const ref = stories[Math.abs(Math.floor(seed)) % stories.length];
    const row = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", ref.topicKey).eq("level", ref.level)).unique();
    const ch = row?.chapters.find((c: any) => c.n === ref.n);
    const card = ch?.cards?.[ref.card];
    const pic = ch?.pictures?.find((p: any) => p.card === ref.card && p.storageId);
    if (!row || !card || !pic) return null;   // the cache changed since the last rebuild
    return { topic: row.plan?.topic ?? row.topic, chapter: ch.title ?? `Chapter ${ch.n}`, title: card.title ?? null, text: card.body, picture: await ctx.storage.getUrl(pic.storageId), count: stories.length };
  },
});
