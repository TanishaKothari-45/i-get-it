# Night report, 4 Oct 2026 (for Prateek, over chai)

Written by the coding agent at about 06:00. Read this, then PROGRESS.md's "Decided" list, then PRODUCT.md.

## What's live

- https://sensible-mongoose-624.convex.site (production). Repo: github.com/prateekk26/igetit (push pending your go; commits are local).
- Night 1 works end to end for the ten ready topics: type the line, see the 7-chapter plan, read chapter 1 with exercises checked on the spot, named-confusion feedback and a re-teach on a miss, the rung lights, reload lands on the same card with no account, sign in (email + password) after the rung, pick a time, come back to two recall cards and chapter 2, and the same handbook on another device after sign-in.
- Ready topics (cache, chapters 1 to 3 seeded; 4 to 7 generating as I write): public speaking, western philosophy, reading a balance sheet, vibe coding with Claude Code, Indian stock market basics, n8n automations, a competitor-tracking agent, AI agents, pool swimming, WWII 1939 to 1945. Each has aliases (e.g. "ww2", "learn to swim", "ai agent").

## What was tested, and how

- On the dev deployment in Chrome, by the agent, at desktop width and in a 390 px frame: the full night-1 flow on "swimming", a miss and a re-teach, sign-up, reload, night 2 with recall, chapter 2 to the time picker, and the other-device check (device token removed, sign-in kept, handbook still there with two rungs).
- On production, at a 500 px window: the first screen, and the honest failure for an uncached topic ("origami"): "Couldn't write it just now. Your line is still here".
- Not tested: a real phone on mobile data (do this first), the five-second test, the two timed people.

## What's waiting on you

1. API credits. Live generation for any new topic calls OpenAI gpt-6-luna with your key; the account has no credits, so new topics fail politely until you add some at platform.openai.com (set a hard monthly limit while you're there). Or set ANTHROPIC_API_KEY on Convex and the same code uses Claude Haiku 4.5. Command: `npx convex env set OPENAI_API_KEY=... --prod` (and without --prod for dev).
2. DESIGN.md: three sections marked MISSING are your taste to pick (the feeling labels, the references, the first-screen words). The product is built on the agent's placeholders.
3. Section 6: outputs are in docs/section6-check/ with the agent's draft scores. Read two topics you know, mark (a) to (d) yourself, and run ChatGPT study mode on the same lines if your account has it (the agent couldn't find it in the tools menu).
4. One coursemate's last attempt (Shaktimaan's blocker 1), then correct PRODUCT.md sections 1 to 3.
5. Push to GitHub when you've read the diff: `git push`.

## Decisions made in your stead (all reversible)

See PROGRESS.md "Decided". The big ones: OpenAI gpt-6-luna as the live model (key set on Convex from your shell, never seen); demo content generated with the same prompts through Claude Code headless and cached; email+password sign-in; two typefaces, paper and ink with one marigold accent; options shuffled server-side because the model put the key at B two times in three.
