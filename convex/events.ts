import { v } from "convex/values";
import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
import { mutation } from "./_generated/server";

// Page events for the owner-only /admin funnel. Only these names and these prop keys are kept; anything else is dropped.
const NAMES = new Set(["open", "beat", "land", "section", "box_focus", "box_type", "submit", "demo_tap", "plan_view", "ch_open", "card", "wait_view", "feedback", "wall_tap"]);   // wall_tap (8 Oct night): the Done screen's account button, so sign-ups can be read against taps
const KEYS = new Set(["section", "via", "topic", "n", "i", "source", "len", "device", "w", "path", "v"]);

const limiter = new RateLimiter(components.rateLimiter, {
  eventsDevice: { kind: "fixed window", rate: 300, period: HOUR },
  eventsAll: { kind: "fixed window", rate: 20000, period: HOUR },
});

const IST_MS = 5.5 * HOUR;
const dayOf = (t: number) => new Date(t + IST_MS).toISOString().slice(0, 10);

export const track = mutation({
  args: { visitor: v.string(), name: v.string(), props: v.optional(v.record(v.string(), v.union(v.string(), v.number()))) },
  handler: async (ctx, { visitor, name, props }) => {
    if (visitor.length < 8 || visitor.length > 64 || !NAMES.has(name)) return;
    if (!(await limiter.limit(ctx, "eventsDevice", { key: visitor })).ok) return;
    if (!(await limiter.limit(ctx, "eventsAll")).ok) return;
    const clean: Record<string, string | number> = {};
    for (const [k, val] of Object.entries(props ?? {})) {
      if (!KEYS.has(k)) continue;
      clean[k] = typeof val === "number" ? (Number.isFinite(val) ? Math.round(val) : 0) : String(val).slice(0, 80);
    }
    const now = Date.now();
    await ctx.db.insert("events", { visitor, name, props: Object.keys(clean).length ? clean : undefined, day: dayOf(now), at: now });
  },
});
