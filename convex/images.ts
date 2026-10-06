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

async function runway(path: string, init?: RequestInit, tries = 3): Promise<any> {
  const key = process.env.Runway ?? process.env.RUNWAYML_API_SECRET;
  if (!key) throw new Error("No Runway key");
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${RUNWAY}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${key}`, "X-Runway-Version": "2024-11-06", "Content-Type": "application/json", ...(init?.headers ?? {}) },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),   // a hung request counts as a blip and is tried again
      });
      const body = await res.json().catch(() => ({}));
      // Busy or a server hiccup: wait and try again. Anything else is a real refusal.
      if ((res.status === 429 || res.status >= 500) && attempt < tries) { await sleep(4000 * attempt); continue; }
      if (!res.ok) throw new Error(`Runway ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
      return body;
    } catch (e: any) {
      if (attempt >= tries || String(e?.message).startsWith("Runway ")) throw e;
      await sleep(4000 * attempt);   // network blip ("fetch failed")
    }
  }
}

const MODEL = "muse_image";      // design/style-anchor.md: 1 credit a picture; Gen-4 wrote text into pictures
const RATIO = "1792:1344";        // 4:3
const MAX_PICTURES = 8;
const AT_ONCE = 3;                // Runway queues ("THROTTLED") past its concurrency limit; more at once just waits longer
const REQUEST_TIMEOUT_MS = 30_000;
const DOWNLOAD_TIMEOUT_MS = 60_000;
const POLLS = 96;                 // every 5 s: up to 8 minutes, so one picture always fits in one action

async function drawOne(ctx: ActionCtx, prompt: string, model = MODEL, ratio = RATIO, seed?: number, extra: Record<string, unknown> = {}): Promise<{ ok: true; storageId: Id<"_storage">; ms: number } | { ok: false; error: string; ms: number }> {
  const t0 = Date.now();
  try {
    const task = await runway("/text_to_image", { method: "POST", body: JSON.stringify({ model, promptText: prompt, ratio, ...(seed !== undefined ? { seed } : {}), ...extra }) });
    let t: any = task;
    for (let i = 0; i < POLLS; i++) {   // big posters are slow; a Convex action may run 10 minutes
      await sleep(5000);
      t = await runway(`/tasks/${task.id}`);
      if (t.status === "SUCCEEDED" || t.status === "FAILED" || t.status === "CANCELLED") break;
    }
    if (t.status !== "SUCCEEDED" || !t.output?.[0]) throw new Error(`${t.status}: ${t.failure ?? t.failureCode ?? ""}`);
    const img = await fetch(t.output[0], { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
    const storageId = await ctx.storage.store(await img.blob());
    await ctx.runMutation(internal.handbooks.logAiCall, { kind: "picture", model, input: prompt.slice(0, 2000), output: String(storageId), ms: Date.now() - t0, ok: true });
    return { ok: true, storageId, ms: Date.now() - t0 };
  } catch (e: any) {
    const error = String(e?.message ?? e).slice(0, 300);
    await ctx.runMutation(internal.handbooks.logAiCall, { kind: "picture", model, input: prompt.slice(0, 2000), output: "", ms: Date.now() - t0, ok: false, error });
    return { ok: false, error, ms: Date.now() - t0 };
  }
}

// Scenes for a chapter's teaching cards (one Haiku call): what each picture should show.
type Picture = { card: number; scene: string; storageId?: Id<"_storage"> };
type Scenes = { status: "ok"; scenes: { card: number; scene: string }[] } | { status: "skipped" | "failed" };
async function scenesFor(ctx: ActionCtx, topic: string, plan: any, title: string, cards: any[]): Promise<Scenes> {
  const teaching = cards.map((c: any, i: number) => ({ c, i })).filter(({ c }) => c && c.type !== "exercise" && c.type !== "watch" && typeof c.body === "string").slice(0, MAX_PICTURES);
  if (!teaching.length) return { status: "skipped" };
  const r: any = await ctx.runAction(internal.ai.generate, { kind: "scenes", system: SCENES_PROMPT, user: scenesUserMessage(topic, title, plan?.picture?.line ?? plan?.picture?.name ?? "", teaching.map(({ c, i }) => ({ card: i, type: c.type, title: c.title, body: c.body }))) });
  const wanted = new Set(teaching.map(({ i }) => i));
  const scenes: { card: number; scene: string }[] = [];
  for (const x of (r.ok ? r.json?.scenes : null) ?? []) {
    const card = parseInt(String(x?.card ?? "").replace(/[^0-9]/g, ""), 10), scene = String(x?.scene ?? "").trim().slice(0, 400);
    if (wanted.has(card) && scene && !scenes.some((y) => y.card === card)) scenes.push({ card, scene });
  }
  return scenes.length ? { status: "ok", scenes } : { status: "failed" };
}

const promptFor = (scene: string) => `${PICTURE_ANCHOR} Subject: ${scene} ${PICTURE_NEVER}`;

// A ready topic's chapter, drawn in one go (run by hand, so nobody waits on it): scenes, then every picture.
async function picturesFor(ctx: ActionCtx, topic: string, plan: any, title: string, cards: any[]): Promise<{ status: string; pictures: Picture[] }> {
  const found = await scenesFor(ctx, topic, plan, title, cards);
  if (found.status !== "ok") return { status: found.status, pictures: [] };
  const scenes = found.scenes;
  const drawn: Awaited<ReturnType<typeof drawOne>>[] = new Array(scenes.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(AT_ONCE, scenes.length) }, async () => {
    while (next < scenes.length) { const k = next++; drawn[k] = await drawOne(ctx, promptFor(scenes[k].scene)); }
  }));
  const pictures: Picture[] = scenes.map((s, k) => ({ ...s, storageId: drawn[k].ok ? (drawn[k] as any).storageId : undefined }));
  return { status: pictures.some((p) => p.storageId) ? "done" : "failed", pictures };
}

// A chapter just written for one reader. Each picture is drawn in an action of its own (one can take minutes), in
// AT_ONCE lanes: a lane draws picture k, then k + AT_ONCE, and so on. The chapter is already open meanwhile.
export const forChapter = internalAction({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }): Promise<void> => {
    const h: any = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    const ch: any = await ctx.runQuery(internal.handbooks.readChapter, { handbookId, n });
    if (!h || !ch || ch.status !== "ready" || !ch.cards) return;
    await ctx.runMutation(internal.pictures.setPictures, { handbookId, n, status: "drawing" });
    const found = await scenesFor(ctx, h.plan?.topic ?? h.topic, h.plan, ch.title ?? "", ch.cards);
    // Readers' chapters count against the app-wide hourly cap; the hand-run ready-topic backfill does not.
    const allowed = found.status === "ok" && (await ctx.runMutation(internal.pictures.takePictureBudget, { count: found.scenes.length }));
    if (found.status !== "ok" || !allowed) {
      await ctx.runMutation(internal.pictures.setPictures, { handbookId, n, status: found.status === "skipped" ? "skipped" : "failed", pictures: [] });
      return;
    }
    await ctx.runMutation(internal.pictures.startPictures, { handbookId, n, pictures: found.scenes, lanes: AT_ONCE });
  },
});

// One lane's next picture. The scene is passed along so a chapter rewritten meanwhile isn't given the old picture.
export const drawLane = internalAction({
  args: { handbookId: v.id("handbooks"), n: v.number(), k: v.number(), card: v.number(), scene: v.string() },
  handler: async (ctx, { handbookId, n, k, card, scene }): Promise<void> => {
    const r = await drawOne(ctx, promptFor(scene));
    await ctx.runMutation(internal.pictures.setPicture, { handbookId, n, k, card, scene, storageId: r.ok ? r.storageId : undefined, lanes: AT_ONCE });
  },
});

// A ready topic's chapter: drawn once, shared by every reader. Run by hand: npx convex run images:forCache '{...}'
export const forCache = internalAction({
  args: { topicKey: v.string(), level: v.union(v.literal("new"), v.literal("some")), n: v.number() },
  handler: async (ctx, { topicKey, level, n }): Promise<{ ok: boolean; error?: string; pictures?: number; of?: number; rows?: number; copies?: number }> => {
    const row: any = await ctx.runQuery(internal.pictures.readCacheChapter, { topicKey, level, n });
    if (!row?.chapter) return { ok: false, error: "no such cached chapter" };
    const r = await picturesFor(ctx, row.plan?.topic ?? row.topic, row.plan, row.chapter.title ?? "", row.chapter.cards ?? []);
    if (r.status !== "done") return { ok: false, error: r.status };
    const shared: { rows: number; copies: number } = await ctx.runMutation(internal.pictures.setCachePictures, { topicKey, level, n, pictures: r.pictures });
    return { ok: true, pictures: r.pictures.filter((p) => p.storageId).length, of: r.pictures.length, ...shared };
  },
});

// The ready-topic backfill as a server-side queue: draw one chapter, then schedule the next.
// Nothing waits on a terminal. Start it with: npx convex run --prod images:backfill '{"queue":[...]}'
const chapterRef = v.object({ topicKey: v.string(), level: v.union(v.literal("new"), v.literal("some")), n: v.number() });
export const backfill = internalAction({
  args: { queue: v.array(chapterRef), done: v.optional(v.number()), failed: v.optional(v.array(chapterRef)) },
  handler: async (ctx, { queue, done = 0, failed = [] }): Promise<void> => {
    const [head, ...rest] = queue;
    if (!head) { console.log(`backfill finished: ${done} chapters drawn, ${failed.length} failed`, JSON.stringify(failed)); return; }
    let ok = false;
    try { const r: any = await ctx.runAction(internal.images.forCache, head); ok = !!r?.ok; console.log("backfill", JSON.stringify(head), JSON.stringify(r)); }
    catch (e: any) { console.log("backfill error", JSON.stringify(head), String(e?.message ?? e).slice(0, 200)); }
    await ctx.scheduler.runAfter(0, internal.images.backfill, { queue: rest, done: done + (ok ? 1 : 0), failed: ok ? failed : [...failed, head] });
  },
});

// Style tests and one-off pictures.
export const draw = internalAction({
  args: { prompt: v.string(), model: v.string(), ratio: v.string(), seed: v.optional(v.number()), extra: v.optional(v.any()) },
  handler: async (ctx, { prompt, model, ratio, seed, extra }): Promise<{ ok: boolean; error?: string; url?: string | null; storageId?: Id<"_storage">; ms: number }> => {
    const r = await drawOne(ctx, prompt, model, ratio, model.startsWith("gen4") ? seed : undefined, extra ?? {});
    return r.ok ? { ...r, url: await ctx.storage.getUrl(r.storageId) } : r;
  },
});
