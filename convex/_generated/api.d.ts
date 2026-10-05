/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as bonus from "../bonus.js";
import type * as crons from "../crons.js";
import type * as handbooks from "../handbooks.js";
import type * as http from "../http.js";
import type * as languages from "../languages.js";
import type * as links from "../links.js";
import type * as prompts from "../prompts.js";
import type * as push from "../push.js";
import type * as pushSend from "../pushSend.js";
import type * as sources from "../sources.js";
import type * as sourcesRead from "../sourcesRead.js";
import type * as translate from "../translate.js";
import type * as translateShape from "../translateShape.js";
import type * as translations from "../translations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  auth: typeof auth;
  bonus: typeof bonus;
  crons: typeof crons;
  handbooks: typeof handbooks;
  http: typeof http;
  languages: typeof languages;
  links: typeof links;
  prompts: typeof prompts;
  push: typeof push;
  pushSend: typeof pushSend;
  sources: typeof sources;
  sourcesRead: typeof sourcesRead;
  translate: typeof translate;
  translateShape: typeof translateShape;
  translations: typeof translations;
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
