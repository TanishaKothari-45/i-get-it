/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as evalModels from "../evalModels.js";
import type * as events from "../events.js";
import type * as handbooks from "../handbooks.js";
import type * as http from "../http.js";
import type * as images from "../images.js";
import type * as landing from "../landing.js";
import type * as polish from "../polish.js";
import type * as pricing from "../pricing.js";
import type * as prompts from "../prompts.js";
import type * as ready from "../ready.js";
import type * as repair from "../repair.js";
import type * as repairData from "../repairData.js";
import type * as settings from "../settings.js";
import type * as stats from "../stats.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai: typeof ai;
  audit: typeof audit;
  auth: typeof auth;
  evalModels: typeof evalModels;
  events: typeof events;
  handbooks: typeof handbooks;
  http: typeof http;
  images: typeof images;
  landing: typeof landing;
  polish: typeof polish;
  pricing: typeof pricing;
  prompts: typeof prompts;
  ready: typeof ready;
  repair: typeof repair;
  repairData: typeof repairData;
  settings: typeof settings;
  stats: typeof stats;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
