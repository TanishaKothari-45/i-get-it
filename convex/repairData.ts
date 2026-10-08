import { v } from "convex/values";
import { internal } from "./_generated/api";
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

// Options rebalanced (BALANCE_PROMPT): replace option texts by id, only when the ids match exactly.
function balanceCards(cards: any[], fixes: any[], where: "cards" | "recall"): { cards: any[]; fixed: number } {
  let fixed = 0;
  const out = (cards ?? []).map((c) => ({ ...c }));
  for (const f of fixes) {
    if (f?.where !== where) continue;
    const c = out[Number(f.index)];
    if (!c || c.type !== "exercise" || !Array.isArray(f.options) || f.options.length !== 3) continue;
    const ids = new Set(c.options.map((o: any) => o.id));
    if (!f.options.every((o: any) => ids.has(o?.id) && typeof o.text === "string" && o.text.trim())) continue;
    c.options = c.options.map((o: any) => ({ ...o, text: f.options.find((x: any) => x.id === o.id).text.trim() }));
    fixed++;
  }
  return { cards: out, fixed };
}

export const applyBalance = internalMutation({
  args: { t: target, fixes: v.any() },
  handler: async (ctx, { t, fixes }) => {
    if (t.kind === "chapter") {
      const ch = await ctx.db.get(t.chapterId);
      if (!ch?.cards) return { fixed: 0, copies: 0 };
      const a = balanceCards(ch.cards, fixes, "cards"), b = balanceCards(ch.recallCards ?? [], fixes, "recall");
      await ctx.db.patch(ch._id, { cards: a.cards, ...(ch.recallCards ? { recallCards: b.cards } : {}) });
      return { fixed: a.fixed + b.fixed, copies: 0 };
    }
    const row = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", t.topicKey).eq("level", t.level)).unique();
    const base = row?.chapters.find((c: any) => c.n === t.n);
    if (!row || !base) return { fixed: 0, copies: 0 };
    const a = balanceCards(base.cards, fixes, "cards"), b = balanceCards(base.recallCards ?? [], fixes, "recall");
    const keys = new Set<string>();
    for (const c of await ctx.db.query("cache").collect()) {
      if (c.level !== t.level || c.topic !== row.topic) continue;
      const m = c.chapters.find((x: any) => x.n === t.n);
      if (!m || m.title !== base.title) continue;
      await ctx.db.patch(c._id, { chapters: c.chapters.map((x: any) => (x.n === t.n ? { ...x, cards: a.cards, ...(base.recallCards ? { recallCards: b.cards } : {}) } : x)) });
      keys.add(c.topicKey);
    }
    let copies = 0;
    for (const h of await ctx.db.query("handbooks").collect()) {
      if (h.source !== "cache" || !keys.has(h.topicKey) || h.level !== t.level) continue;
      const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id).eq("n", t.n)).unique();
      if (!ch || ch.title !== base.title || ch.model) continue;
      await ctx.db.patch(ch._id, { cards: balanceCards(ch.cards, fixes, "cards").cards, ...(ch.recallCards ? { recallCards: balanceCards(ch.recallCards, fixes, "recall").cards } : {}) });
      copies++;
    }
    return { fixed: a.fixed + b.fixed, copies };
  },
});

// Chapters with at least one quiz whose right option is the longest by 10% or more.
function uneven(cards: any[]): boolean {
  return (cards ?? []).some((c: any) => {
    if (c?.type !== "exercise" || !Array.isArray(c.options)) return false;
    const right = c.options.find((o: any) => o.id === c.answer)?.text?.length ?? 0;
    const others = c.options.filter((o: any) => o.id !== c.answer).map((o: any) => o.text?.length ?? 0);
    return right >= 1.1 * Math.max(...others);
  });
}
export const balanceTargets = internalQuery({
  args: {},
  handler: async (ctx) => {
    const seen = new Map<string, any>();
    for (const r of await ctx.db.query("cache").collect()) if (!seen.has(`${r.topic}|${r.level}`)) seen.set(`${r.topic}|${r.level}`, r);
    const out: any[] = [];
    for (const r of seen.values()) for (const c of r.chapters) if (uneven([...(c.cards ?? []), ...(c.recallCards ?? [])])) out.push({ kind: "cache", topicKey: r.topicKey, level: r.level, n: c.n });
    for (const ch of await ctx.db.query("chapters").collect()) {
      if (ch.status !== "ready" || !ch.cards || !uneven([...ch.cards, ...(ch.recallCards ?? [])])) continue;
      const h = await ctx.db.get(ch.handbookId);
      if (h && (h.source !== "cache" || ch.model)) out.push({ kind: "chapter", chapterId: ch._id });
    }
    return out;
  },
});

// Whole-card rewrites for a ready topic's chapter (the chapter 1 polish, 6 Oct): every spelling of the topic,
// then only readers' copies they haven't started (a reader mid-chapter keeps the cards they're reading).
export const replaceCards = internalMutation({
  // recallCards and resetPictures (7 Oct, the 6-card chapter 1): a whole new chapter brings its own recall questions,
  // and the old pictures point at card numbers that no longer match, so they are cleared for a redraw.
  args: { topicKey: v.string(), level: v.union(v.literal("new"), v.literal("some")), n: v.number(), cards: v.any(), recallCards: v.optional(v.any()), resetPictures: v.optional(v.boolean()) },
  handler: async (ctx, { topicKey, level: lvl, n, cards, recallCards, resetPictures }) => {
    const extra: any = { ...(recallCards ? { recallCards } : {}), ...(resetPictures ? { pictures: [] } : {}) };
    const row = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", topicKey).eq("level", lvl)).unique();
    const base = row?.chapters.find((c: any) => c.n === n);
    if (!row || !base || !Array.isArray(cards) || cards.length < 5) return { rows: 0, copies: 0 };
    const keys = new Set<string>();
    let rows = 0;
    for (const c of await ctx.db.query("cache").collect()) {
      if (c.level !== lvl || c.topic !== row.topic) continue;
      const m = c.chapters.find((x: any) => x.n === n);
      if (!m || m.title !== base.title) continue;
      await ctx.db.patch(c._id, { chapters: c.chapters.map((x: any) => (x.n === n ? { ...x, cards, ...extra } : x)), version: Date.now() });
      keys.add(c.topicKey); rows++;
    }
    let copies = 0;
    for (const h of await ctx.db.query("handbooks").collect()) {
      if (h.source !== "cache" || !keys.has(h.topicKey) || h.level !== lvl) continue;
      const ch = await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id).eq("n", n)).unique();
      if (!ch || ch.title !== base.title || ch.model) continue;
      const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
      const unread = !p || p.currentChapter < n || (p.currentChapter === n && p.currentCard === 0 && !p.chaptersPassed.includes(n));
      if (!unread) continue;
      await ctx.db.patch(ch._id, { cards, ...extra, ...(resetPictures ? { picturesStatus: undefined } : {}) });
      copies++;
    }
    await ctx.scheduler.runAfter(0, internal.shelf.syncReadyTopic, { topic: row.topic });
    return { rows, copies };
  },
});

// Take a superseded ready topic off the shelf (6 Oct: the old Avengers handbook, replaced by the story-mode one).
// Readers who started it keep their own copies; only the shelf entry goes.
export const dropCacheRow = internalMutation({
  args: { topicKey: v.string(), level: v.union(v.literal("new"), v.literal("some")) },
  handler: async (ctx, { topicKey, level: lvl }) => {
    const row = await ctx.db.query("cache").withIndex("by_key", (q) => q.eq("topicKey", topicKey).eq("level", lvl)).unique();
    if (!row) return { removed: 0 };
    await ctx.db.delete(row._id);
    await ctx.scheduler.runAfter(0, internal.shelf.syncReadyTopic, { topic: row.topic });
    return { removed: 1, topic: row.topic };
  },
});

// Chapter 1 becomes reading only (Prateek, 6 Oct: "stop quizzes in chapter 1"). Removes quiz cards (story polls stay)
// from chapter 1 of ready topics, shared library entries and readers' copies they haven't started; each picture moves
// with its card. Stops running A/B tests (they compared quiz orders). Run once: npx convex run repairData:stripChapter1Quizzes
function strip(ch: any) {
  if (!ch?.cards) return null;
  const keep: number[] = [];
  ch.cards.forEach((c: any, i: number) => { if (!(c?.type === "exercise" && c.kind !== "poll")) keep.push(i); });
  if (keep.length === ch.cards.length) return null;
  const map = new Map(keep.map((old, k) => [old, k]));
  return { cards: keep.map((i) => ch.cards[i]), pictures: (ch.pictures ?? []).filter((p: any) => map.has(p.card)).map((p: any) => ({ ...p, card: map.get(p.card) })) };
}
export const stripChapter1Quizzes = internalMutation({
  args: {},
  handler: async (ctx) => {
    let rows = 0, library = 0, copies = 0, tests = 0;
    for (const c of await ctx.db.query("cache").collect()) {
      const ch1 = c.chapters.find((x: any) => x.n === 1); const s = strip(ch1);
      if (!s) continue;
      await ctx.db.patch(c._id, { chapters: c.chapters.map((x: any) => (x.n === 1 ? { ...x, ...s } : x)), version: Date.now() }); rows++;
    }
    for (const l of await ctx.db.query("library").collect()) {
      const s = strip(l.chapter1); if (!s) continue;
      await ctx.db.patch(l._id, { chapter1: { ...l.chapter1, ...s } }); library++;
    }
    for (const ch of await ctx.db.query("chapters").collect()) {
      if (ch.n !== 1) continue;
      const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", ch.handbookId)).unique();
      if (p && (p.currentCard > 0 || p.chaptersPassed.includes(1) || p.currentChapter > 1)) continue;   // they've started: leave it
      const s = strip(ch); if (!s) continue;
      await ctx.db.patch(ch._id, { cards: s.cards, pictures: s.pictures }); copies++;
    }
    for (const e of await ctx.db.query("experiments").collect()) {
      if (e.status !== "running") continue;
      await ctx.db.patch(e._id, { status: "stopped", endedAt: Date.now(), diagnosis: e.diagnosis + " (Stopped 6 Oct: chapter 1 became reading only.)" }); tests++;
    }
    return { rows, library, copies, tests };
  },
});

// Story topics take no quizzes at all (Prateek, 7 Oct: "we don't need to quiz them like for avengers").
// Strips every exercise (polls too) and the recall cards from story-mode ready topics, and from readers' copies of
// chapters they haven't started. Chapters someone is partway through are left alone. dryRun only counts.
function stripAll(ch: any) {
  if (!ch?.cards) return null;
  const keep: number[] = [];
  ch.cards.forEach((c: any, i: number) => { if (c?.type !== "exercise") keep.push(i); });
  if (keep.length === ch.cards.length && !(ch.recallCards?.length)) return null;
  const map = new Map(keep.map((old, k) => [old, k]));
  return { cards: keep.map((i) => ch.cards[i]), pictures: (ch.pictures ?? []).filter((p: any) => map.has(p.card)).map((p: any) => ({ ...p, card: map.get(p.card) })), recallCards: [] };
}
export const stripStoryQuizzes = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun = true }) => {
    const topics = new Set<string>(); let rows = 0, copies = 0, skippedStarted = 0;
    for (const c of await ctx.db.query("cache").collect()) {
      if ((c.plan as any)?.mode !== "story") continue;
      topics.add(c.topic);
      const chapters = c.chapters.map((x: any) => { const s = stripAll(x); return s ? { ...x, ...s } : x; });
      if (JSON.stringify(chapters) === JSON.stringify(c.chapters)) continue;
      if (!dryRun) await ctx.db.patch(c._id, { chapters, version: Date.now() });
      rows++;
    }
    for (const h of await ctx.db.query("handbooks").collect()) {
      if (h.source !== "cache" || !topics.has(h.topic)) continue;
      const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
      for (const ch of await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id)).collect()) {
        if (p && (p.chaptersPassed.includes(ch.n) || (p.currentChapter === ch.n && p.currentCard > 0))) { skippedStarted++; continue; }
        const s = stripAll(ch); if (!s) continue;
        if (!dryRun) await ctx.db.patch(ch._id, s as any);
        copies++;
      }
    }
    return { dryRun, topics: [...topics], rows, copies, skippedStarted };
  },
});

// Swap one name for another across a ready topic (every spelling's stored copy and readers' copies), in cards, recall
// quizzes and quiz levels. 7 Oct: an Indian name in the international finance ad topic. Whole words only.
export const renameInTopic = internalMutation({
  args: { topic: v.string(), from: v.string(), to: v.string() },
  handler: async (ctx, { topic, from, to }) => {
    const re = new RegExp(`\\b${from.replace(/[^A-Za-z]/g, "")}\\b`, "g");
    const swap = (x: any) => JSON.parse(JSON.stringify(x).replace(re, to));
    let rows = 0, copies = 0;
    for (const c of await ctx.db.query("cache").withIndex("by_topic", (q) => q.eq("topic", topic)).collect()) {
      await ctx.db.patch(c._id, { chapters: swap(c.chapters), version: Date.now() }); rows++;
    }
    for (const h of await ctx.db.query("handbooks").withIndex("by_token").collect()) {
      if (h.source !== "cache" || h.topic !== topic) continue;
      for (const ch of await ctx.db.query("chapters").withIndex("by_handbook_n", (q) => q.eq("handbookId", h._id)).collect()) {
        const c: any = ch;
        await ctx.db.patch(ch._id, { cards: swap(c.cards ?? []), recallCards: c.recallCards ? swap(c.recallCards) : undefined, quizTiers: c.quizTiers ? swap(c.quizTiers) : undefined, recallTiers: c.recallTiers ? swap(c.recallTiers) : undefined } as any);
        copies++;
      }
    }
    await ctx.scheduler.runAfter(0, internal.shelf.syncReadyTopic, { topic });
    return { rows, copies };
  },
});
