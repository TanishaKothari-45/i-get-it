"use node";
// Nudges, the sending half. Runs every 15 minutes (crons.ts): each device whose chosen time has come
// in its own timezone gets one nudge a day, unless they've already studied today.
import webpush from "web-push";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// A nudge goes out if the cron runs within this long after the chosen time (the cron runs every 15 min).
const SEND_WINDOW_MIN = 30;
// A nudge nobody saw for this long isn't worth showing.
const TTL_SECONDS = 4 * 60 * 60;

type Due = { subId: Id<"pushSubscriptions">; day: string; endpoint: string; p256dh: string; auth: string; payload: { title: string; body: string; url: string } };

function vapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY, privateKey = process.env.VAPID_PRIVATE_KEY, subject = process.env.VAPID_SUBJECT;
  return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
}

// The device's local date ("2026-10-05") and minutes since midnight, in its own timezone.
function localNow(at: number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(at));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + (m || 0); };

// This week's nudges: {n} becomes the chapter they're on. Each device gets a different one each day,
// all seven in a week. To freshen them up, replace this list. (Copy chosen by Tanisha, 9 Oct.)
const NUDGES: { title: string; body: string }[] = [
  { title: "👋 Hey, ready for chapter {n}?", body: "It's chapter o'clock. Twenty minutes, one new idea." },
  { title: "👀 Psst… chapter {n} has a twist", body: "It's waiting for you. Shall we?" },
  { title: "🧠 Your brain called", body: "It wants chapter {n}. We promised we'd pass the message on." },
  { title: "☕ Chai + chapter {n}?", body: "Best combo of the evening. Twenty minutes, tops." },
  { title: "🚀 Chapter {n}, ready for liftoff", body: "Twenty minutes to your next “oh, I get it”." },
  { title: "🍿 Tonight's episode: chapter {n}", body: "No ads. No spoilers. Just press play." },
  { title: "🎯 One chapter closer", body: "Chapter {n} is twenty minutes away. Let's get it." },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Which of the seven for this local day ("2026-10-05"): a different one each day, in turn.
function nudgeFor(c: { chapter: number; handbookId: string }, day: string) {
  const dayNumber = Math.floor(Date.parse(`${day}T00:00:00Z`) / MS_PER_DAY);
  const pick = NUDGES[((dayNumber % NUDGES.length) + NUDGES.length) % NUDGES.length];
  const fill = (s: string) => s.replace(/\{n\}/g, String(c.chapter));
  return { title: fill(pick.title), body: fill(pick.body), url: `/h/${c.handbookId}` };
}

// The push service says this address will never work again (blocked, uninstalled, expired).
const isGone = (e: any) => e?.statusCode === 404 || e?.statusCode === 410;

async function send(d: Due, keys: NonNullable<ReturnType<typeof vapid>>) {
  return webpush.sendNotification(
    { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
    JSON.stringify(d.payload),
    { TTL: TTL_SECONDS, vapidDetails: keys },
  );
}

// The 15-minute job. dryRun: send nothing, and say for every device what would happen and why;
// `at` (dry runs only) pretends it's another moment, e.g. tomorrow 9:05pm, to check the timing.
// Run by hand: npx convex run pushSend:sendDue '{"dryRun": true}'
export const sendDue = internalAction({
  args: { dryRun: v.optional(v.boolean()), at: v.optional(v.number()) },
  handler: async (ctx, { dryRun, at }) => {
    const keys = vapid();
    if (!keys && !dryRun) return { sent: 0, skipped: "VAPID keys not set" };
    const now = dryRun && at ? at : Date.now();
    const due: Due[] = [];
    const notNow: { subId: Id<"pushSubscriptions">; reason: string }[] = [];
    for (const c of await ctx.runQuery(internal.push.candidates, {})) {
      let local, studied;
      try { local = localNow(now, c.timezone); studied = localNow(c.lastStudiedAt, c.timezone); }
      catch { notNow.push({ subId: c.subId, reason: `unknown timezone ${c.timezone}` }); continue; }
      const since = local.minutes - toMinutes(c.nudgeAt);
      if (since < 0 || since >= SEND_WINDOW_MIN) { notNow.push({ subId: c.subId, reason: `not their time (nudge at ${c.nudgeAt}, it's ${local.day} ${String(Math.floor(local.minutes / 60)).padStart(2, "0")}:${String(local.minutes % 60).padStart(2, "0")} there)` }); continue; }
      if (c.lastSentDay === local.day) { notNow.push({ subId: c.subId, reason: "already nudged today" }); continue; }
      if (studied.day === local.day) { notNow.push({ subId: c.subId, reason: "already studied today" }); continue; }
      due.push({ subId: c.subId, day: local.day, endpoint: c.endpoint, p256dh: c.p256dh, auth: c.auth, payload: nudgeFor(c, local.day) });
    }
    if (dryRun || !keys) return { wouldSend: due.map((d) => ({ subId: d.subId, ...d.payload })), notNow };

    let sent = 0, stopped = 0, failed = 0;
    for (const d of due) {
      try {
        await send(d, keys);
        await ctx.runMutation(internal.push.markSent, { subId: d.subId, day: d.day });
        sent++;
      } catch (e: any) {
        if (isGone(e)) { await ctx.runMutation(internal.push.markStopped, { subId: d.subId, reason: `gone (${e.statusCode})` }); stopped++; }
        else failed++;   // a blip: keep it, try again tomorrow
      }
    }
    return { sent, stopped, failed };
  },
});

// A test nudge to every subscribed device right now, ignoring the time. For checking the setup.
// Run by hand: npx convex run pushSend:sendTest
export const sendTest = internalAction({
  args: { body: v.optional(v.string()) },
  handler: async (ctx, { body }) => {
    const keys = vapid();
    if (!keys) return { sent: 0, skipped: "VAPID keys not set" };
    let sent = 0, stopped = 0, failed = 0;
    for (const sub of await ctx.runQuery(internal.push.allSubscriptions, {})) {
      const d: Due = { subId: sub._id, day: "", endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, payload: { title: "I Get It", body: body ?? "Test nudge: notifications work.", url: "/" } };
      try { await send(d, keys); sent++; }
      catch (e: any) {
        if (isGone(e)) { await ctx.runMutation(internal.push.markStopped, { subId: sub._id, reason: `gone (${e.statusCode})` }); stopped++; }
        else failed++;
      }
    }
    return { sent, stopped, failed };
  },
});
