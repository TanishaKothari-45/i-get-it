"use node";
import webpush from "web-push";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Sends the reminders that are due (every 10 minutes, crons.ts). A subscription the browser has dropped (404/410) is removed.
export const sendDue = internalAction({
  args: {},
  handler: async (ctx): Promise<{ sent: number; gone: number }> => {
    const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
    if (!pub || !priv) return { sent: 0, gone: 0 };
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://sensible-mongoose-624.convex.site", pub, priv);
    const due: any[] = await ctx.runQuery(internal.push.due, { now: Date.now() });
    let sent = 0, gone = 0;
    for (const d of due) {
      try { await webpush.sendNotification(d.subscription, JSON.stringify(d.payload)); sent++; await ctx.runMutation(internal.push.markSent, { id: d.id, day: d.today }); }
      catch (e: any) {
        const code = e?.statusCode;
        if (code === 404 || code === 410) { gone++; await ctx.runMutation(internal.push.markSent, { id: d.id, day: d.today, gone: true }); }
        else console.log("push failed", code, String(e?.body ?? e?.message ?? e).slice(0, 200));
      }
    }
    return { sent, gone };
  },
});

// One test notification to a phone that has a reminder: npx convex run pushSend:test '{"deviceToken":"..."}'
export const test = internalAction({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  handler: async (_ctx, { endpoint, p256dh, auth }) => {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://sensible-mongoose-624.convex.site", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
    await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, JSON.stringify({ title: "I Get It", body: "Reminders work.", url: "/" }));
    return "sent";
  },
});
