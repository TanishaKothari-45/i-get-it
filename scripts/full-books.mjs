// Complete handbooks on Gemini Flash alone (9 Oct), for the delivery review: research v7, plan v8, every chapter written
// and fact-checked, through the real pipeline on test handbooks marked flashOnly (no Opus or Claude writing) and
// noVersions (no easier/harder quiz versions). A Flash failure (Google's 503 "high demand") is retried on Flash, up to
// 3 times with a pause; it never falls back to another model. Dev deployment only (Node 20+):
//   node scripts/full-books.mjs        writes evals/full-books/<time>/raw.json (the shape delivery-review.mjs reads)
import { execFile } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);
// Three requests far apart on every axis: a result in a few pieces, an understanding in many, a practised body skill.
// BOOKS='[{"topic":...,"level":"new","goal":...,"mode":...}]' overrides the list (the neutral set, 9 Oct).
const DEFAULT_BOOKS = [
  { topic: "write a cover letter for my first job", level: "new", goal: "send a strong cover letter this week", mode: "skill" },
  { topic: "the mughal empire", level: "new", goal: "understand how it rose and fell", mode: "subject" },
  { topic: "learn guitar", level: "new", goal: "play my first song in a month", mode: "skill" },
];
const BOOKS = process.env.BOOKS ? JSON.parse(process.env.BOOKS) : DEFAULT_BOOKS;
const OUT = `evals/full-books/${new Date().toISOString().slice(0, 16).replace(":", "-")}`;
const convex = async (fn, args) => { const { stdout } = await run("npx", ["convex", "run", fn, JSON.stringify(args)], { maxBuffer: 1e8, timeout: 11 * 60 * 1000 }); const t = stdout.trim(); return t ? JSON.parse(t) : null; };
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const read = (id) => convex("evalShape:read", { handbookId: id });
// Start a long step on the server and read until it lands (the CLI gives up on calls of more than about 5 minutes).
const waitPlan = async (id) => {
  await convex("evalShape:runPlan", { handbookId: id });
  for (let k = 0; k < 90; k++) { await sleep(10000); const h = await convex("evalShape:read", { handbookId: id }); if (h?.plan || ["failed", "declined", "question"].includes(h?.status)) return h; }
  return convex("evalShape:read", { handbookId: id });
};
const waitChapter = async (id, n) => {
  await convex("evalShape:runChapter", { handbookId: id, n });
  for (let k = 0; k < 60; k++) { await sleep(10000); const c = (await convex("evalShape:read", { handbookId: id }))?.chapters?.find((x) => x.n === n); if (c && c.status !== "writing") return c; }
};


async function plan(id) {
  for (let k = 0; k < 3; k++) {
    const h = await waitPlan(id);
    if (h?.plan) return h;
    log(`    plan failed (${String(h?.error ?? h?.status).slice(0, 80)}), retry ${k + 1} on Flash after 30 s`);
    await convex("evalShape:resetForRetry", { handbookId: id });
    await sleep(30000);
  }
  return read(id);
}
async function chapter(id, n) {
  for (let k = 0; k < 3; k++) {
    const c = await waitChapter(id, n);
    if (c?.status === "ready") return c;
    log(`    chapter ${n} failed (${String(c?.error ?? "").slice(0, 80)}), retry ${k + 1} on Flash after 30 s`);
    await sleep(30000);
  }
}
async function book(t) {
  const id = await convex("evalShape:create", { ...t, flashOnly: true, noVersions: true });
  log(`${t.topic}: planning`);
  let h = await plan(id);
  if (!h?.plan) { log(`${t.topic}: no plan`); return { id, h }; }
  const total = h.plan.chapters.length;
  log(`${t.topic}: ${h.plan.format}, ${total} chapters; writing every chapter`);
  // Chapter 1 (and every chapter of a quick handbook) was scheduled by the plan step: wait for those, then write the rest.
  for (let k = 0; k < 40; k++) { h = await read(id); if (!(h.chapters ?? []).some((c) => c.status === "writing")) break; await sleep(10000); }
  // In order (writer v6, 9 Oct): each chapter is written with the record of the ones before it, as for a reader.
  for (let n = 1; n <= total; n++) {
    h = await read(id);
    for (let k = 0; k < 40 && h.chapters.find((c) => c.n === n)?.status === "writing"; k++) { await sleep(10000); h = await read(id); }
    if (h.chapters.find((c) => c.n === n)?.status !== "ready") await chapter(id, n);
  }
  h = await read(id);
  const cost = await convex("evalShape:cost", { handbookId: id });
  log(`${t.topic}: ${h.chapters.filter((c) => c.status === "ready").length} of ${total} chapters ready, ₹${cost.inr.toFixed(2)}`);
  return { id, h, cost };
}

mkdirSync(OUT, { recursive: true });
const done = await Promise.all(BOOKS.map(book));
writeFileSync(`${OUT}/raw.json`, JSON.stringify({ at: new Date().toISOString(), results: BOOKS.map((t, i) => ({ ...t, new: done[i] })) }, null, 2));
log(`done: ${OUT}/raw.json, total ₹${done.reduce((a, r) => a + (r.cost?.inr ?? 0), 0).toFixed(2)}`);
