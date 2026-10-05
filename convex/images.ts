"use node";
import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { PICTURE_ANCHOR, PICTURE_NEVER, SCENES_PROMPT, scenesUserMessage } from "./prompts";

// Pictures come from Runway's API (key in the Convex env variable "Runway"). One call = one picture,
// stored in Convex file storage so readers never hit Runway. Prices: docs.dev.runwayml.com/guides/pricing.
const RUNWAY = "https://api.dev.runwayml.com/v1";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runway(path: string, init?: RequestInit) {
  const key = process.env.Runway ?? process.env.RUNWAYML_API_SECRET;
  if (!key) throw new Error("No Runway key");
  const res = await fetch(`${RUNWAY}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "X-Runway-Version": "2024-11-06", "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Runway ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body as any;
}

const MODEL = "muse_image";      // design/style-anchor.md: 1 credit a picture; Gen-4 wrote text into pictures
const RATIO = "1792:1344";        // 4:3
const MAX_PICTURES = 8;

async function drawOne(ctx: ActionCtx, prompt: string, model = MODEL, ratio = RATIO, seed?: number): Promise<{ ok: true; storageId: Id<"_storage">; ms: number } | { ok: false; error: string; ms: number }> {
  const t0 = Date.now();
  try {
    const task = await runway("/text_to_image", { method: "POST", body: JSON.stringify({ model, promptText: prompt, ratio, ...(seed !== undefined ? { seed } : {}) }) });
    let t: any = task;
    for (let i = 0; i < 60; i++) {
      await sleep(5000);
      t = await runway(`/tasks/${task.id}`);
      if (t.status === "SUCCEEDED" || t.status === "FAILED" || t.status === "CANCELLED") break;
    }
    if (t.status !== "SUCCEEDED" || !t.output?.[0]) throw new Error(`${t.status}: ${t.failure ?? t.failureCode ?? ""}`);
    const img = await fetch(t.output[0]);
    const storageId = await ctx.storage.store(await img.blob());
    await ctx.runMutation(internal.handbooks.logAiCall, { kind: "picture", model, input: prompt.slice(0, 2000), output: String(storageId), ms: Date.now() - t0, ok: true });
    return { ok: true, storageId, ms: Date.now() - t0 };
  } catch (e: any) {
    const error = String(e?.message ?? e).slice(0, 300);
    await ctx.runMutation(internal.handbooks.logAiCall, { kind: "picture", model, input: prompt.slice(0, 2000), output: "", ms: Date.now() - t0, ok: false, error });
    return { ok: false, error, ms: Date.now() - t0 };
  }
}

// Scenes for a chapter's teaching cards (one Haiku call), then one picture per scene, drawn in parallel.
type Picture = { card: number; scene: string; storageId?: Id<"_storage"> };
async function picturesFor(ctx: ActionCtx, topic: string, plan: any, title: string, cards: any[], capped = true): Promise<{ status: string; pictures: Picture[] }> {
  const teaching = cards.map((c: any, i: number) => ({ c, i })).filter(({ c }) => c && c.type !== "exercise" && c.type !== "watch" && typeof c.body === "string").slice(0, MAX_PICTURES);
  if (!teaching.length) return { status: "skipped", pictures: [] };
  const r: any = await ctx.runAction(internal.ai.generate, { kind: "scenes", system: SCENES_PROMPT, user: scenesUserMessage(topic, title, plan?.picture?.line ?? plan?.picture?.name ?? "", teaching.map(({ c, i }) => ({ card: i, type: c.type, title: c.title, body: c.body }))) });
  const wanted = new Set(teaching.map(({ i }) => i));
  const scenes: { card: number; scene: string }[] = [];
  for (const x of (r.ok ? r.json?.scenes : null) ?? []) {
    const card = parseInt(String(x?.card ?? "").replace(/[^0-9]/g, ""), 10), scene = String(x?.scene ?? "").trim().slice(0, 400);
    if (wanted.has(card) && scene && !scenes.some((y) => y.card === card)) scenes.push({ card, scene });
  }
  if (!scenes.length) return { status: "failed", pictures: [] };
  // Readers' chapters count against the app-wide hourly cap; the hand-run ready-topic backfill does not.
  if (capped && !(await ctx.runMutation(internal.handbooks.takePictureBudget, { count: scenes.length }))) return { status: "failed", pictures: [] };
  const drawn = await Promise.all(scenes.map((s) => drawOne(ctx, `${PICTURE_ANCHOR} Subject: ${s.scene} ${PICTURE_NEVER}`)));
  const pictures: Picture[] = scenes.map((s, k) => ({ ...s, storageId: drawn[k].ok ? (drawn[k] as any).storageId : undefined }));
  return { status: pictures.some((p) => p.storageId) ? "done" : "failed", pictures };
}

// A chapter just written for one reader.
export const forChapter = internalAction({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }): Promise<void> => {
    const h: any = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    const ch: any = await ctx.runQuery(internal.handbooks.readChapter, { handbookId, n });
    if (!h || !ch || ch.status !== "ready" || !ch.cards) return;
    await ctx.runMutation(internal.handbooks.setPictures, { handbookId, n, status: "drawing" });
    const r = await picturesFor(ctx, h.plan?.topic ?? h.topic, h.plan, ch.title ?? "", ch.cards);
    await ctx.runMutation(internal.handbooks.setPictures, { handbookId, n, status: r.status, pictures: r.pictures });
  },
});

// A ready topic's chapter: drawn once, shared by every reader. Run by hand: npx convex run images:forCache '{...}'
export const forCache = internalAction({
  args: { topicKey: v.string(), level: v.union(v.literal("new"), v.literal("some")), n: v.number() },
  handler: async (ctx, { topicKey, level, n }): Promise<{ ok: boolean; error?: string; pictures?: number; of?: number; rows?: number; copies?: number }> => {
    const row: any = await ctx.runQuery(internal.handbooks.readCacheChapter, { topicKey, level, n });
    if (!row?.chapter) return { ok: false, error: "no such cached chapter" };
    const r = await picturesFor(ctx, row.plan?.topic ?? row.topic, row.plan, row.chapter.title ?? "", row.chapter.cards ?? [], false);
    if (r.status !== "done") return { ok: false, error: r.status };
    const shared: { rows: number; copies: number } = await ctx.runMutation(internal.handbooks.setCachePictures, { topicKey, level, n, pictures: r.pictures });
    return { ok: true, pictures: r.pictures.filter((p) => p.storageId).length, of: r.pictures.length, ...shared };
  },
});

// Style tests and one-off pictures.
export const draw = internalAction({
  args: { prompt: v.string(), model: v.string(), ratio: v.string(), seed: v.optional(v.number()) },
  handler: async (ctx, { prompt, model, ratio, seed }): Promise<{ ok: boolean; error?: string; url?: string | null; storageId?: Id<"_storage">; ms: number }> => {
    const r = await drawOne(ctx, prompt, model, ratio, model.startsWith("gen4") ? seed : undefined);
    return r.ok ? { ...r, url: await ctx.storage.getUrl(r.storageId) } : r;
  },
});
