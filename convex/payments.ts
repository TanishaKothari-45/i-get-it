import { v } from "convex/values";
import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { getAuthUserId } from "@convex-dev/auth/server";
import { components, internal } from "./_generated/api";
import { action, httpAction, internalMutation, internalQuery, query, type QueryCtx } from "./_generated/server";
import { DAYS, GRACE_DAYS, TIERS, tierFor, type Plan } from "./pricing";
import { isOwner } from "./admin";

// Razorpay, one payment at a time (6 Oct; a month or a year since 7 Oct). The reader taps Pay, we create an order
// here, Razorpay Checkout takes the money (UPI, cards, netbanking), and the days count only once Razorpay's signature
// checks out: either from the checkout reply (confirm) or from the webhook, whichever lands first. Nothing renews by
// itself. The price comes from the early-bird tiers in pricing.ts.
// Keys live in Convex env only: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.
// A test key (rzp_test_...) moves no real money.

const DAY = 24 * HOUR;
const planV = v.union(v.literal("month"), v.literal("year"));

const limiter = new RateLimiter(components.rateLimiter, {
  orderPerUser: { kind: "fixed window", rate: 10, period: HOUR },
  orderAll: { kind: "fixed window", rate: 300, period: HOUR },
});

export const live = () => !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;
const modeOf = (): "test" | "live" => ((process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_live_") ? "live" : "test");

// Paying customers so far (people, not payments), in the mode the keys are in, so test payments never use up
// real early-bird spots. This number sets the open tier.
async function customers(ctx: QueryCtx) {
  const mode = modeOf();
  const paid = (await ctx.db.query("payments").collect()).filter((r) => r.status === "paid" && r.mode === mode);
  return new Set(paid.map((r) => String(r.userId))).size;
}

// What the Pricing screen needs: is paying switched on, which tier is open, this person's tier and prices
// (kept from their first payment while they keep paying), and until when they're paid.
export async function standing(ctx: QueryCtx, userId: any) {
  const count = await customers(ctx);
  const open = tierFor(count);
  const rows = userId ? await ctx.db.query("payments").withIndex("by_user", (q) => q.eq("userId", userId)).collect() : [];
  const paid = rows.filter((r) => r.status === "paid" && r.mode === modeOf()).sort((a, b) => (a.paidAt ?? 0) - (b.paidAt ?? 0));
  const last = paid[paid.length - 1];
  const end = last ? (last.paidAt ?? last.at) + (last.days ?? DAYS.month) * DAY : null;
  const kept = last && end! + GRACE_DAYS * DAY > Date.now() && last.tier !== undefined ? last.tier : null;
  const tier = kept ?? open;
  return {
    live: live(),
    mode: live() ? modeOf() : null,
    customers: count,
    openTier: open + 1,
    tier: tier + 1,
    kept: kept !== null && kept < open,   // paying less than newcomers because they came early
    price: { month: TIERS[tier].month, year: TIERS[tier].year },
    payments: paid.length,
    plan: (last?.plan ?? null) as Plan | null,
    paidUntil: end && end > Date.now() ? end : null,
  };
}

export const reserve = internalMutation({
  args: { userId: v.id("users"), plan: planV },
  handler: async (ctx, { userId, plan }) => {
    if (!(await limiter.limit(ctx, "orderPerUser", { key: userId })).ok || !(await limiter.limit(ctx, "orderAll")).ok) throw new Error("busy");
    const s = await standing(ctx, userId);
    if (!s.live) throw new Error("Payments are off");
    if (s.paidUntil) throw new Error("Already paid");
    const amount = s.price[plan];
    const id = await ctx.db.insert("payments", { userId, amount, month: s.payments, plan, days: DAYS[plan], tier: s.tier - 1, status: "created", mode: modeOf(), at: Date.now() });
    return { id, amount, month: s.payments };
  },
});

export const setOrder = internalMutation({
  args: { id: v.id("payments"), orderId: v.optional(v.string()) },
  handler: async (ctx, { id, orderId }) => {
    await ctx.db.patch(id, orderId ? { orderId } : { status: "failed" });
  },
});

// Step 1, when Pay is tapped: create the Razorpay order at this person's tier price, for a month or a year.
export const order = action({
  args: { plan: planV },
  handler: async (ctx, { plan }): Promise<{ keyId: string; orderId: string; amount: number; month: number; plan: Plan; email?: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first");
    const keyId = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !secret) throw new Error("Payments are off");
    const r = await ctx.runMutation(internal.payments.reserve, { userId, plan });
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(`${keyId}:${secret}`) },
      body: JSON.stringify({ amount: r.amount * 100, currency: "INR", receipt: String(r.id).slice(0, 40), notes: { plan, payment: String(r.month + 1) } }),
    });
    const body: any = await res.json().catch(() => null);
    if (!res.ok || !body?.id) {
      console.log(`razorpay order failed: ${res.status} ${body?.error?.description ?? ""}`);
      await ctx.runMutation(internal.payments.setOrder, { id: r.id });
      throw new Error("Couldn't start the payment");
    }
    await ctx.runMutation(internal.payments.setOrder, { id: r.id, orderId: body.id });
    const email = (await ctx.runQuery(internal.payments.emailOf, { userId })) ?? undefined;
    return { keyId, orderId: body.id, amount: r.amount, month: r.month, plan, email };
  },
});

// Only the signed-in person's own email, to prefill Checkout.
export const emailOf = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => (await ctx.db.get(userId))?.email ?? undefined,
});

export const markPaid = internalMutation({
  args: { orderId: v.string(), paymentId: v.string(), via: v.string(), amountPaise: v.optional(v.number()) },
  handler: async (ctx, { orderId, paymentId, via, amountPaise }) => {
    const row = await ctx.db.query("payments").withIndex("by_order", (q) => q.eq("orderId", orderId)).first();
    if (!row) return { ok: false, why: "no order" };
    if (row.status === "paid") return { ok: true, already: true };
    if (amountPaise !== undefined && amountPaise !== row.amount * 100) return { ok: false, why: "amount" };
    await ctx.db.patch(row._id, { status: "paid", paymentId, via, paidAt: Date.now() });
    return { ok: true };
  },
});

export const markFailed = internalMutation({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    const row = await ctx.db.query("payments").withIndex("by_order", (q) => q.eq("orderId", orderId)).first();
    if (row && row.status === "created") await ctx.db.patch(row._id, { status: "failed" });
  },
});

// Step 2, from the checkout reply: Razorpay signs "order_id|payment_id" with our key secret. Only a match counts.
export const confirm = action({
  args: { orderId: v.string(), paymentId: v.string(), signature: v.string() },
  handler: async (ctx, { orderId, paymentId, signature }): Promise<{ ok: boolean }> => {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret || orderId.length > 64 || paymentId.length > 64 || signature.length > 128) return { ok: false };
    if (!same(await hmacHex(secret, `${orderId}|${paymentId}`), signature)) return { ok: false };
    const r = await ctx.runMutation(internal.payments.markPaid, { orderId, paymentId, via: "checkout" });
    return { ok: r.ok };
  },
});

// The backup: Razorpay calls this when a payment is captured or fails, even if the reader closed the tab.
// Set it up in the Razorpay dashboard (Settings → Webhooks) with the URL .../razorpay/webhook and the events
// payment.captured and payment.failed, then put the secret you chose there in RAZORPAY_WEBHOOK_SECRET.
export const webhook = httpAction(async (ctx, req) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return new Response("not set up", { status: 503 });
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") ?? "";
  if (!same(await hmacHex(secret, raw), sig)) return new Response("bad signature", { status: 400 });
  let event: any;
  try { event = JSON.parse(raw) } catch { return new Response("bad body", { status: 400 }) }
  const p = event?.payload?.payment?.entity;
  if (event?.event === "payment.captured" && p?.order_id && p?.id) {
    await ctx.runMutation(internal.payments.markPaid, { orderId: p.order_id, paymentId: p.id, via: "webhook", amountPaise: p.amount });
  } else if (event?.event === "payment.failed" && p?.order_id) {
    await ctx.runMutation(internal.payments.markFailed, { orderId: p.order_id });
  }
  return new Response("ok", { status: 200 });
});

// /admin: money in, owner only. No emails, just amounts and when.
export const adminList = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isOwner(ctx)).ok) return null;
    const rows = await ctx.db.query("payments").order("desc").take(500);
    const paid = rows.filter((r) => r.status === "paid");
    const sum = (m: "test" | "live") => paid.filter((r) => r.mode === m).reduce((a, r) => a + r.amount, 0);
    return {
      live: live(),
      mode: live() ? modeOf() : null,
      paidLive: paid.filter((r) => r.mode === "live").length,
      paidTest: paid.filter((r) => r.mode === "test").length,
      rupeesLive: sum("live"),
      rupeesTest: sum("test"),
      started: rows.length,
      payers: new Set(paid.map((r) => r.userId)).size,
      recent: rows.slice(0, 20).map((r) => ({ at: r.at, amount: r.amount, month: r.month + 1, plan: r.plan ?? "month", tier: r.tier === undefined ? null : r.tier + 1, status: r.status, mode: r.mode, via: r.via ?? null })),
    };
  },
});

async function hmacHex(secret: string, msg: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Same length and every character equal, without stopping at the first difference.
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
