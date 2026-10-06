import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

// Reminders by web push (6 Oct). The phone subscribes after the reader picks a time on the Done screen; a job every
// 10 minutes (crons.ts -> pushSend.sendDue) sends "your next chapter is ready" at that local time, once a day, and stays
// quiet if they've already opened the app that day.

export const publicKey = query({ args: {}, handler: async () => process.env.VAPID_PUBLIC_KEY ?? null });

export const saveReminder = mutation({
  args: {
    deviceToken: v.string(), at: v.string(), tzOffsetMin: v.number(), handbookId: v.optional(v.id("handbooks")),
    subscription: v.object({ endpoint: v.string(), keys: v.object({ p256dh: v.string(), auth: v.string() }) }),
  },
  handler: async (ctx, { deviceToken, at, tzOffsetMin, handbookId, subscription }) => {
    if (!/^\d{2}:\d{2}$/.test(at) || deviceToken.length < 8 || deviceToken.length > 64 || !subscription.endpoint.startsWith("https://")) throw new Error("Bad reminder");
    if (handbookId) {
      const h = await ctx.db.get(handbookId);
      if (!h || h.ownerToken !== deviceToken) handbookId = undefined;
    }
    const row = await ctx.db.query("pushSubs").withIndex("by_endpoint", (q) => q.eq("endpoint", subscription.endpoint)).unique();
    const doc = { deviceToken, endpoint: subscription.endpoint, keys: subscription.keys, at, tzOffsetMin: Math.max(-840, Math.min(840, Math.round(tzOffsetMin))), handbookId, createdAt: Date.now() };
    if (row) await ctx.db.patch(row._id, doc); else await ctx.db.insert("pushSubs", doc);
  },
});

const localDay = (t: number, off: number) => new Date(t - off * 60000).toISOString().slice(0, 10);
const localMinutes = (t: number, off: number) => { const d = new Date(t - off * 60000); return d.getUTCHours() * 60 + d.getUTCMinutes(); };

// Who should get a reminder now: their time fell in the last 10 minutes, none sent today, and they haven't read today.
export const due = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, { now }) => {
    const out: any[] = [];
    for (const s of await ctx.db.query("pushSubs").collect()) {
      const [hh, mm] = s.at.split(":").map(Number);
      const target = hh * 60 + mm, nowMin = localMinutes(now, s.tzOffsetMin);
      const diff = (nowMin - target + 1440) % 1440;
      if (diff >= 10) continue;
      const today = localDay(now, s.tzOffsetMin);
      if (s.lastSentDay === today) continue;
      const h = s.handbookId ? await ctx.db.get(s.handbookId) : null;
      const p = h ? await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique() : null;
      if (p && localDay(p.lastOpenedAt, s.tzOffsetMin) === today) continue;
      if (p && p.chaptersPassed.length >= 7) continue;
      const n = p?.currentChapter ?? 1;
      const title = (h?.plan as any)?.chapters?.[n - 1]?.title;
      const topic = (h?.plan as any)?.topic ?? h?.topic;
      out.push({ id: s._id, today, subscription: { endpoint: s.endpoint, keys: s.keys },
        payload: { title: topic ? `Chapter ${n} of ${topic}` : "I Get It", body: title ? `${title}. Twenty minutes, whenever you're ready.` : "Your next chapter is ready. Twenty minutes.", url: "/?utm_source=reminder" } });
    }
    return out;
  },
});

export const markSent = internalMutation({
  args: { id: v.id("pushSubs"), day: v.string(), gone: v.optional(v.boolean()) },
  handler: async (ctx, { id, day, gone }) => { if (gone) await ctx.db.delete(id); else await ctx.db.patch(id, { lastSentDay: day }); },
});
