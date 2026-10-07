import { httpRouter } from "convex/server";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { components } from "./_generated/api";
import { auth } from "./auth";
import { webhook } from "./payments";

const http = httpRouter();

// Exact routes first: /.well-known/openid-configuration, /.well-known/jwks.json, sign-in callbacks.
auth.addHttpRoutes(http);

// Razorpay tells us about captured and failed payments here.
http.route({ path: "/razorpay/webhook", method: "POST", handler: webhook });

// Then the static site as the catch-all, with SPA fallback.
registerStaticRoutes(http, components.staticHosting);

export default http;
