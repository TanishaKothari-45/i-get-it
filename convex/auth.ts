import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

// Email + password. Decided 4 Oct (night) because passkeys and Google sign-in
// both need setup only Prateek can do; swapping the provider is one line here.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
