import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { DAYS } from "./pricing";
import { isOwner } from "./admin";

// Visitor, signed up, member (Prateek, 7 Oct, afternoon). One place for every number. Each limit is checked in a Convex
// function; the screens only explain it. "New chapter" means one opened for the first time; going back is always free.
//   Visitor (no account): chapters 1 to 3 of any handbook, up to 3 new chapters a day (all on day 1 is fine), 1 typed
//         handbook. Chapter 4 asks them to sign up, free.
//   Signed up (free): every chapter of every ready and shared handbook and of their 1 typed handbook, up to 3 new
//         chapters a day. A second typed handbook asks them to become a member.
//   Member: 3 typed handbooks on the go (at most 6 new a month, a cost guard), 7 new chapters a day, 30 web-checked
//         answers a month, unlimited "Say it simpler", a printable handbook, first access to what's coming.
//   Everyone not paying: 3 web-checked answers a week, 10 "Say it simpler" a day.
// Accounts can be made up (no email check yet), so free readers' new typed topics and web answers also stop once
// readers have cost DAILY_BUDGET_INR today. Members never hit it: paying is the one thing that can't be faked cheaply.
export const LIMITS = {
  freeTyped: 1,
  memberActiveTyped: 3,
  memberTypedPerMonth: 6,
  visitorChapters: 3,          // per handbook, before signing up
  freeChaptersPerDay: 3,       // visitors and signed-up readers
  memberChaptersPerDay: 7,
  freeSearchPerWeek: 3,
  memberSearchPerMonth: 30,
  freeSimplerPerDay: 10,
  dailyBudgetInr: 1000,
} as const;

// What one reader action costs us, roughly (AGENTS.md section 4, measured 4–6 Oct).
export const COST_INR = { handbook: 17, chapter: 13, search: 9.4 } as const;

const DAY = 24 * 60 * 60 * 1000;
const IST = 5.5 * 60 * 60 * 1000;

function modeOf(): "test" | "live" {
  return (process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_live_") ? "live" : "test";
}

// The end of this person's paid time, if it's still running.
export async function memberUntil(ctx: QueryCtx | MutationCtx, userId: Id<"users"> | null | undefined): Promise<number | null> {
  if (!userId) return null;
  const rows = await ctx.db.query("payments").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  let end = 0;
  for (const r of rows) {
    if (r.status !== "paid" || r.mode !== modeOf()) continue;
    end = Math.max(end, (r.paidAt ?? r.at) + ((r as any).days ?? DAYS.month) * DAY);
  }
  return end > Date.now() ? end : null;
}

export async function ownerIsMember(ctx: QueryCtx | MutationCtx, h: Doc<"handbooks">) {
  return !!(await memberUntil(ctx, h.userId));
}

// Handbooks this person typed (not ready topics, not copies from the shared library, not ones that were declined),
// hidden ones included so hiding can't reset the count.
export async function typedBooks(ctx: QueryCtx | MutationCtx, userId: Id<"users"> | null, deviceToken?: string) {
  const out = new Map<string, Doc<"handbooks">>();
  if (userId) for (const h of await ctx.db.query("handbooks").withIndex("by_user", (q) => q.eq("userId", userId)).collect()) out.set(h._id, h);
  if (deviceToken) for (const h of await ctx.db.query("handbooks").withIndex("by_token", (q) => q.eq("ownerToken", deviceToken)).collect()) out.set(h._id, h);
  return [...out.values()].filter((h) => h.source === "live" && !(h as any).fromLibrary && (h.status as string) !== "declined");
}

// Can this person start a new typed topic? Returns why not, for the screen to explain.
export async function typedAllowance(ctx: QueryCtx | MutationCtx, userId: Id<"users"> | null, deviceToken?: string) {
  const member = !!(await memberUntil(ctx, userId));
  const books = await typedBooks(ctx, userId, deviceToken);
  if (member) {
    const month = books.filter((h) => h.createdAt > Date.now() - DAYS.month * DAY).length;
    let active = 0;
    for (const h of books) {
      if (h.hiddenAt) continue;
      const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
      const total = Array.isArray((h.plan as any)?.chapters) && (h.plan as any).chapters.length ? Math.min(7, (h.plan as any).chapters.length) : 7;
      if ((p?.chaptersPassed.length ?? 0) < total) active++;
    }
    const why = active >= LIMITS.memberActiveTyped ? "member-active" : month >= LIMITS.memberTypedPerMonth ? "member-month" : null;
    return { member, used: active, limit: LIMITS.memberActiveTyped, month, ok: !why, why };
  }
  return { member, used: books.length, limit: LIMITS.freeTyped, month: books.length, ok: books.length < LIMITS.freeTyped, why: books.length < LIMITS.freeTyped ? null : "free-used" };
}

export const istDay = (t = Date.now()) => new Date(t + IST).toISOString().slice(0, 10);
const isTyped = (h: Doc<"handbooks">) => h.source === "live" && !(h as any).fromLibrary;

// Is chapter n already open for this reader? Passed, opened before, or (progress from before 7 Oct, which has no
// "opened" list) the chapter they were partway through.
export function isOpen(p: Doc<"progress"> | null, n: number) {
  if (!p) return false;
  if (p.chaptersPassed.includes(n)) return true;
  if (p.opened) return p.opened.some((o) => o.n === n);
  return n < p.currentChapter || (n === p.currentChapter && p.currentCard > 0);
}

// Open chapter n for the first time, if today's allowance has room. Records it; says why not otherwise.
export async function tryOpen(ctx: MutationCtx, h: Doc<"handbooks">, n: number): Promise<{ ok: true } | { ok: false; code: string }> {
  const p = await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", h._id)).unique();
  if (!p) return { ok: false, code: "missing" };
  if (isOpen(p, n)) return { ok: true };
  const day = istDay();
  const member = await ownerIsMember(ctx, h);
  // Everything this person (the account, else the phone) opened today, across their handbooks.
  const books = h.userId
    ? await ctx.db.query("handbooks").withIndex("by_user", (q) => q.eq("userId", h.userId)).collect()
    : await ctx.db.query("handbooks").withIndex("by_token", (q) => q.eq("ownerToken", h.ownerToken!)).collect();
  const today: { id: string; typed: boolean }[] = [];
  for (const b of books) {
    const bp = b._id === h._id ? p : await ctx.db.query("progress").withIndex("by_handbook", (q) => q.eq("handbookId", b._id)).unique();
    for (const o of bp?.opened ?? []) if (o.day === day) today.push({ id: b._id, typed: isTyped(b) });
  }
  if (member) {
    if (today.length >= LIMITS.memberChaptersPerDay) return { ok: false, code: "daily-member" };
  } else {
    if (!h.userId && n > LIMITS.visitorChapters) return { ok: false, code: "signup-more" };
    if (today.length >= LIMITS.freeChaptersPerDay) return { ok: false, code: "daily-free" };
  }
  // The first record on older progress keeps whatever was open under the old rule, so nothing locks again.
  const before = p.opened ?? Array.from({ length: p.currentChapter }, (_, i) => i + 1).filter((k) => isOpen(p, k)).map((k) => ({ n: k, day: "before" }));
  await ctx.db.patch(p._id, { opened: [...before, { n, day }], updatedAt: Date.now() });
  return { ok: true };
}

// The daily reader budget for free readers: add today's estimated cost if it fits, else say no.
export async function spendFits(ctx: MutationCtx, inr: number) {
  const day = new Date(Date.now() + IST).toISOString().slice(0, 10);
  const key = `readerSpend:${day}`;
  const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", key)).unique();
  const spent = row ? Number(row.value) || 0 : 0;
  if (spent + inr > LIMITS.dailyBudgetInr) return false;
  if (row) await ctx.db.patch(row._id, { value: String(spent + inr), at: Date.now() });
  else await ctx.db.insert("settings", { key, value: String(inr), at: Date.now() });
  return true;
}

// For the screens: member or not, until when, and what's left of each allowance.
export const status = query({
  args: { deviceToken: v.optional(v.string()) },
  handler: async (ctx, { deviceToken }) => {
    const userId = await getAuthUserId(ctx);
    const until = await memberUntil(ctx, userId);
    const typed = await typedAllowance(ctx, userId, deviceToken);
    return { member: !!until, until, typed: { used: typed.used, limit: typed.limit, month: typed.month }, limits: LIMITS };
  },
});

// /admin: today's estimated reader spend against the free readers' daily budget. Owner only.
export const budgetToday = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isOwner(ctx)).ok) return null;
    const day = new Date(Date.now() + IST).toISOString().slice(0, 10);
    const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", `readerSpend:${day}`)).unique();
    return { day, spent: Math.round(row ? Number(row.value) || 0 : 0), budget: LIMITS.dailyBudgetInr };
  },
});
