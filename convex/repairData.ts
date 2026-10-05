import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { level } from "./schema";

const target = v.union(
  v.object({ kind: v.literal("cache"), topicKey: v.string(), level, n: v.number() }),
  v.object({ kind: v.literal("chapter"), chapterId: v.id("chapters") }),
);

export const read = internalQuery({
  args: { t: target },
  handler: async (ctx, { t }) => {
    if (t.kind === "chapter") return await ctx.db.get(t.chapterId);
    const row = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", t.topicKey).eq("level", t.level)).unique();
    return row?.chapters.find((c: any) => c.n === t.n) ?? null;
  },
});

// Same shuffle as handbooks.ts uses, so recall answers aren't always in the same place.
function shuffle(cards: any[], seed: string): any[] {
  let h = 2166136261;
  for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const rnd = () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
  return cards.map((c) => {
    const order = [0, 1, 2];
    for (let i = 2; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const ids = ["a", "b", "c"];
    const options = order.map((o, k) => ({ id: ids[k], text: c.options[o].text }));
    const answer = ids[order.findIndex((o) => c.options[o].id === c.answer)];
    const whyNot: Record<string, string> = {};
    order.forEach((o, k) => { const old = c.options[o].id; if (c.whyNot?.[old]) whyNot[ids[k]] = c.whyNot[old]; });
    return { ...c, options, answer, whyNot };
  });
}

function fixCards(cards: any[], fixes: any[]): { cards: any[]; fixed: number } {
  let fixed = 0;
  const out = cards.map((c) => ({ ...c }));
  for (const f of fixes) {
    const i = Number(f?.card); const c = out[i];
    if (!c || c.type !== "exercise") continue;
    if (typeof f.reteach === "string" && f.reteach.trim()) { c.reteach = f.reteach.trim(); fixed++; }
    if (f.whyNot && typeof f.whyNot === "object") for (const [id, text] of Object.entries(f.whyNot)) if (c.whyNot?.[id] !== undefined && typeof text === "string" && text.trim()) { c.whyNot = { ...c.whyNot, [id]: text.trim() }; fixed++; }
  }
  // The closing line opens the next chapter with "Next:" (bingeing is fine: Prateek, 6 Oct).
  for (const c of out) {
    if (typeof c.body === "string") c.body = c.body.replace(/\bTomorrow:/g, "Next:");
    if (typeof c.simpler === "string") c.simpler = c.simpler.replace(/\bTomorrow:/g, "Next:");
  }
  return { cards: out, fixed };
}

export const apply = internalMutation({
  args: { t: target, fixes: v.any(), recall: v.any() },
  handler: async (ctx, { t, fixes, recall }) => {
    if (t.kind === "chapter") {
      const ch = await ctx.db.get(t.chapterId);
      if (!ch?.cards) return { fixed: 0, copies: 0 };
      const r = fixCards(ch.cards, fixes);
      await ctx.db.patch(ch._id, { cards: r.cards, recallCards: recall.length ? shuffle(recall, `${ch._id}:recall`) : ch.recallCards });
      return { fixed: r.fixed, copies: 0 };
    }
    const row = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", t.topicKey).eq("level", t.level)).unique();
    const base = row?.chapters.find((c: any) => c.n === t.n);
    if (!row || !base) return { fixed: 0, copies: 0 };
    const r = fixCards(base.cards, fixes);
    const recallCards = recall.length ? shuffle(recall, `${t.topicKey}:${t.n}:recall`) : base.recallCards;
    // Every spelling of the topic with the same chapter, then every reader's untouched copy of it.
    const keys = new Set<string>();
    for (const c of await ctx.db.query("cache").collect()) {
      if (c.level !== t.level || c.topic !== row.topic) continue;
      const m = c.chapters.find((x: any) => x.n === t.n);
      if (!m || m.title !== base.title) continue;
      await ctx.db.patch(c._id, { chapters: c.chapters.map((x: any) => (x.n === t.n ? { ...x, cards: r.cards, recallCards } : x)) });
      keys.add(c.topicKey);
    }
    let copies = 0;
    for (const h of await ctx.db.query("handbooks").collect()) {
      if (h.source !== "cache" || !keys.has(h.topicKey) || h.level !== t.level) continue;
      const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id).eq("n", t.n)).unique();
      if (!ch || ch.title !== base.title || ch.model) continue;   // a copy rewritten for its reader keeps its own text
      await ctx.db.patch(ch._id, { cards: fixCards(ch.cards, fixes).cards, recallCards });
      copies++;
    }
    return { fixed: r.fixed, copies };
  },
});

// Every chapter that needs the repair: ready-topic chapters (one per real topic) and live chapters people have.
export const targets = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("cache").collect();
    const seen = new Map<string, any>();
    for (const r of rows) if (!seen.has(`${r.topic}|${r.level}`)) seen.set(`${r.topic}|${r.level}`, r);
    const out: any[] = [];
    for (const r of seen.values()) for (const c of r.chapters) if (!c.recallCards) out.push({ kind: "cache", topicKey: r.topicKey, level: r.level, n: c.n });
    for (const ch of await ctx.db.query("chapters").collect()) {
      if (ch.status !== "ready" || !ch.cards || ch.recallCards) continue;
      const h = await ctx.db.get(ch.handbookId);
      if (h && (h.source !== "cache" || ch.model)) out.push({ kind: "chapter", chapterId: ch._id });
    }
    return out;
  },
});
