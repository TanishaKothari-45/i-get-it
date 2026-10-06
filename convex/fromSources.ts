// Starting a handbook from what the learner saved (links, photos, or a creator's reels) instead of a typed line.
// Plain helpers for handbooks.create; the reading itself is sourcesRead.ts.
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { buildSources } from "./sources";
import { classifyLink, parseCreator } from "./links";
import { ENGLISH } from "./languages";
import { limiter, ownedBooks, watchPlan } from "./handbooks";

export type SourceStart = { clean: string; level: "new" | "some"; voice: "friend" | "straight" | "stories"; language: string; deviceToken: string };

// The same links (in any order, tracking codes stripped) or the same creator: one key, so sharing them again reopens it.
function sourcesKeyOf(links: string[], creator?: string): string {
  if (creator) return `@${creator}`;
  // By the video's or reel's own id, so youtu.be/x, youtube.com/shorts/x and watch?v=x are the same thing.
  const idOf = (l: string) => {
    const c = classifyLink(l);
    if (!c) return l.trim();
    const id = c.kind === "youtube" ? (c.url.match(/(?:youtu\.be\/|shorts\/|[?&]v=)([\w-]+)/)?.[1]) : c.url.match(/\/(?:reel|p)\/([\w-]+)/)?.[1];
    return `${c.kind}:${id ?? c.url}`;
  };
  return [...new Set(links.map(idOf))].sort().join(" ");
}

// Sharing the same links or creator again (or a double tap) reopens the handbook they already have, never a second one.
async function reopenSources(ctx: MutationCtx, deviceToken: string, key: string, language: string) {
  const userId = await getAuthUserId(ctx);
  const again = (await ownedBooks(ctx, userId, deviceToken)).find((h) => h.sourcesKey === key && (h.language ?? ENGLISH) === language && h.status !== "failed");
  return again ? { handbookId: again._id, fromCache: false, existing: true } : null;
}

async function startSourcesHandbook(ctx: MutationCtx, a: SourceStart, fields: Partial<Doc<"handbooks">>, next: "readAll" | "gatherCreator") {
  const userId = await getAuthUserId(ctx);
  const all = await limiter.limit(ctx, "generateAll");
  const mine = await limiter.limit(ctx, "generateDevice", { key: userId ? String(userId) : a.deviceToken });
  if (!all.ok || !mine.ok) throw new Error("busy");
  const now = Date.now();
  // topicKey stays empty: the topic comes from the sources, and this handbook never meets the shared cache.
  const handbookId = await ctx.db.insert("handbooks", {
    topic: a.clean, topicKey: "", level: a.level, language: a.language, voice: a.voice, status: "planning",
    ownerToken: a.deviceToken, userId: userId ?? undefined, source: "live", createdAt: now, startedAt: now, ...fields,
  });
  await watchPlan(ctx, handbookId, now);
  await ctx.db.insert("progress", { handbookId, currentChapter: 1, currentCard: 0, chaptersPassed: [], passedExercises: [], missedExercises: [], lastOpenedAt: now, updatedAt: now });
  await ctx.scheduler.runAfter(0, next === "readAll" ? internal.sourcesRead.readAll : internal.sourcesRead.gatherCreator, { handbookId });
  return { handbookId, fromCache: false, existing: false };
}

export async function startFromSources(ctx: MutationCtx, a: SourceStart, links: string[], images: Id<"_storage">[]) {
  const sources = buildSources(links, images);
  const key = images.length ? undefined : sourcesKeyOf(links);   // new photos are always a new handbook
  if (key) { const again = await reopenSources(ctx, a.deviceToken, key, a.language); if (again) return again; }
  return startSourcesHandbook(ctx, a, { sources, sourcesKey: key }, "readAll");
}

export async function startFromCreator(ctx: MutationCtx, a: SourceStart, creator: string) {
  const handle = parseCreator(creator);
  if (!handle) throw new Error("That doesn't look like an Instagram handle.");
  const key = sourcesKeyOf([], handle);
  const again = await reopenSources(ctx, a.deviceToken, key, a.language);
  if (again) return again;
  return startSourcesHandbook(ctx, a, { sources: [], creator: { handle }, sourcesKey: key }, "gatherCreator");
}

