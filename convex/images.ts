"use node";
import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { PICTURE_ANCHOR, PICTURE_NEVER, SCENES_PROMPT, scenesUserMessage } from "./prompts";
import { inkAndWash } from "./inkwash";

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
const MAX_PICTURES = 5;           // 7 Oct, Prateek: 4 to 5 a chapter (was up to 8)

// Which cards get a picture: the opening picture card, then examples and mistakes (the scenes people remember), then
// the try card and teaching cards, in reading order, at most MAX_PICTURES. The closing "In one breath" card isn't shown.
const PRIORITY: Record<string, number> = { picture: 0, example: 1, mistake: 2, try: 3, teach: 4 };
export function pictureCards(cards: any[]) {
  const all = cards.map((c: any, i: number) => ({ c, i })).filter(({ c }) => c && c.type !== "exercise" && c.type !== "watch" && typeof c.body === "string" && !/^in one breath$/i.test(String(c.title ?? "").trim()));
  const keep = new Set([...all].sort((a, b) => (PRIORITY[a.c.type] ?? 5) - (PRIORITY[b.c.type] ?? 5) || a.i - b.i).slice(0, MAX_PICTURES).map((x) => x.i));
  return all.filter((x) => keep.has(x.i));
}
const AT_ONCE = 3;                // Runway queues ("THROTTLED") past its concurrency limit; more at once just waits longer

async function drawOne(ctx: ActionCtx, prompt: string, model = MODEL, ratio = RATIO, seed?: number, extra: Record<string, unknown> = {}): Promise<{ ok: true; storageId: Id<"_storage">; ms: number } | { ok: false; error: string; ms: number }> {
  const t0 = Date.now();
  try {
    const task = await runway("/text_to_image", { method: "POST", body: JSON.stringify({ model, promptText: prompt, ratio, ...(seed !== undefined ? { seed } : {}), ...extra }) });
    let t: any = task;
    for (let i = 0; i < 110; i++) {   // up to ~9 minutes (big posters are slow); a Convex action may run 10
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
type Picture = { card: number; scene: string; storageId?: Id<"_storage">; credit?: string; source?: string };

// A freely licensed photo from Wikimedia Commons for a real thing (6 Oct, Prateek: real Iron Man, real Odyssey, not
// random drawings). Only public domain, CC0 and Creative Commons BY / BY-SA; stored with its credit line and source page.
const OPEN = /^(cc0|public domain|pd\b|pd-|cc[ -]by(-sa)?[ -]?\d)/i;
const strip = (html: string) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
async function commonsPhoto(ctx: ActionCtx, query: string): Promise<{ storageId: Id<"_storage">; credit: string; source: string } | null> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=10&gsrsearch=${encodeURIComponent(query + " filetype:bitmap")}&prop=imageinfo&iiprop=url|extmetadata|mime|size&iiurlwidth=1024`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "IGetIt/1.0 (https://sensible-mongoose-624.convex.site; learning handbooks)" } });
    const pages: any[] = Object.values((await res.json())?.query?.pages ?? {}).sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0));
    for (const p of pages) {
      const ii = p.imageinfo?.[0]; const md = ii?.extmetadata ?? {};
      const license = strip(String(md.LicenseShortName?.value ?? ""));
      if (!ii || !/image\/(jpeg|png)/.test(ii.mime) || (ii.width ?? 0) < 600 || !OPEN.test(license) || /nonfree|fair use/i.test(String(md.NonFree?.value ?? "") + license)) continue;
      const img = await fetch(ii.thumburl ?? ii.url, { headers: { "User-Agent": "IGetIt/1.0 (https://sensible-mongoose-624.convex.site)" } });
      if (!img.ok) continue;
      // Ink and wash (8 Oct): the photo is restyled to sit with the drawn covers; if the filter fails, the photo as it is.
      const bytes = new Uint8Array(await img.arrayBuffer());
      const t0 = Date.now();
      // Share-alike (CC BY-SA) photos are not restyled: an adaptation would have to be released as CC BY-SA too (8 Oct).
      const shareAlike = /-sa\b|by-sa/i.test(license);
      const styled = shareAlike ? null : await inkAndWash(bytes, ii.mime).catch((e: any) => { console.log("inkAndWash failed", String(e?.message ?? e).slice(0, 200)); return null; });
      if (styled) console.log("inkAndWash ms", Date.now() - t0);
      const storageId = await ctx.storage.store(new Blob([(styled ?? bytes) as BlobPart], { type: styled ? "image/jpeg" : ii.mime }));
      const artist = strip(String(md.Artist?.value ?? "")).slice(0, 60) || "Unknown";
      return { storageId, credit: `${/public domain|^pd/i.test(license) ? "Public domain" : `${artist}, ${license}`}, Wikimedia Commons${styled ? ", adapted" : ""}`, source: String(ii.descriptionurl ?? "") };
    }
  } catch { /* fall back to drawing */ }
  return null;
}
async function picturesFor(ctx: ActionCtx, topic: string, plan: any, title: string, cards: any[], capped = true, cover = false, model?: string): Promise<{ status: string; pictures: Picture[] }> {
  const teaching = pictureCards(cards);
  if (!teaching.length) return { status: "skipped", pictures: [] };
  const r: any = await ctx.runAction(internal.ai.generate, { kind: "scenes", system: SCENES_PROMPT, user: scenesUserMessage(topic, title, plan?.picture?.line ?? plan?.picture?.name ?? "", teaching.map(({ c, i }) => ({ card: i, type: c.type, title: c.title, body: c.body }))), model });
  const wanted = new Set(teaching.map(({ i }) => i));
  const scenes: { card: number; scene: string; real?: string }[] = [];
  for (const x of (r.ok ? r.json?.scenes : null) ?? []) {
    const card = parseInt(String(x?.card ?? "").replace(/[^0-9]/g, ""), 10), scene = String(x?.scene ?? "").trim().slice(0, 400);
    const real = typeof x?.real === "string" && x.real.trim() ? x.real.trim().slice(0, 80) : undefined;
    if (wanted.has(card) && scene && !scenes.some((y) => y.card === card)) scenes.push({ card, scene, real });
  }
  if (!scenes.length) return { status: "failed", pictures: [] };
  // Readers' chapters count against the app-wide hourly cap; the hand-run ready-topic backfill does not.
  if (capped && !(await ctx.runMutation(internal.handbooks.takePictureBudget, { count: scenes.length }))) return { status: "failed", pictures: [] };
  // Real things: a real, freely licensed photo first. Runway draws only the cover (8 Oct, Prateek: no Runway credits
  // inside chapters): the first picture of chapter 1, which is also the handbook's cover. Every other card gets a photo.
  const photos = await Promise.all(scenes.map((s) => (s.real ? commonsPhoto(ctx, s.real) : Promise.resolve(null))));
  const drawn: (Awaited<ReturnType<typeof drawOne>> | null)[] = new Array(scenes.length).fill(null);
  const first = Math.min(...scenes.map((s) => s.card));
  const toDraw = scenes.map((_, k) => k).filter((k) => !photos[k] && cover && scenes[k].card === first);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(AT_ONCE, toDraw.length) }, async () => {
    while (next < toDraw.length) { const k = toDraw[next++]; drawn[k] = await drawOne(ctx, `${PICTURE_ANCHOR} Subject: ${scenes[k].scene} ${PICTURE_NEVER}`); }
  }));
  // Every card without a photo or a drawing (and a cover Runway refused) gets a free, openly licensed Wikimedia photo
  // found from the card's title and the topic. No photo is used twice in one chapter.
  const usedSources = new Set(photos.filter(Boolean).map((p) => p!.source));
  for (let k = 0; k < scenes.length; k++) {
    if (photos[k] || drawn[k]?.ok) continue;
    const card = cards[scenes[k].card] ?? {};
    const query = scenes[k].real ?? `${String(card.title ?? "").replace(/^in one breath$/i, "")} ${topic}`.trim();
    const photo = query ? await commonsPhoto(ctx, query) : null;
    if (photo && !usedSources.has(photo.source)) { photos[k] = photo; usedSources.add(photo.source); }
  }
  const pictures: Picture[] = scenes.map((s, k) => photos[k] ? { card: s.card, scene: s.scene, storageId: photos[k]!.storageId, credit: photos[k]!.credit, source: photos[k]!.source }
    : { card: s.card, scene: s.scene, storageId: drawn[k]?.ok ? (drawn[k] as any).storageId : undefined });
  return { status: pictures.some((p) => p.storageId) ? "done" : "failed", pictures };
}

// Dry run: the scene plan only (which cards would get a real photo), no drawing. npx convex run images:scenesOnly '{...}'
export const scenesOnly = internalAction({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }): Promise<any> => {
    const h: any = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    const ch: any = await ctx.runQuery(internal.handbooks.readChapter, { handbookId, n });
    const teaching = pictureCards(ch?.cards ?? []);
    const r: any = await ctx.runAction(internal.ai.generate, { kind: "scenes", system: SCENES_PROMPT, user: scenesUserMessage(h.plan?.topic ?? h.topic, ch.title ?? "", h.plan?.picture?.line ?? "", teaching.map(({ c, i }: any) => ({ card: i, type: c.type, title: c.title, body: c.body }))) });
    return r.ok ? r.json.scenes.map((x: any) => ({ card: x.card, real: x.real ?? null, scene: String(x.scene).slice(0, 60) })) : r.error;
  },
});

// Pictures for an A/B rewrite of chapter 1 (doctor.ts), drawn once for every B reader.
export const forExperiment = internalAction({
  args: { experimentId: v.id("experiments") },
  handler: async (ctx, { experimentId }): Promise<void> => {
    const e: any = await ctx.runQuery(internal.doctor.readExperiment, { id: experimentId });
    const row: any = e && await ctx.runQuery(internal.doctor.readTopic, { topic: e.topic });
    if (!e || !row) return;
    const r = await picturesFor(ctx, row.plan?.topic ?? e.topic, row.plan, e.b.title ?? "", e.b.cards, false, true);
    if (r.status === "done") await ctx.runMutation(internal.doctor.setBPictures, { id: experimentId, pictures: r.pictures });
  },
});

// A chapter just written for one reader.
export const forChapter = internalAction({
  args: { handbookId: v.id("handbooks"), n: v.number() },
  handler: async (ctx, { handbookId, n }): Promise<void> => {
    const h: any = await ctx.runQuery(internal.handbooks.readHandbook, { handbookId });
    const ch: any = await ctx.runQuery(internal.handbooks.readChapter, { handbookId, n });
    if (!h || !ch || ch.status !== "ready" || !ch.cards) return;
    await ctx.runMutation(internal.handbooks.setPictures, { handbookId, n, status: "drawing" });
    const r = await picturesFor(ctx, h.plan?.topic ?? h.topic, h.plan, ch.title ?? "", ch.cards, true, n === 1, h.writer);
    await ctx.runMutation(internal.handbooks.setPictures, { handbookId, n, status: r.status, pictures: r.pictures });
  },
});

// A ready topic's chapter: drawn once, shared by every reader. Run by hand: npx convex run images:forCache '{...}'
export const forCache = internalAction({
  args: { topicKey: v.string(), level: v.union(v.literal("new"), v.literal("some")), n: v.number() },
  handler: async (ctx, { topicKey, level, n }): Promise<{ ok: boolean; error?: string; pictures?: number; of?: number; rows?: number; copies?: number }> => {
    const row: any = await ctx.runQuery(internal.handbooks.readCacheChapter, { topicKey, level, n });
    if (!row?.chapter) return { ok: false, error: "no such cached chapter" };
    const r = await picturesFor(ctx, row.plan?.topic ?? row.topic, row.plan, row.chapter.title ?? "", row.chapter.cards ?? [], false, n === 1);
    if (r.status !== "done") { await ctx.runMutation(internal.handbooks.cachePicturesFailed, { topicKey, level, n }); return { ok: false, error: r.status }; }
    const shared: { rows: number; copies: number } = await ctx.runMutation(internal.handbooks.setCachePictures, { topicKey, level, n, pictures: r.pictures });
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

// Try the Wikimedia photo step (with ink and wash) on one search. npx convex run images:photoTest '{"query":"..."}'
export const photoTest = internalAction({
  args: { query: v.string() },
  handler: async (ctx, { query }): Promise<any> => {
    const t0 = Date.now();
    const p = await commonsPhoto(ctx, query);
    return p ? { ms: Date.now() - t0, credit: p.credit, url: await ctx.storage.getUrl(p.storageId) } : { ms: Date.now() - t0, found: false };
  },
});
