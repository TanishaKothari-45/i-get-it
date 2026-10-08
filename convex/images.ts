"use node";
import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { PICTURE_ANCHOR, PICTURE_NEVER, SCENES_PROMPT, scenesUserMessage } from "./prompts";
import { inkAndWash, shrink } from "./inkwash";

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
    // Stored small (8 Oct night): about 900 px wide JPEG, not the 3 to 4 MB PNG Runway returns. If shrinking fails, the
    // original is kept rather than losing the picture.
    const raw = new Uint8Array(await img.arrayBuffer()), mime = img.headers.get("content-type") ?? "image/png";
    let blob: Blob;
    try { const small = await shrink(raw, mime); blob = new Blob([small.bytes as BlobPart], { type: "image/jpeg" }); }
    catch (e: any) { console.log("shrink failed, storing the original", String(e?.message ?? e).slice(0, 120)); blob = new Blob([raw as BlobPart], { type: mime }); }
    const storageId = await ctx.storage.store(blob);
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
// stored: scenes the fact check already wrote for this chapter (8 Oct, Tanisha: one Sonnet call fewer). With them, no
// scenes call is made; without them (older chapters, ready topics built before), the picture editor writes them here.
async function picturesFor(ctx: ActionCtx, topic: string, plan: any, title: string, cards: any[], capped = true, cover = false, model?: string, stored?: { card: number; scene: string; real?: string }[], trace?: { handbookId?: any; chapter?: number }): Promise<{ status: string; pictures: Picture[] }> {
  const teaching = pictureCards(cards);
  if (!teaching.length) return { status: "skipped", pictures: [] };
  const r: any = stored?.length ? { ok: true, json: { scenes: stored } }
    : await ctx.runAction(internal.ai.generate, { kind: "scenes", system: SCENES_PROMPT, user: scenesUserMessage(topic, title, plan?.picture?.line ?? plan?.picture?.name ?? "", teaching.map(({ c, i }) => ({ card: i, type: c.type, title: c.title, body: c.body }))), model, trace });
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
  // Real things: a real, freely licensed photo first (ink and wash). Everything else is drawn by Runway (8 Oct, Prateek:
  // "Runway back on"; the night's cover-only rule left new chapters with 0 or 1 picture, and a reader said so).
  const photos = await Promise.all(scenes.map((s) => (s.real ? commonsPhoto(ctx, s.real) : Promise.resolve(null))));
  const drawn: (Awaited<ReturnType<typeof drawOne>> | null)[] = new Array(scenes.length).fill(null);
  void cover;
  const toDraw = scenes.map((_, k) => k).filter((k) => !photos[k]);
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
    const r = await picturesFor(ctx, h.plan?.topic ?? h.topic, h.plan, ch.title ?? "", ch.cards, true, n === 1, h.writer, ch.scenes, { handbookId, chapter: n });
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

// Backfill (8 Oct): every ready-topic chapter with fewer than 4 pictures (chapter 1 only if it has fewer than 3 and the
// topic isn't frozen), queued one after another; and every live chapter opened since 7 Oct evening with at most 1
// drawing, redrawn now. Run: npx convex run --prod images:backfillMissing '{}'
export const backfillMissing = internalAction({
  args: {},
  handler: async (ctx): Promise<{ cacheChapters: number; liveChapters: number }> => {
    const { queue, live } = await ctx.runQuery(internal.repairData.missingPictures, {});
    if (queue.length) await ctx.scheduler.runAfter(0, internal.images.backfill, { queue });
    for (const [i, x] of live.entries()) await ctx.scheduler.runAfter(i * 20000, internal.images.forChapter, x);
    return { cacheChapters: queue.length, liveChapters: live.length };
  },
});

// ---------- one-off (8 Oct night): shrink every stored picture ----------
// Walks each table that holds picture ids, shrinks each big PNG once (the old → new pair is kept in settings under
// "shrunk:<id>", so a file shared by a chapter, its library copy and the shelf is shrunk once), rewrites the row, and
// schedules the next page. Originals are not deleted here; images:deleteShrunkOriginals does that after a check.
// Start: npx convex run --prod images:shrinkAll '{}'
const SHRINK_TABLES = ["chapters", "library", "cache", "shelf", "experiments"] as const;
const BIG = 400_000;   // bytes; anything smaller is already small enough
export const shrinkAll = internalAction({
  args: { table: v.optional(v.string()), cursor: v.optional(v.union(v.string(), v.null())), done: v.optional(v.number()), saved: v.optional(v.number()) },
  handler: async (ctx, { table = "chapters", cursor = null, done = 0, saved = 0 }): Promise<void> => {
    const page: { rows: { id: string; ids: string[] }[]; cursor: string | null; done: boolean } = await ctx.runQuery(internal.repairData.pictureRefs, { table, cursor });
    for (const row of page.rows) {
      const pairs: { from: string; to: string }[] = [];
      for (const id of new Set(row.ids)) {
        const known: string | null = await ctx.runQuery(internal.repairData.shrunkFor, { from: id });
        if (known) { pairs.push({ from: id, to: known }); continue; }
        const meta: { size: number; contentType: string | null } | null = await ctx.runQuery(internal.repairData.fileMeta, { id });
        if (!meta || meta.size < BIG) continue;
        try {
          const blob = await ctx.storage.get(id as Id<"_storage">);
          if (!blob) continue;
          const small = await shrink(new Uint8Array(await blob.arrayBuffer()), meta.contentType ?? "image/png");
          const to = await ctx.storage.store(new Blob([small.bytes as BlobPart], { type: "image/jpeg" }));
          await ctx.runMutation(internal.repairData.rememberShrunk, { from: id, to: String(to) });
          pairs.push({ from: id, to: String(to) });
          done++; saved += meta.size - small.bytes.length;
        } catch (e: any) { console.log("shrink failed", id, String(e?.message ?? e).slice(0, 120)); }
      }
      if (pairs.length) await ctx.runMutation(internal.repairData.remapRow, { table, id: row.id, pairs });
    }
    if (!page.done) { await ctx.scheduler.runAfter(0, internal.images.shrinkAll, { table, cursor: page.cursor, done, saved }); return; }
    const next = SHRINK_TABLES[SHRINK_TABLES.indexOf(table as any) + 1];
    if (next) { await ctx.scheduler.runAfter(0, internal.images.shrinkAll, { table: next, cursor: null, done, saved }); return; }
    console.log(`shrinkAll finished: ${done} pictures shrunk, about ${Math.round(saved / 1e6)} MB saved`);
    await ctx.runMutation(internal.repairData.rememberShrunk, { from: "shrinkAll:finished", to: `${done} pictures, ${Math.round(saved / 1e6)} MB, ${new Date().toISOString()}` });
  },
});

// After shrinkAll: delete the big originals that were replaced. Only files recorded as "from" in the shrunk map, and only
// when no table still points at them. Run: npx convex run --prod images:deleteShrunkOriginals '{}'
export const deleteShrunkOriginals = internalAction({
  args: { cursor: v.optional(v.union(v.string(), v.null())), deleted: v.optional(v.number()), kept: v.optional(v.number()) },
  handler: async (ctx, { cursor = null, deleted = 0, kept = 0 }): Promise<void> => {
    const page: { rows: { from: string }[]; cursor: string | null; done: boolean } = await ctx.runQuery(internal.repairData.shrunkPage, { cursor });
    for (const r of page.rows) {
      if (!/^[a-z0-9]{20,}$/.test(r.from)) continue;
      const still: boolean = await ctx.runQuery(internal.repairData.stillReferenced, { id: r.from });
      if (still) { kept++; continue; }
      try { await ctx.storage.delete(r.from as Id<"_storage">); deleted++; } catch { kept++; }
    }
    if (!page.done) { await ctx.scheduler.runAfter(0, internal.images.deleteShrunkOriginals, { cursor: page.cursor, deleted, kept }); return; }
    console.log(`deleteShrunkOriginals finished: ${deleted} deleted, ${kept} kept`);
  },
});
