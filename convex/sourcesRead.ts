"use node";
// Reading what the learner shared, before the plan is written. Gemini watches and listens:
// - YouTube: Gemini watches the link directly (clipped to MAX_SECONDS).
// - Instagram: Apify fetches the reel's video and caption (no transcript add-on: Gemini hears the audio, in any
//   language, and reads what's on screen). Video unavailable: Supadata's transcript, then the caption.
// - Photo: Gemini reads it at high resolution (small print on a page), and the photo is deleted.
// Then the notes are combined into one topic and what the learner is after (or one question).
// Tested 6 Oct on real reels: Flash-Lite read as well as Flash, 2-8 s each against 14-50 s, and never hit
// "high demand"; watching found names and links (on screen) a transcript got wrong or missed. About ₹0.10 a reel.
// Videos are never stored: only Gemini's notes are kept.
import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { COMBINE_PROMPT, SOURCE_READ_PROMPT, THEMES_PROMPT, combineMessage, sourceReadMessage, themesMessage, type Brief } from "./prompts";
import { CREATOR_REELS } from "./links";

// Two jobs, two models. Reading (watching each reel, reading each photo) is mostly seeing and hearing: Flash-Lite,
// fast and steady, with Flash as its backup. Judging (one topic and why it was saved, or a creator's themes) shapes
// the whole handbook and reads only short notes: Flash, with Flash-Lite as its backup so it never fails for being busy.
const READER = () => process.env.GEMINI_READ_MODEL ?? "gemini-3.5-flash-lite";
const JUDGE = () => process.env.GEMINI_JUDGE_MODEL ?? "gemini-3.8-flash";
const READ_MODELS = () => [READER(), READER(), JUDGE()];
const JUDGE_MODELS = () => [JUDGE(), READER(), READER()];
const MAX_SECONDS = 180;                      // a video is read up to 3 minutes
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;     // a reel is a few MB; anything bigger falls back to its transcript or caption
const TIMEOUT_MS = 120_000;
const RETRY_DELAY_MS = 2_000;
const SUPADATA_POLLS = 6;
const SUPADATA_POLL_MS = 5_000;

type Source = NonNullable<Doc<"handbooks">["sources"]>[number];
type Read = { learnable: boolean; title: string; notes: string; hook?: string; via: string };
type Reel = { url?: string; caption?: string; videoUrl?: string };

// A failure worth another go: Gemini busy ("high demand", 429, 5xx) or slow.
class Busy extends Error {}

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try { return await fetch(url, { ...init, signal: controller.signal }); } finally { clearTimeout(timer); }
}

type Resolution = "MEDIA_RESOLUTION_LOW" | "MEDIA_RESOLUTION_HIGH";

async function callGemini(model: string, system: string, parts: any[], resolution: Resolution): Promise<{ json: any; text: string; tokensIn?: number; tokensOut?: number }> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 4096, mediaResolution: resolution, thinkingConfig: { thinkingLevel: "low" } },
      }),
    });
  } catch (e: any) {
    throw new Busy(e?.name === "AbortError" ? "Gemini timed out" : `Gemini unreachable: ${e?.message ?? e}`);
  }
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message ?? `Gemini ${res.status}`;
    if (res.status === 429 || res.status >= 500 || /high demand|overloaded|try again/i.test(message)) throw new Busy(message);
    throw new Error(message);
  }
  const text = (data.candidates?.[0]?.content?.parts ?? []).filter((p: any) => !p.thought && typeof p.text === "string").map((p: any) => p.text).join("");
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Busy("no JSON in Gemini's reply");
  return { json: JSON.parse(m[0]), text, tokensIn: data.usageMetadata?.promptTokenCount, tokensOut: data.usageMetadata?.candidatesTokenCount };
}

// One Gemini call that answers in JSON: each model in turn while the last one was busy. Every attempt is logged in aiCalls.
// Videos are watched at low resolution (cheap, and enough for on-screen text); photos at high.
async function gemini(ctx: ActionCtx, label: string, system: string, parts: any[], input: string,
  { models = READ_MODELS(), resolution = "MEDIA_RESOLUTION_LOW" }: { models?: string[]; resolution?: Resolution } = {}): Promise<any> {
  if (!process.env.GEMINI_API_KEY) throw new Error("no Gemini key set");
  const attempts = models;
  let last = "";
  for (const [i, model] of attempts.entries()) {
    const started = Date.now();
    try {
      const r = await callGemini(model, system, parts, resolution);
      await ctx.runMutation(internal.handbooks.logAiCall, { kind: label, model, input, output: r.text.slice(0, 20000), tokensIn: r.tokensIn, tokensOut: r.tokensOut, ms: Date.now() - started, ok: true });
      return r.json;
    } catch (e: any) {
      last = String(e?.message ?? e).slice(0, 500);
      const tryAgain = e instanceof Busy && i < attempts.length - 1;
      await ctx.runMutation(internal.handbooks.logAiCall, { kind: label, model, input, output: "", ms: Date.now() - started, ok: false, error: `${tryAgain ? `attempt ${i + 1}, trying again: ` : ""}${last}` });
      if (!tryAgain) break;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  throw new Error(last);
}

function asRead(json: any, via: string): Read {
  const hook = typeof json?.hook === "string" && json.hook.trim() ? json.hook.trim().slice(0, 300) : undefined;
  return { learnable: json?.learnable !== false && typeof json?.notes === "string" && json.notes.trim().length > 0, title: String(json?.title ?? "").slice(0, 80), notes: String(json?.notes ?? "").slice(0, 4000), hook, via };
}

const clip = { endOffset: `${MAX_SECONDS}s` };

async function readYoutube(ctx: ActionCtx, url: string): Promise<Read> {
  const json = await gemini(ctx, "source-youtube", SOURCE_READ_PROMPT, [{ fileData: { fileUri: url }, videoMetadata: clip }, { text: sourceReadMessage("youtube") }], url);
  return asRead(json, "video");
}

function transcriptText(t: unknown): string {
  if (typeof t === "string") return t;
  if (Array.isArray(t)) return t.map((x: any) => (typeof x === "string" ? x : x?.text ?? "")).join(" ");
  return "";
}

// Apify's Instagram Reel Scraper: for a reel link, or a public creator's handle (their latest reels), the caption and
// the video file's link, without logging in. No transcript add-on: Gemini listens to the video itself. null without a key.
async function apifyReels(target: string, limit: number): Promise<Reel[] | null> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return null;
  const res = await fetchWithTimeout("https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items?timeout=110", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ username: [target], resultsLimit: limit }),
  });
  if (!res.ok) throw new Error(`Apify ${res.status}`);
  const items: any[] = await res.json();
  return (items ?? []).filter((item) => item && !item.error).slice(0, limit)
    .map((item) => ({ url: item.url ?? undefined, caption: item.caption ?? undefined, videoUrl: item.videoUrl ?? undefined }));
}

// The reel's video, downloaded once for Gemini to watch, then dropped. null if too big or gone (links expire).
async function downloadVideo(videoUrl: string): Promise<string | null> {
  const res = await fetchWithTimeout(videoUrl, {}, 60_000);
  if (!res.ok) return null;
  if (Number(res.headers.get("content-length") ?? 0) > MAX_VIDEO_BYTES) return null;
  const bytes = Buffer.from(await res.arrayBuffer());
  return bytes.length > MAX_VIDEO_BYTES ? null : bytes.toString("base64");
}

// Supadata: a transcript from the reel's link, for when the video itself can't be fetched. Slow ones come back as a job.
async function supadataTranscript(url: string): Promise<string | null> {
  const key = process.env.SUPADATA_API_KEY;
  if (!key) return null;
  const headers = { "x-api-key": key };
  let res = await fetchWithTimeout(`https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(url)}&text=true`, { headers });
  let data: any = await res.json().catch(() => ({}));
  const jobId = res.status === 202 ? data?.jobId : undefined;
  for (let i = 0; jobId && i < SUPADATA_POLLS; i++) {
    await new Promise((r) => setTimeout(r, SUPADATA_POLL_MS));
    res = await fetchWithTimeout(`https://api.supadata.ai/v1/transcript/${jobId}`, { headers });
    data = await res.json().catch(() => ({}));
    if (!data?.status || data.status === "completed" || data.status === "failed") break;
  }
  const content = typeof data?.content === "string" ? data.content : transcriptText(data?.content);
  return res.ok && content.trim() ? content : null;
}

// Instagram's own embed (official, public posts): the caption, when nothing else works.
async function instagramCaption(url: string): Promise<string | null> {
  const token = process.env.INSTAGRAM_OEMBED_TOKEN;
  const res = await fetchWithTimeout(`https://graph.facebook.com/v25.0/instagram_oembed?url=${encodeURIComponent(url)}${token ? `&access_token=${token}` : ""}`, {}, 20_000);
  if (!res.ok) return null;
  const data: any = await res.json().catch(() => ({}));
  const text = String(data?.title ?? data?.caption ?? String(data?.html ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  return text || null;
}

// pre: what was already fetched (a creator's reels come in one call), so the reel isn't fetched again.
async function readInstagram(ctx: ActionCtx, url: string, pre?: Reel): Promise<Read> {
  const reel = pre ?? (await apifyReels(url, 1).catch(() => null))?.[0] ?? null;
  const video = reel?.videoUrl ? await downloadVideo(reel.videoUrl).catch(() => null) : null;
  if (video) {
    const json = await gemini(ctx, "source-instagram-video", SOURCE_READ_PROMPT,
      [{ inlineData: { mimeType: "video/mp4", data: video }, videoMetadata: clip }, { text: sourceReadMessage("instagram", { caption: reel?.caption }) }], url);
    return asRead(json, "video");
  }
  // No video: what is said (Supadata), else what is written (the caption).
  const transcript = await supadataTranscript(url).catch(() => null);
  const caption = reel?.caption ?? await instagramCaption(url).catch(() => null) ?? undefined;
  if (!transcript && !caption) throw new Error("couldn't open this reel");
  const json = await gemini(ctx, `source-instagram-${transcript ? "transcript" : "caption"}`, SOURCE_READ_PROMPT, [{ text: sourceReadMessage("instagram", { caption, transcript: transcript ?? undefined }) }], url);
  return asRead(json, transcript ? "transcript" : "caption");
}

async function readImage(ctx: ActionCtx, storageId: Id<"_storage">): Promise<Read> {
  const blob = await ctx.storage.get(storageId);
  if (!blob) throw new Error("photo missing");
  const data = Buffer.from(await blob.arrayBuffer()).toString("base64");
  const json = await gemini(ctx, "source-photo", SOURCE_READ_PROMPT, [{ inlineData: { mimeType: blob.type || "image/jpeg", data } }, { text: sourceReadMessage("image") }], "photo", { resolution: "MEDIA_RESOLUTION_HIGH" });
  return asRead(json, "photo");
}

async function readOne(ctx: ActionCtx, s: Source): Promise<Read> {
  if (s.kind === "youtube" && s.url) return readYoutube(ctx, s.url);
  if (s.kind === "instagram" && s.url) return readInstagram(ctx, s.url, s.caption || s.videoUrl ? { caption: s.caption, videoUrl: s.videoUrl } : undefined);
  if (s.kind === "image" && s.storageId) return readImage(ctx, s.storageId);
  throw new Error("nothing to read");
}

// Every source not read yet (and not set aside), at once. Photos are deleted afterwards, whatever happened.
async function readSources(ctx: ActionCtx, handbookId: Id<"handbooks">) {
  const h = await ctx.runQuery(internal.sources.readHandbook, { handbookId });
  await Promise.all((h?.sources ?? []).map(async (s, index) => {
    if (s.status === "read" || s.error === "about something else") return;
    await ctx.runMutation(internal.sources.setSource, { handbookId, index, fields: { status: "reading", error: undefined } });
    try {
      const r = await readOne(ctx, s);
      await ctx.runMutation(internal.sources.setSource, { handbookId, index, fields: r.learnable
        ? { status: "read", via: r.via, title: r.title, notes: r.notes, hook: r.hook, clearStorage: s.kind === "image" }
        : { status: "failed", via: r.via, title: r.title, error: "nothing to learn in it", clearStorage: s.kind === "image" } });
    } catch (e: any) {
      await ctx.runMutation(internal.sources.setSource, { handbookId, index, fields: { status: "failed", error: String(e?.message ?? e).slice(0, 200), clearStorage: s.kind === "image" } });
    } finally {
      if (s.kind === "image" && s.storageId) await ctx.storage.delete(s.storageId).catch(() => {});
    }
  }));
}

const KINDS = ["picks", "howto", "explainer", "story", "mixed"];
const strings = (xs: unknown, n: number, len: number) => (Array.isArray(xs) ? xs : []).filter((x) => typeof x === "string" && x.trim()).slice(0, n).map((x: string) => x.trim().slice(0, len));
const line = (x: unknown, len: number) => (typeof x === "string" && x.trim() ? x.trim().slice(0, len) : undefined);

// Flash's brief, checked: known kinds only, short fields, examples pointing at sources that exist.
function briefOf(json: any, sources: number[]): Brief | undefined {
  if (!json?.topic) return undefined;
  return {
    kind: KINDS.includes(json.kind) ? json.kind : "mixed",
    want: line(json.want, 300), intent: line(json.intent, 600), core: line(json.core, 500),
    examples: (Array.isArray(json.examples) ? json.examples : []).filter((e: any) => typeof e?.what === "string" && e.what.trim()).slice(0, 15)
      .map((e: any) => ({ what: e.what.trim().slice(0, 240), from: (Array.isArray(e.from) ? e.from : []).map(Number).filter((n: number) => sources.includes(n)) })),
    beyond: strings(json.beyond, 4, 240), assumes: strings(json.assumes, 4, 200), claims: strings(json.claims, 8, 240),
    fresh: ["fast", "medium", "stable"].includes(json.fresh) ? json.fresh : undefined,
  };
}

// The read sources (not set aside) into one topic and what the learner is after, or one question.
async function combine(ctx: ActionCtx, handbookId: Id<"handbooks">) {
  const h = await ctx.runQuery(internal.sources.readHandbook, { handbookId });
  const read = (h?.sources ?? []).flatMap((s, i) => (s.status === "read" ? [{ n: i + 1, kind: s.kind, title: s.title ?? "", hook: s.hook, notes: s.notes ?? "" }] : []));
  const typed = (h?.topic ?? "").trim();
  if (!read.length) {
    // Nothing readable. A typed line can still carry the handbook; otherwise ask.
    if (typed.length >= 2) await ctx.runMutation(internal.sources.finishReading, { handbookId, topic: typed, use: [] });
    else await ctx.runMutation(internal.sources.finishReading, { handbookId, question: "I couldn't read those. What do you want to learn from them?" });
    return;
  }
  try {
    const json = await gemini(ctx, "source-combine", COMBINE_PROMPT, [{ text: combineMessage(typed, read) }], typed || read.map((r) => r.title).join("; "), { models: JUDGE_MODELS() });
    const use = Array.isArray(json?.use) ? json.use.map(Number).filter((n: number) => read.some((r) => r.n === n)) : undefined;
    await ctx.runMutation(internal.sources.finishReading, { handbookId, topic: json?.topic ? String(json.topic) : undefined, brief: briefOf(json, read.map((r) => r.n)), question: json?.question ? String(json.question) : undefined, use });
  } catch {
    // The combining call failed: the typed line, else the first source's own title, carries it.
    await ctx.runMutation(internal.sources.finishReading, { handbookId, topic: typed || read[0].title || "What these sources teach" });
  }
}

// Links and photos: read them all, then decide the one topic (or ask one question).
export const readAll = internalAction({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    await readSources(ctx, handbookId);
    const h = await ctx.runQuery(internal.sources.readHandbook, { handbookId });
    // A creator's reels: sorted into themes for the learner to pick from, instead of combined straight away.
    if (h?.creator) await sortThemes(ctx, handbookId);
    else await combine(ctx, handbookId);
  },
});

// After the learner picks a creator's theme: those reels (already read) into the topic, then the plan.
export const combineChosen = internalAction({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    await readSources(ctx, handbookId);   // anything that failed to read the first time gets one more go
    await combine(ctx, handbookId);
  },
});

// "Learn from a creator": their latest public reels in one call. Each is then watched (readAll), and the notes
// sorted into themes, so the themes come from what the reels teach, not just their captions.
export const gatherCreator = internalAction({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    const h = await ctx.runQuery(internal.sources.readHandbook, { handbookId });
    const handle = h?.creator?.handle;
    if (!handle) return;
    let reels: Reel[] | null;
    try { reels = await apifyReels(handle, CREATOR_REELS); }
    catch (e: any) { await ctx.runMutation(internal.handbooks.setFailed, { handbookId, error: `couldn't reach @${handle}'s reels: ${String(e?.message ?? e).slice(0, 200)}` }); return; }
    if (reels === null) { await ctx.runMutation(internal.handbooks.setFailed, { handbookId, error: "no reel service key set" }); return; }
    const found = reels.filter((r) => r.url);
    if (!found.length) { await ctx.runMutation(internal.handbooks.setFailed, { handbookId, error: `no public reels found for @${handle}` }); return; }
    await ctx.runMutation(internal.sources.setCreatorReels, { handbookId, reels: found.map((r) => ({ url: r.url!, caption: r.caption, videoUrl: r.videoUrl })) });
  },
});

async function sortThemes(ctx: ActionCtx, handbookId: Id<"handbooks">) {
  const h = await ctx.runQuery(internal.sources.readHandbook, { handbookId });
  const handle = h?.creator?.handle ?? "";
  const read = (h?.sources ?? []).flatMap((s, i) => (s.status === "read" ? [{ n: i + 1, title: s.title ?? "", hook: s.hook, notes: s.notes ?? "" }] : []));
  let themes: { name: string; reels: number[] }[] = [];
  if (read.length) {
    try {
      const json = await gemini(ctx, "source-themes", THEMES_PROMPT, [{ text: themesMessage(handle, read) }], `@${handle}`, { models: JUDGE_MODELS() });
      themes = (Array.isArray(json?.themes) ? json.themes : [])
        .map((t: any) => ({ name: String(t?.name ?? "").slice(0, 60), reels: (Array.isArray(t?.reels) ? t.reels : []).map(Number).filter((n: number) => read.some((r) => r.n === n)) }))
        .filter((t: { name: string; reels: number[] }) => t.name && t.reels.length)
        .slice(0, 4);
    } catch { /* no themes: the learner is asked what they want from these reels */ }
  }
  await ctx.runMutation(internal.sources.creatorThemes, { handbookId, themes });
}
