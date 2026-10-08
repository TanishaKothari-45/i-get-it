"use node";
import cvModule from "@techstark/opencv-js";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

// Ink and wash (Prateek, 8 Oct: "use OpenCV if the latency is not too high"). Turns a Wikimedia photo into a light
// watercolour wash with a soft ink outline, so photos sit with the drawn covers. Measured: about 0.45 to 0.65 s a
// picture. Based on the other session's ink_and_wash() (Python), rebuilt from what opencv.js has: repeated bilateral
// filtering stands in for mean shift + stylization (not in opencv.js). A filter on an existing photo, not new art.

let ready: Promise<any> | null = null;
const opencv = () => (ready ??= cvModule instanceof Promise ? cvModule : new Promise((r) => { (cvModule as any).onRuntimeInitialized = () => r(cvModule); }));

// Seeded noise: the same photo always gives the same picture.
function rng(seed: number) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function decode(bytes: Uint8Array, mime: string): { data: Uint8Array; width: number; height: number } {
  if (/png/.test(mime)) { const p = PNG.sync.read(Buffer.from(bytes)); return { data: new Uint8Array(p.data), width: p.width, height: p.height }; }
  const j = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 256 });
  return { data: j.data, width: j.width, height: j.height };
}

export async function inkAndWash(bytes: Uint8Array, mime: string, W = 896, H = 672): Promise<Uint8Array> {
  const cv = await opencv();
  const raw = decode(bytes, mime);
  const rgba = cv.matFromImageData({ data: raw.data, width: raw.width, height: raw.height });
  const s = Math.max(W / raw.width, H / raw.height), rw = Math.round(raw.width * s), rh = Math.round(raw.height * s);
  const big = new cv.Mat(); cv.resize(rgba, big, new cv.Size(rw, rh), 0, 0, cv.INTER_AREA);
  const crop = big.roi(new cv.Rect(Math.floor((rw - W) / 2), Math.floor((rh - H) / 2), W, H));
  const src = new cv.Mat(); cv.cvtColor(crop, src, cv.COLOR_RGBA2RGB);
  // Washes: bilateral filtering at half size flattens colour but keeps edges.
  const half = new cv.Mat(); cv.resize(src, half, new cv.Size(W / 2, H / 2), 0, 0, cv.INTER_AREA);
  let a = half, b = new cv.Mat();
  for (let i = 0; i < 4; i++) { cv.bilateralFilter(a, b, 9, 60, 9); [a, b] = [b, a]; }
  const flat = new cv.Mat(); cv.resize(a, flat, new cv.Size(W, H), 0, 0, cv.INTER_CUBIC);
  const soft = new cv.Mat(); cv.GaussianBlur(flat, soft, new cv.Size(0, 0), 2.2);
  // Rims: darker where washes meet.
  const g = new cv.Mat(); cv.cvtColor(flat, g, cv.COLOR_RGB2GRAY);
  const edges = new cv.Mat(); cv.Canny(g, edges, 30, 90);
  const rim = new cv.Mat(); cv.GaussianBlur(edges, rim, new cv.Size(0, 0), 1.6);
  // Ink: outlines of the smoothed photo, wide window and high threshold, specks removed.
  const med = new cv.Mat(); cv.medianBlur(g, med, 7);
  const raw0 = new cv.Mat(); cv.adaptiveThreshold(med, raw0, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 21, 10);
  const line = new cv.Mat(); cv.medianBlur(raw0, line, 5);
  // Per pixel: rim darkening, lift towards paper, paper grain (smooth blotches + fine grain), soft ink on top.
  const out = new Uint8Array(W * H * 4), sd = soft.data, rd = rim.data, ld = line.data, rand = rng(7);
  const BW = (W >> 4) + 2, BH = (H >> 4) + 2, blot = new Float32Array(BW * BH).map(() => rand() + rand() + rand() - 1.5);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const fx = x / 16, fy = y / 16, x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0;
    const bl = blot[y0 * BW + x0] * (1 - tx) * (1 - ty) + blot[y0 * BW + x0 + 1] * tx * (1 - ty) + blot[(y0 + 1) * BW + x0] * (1 - tx) * ty + blot[(y0 + 1) * BW + x0 + 1] * tx * ty;
    const p = y * W + x, r = rd[p] / 255, paper = 1 + 0.05 * bl + 0.02 * (rand() - 0.5);
    for (let c = 0; c < 3; c++) {
      let v = sd[p * 3 + c] * (1 - 0.35 * r);
      v = 255 - (255 - v) * 0.72;
      out[p * 4 + c] = Math.max(0, Math.min(255, Math.min(v * paper, ld[p] ? 255 : 70)));
    }
    out[p * 4 + 3] = 255;
  }
  for (const m of new Set([rgba, big, crop, src, half, a, b, flat, soft, g, edges, rim, med, raw0, line])) m.delete();
  return new Uint8Array(jpeg.encode({ data: out, width: W, height: H }, 86).data);
}
