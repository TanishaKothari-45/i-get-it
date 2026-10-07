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
export function weekStartIST(t = Date.now()): string {
  const d = new Date(t + 5.5 * 3600000);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export const content = query({
  args: {},
  handler: async (ctx) => {
    const url = async (id?: any) => (id ? await ctx.storage.getUrl(id) : null);
    const pictureFor = async (ch: any, card: number) => url(ch?.pictures?.find((p: any) => p.card === card)?.storageId);
    // The shelf (shelf.ts) holds one light row per ready topic, so this page never loads every full handbook (7 Oct).
    const rows = (await ctx.db.query("shelf").withIndex("by_kind", (q) => q.eq("kind", "ready")).collect()).filter((r) => r.level === "new");
    // Real numbers for the carousel pills (6 Oct): started this week, share passing chapter 1, trending, new.
    const excluded = await ctx.db.query("statsExcluded").collect();
    const xTokens = new Set(excluded.map((e) => e.deviceToken).filter(Boolean) as string[]);
    const weekAgo = Date.now() - 7 * 24 * 3600000;
    const recent = (await ctx.db.query("handbooks").withIndex("by_created", (q) => q.gte("createdAt", weekAgo)).collect())
      .filter((h) => h.source === "cache" && !h.ownerToken?.startsWith("abuse-") && !(h.ownerToken && xTokens.has(h.ownerToken)));
    const thisWeek = weekStartIST();
    const shelf = [];
    for (const r of rows) {
      shelf.push({ topic: r.title, outcome: r.outcome, cover: await url(r.cover),
        week: recent.filter((h) => h.topic === r.topic).length, starts: r.starts, passRate: r.starts >= 3 ? r.passes / r.starts : null,
        trending: r.trendingWeek === thisWeek, addedAt: r.addedAt, mode: r.mode ?? null,
        improved: !!r.improvedAt && Date.now() - r.improvedAt < 14 * 24 * 3600000 });
    }

    const demoRow = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", DEMO_TOPIC).eq("level", "new")).unique();
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
    const rows = await ctx.db.query("shelf").withIndex("by_kind", (q) => q.eq("kind", "ready")).collect();
    const stories: { topic: string; chapter: string; title?: string; text: string; storageId: any }[] = [];
    for (const r of rows) for (const st of (r.stories ?? []) as any[]) stories.push({ topic: r.title, chapter: st.chapter, title: st.title ?? undefined, text: st.text, storageId: st.storageId });
    if (!stories.length) return null;
    const s = stories[Math.abs(Math.floor(seed)) % stories.length];
    return { topic: s.topic, chapter: s.chapter, title: s.title ?? null, text: s.text, picture: await ctx.storage.getUrl(s.storageId), count: stories.length };
  },
});

