"use node";
import nodemailer from "nodemailer";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Sign-in codes by email (Prateek, 7 Oct: "email and OTP based login, promise 0 spam"). Sent through Gmail from
// GMAIL_USER with a Gmail app password (GMAIL_APP_PASSWORD), both in Convex env only. The only email this app sends
// besides reminders someone asked for. Caps in mailLimits.ts stop anyone using the form to flood an inbox.
export const sendCode = internalAction({
  args: { to: v.string(), code: v.string() },
  handler: async (ctx, { to, code }): Promise<void> => {
    const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) throw new Error("email codes are not set up");
    if (!(await ctx.runMutation(internal.mailLimits.take, { to }))) throw new Error("too many codes");
    const t = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
    await t.sendMail({
      from: `I Get It <${user}>`,
      to,
      subject: `Your I Get It code: ${code}`,
      text: `Your sign-in code is ${code}.\n\nType it on the sign-in screen. It works for 10 minutes.\n\nIf you didn't ask for it, ignore this email and nothing happens.\n\nThis is the only kind of email I Get It sends, unless you turn on reminders. No newsletters, no spam, ever.`,
    });
  },
});
