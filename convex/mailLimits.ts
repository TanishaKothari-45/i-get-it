import { v } from "convex/values";
import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
import { internalMutation, query } from "./_generated/server";

// Sign-in code emails: 3 an hour to one address, 100 an hour from the app (Gmail allows about 500 a day).
const limiter = new RateLimiter(components.rateLimiter, {
  codePerEmail: { kind: "fixed window", rate: 3, period: HOUR },
  codeAll: { kind: "fixed window", rate: 100, period: HOUR },
});

export const take = internalMutation({
  args: { to: v.string() },
  handler: async (ctx, { to }) =>
    (await limiter.limit(ctx, "codePerEmail", { key: to.trim().toLowerCase() })).ok && (await limiter.limit(ctx, "codeAll")).ok,
});

// Can sign-in codes go out? The sign-in screen falls back to email + password until the Gmail app password is set.
export const codesReady = query({ args: {}, handler: async () => !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD });
