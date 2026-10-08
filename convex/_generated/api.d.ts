/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as abtest from "../abtest.js";
import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as costs from "../costs.js";
import type * as crons from "../crons.js";
import type * as doctor from "../doctor.js";
import type * as evalModels from "../evalModels.js";
import type * as evalResearch from "../evalResearch.js";
import type * as events from "../events.js";
import type * as frozen from "../frozen.js";
import type * as handbooks from "../handbooks.js";
import type * as http from "../http.js";
import type * as images from "../images.js";
import type * as inkwash from "../inkwash.js";
import type * as landing from "../landing.js";
import type * as library from "../library.js";
import type * as mail from "../mail.js";
import type * as mailLimits from "../mailLimits.js";
import type * as membership from "../membership.js";
import type * as nism from "../nism.js";
import type * as payments from "../payments.js";
import type * as polish from "../polish.js";
import type * as pricing from "../pricing.js";
import type * as prompts from "../prompts.js";
import type * as push from "../push.js";
import type * as pushSend from "../pushSend.js";
import type * as ready from "../ready.js";
import type * as repair from "../repair.js";
import type * as repairData from "../repairData.js";
import type * as research from "../research.js";
import type * as schemas from "../schemas.js";
import type * as settings from "../settings.js";
import type * as shelf from "../shelf.js";
import type * as social from "../social.js";
import type * as stats from "../stats.js";
import type * as trending from "../trending.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  abtest: typeof abtest;
  admin: typeof admin;
  ai: typeof ai;
  audit: typeof audit;
  auth: typeof auth;
  costs: typeof costs;
  crons: typeof crons;
  doctor: typeof doctor;
  evalModels: typeof evalModels;
  evalResearch: typeof evalResearch;
  events: typeof events;
  frozen: typeof frozen;
  handbooks: typeof handbooks;
  http: typeof http;
  images: typeof images;
  inkwash: typeof inkwash;
  landing: typeof landing;
  library: typeof library;
  mail: typeof mail;
  mailLimits: typeof mailLimits;
  membership: typeof membership;
  nism: typeof nism;
  payments: typeof payments;
  polish: typeof polish;
  pricing: typeof pricing;
  prompts: typeof prompts;
  push: typeof push;
  pushSend: typeof pushSend;
  ready: typeof ready;
  repair: typeof repair;
  repairData: typeof repairData;
  research: typeof research;
  schemas: typeof schemas;
  settings: typeof settings;
  shelf: typeof shelf;
  social: typeof social;
  stats: typeof stats;
  trending: typeof trending;
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
