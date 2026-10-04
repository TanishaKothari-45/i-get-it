// Load the pre-written handbooks in docs/section6-check into the current Convex deployment
// (whatever `npx convex dev` is pointed at), as seed books with a few aliases each.
// Run from the repo root: node scripts/seed-local.mjs
import { readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const DIR = "docs/section6-check";
const CHAPTERS = 7;

// Lines people actually type for these topics, so they land on the ready handbook.
const ALIASES = {
  "ai-agents-software-that-uses-a-model-lik": ["ai agents", "ai agent", "agents"],
  "an-agent-that-tracks-my-competitors": ["competitor tracking agent", "track my competitors"],
  "indian-stock-market-basics": ["stock market", "indian stock market"],
  "n8n-automations-for-my-job": ["n8n", "n8n automations"],
  "public-speaking": ["public speaking", "speaking in public"],
  "read-a-balance-sheet": ["balance sheet", "read a balance sheet"],
  "swimming-to-be-safe-and-comfortable-in-a": ["swimming", "learn to swim"],
  "vibe-coding-with-claude-code": ["vibe coding", "claude code"],
  "western-philosophy": ["philosophy", "western philosophy"],
  "wwii-how-the-war-started-and-was-won-193": ["wwii", "ww2", "world war 2", "world war ii"],
};

const readJson = (file) => JSON.parse(readFileSync(join(DIR, file), "utf8"));

const slugs = [...new Set(readdirSync(DIR).filter((f) => f.endsWith(".plan.json")).map((f) => f.replace(".plan.json", "")))];

for (const slug of slugs) {
  const { plan } = readJson(`${slug}.plan.json`);
  if (plan.needsClarification || !Array.isArray(plan.chapters) || plan.chapters.length !== CHAPTERS) continue;
  const chapters = [];
  for (let n = 1; n <= CHAPTERS; n++) {
    try { chapters.push(readJson(`${slug}.ch${n}.json`).chapter); } catch { break; }
  }
  const args = { topic: plan.topic, aliases: [slug.replace(/-/g, " "), ...(ALIASES[slug] ?? [])], level: "new", plan, chapters };
  const keys = execFileSync("npx", ["convex", "run", "handbooks:seedCache", JSON.stringify(args)], { encoding: "utf8" });
  console.log(`${plan.topic}: ${chapters.length} chapters, keys ${keys.trim().replace(/\s+/g, " ")}`);
}
