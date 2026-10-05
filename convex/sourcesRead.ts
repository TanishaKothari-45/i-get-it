"use node";
// Reading what the learner shared, before the plan is written. Adaptive, cheapest first:
// - YouTube: Gemini watches the link directly (clipped to MAX_SECONDS).
// - Instagram: Apify returns caption + transcript + the video file's link. A talking reel is read from its
//   transcript (text, cheap); a reel that teaches on screen (little speech, or a demo) is downloaded and
//   watched. Apify down: Supadata's transcript. Then Instagram's own caption. Then the reader is asked.
// - Photo: Gemini reads it, and the photo is deleted.
// Videos are never stored: only Gemini's notes are kept.
import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { COMBINE_PROMPT, SOURCE_READ_PROMPT, THEMES_PROMPT, combineMessage, sourceReadMessage, themesMessage } from "./prompts";
import { CREATOR_REELS } from "./links";

const MAX_SECONDS = 180;                      // a video is read up to 3 minutes (about ₹0.5 a minute at low resolution)
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;     // a reel is a few MB; anything bigger is read from its transcript instead
const RICH_TRANSCRIPT_WORDS = 40;             // this much speech carries a reel; less means it teaches on screen
const LOOKS_VISUAL = /\b(watch|demo|step|steps|tutorial|code|command|terminal|how to|screen|setup|install)\b/i;
const TIMEOUT_MS = 120_000;
const SUPADATA_POLLS = 6;
const SUPADATA_POLL_MS = 5_000;

type Source = NonNullable<Doc<"handbooks">["sources"]>[number];
type Read = { learnable: boolean; title: string; notes: string; via: string };

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try { return await fetch(url, { ...init, signal: controller.signal }); } finally { clearTimeout(timer); }
}

// One Gemini call that answers in JSON. Every call is logged in aiCalls.
async function gemini(ctx: ActionCtx, label: string, system: string, parts: any[], input: string): Promise<any> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("no Gemini key set");
  const model = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
  const started = Date.now();
  try {
    const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 4096, mediaResolution: "MEDIA_RESOLUTION_LOW", thinkingConfig: { thinkingLevel: "low" } },
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message ?? `Gemini ${res.status}`);
    const text = (data.candidates?.[0]?.content?.parts ?? []).filter((p: any) => !p.thought && typeof p.text === "string").map((p: any) => p.text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("no JSON in Gemini's reply");
    const json = JSON.parse(m[0]);
    await ctx.runMutation(internal.handbooks.logAiCall, { kind: label, model, input, output: text.slice(0, 20000), tokensIn: data.usageMetadata?.promptTokenCount, tokensOut: data.usageMetadata?.candidatesTokenCount, ms: Date.now() - started, ok: true });
    return json;
  } catch (e: any) {
    const error = String(e?.name === "AbortError" ? "Gemini timed out" : e?.message ?? e).slice(0, 500);
    await ctx.runMutation(internal.handbooks.logAiCall, { kind: label, model, input, output: "", ms: Date.now() - started, ok: false, error });
    throw new Error(error);
  }
}

function asRead(json: any, via: string): Read {
  return { learnable: json?.learnable !== false && typeof json?.notes === "string" && json.notes.trim().length > 0, title: String(json?.title ?? "").slice(0, 80), notes: String(json?.notes ?? "").slice(0, 3000), via };
}

const clip = { endOffset: `${MAX_SECONDS}s` };

async function readYoutube(ctx: ActionCtx, url: string): Promise<Read> {
  const json = await gemini(ctx, "source-youtube", SOURCE_READ_PROMPT, [{ fileData: { fileUri: url }, videoMetadata: clip }, { text: sourceReadMessage("youtube") }], url);
  return asRead(json, "video");
}

// From a transcript or caption alone (text: the cheap path).
async function readText(ctx: ActionCtx, kind: string, via: string, extra: { caption?: string; transcript?: string }, url: string): Promise<Read> {
  const json = await gemini(ctx, `source-${kind}-${via}`, SOURCE_READ_PROMPT, [{ text: sourceReadMessage(kind, extra) }], url);
  return asRead(json, via);
}

function words(s: string | undefined) { return (s ?? "").trim().split(/\s+/).filter(Boolean).length; }

function transcriptText(t: unknown): string {
  if (typeof t === "string") return t;
  if (Array.isArray(t)) return t.map((x: any) => (typeof x === "string" ? x : x?.text ?? "")).join(" ");
  return "";
}

type Reel = { url?: string; caption?: string; transcript?: string; videoUrl?: string };

// Apify's Instagram Reel Scraper: for a reel link, or a public creator's handle (their latest reels), the caption,
// transcript and video file's link, without logging in. null when no key is set.
async function apifyReels(target: string, limit: number): Promise<Reel[] | null> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return null;
  const res = await fetchWithTimeout("https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items?timeout=110", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ username: [target], resultsLimit: limit, includeTranscript: true }),
  });
  if (!res.ok) throw new Error(`Apify ${res.status}`);
  const items: any[] = await res.json();
  return (items ?? []).filter((item) => item && !item.error).slice(0, limit).map((item) => ({
    url: item.url ?? undefined, caption: item.caption ?? undefined,
    transcript: transcriptText(item.transcript) || undefined, videoUrl: item.videoUrl ?? undefined,
  }));
}

async function apifyReel(url: string): Promise<Reel | null> {
  return (await apifyReels(url, 1))?.[0] ?? null;
}

// The reel's video, downloaded once for Gemini to watch, then dropped. null if too big or gone.
async function downloadVideo(videoUrl: string): Promise<string | null> {
  const res = await fetchWithTimeout(videoUrl, {}, 60_000);
  if (!res.ok) return null;
  const size = Number(res.headers.get("content-length") ?? 0);
  if (size > MAX_VIDEO_BYTES) return null;
  const bytes = Buffer.from(await res.arrayBuffer());
  return bytes.length > MAX_VIDEO_BYTES ? null : bytes.toString("base64");
}

// Supadata: a transcript from the reel's link (its captions, else AI transcription). Slow ones come back as a job.
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

// Instagram's own embed (official, public posts): the caption, which often names the topic.
async function instagramCaption(url: string): Promise<string | null> {
  const token = process.env.INSTAGRAM_OEMBED_TOKEN;
  const res = await fetchWithTimeout(`https://graph.facebook.com/v25.0/instagram_oembed?url=${encodeURIComponent(url)}${token ? `&access_token=${token}` : ""}`, {}, 20_000);
  if (!res.ok) return null;
  const data: any = await res.json().catch(() => ({}));
  const text = String(data?.title ?? data?.caption ?? String(data?.html ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  return text || null;
}

// pre: what was already fetched (a creator's reels are gathered in one call), so the reel isn't fetched again.
async function readInstagram(ctx: ActionCtx, url: string, pre?: Reel): Promise<Read> {
  const reel = pre ?? await apifyReel(url).catch(() => null);
  if (reel) {
    const rich = words(reel.transcript) >= RICH_TRANSCRIPT_WORDS && !LOOKS_VISUAL.test(reel.caption ?? "");
    if (rich) return readText(ctx, "instagram", "transcript", reel, url);
    // Little speech, or a demo: watch it.
    const video = reel.videoUrl ? await downloadVideo(reel.videoUrl).catch(() => null) : null;
    if (video) {
      const json = await gemini(ctx, "source-instagram-video", SOURCE_READ_PROMPT,
        [{ inlineData: { mimeType: "video/mp4", data: video }, videoMetadata: clip }, { text: sourceReadMessage("instagram", reel) }], url);
      return asRead(json, "video");
    }
    if (reel.transcript || reel.caption) return readText(ctx, "instagram", reel.transcript ? "transcript" : "caption", reel, url);
  }
  const transcript = await supadataTranscript(url).catch(() => null);
  const caption = await instagramCaption(url).catch(() => null);
  if (transcript) return readText(ctx, "instagram", "transcript", { transcript, caption: caption ?? undefined }, url);
  if (caption) return readText(ctx, "instagram", "caption", { caption }, url);
  throw new Error("couldn't open this reel");
}

async function readImage(ctx: ActionCtx, storageId: Id<"_storage">): Promise<Read> {
  const blob = await ctx.storage.get(storageId);
  if (!blob) throw new Error("photo missing");
  const data = Buffer.from(await blob.arrayBuffer()).toString("base64");
  const json = await gemini(ctx, "source-photo", SOURCE_READ_PROMPT, [{ inlineData: { mimeType: blob.type || "image/jpeg", data } }, { text: sourceReadMessage("image") }], "photo");
  return asRead(json, "photo");
}

async function readOne(ctx: ActionCtx, s: Source): Promise<Read> {
  if (s.kind === "youtube" && s.url) return readYoutube(ctx, s.url);
  if (s.kind === "instagram" && s.url) return readInstagram(ctx, s.url, s.caption || s.transcript || s.videoUrl ? { caption: s.caption, transcript: s.transcript, videoUrl: s.videoUrl } : undefined);
  if (s.kind === "image" && s.storageId) return readImage(ctx, s.storageId);
  throw new Error("nothing to read");
}

// Read every source at once, then decide the one topic (or ask one question).
export const readAll = internalAction({
  args: { handbookId: v.id("handbooks") },
  handler: async (ctx, { handbookId }) => {
    const h = await ctx.runQuery(internal.sources.readHandbook, { handbookId });
    if (!h?.sources) return;
    await Promise.all(h.sources.map(async (s, index) => {
      if (s.status === "read" || s.error === "about something else") return;
      await ctx.runMutation(internal.sources.setSource, { handbookId, index, fields: { status: "reading", error: undefined } });
      try {
        const r = await readOne(ctx, s);
        await ctx.runMutation(internal.sources.setSource, { handbookId, index, fields: r.learnable
          ? { status: "read", via: r.via, title: r.title, notes: r.notes, clearStorage: s.kind === "image" }
          : { status: "failed", via: r.via, title: r.title, error: "nothing to learn in it", clearStorage: s.kind === "image" } });
      } catch (e: any) {
        await ctx.runMutation(internal.sources.setSource, { handbookId, index, fields: { status: "failed", error: String(e?.message ?? e).slice(0, 200), clearStorage: s.kind === "image" } });
      } finally {
        // A photo is read once and then deleted, whatever happened.
        if (s.kind === "image" && s.storageId) await ctx.storage.delete(s.storageId).catch(() => {});
      }
    }));

    const done = await ctx.runQuery(internal.sources.readHandbook, { handbookId });
    const read = (done?.sources ?? []).flatMap((s, i) => (s.status === "read" ? [{ n: i + 1, kind: s.kind, title: s.title ?? "", notes: s.notes ?? "" }] : []));
    const typed = (done?.topic ?? "").trim();
    if (!read.length) {
      // Nothing readable. A typed line can still carry the handbook; otherwise ask.
      if (typed.length >= 2) await ctx.runMutation(internal.sources.finishReading, { handbookId, topic: typed, use: [] });
      else await ctx.runMutation(internal.sources.finishReading, { handbookId, question: "I couldn't read those. What do you want to learn from them?" });
      return;
    }
    try {
      const json = await gemini(ctx, "source-combine", COMBINE_PROMPT, [{ text: combineMessage(typed, read) }], typed || read.map((r) => r.title).join("; "));
      const use = Array.isArray(json?.use) ? json.use.map(Number).filter((n: number) => read.some((r) => r.n === n)) : undefined;
      await ctx.runMutation(internal.sources.finishReading, { handbookId, topic: json?.topic ? String(json.topic) : undefined, question: json?.question ? String(json.question) : undefined, use });
    } catch {
      // The combining call failed: the typed line, else the first source's own title, carries it.
      await ctx.runMutation(internal.sources.finishReading, { handbookId, topic: typed || read[0].title || "What these sources teach" });
    }
  },
});

// "Learn from a creator": their latest public reels in one call, sorted into themes for the learner to pick from.
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
    const numbered = found.map((r, i) => ({ n: i + 1, caption: r.caption, transcript: r.transcript }));
    let themes: { name: string; reels: number[] }[] = [];
    try {
      const json = await gemini(ctx, "source-themes", THEMES_PROMPT, [{ text: themesMessage(handle, numbered) }], `@${handle}`);
      themes = (Array.isArray(json?.themes) ? json.themes : [])
        .map((t: any) => ({ name: String(t?.name ?? "").slice(0, 60), reels: (Array.isArray(t?.reels) ? t.reels : []).map(Number).filter((n: number) => n >= 1 && n <= found.length) }))
        .filter((t: { name: string; reels: number[] }) => t.name && t.reels.length);
    } catch { /* no themes: the learner is asked what they want from these reels */ }
    await ctx.runMutation(internal.sources.setCreatorReels, { handbookId, reels: found.map((r) => ({ url: r.url!, caption: r.caption, transcript: r.transcript, videoUrl: r.videoUrl })), themes: themes.slice(0, 4) });
  },
});

