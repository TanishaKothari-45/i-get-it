import { v } from "convex/values";
import { query } from "./_generated/server";

// Public content for the landing page, all from the ready topics: a tappable demo of
// Public speaking chapter 1, its seven-night path, and a shelf of ready topics with cover pictures.
const DEMO_TOPIC = "public speaking";
// The order of the "start one tonight" row under the box (Prateek, 6 Oct): timely and pop-culture topics first.
// Matched against each ready topic's name; anything not listed follows.
const FEATURED = ["odyssey", "iliad", "homer", "avengers", "marvel", "k-pop", "us stock", "abroad", "philosophy", "public speaking", "indian stock", "vibe coding", "swimming"];
const rank = (topic: string) => { const t = topic.toLowerCase(); const i = FEATURED.findIndex((f) => t.includes(f)); return i < 0 ? FEATURED.length : i; };

const firstPara = (s: string) => s.split(/\n\n+/)[0]?.trim() ?? "";
function weekStartIST(t = Date.now()): string {
  const d = new Date(t + 5.5 * 3600000);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export const content = query({
  args: {},
  handler: async (ctx) => {
    const rows = (await ctx.db.query("cache").collect()).filter((r) => r.level === "new");
    const url = async (id?: any) => (id ? await ctx.storage.getUrl(id) : null);
    const pictureFor = async (ch: any, card: number) => url(ch?.pictures?.find((p: any) => p.card === card)?.storageId);

    // One shelf entry per real topic (several spellings share one row's content).
    const seen = new Map<string, any>();
    for (const r of rows) if (!seen.has(r.topic)) seen.set(r.topic, r);
    // Real numbers for the carousel pills (6 Oct): started this week, share passing chapter 1, trending, new.
    const excluded = await ctx.db.query("statsExcluded").collect();
    const xTokens = new Set(excluded.map((e) => e.deviceToken).filter(Boolean) as string[]);
    const books = (await ctx.db.query("handbooks").collect()).filter((h) => h.source === "cache" && !h.ownerToken?.startsWith("abuse-") && !(h.ownerToken && xTokens.has(h.ownerToken)));
    const weekAgo = Date.now() - 7 * 24 * 3600000;
    const thisWeek = weekStartIST();
    const shelf = [];
    for (const r of seen.values()) {
      const ch1 = r.chapters.find((c: any) => c.n === 1);
      const mine = books.filter((h) => h.topic === r.topic);
      let passed = 0;
      for (const h of mine) { const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique(); if (p?.chaptersPassed.includes(1)) passed++; }
      shelf.push({ topic: r.plan?.topic ?? r.topic, outcome: String(r.plan?.outcome7 ?? "").split(/(?<=\.)\s/)[0], cover: await pictureFor(ch1, 0),
        week: mine.filter((h) => h.createdAt >= weekAgo).length, starts: mine.length, passRate: mine.length >= 3 ? passed / mine.length : null,
        trending: r.trendingWeek === thisWeek, addedAt: r.addedAt ?? r._creationTime, mode: r.plan?.mode ?? null,
        improved: !!r.improvedAt && Date.now() - r.improvedAt < 14 * 24 * 3600000 });
    }

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
          frames.push({ kind: c.type, title: c.title, text: firstPara(c.body), picture: await pictureFor(ch, i) });
        }
      }
    }
    return {
      demo: ch ? { topic: demoRow!.plan?.topic ?? demoRow!.topic, title: ch.title, frames, total: (ch.cards ?? []).length } : null,
      path: demoRow?.plan ? { topic: demoRow.plan.topic, outcome: demoRow.plan.outcome7, chapters: (demoRow.plan.chapters ?? []).map((c: any) => ({ n: c.n, title: c.title, hook: c.hook })) } : null,
      shelf: shelf.sort((x, y) => rank(x.topic) - rank(y.topic) || Number(!x.cover) - Number(!y.cover)),
    };
  },
});

// A story to read while a new plan is written (Prateek, 6 Oct): one "Story time" card with its picture from a
// ready handbook, so the wait is worth something and the reader can add that handbook too. The seed picks which.
export const waitStory = query({
  args: { seed: v.number() },
  handler: async (ctx, { seed }) => {
    const rows = (await ctx.db.query("cache").collect()).filter((r) => r.level === "new");
    const seen = new Map<string, any>();
    for (const r of rows) if (!seen.has(r.topic)) seen.set(r.topic, r);
    const stories: { topic: string; chapter: string; title?: string; text: string; storageId: any }[] = [];
    for (const r of seen.values()) for (const ch of r.chapters) (ch.cards ?? []).forEach((c: any, i: number) => {
      const pic = ch.pictures?.find((p: any) => p.card === i && p.storageId);
      if (c?.type === "example" && typeof c.body === "string" && pic) stories.push({ topic: r.plan?.topic ?? r.topic, chapter: ch.title ?? `Chapter ${ch.n}`, title: c.title, text: c.body, storageId: pic.storageId });
    });
    if (!stories.length) return null;
    const s = stories[Math.abs(Math.floor(seed)) % stories.length];
    return { topic: s.topic, chapter: s.chapter, title: s.title ?? null, text: s.text, picture: await ctx.storage.getUrl(s.storageId), count: stories.length };
  },
});
