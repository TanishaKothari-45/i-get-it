import { defineApp } from "convex/server";
import staticHosting from "@convex-dev/static-hosting/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";

// The app's own HTTP router owns the root so Convex Auth's well-known
// endpoints sit at /.well-known/*; the static site is registered from
// convex/http.ts as the catch-all (exact routes win over it).
const app = defineApp();
app.use(staticHosting);
app.use(rateLimiter);

export default app;
