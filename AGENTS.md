# AGENTS.md

Working rules for the coding agent on I Get It. Read before every task. Format: docs/tech-thinking/00-overview.md. PRODUCT.md says what we build, DESIGN.md how it looks and reads, PLAN.md what's next, PROGRESS.md what's done.

## 1. How the product works
Interface: a web page on a phone (Vite + React, served by Convex static hosting at the .convex.site link). The one thing they do there: type the thing they keep meaning to learn, then read chapter cards and answer exercises.
Business logic: a Convex action writes the plan (7 chapters) and each chapter (cards plus exercises) by calling the model with the prompts in convex/prompts.ts, checks the JSON shape, and stores it. Mutations record each answer, light a rung only on a pass, and keep the anonymous night under a device token until sign-in attaches it to a user.
Database (Convex tables): handbooks (topic, level, plan JSON, owner: deviceToken or userId), chapters (handbookId, n, cards JSON, status), answers (handbookId, chapter, cardIndex, optionId, correct, at), progress (handbookId, chaptersPassed, currentChapter, tomorrowAt), aiCalls (what went in, what came out, tokens, ms, model), cache (normalised topic+level → handbookId, for pre-generated handbooks).
Third party: the model provider's API for every generation, key in Convex environment variables (OPENAI_API_KEY now; ANTHROPIC_API_KEY takes over if set). Convex Auth for sign-in (keys JWT_PRIVATE_KEY, JWKS, SITE_URL in Convex env). Google Fonts for the two typefaces. Nothing else.
Not in v1: reminders (needs an email or push provider; ask Prateek first), days 8 to 28, regenerate-with-comments, the tutor chat, a second topic, any social feature, reading links or videos.

When I report a bug, I'll name the part. Look there first, and tell me if you think I named the wrong one.

## 2. How we work
- Read PRODUCT.md, PLAN.md and PROGRESS.md before anything else, and DESIGN.md before any screen work. IDEA_SCOPE.md and docs/*.md outside the handbook chapters are superseded; don't build from them.
- Before writing code, say in two or three sentences what you think I'm after, then your plan. Wait for my yes. (Night of 4 Oct: Prateek asleep and has authorised decisions in his stead; every such decision is written in PROGRESS.md under "Decided", and the first thing in the morning is to read that list.)
- One milestone at a time: the next one in PLAN.md, working end to end. Nothing outside it.
- If I ask for something new mid-milestone, add it to the parked list in PLAN.md and carry on.
- Never say "done" until you've seen it work (a screenshot at 390 px, or the live link on a phone) and told me how to check it on my phone.
- When I report a bug, find the cause before changing anything. Fix only that.
- After a milestone works: commit, push, deploy, and add one line to PROGRESS.md.
- Never put a key or password in code, in a VITE_ variable (those are sent to every visitor) or in a committed file. Never ask me to paste a key into chat; tell me the `npx convex env set` command instead.
- Copy that a user reads is a placeholder until Prateek rewrites it. Mark it (agent) in DESIGN.md until then.
- Never use or suggest any host, database or auth service other than Convex, or any other service, without asking first. (Prateek's standing rule.)

## 3. Shipping
Live link: the .convex.site address of this project (see PROGRESS.md for the current one).
Repo: github.com/prateekk26/igetit, public.
Deploy: npm run deploy (Convex functions, then the static site). A push never deploys by itself. After a milestone works: commit, push, then deploy.
Keys: OPENAI_API_KEY (and ANTHROPIC_API_KEY if used), JWT_PRIVATE_KEY, JWKS, SITE_URL live in Convex environment variables, set for dev and for prod. Never in code, a VITE_ variable or a committed file.
.gitignore covers .env.local.
Real people's data never goes in the repo, not even as a test file. Seed handbooks are generated content, not user data.
Every limit and every "is this allowed" check happens in a Convex function, never only on screen.
Before sharing the link: open it on a phone, logged out, on mobile data, and do night 1 once.

## 4. The AI call
Model: Claude Haiku 4.5 by default (ANTHROPIC_API_KEY is set on prod and dev since 4 Oct afternoon). gpt-6-luna via OpenAI only if the Anthropic key is removed. A person who ran the masked comparison gets the writer they picked (Sonnet 5.5, Opus 5.5 or Fable 5.1) for their chapters from then on. (Night of 4 Oct: the OpenAI key has no credits; the demo content is generated with the same prompts through Claude Code headless and stored in the cache table. Live generation for a new topic works as soon as credits are added or an Anthropic key is set.)
What goes in, and its limit: the typed line (at most 200 characters), the level, and for chapters the plan JSON (about 1,500 tokens). Never user data beyond that.
Where it runs: a Convex action. Never in the interface.
Key: OPENAI_API_KEY / ANTHROPIC_API_KEY in Convex environment variables, dev and prod.
Reply cap: max_output_tokens 3,000 for a plan, 6,000 for a chapter (the illustration SVG lives inside it), 600 for a "say it simpler" rewrite.
Token rules (added 4 Oct afternoon, when personalisation came in):
- One chapter at a time, written when opened, never ahead. Plans are never regenerated for tone or persona.
- The reader's profile is one line, about 100 tokens, in a fixed order, sent with every chapter call. It is the only personalisation payload; never send chat history or earlier chapters.
- A profile change marks unread chapters stale; a stale chapter is rewritten once, when opened. Chapters already started are never rewritten.
- "Say it simpler" rewrites one card (600 tokens out) and stores it, so the second tap is free. Pre-generated for cached topics.
- The masked comparison writes one chapter three times (Sonnet, Opus, Fable) only when the person asks, on the chapter they're on. Opus and Fable cost about ten times Haiku per chapter, so the comparison is per-chapter and per-request, never automatic.
- "Ask or object" answers from the one card plus the chapter title and the reader line, 600 tokens out max, 40 an hour per device.
- Cached handbooks carry a version; an unread, unpersonalised chapter is swapped for the newer cached one when the handbook is opened. No model call.
- Quality gate for the cache: every cached chapter is scored by an LLM judge on 12 binary checks (docs/section6-check/judge.py logic, report in judge-report.md); under 10, or any doubtful fact, is regenerated once and re-judged.
- Illustrations are model-drawn SVG inside the chapter call (about 800 tokens), capped at 1,400 characters, sanitised before render. No image provider.
Calls cap: at most 60 generations an hour across the app, 6 an hour per device token, 30 "simpler" rewrites an hour per device, checked in mutations before anything is scheduled (Convex rate limiter component). A comparison counts as one generation against both caps even though it makes three calls.
Provider limit: a hard monthly limit set by Prateek at the provider (not set as of 4 Oct night: no credits on the account).
When a cap is hit or the call fails: "Couldn't write it just now. Your line is still here; try once more in a minute." The typed line stays on screen.
Every call is saved in aiCalls (in, out, tokens, ms) so the last 100 can be read.
Login: Convex Auth, after chapter 1 is passed, never before. Anonymous nights live under a device token.
The AI must never: invent facts, names, dates, tools or statistics; put quoted words after a real person's name unless a verified reference gives that phrase; attach a general claim to a named expert; link anywhere outside the verified reference list; write exercises that test something the chapter didn't teach; use the words "incorrect" or "wrong"; give medical, legal or financial advice as instruction (it may teach how a balance sheet works, it may not tell someone what to buy); write more than seven chapters or fewer.
