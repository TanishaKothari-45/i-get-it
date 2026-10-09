import { v } from "convex/values";
import { smallUrl } from "./pictures";
import { query } from "./_generated/server";
import { onShelf } from "./shelf";

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
    const url = async (id?: any) => (id ? await smallUrl(ctx, id) : null);   // D29b: the small variant when one exists
    const pictureFor = async (ch: any, card: number) => url(ch?.pictures?.find((p: any) => p.card === card)?.storageId);
    // The shelf (shelf.ts) holds one light row per ready topic, so this page never loads every full handbook (7 Oct).
    const rows = (await ctx.db.query("shelf").withIndex("by_kind", (q) => q.eq("kind", "ready")).collect()).filter((r) => r.level === "new" && onShelf(r));   // D34
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
      demo: ch ? { topic: demoRow!.topic, title: ch.title, frames, total: (ch.cards ?? []).length } : null,
      path: demoRow?.plan ? { topic: demoRow.plan.topic, outcome: demoRow.plan.outcome7, chapters: (demoRow.plan.chapters ?? []).map((c: any) => ({ n: c.n, title: c.title, hook: c.hook })) } : null,
      shelf: shelf.sort((x, y) => rank(x.topic) - rank(y.topic) || Number(!x.cover) - Number(!y.cover)),
    };
  },
});

// A story to read while a new plan is written (Prateek, 6 Oct): one "Story time" card with its picture from a
// ready handbook, so the wait is worth something and the reader can add that handbook too. The seed picks which.
// D29 (Prateek, 9 Oct 02:1x): a proper story while the handbook is written. A handbook is picked first, then one of its
// stories, so no topic dominates; never the topic the reader is waiting for. Returns every frame, the typed name, and
// what the UI needs to start that handbook with one tap (kind "ready" + topic; the UI calls the same start as the Shelf).
export const waitStory = query({
  args: { seed: v.number(), exclude: v.optional(v.string()) },
  handler: async (ctx, { seed, exclude }) => {
    const ex = (exclude ?? "").trim().toLowerCase();
    const rows = (await ctx.db.query("shelf").withIndex("by_kind", (q) => q.eq("kind", "ready")).collect())
      .filter((r) => onShelf(r) && (r.stories ?? []).length && r.title.toLowerCase() !== ex && r.topic.toLowerCase() !== ex);   // D34: a story never sells a handbook that is off the Shelf
    if (!rows.length) return null;
    const n = Math.abs(Math.floor(seed));
    // D29a: the scroll moves between genres: pick a kind first (by the plan's mode and caution), then a handbook in it, then a story.
    const kindOf = (r: any) => (r.caution && r.caution !== "none" ? "decision" : r.mode === "story" ? "story" : r.mode === "skill" ? "skill" : "subject");
    const kinds = [...new Set(rows.map(kindOf))];
    const kind = kinds[n % kinds.length];
    const inKind = rows.filter((r) => kindOf(r) === kind);
    const r = inKind[Math.floor(n / kinds.length) % inKind.length];
    const list = r.stories as any[];
    const st = list[Math.floor(n / (kinds.length * inKind.length)) % list.length];
    const frames: string[] = Array.isArray(st.frames) && st.frames.length ? st.frames : String(st.text ?? "").split(/\n\s*\n/).filter(Boolean);
    return {
      topic: r.title, key: r.key, kind: r.kind, title: st.title ?? null, frames, text: frames.join("\n\n"), source: st.source ?? null,
      chapter: st.chapter ?? "", picture: st.storageId ? await smallUrl(ctx, st.storageId) : null, pictureFull: st.storageId ? await ctx.storage.getUrl(st.storageId) : null,
      count: rows.reduce((t, x) => t + (x.stories ?? []).length, 0), handbooks: rows.length,
    };
  },
});

