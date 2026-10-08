// Which reader-facing work a logged AI call belongs to (observability, 8 Oct): its handbook and, for chapter work,
// which chapter. Optional everywhere: one-off tools (comparisons, repairs, the doctor) log without one.
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const traceV = v.optional(v.object({ handbookId: v.optional(v.id("handbooks")), chapter: v.optional(v.number()) }));
export type Trace = { handbookId?: Id<"handbooks">; chapter?: number };
