// Learning from what you saved: YouTube and Instagram links, and photos. This file is the database side
// (checking links, uploads, each source's status, and what happens once they're all read); the reading
// itself, with Gemini, Apify and Supadata, is in sourcesRead.ts.
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { MAX_LINKS, MAX_PHOTOS, classifyLink } from "./links";
import { limiter } from "./handbooks";

type Source = NonNullable<Doc<"handbooks">["sources"]>[number];

// The sources for a new handbook, checked: only links we can read, at most MAX_LINKS and MAX_PHOTOS.
export function buildSources(links: string[], images: Id<"_storage">[]): Source[] {
  const cleaned = links.map((l) => l.trim()).filter(Boolean);
  if (cleaned.length > MAX_LINKS) throw new Error(`At most ${MAX_LINKS} links`);
  if (images.length > MAX_PHOTOS) throw new Error(`At most ${MAX_PHOTOS} photos`);
  const out: Source[] = [];
  const seen = new Set<string>();
  for (const l of cleaned) {
    const c = classifyLink(l);
    if (!c) throw new Error("Only YouTube and Instagram links for now");
    if (seen.has(c.url)) continue;
    seen.add(c.url);
    out.push({ kind: c.kind, url: c.url, status: "waiting" });
  }
  for (const storageId of images) out.push({ kind: "image", storageId, status: "waiting" });
  return out;
}

// Where the phone sends a photo before starting. The photo is deleted once it has been read.
export const uploadUrl = mutation({
  args: { deviceToken: v.string() },
  handler: async (ctx, { deviceToken }) => {
    const mine = await limiter.limit(ctx, "uploadDevice", { key: deviceToken });
    const all = await limiter.limit(ctx, "uploadAll");
    if (!mine.ok || !all.ok) throw new Error("busy");
    return ctx.storage.generateUploadUrl();
  },
});

export const readHandbook = internalQuery({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => ctx.db.get(handbookId),
});

// One source's progress, as the reader sees it on the chips.
export const setSource = internalMutation({
  args: {
    handbookId: v.id("handbooks"), index: v.number(),
    fields: v.object({
      status: v.optional(v.union(v.literal("waiting"), v.literal("reading"), v.literal("read"), v.literal("failed"))),
      via: v.optional(v.string()), title: v.optional(v.string()), notes: v.optional(v.string()), error: v.optional(v.string()),
      clearStorage: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { handbookId, index, fields }) => {
    const h = await ctx.db.get(handbookId);
    if (!h?.sources?.[index]) return;
    const { clearStorage, ...rest } = fields;
    const sources = h.sources.map((s, i) => (i !== index ? s : { ...s, ...rest, ...(clearStorage ? { storageId: undefined } : {}) }));
    await ctx.db.patch(handbookId, { sources });
  },
});

// All sources read. Either one question (nothing to learn, or two different subjects), or the topic is set
// and the plan is written from the sources.
export const finishReading = internalMutation({
  args: { handbookId: v.id("handbooks"), topic: v.optional(v.string()), question: v.optional(v.string()), use: v.optional(v.array(v.number())) },
  handler: async (ctx, { handbookId, topic, question, use }) => {
    const h = await ctx.db.get(handbookId);
    if (!h?.sources) return;
    if (question || !topic) {
      await ctx.db.patch(handbookId, { status: "question", question: question ?? "What do you want to learn from these?" });
      return;
    }
    // Sources that don't belong to the chosen topic are set aside, not deleted.
    const keep = new Set(use ?? h.sources.map((_, i) => i + 1));
    const sources = h.sources.map((s, i) => (s.status === "read" && !keep.has(i + 1) ? { ...s, status: "failed" as const, error: "about something else" } : s));
    await ctx.db.patch(handbookId, { topic: topic.slice(0, 200), sources });
    await ctx.scheduler.runAfter(0, internal.handbooks.generatePlan, { handbookId });
  },
});

// The notes the plan and chapters are written from: every source that was read, numbered as the reader saw them.
export function sourceNotesOf(h: Pick<Doc<"handbooks">, "sources">): string | undefined {
  const label = { youtube: "YouTube video", instagram: "Instagram reel", image: "Photo" } as const;
  const lines = (h.sources ?? []).flatMap((s, i) => (s.status === "read" && s.notes ? [`Source ${i + 1} (${label[s.kind]}${s.title ? `: ${s.title}` : ""}):\n${s.notes}`] : []));
  return lines.length ? lines.join("\n\n").slice(0, 12000) : undefined;
}
