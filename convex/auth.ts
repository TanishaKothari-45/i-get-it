import { Password } from "@convex-dev/auth/providers/Password";
import { Email } from "@convex-dev/auth/providers/Email";
import { internal } from "./_generated/api";
import { convexAuth } from "@convex-dev/auth/server";

// Email + a 6-digit code (7 Oct, Prateek): no password to make up, the lightest sign-up we can offer. The code goes out
// through Gmail (mail.ts). Email + password stays for accounts made before 7 Oct and as a fallback.
const EmailCode = Email({
  id: "email-otp",
  maxAge: 10 * 60,
  async generateVerificationToken() {
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
    return String(n).padStart(6, "0");
  },
  // Convex Auth passes its action context as a second argument (its typings don't show it yet).
  async sendVerificationRequest(params: { identifier: string; token: string }, ...rest: any[]) {
    await rest[0].runAction(internal.mail.sendCode, { to: params.identifier, code: params.token });
  },
});
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [EmailCode, Password],
  callbacks: {
    // A code sign-in proves the person controls that inbox, so it joins the account that already has this email
    // (7 Oct: everyone before today signed up with a password, and Prateek's membership is on that account). A
    // password sign-up never joins someone else's account: anyone can type any email next to a password.
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) return args.existingUserId;
      const db = ctx.db as any;
      const raw = typeof args.profile.email === "string" ? args.profile.email.trim() : undefined;
      if (args.provider.id === "email-otp" && raw) {
        const same = (await db.query("users").withIndex("email", (q: any) => q.eq("email", raw)).first())
          ?? (await db.query("users").withIndex("email", (q: any) => q.eq("email", raw.toLowerCase())).first());
        if (same) {
          if (!same.emailVerificationTime) await db.patch(same._id, { emailVerificationTime: Date.now() });
          return same._id;
        }
        return db.insert("users", { email: raw.toLowerCase(), emailVerificationTime: Date.now() });
      }
      return db.insert("users", { ...(raw ? { email: raw } : {}), ...(args.profile.emailVerified ? { emailVerificationTime: Date.now() } : {}) });
    },
  },
});
