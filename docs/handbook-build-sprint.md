# GrowthX Build Sprint · Season 04 · handbook notes

Captured 3 Oct 2026 from https://growthx.club/learn/build-sprint (login-gated, 22 pages plus 5 embedded source documents). This file is the offline copy the coding agent checks the build against. The handbook wins where this file and our own docs disagree.

## Dates and rhythm (all IST)

- Sprint: Fri 2 Oct to Sat 17 Oct 2026. Week one builds (2 to 9 Oct). Week two sells (10 to 17 Oct).
- Submission: Sat 17 Oct before 11:00 AM. Hard cutoff. Aim for 9:00 AM. No demo session: a reviewer opens the live URL, the public repo and the numbers without you in the room.
- Solo only. One product each. Build in public. Strictly no teams.
- About 32 hours total, 10 live.

| Day | Session | Milestone at end of day |
|---|---|---|
| Fri 2 Oct | Kickoff 11 to 1 | One locked idea, first working direction. M0: empty app live on Convex, repo on GitHub, riskiest assumption tested with no code |
| Sat 3 Oct | Deep work 11 to 1: how to build your AI product | A working product core |
| Sun 4 Oct | Keep building 11 to 1 | Something real enough to put in front of users. M1: one ugly complete flow at the live URL, data survives refresh |
| Mon 5, Tue 6 | Own time, 2 hrs after work | Weeknight build, async updates. Mon: watch 3 real users, no demo. Tue: distribute before it feels ready |
| Wed 7 Oct | Q&A 8 to 9 PM | Bring blockers |
| Thu 8, Fri 9 | Own time | Final build push. Friday night: product ready to sell. Analytics live with read-only access |
| Sat 10 Oct | GTM masterclass 11 to 12: video first | GTM video scripted, shot, edited |
| Sun 11 Oct | Start selling 11 to 12 | Outreach in motion, first real sale attempt |
| Mon 12 Oct | Own time, morning | GTM live on socials (Monday gets best reach) |
| Tue 13, Wed 14, Thu 15 | Posts 2, 3, 4. Wed Q&A 8 to 9 PM | Fold buyer feedback into product and pitch |
| Fri 16 Oct | Own time | Last changes, gather revenue and intent proof |
| Sat 17 Oct | Deadline 11:00 AM | Submit |

Week two is not extra build time. The product stops changing except where a buyer says it must.

## What you submit

1. A live product: a URL anyone can open, tested logged out, on a phone, on someone else's laptop. Core action works without explanation.
2. A public GitHub repo, link opens in a private window.
3. Your numbers and your primary track: impressions, reactions, visitors, signups, waitlist, payments. Screenshots of the Convex table count for signups. Visitors need read-only analytics access (PostHog, Plausible, GA4 or Datafast) or that row caps at L2. Real small numbers beat vague big ones.

Last-24-hours checklist: core action works at live URL logged out on a phone; data survives closing and reopening; repo public; numbers written with screenshots; primary track picked and self-scored, know which row two more hours would fix; one honest paragraph (what I built, who for, why they care, link); submitted before 11:00.

## The fixed stack and rules

- Codex or Claude Code as coding agent, GitHub for code, Convex for backend, database, auth (Convex Auth) and hosting (static-hosting component, `npm run deploy`, live at `.convex.site`).
- Build it during the sprint. Bring your own idea from a pain you feel. The rubric does not care where the idea came from.
- Working rules: write the scope yourself, not the AI; validate the riskiest assumption before the AI builds anything; you are the manager, the AI is the intern; put it in front of a real person before it feels ready; fix the point where they stop, not the thing that bothers you.
- Every signup lives in Convex. dashboard.convex.dev, data tab, is the table of real people.
- Builder Pulse sends GrowthX your prompts, commands, folders and token counts (leaderboard). Never paste secrets into prompts.

## Build your V1 (Sat 3 Oct session)

**Build order.** By the end of this weekend the whole product works end to end. Build in this order:
1. Landing page: is it good? It is the product spec of what you are building.
2. Onboarding: is it simple? If onboarding takes 20 minutes, nobody gets to value.
3. Value: can you deliver it quickly? Your user flows, the aha moment as soon as possible.
4. Bonus, last: emails and communication. Only once the three above work.

**Four parts of every product:** interface, business logic, database, third party. Convex merges logic and database. High-level view (market, user, business) dictates low-level choices (which interface, which integrations).

**Scope.** Start with the user and the job to be done. List what the user does, ask which parts the product fails without. Four questions: who exactly (narrow), what job (the real pain, not the solution in your head), which user on the bench first, do people already pay for it. Then strip it down: remove, reduce, pivot.

**One user story at a time.** Don't abstract. Pick one common user story, build it by 4 PM, add another, three at most, then go to onboarding and the landing page. Every feature opens ten bugs; keep it narrow and expand through the week.

**Onboarding: solve the friction first.** What are the one or two biggest friction points today? Trust: copy how others earn it (Mobbin), don't add screens. Fear: let them practise something tiny (Duolingo's easy first lesson). Words: explain the step in the flow. Do the smallest thing you need.

**Chats.** One chat at a time until you have built 5 to 10 features with an agent. New chat only when the job pulls in a lot of other context. Context window gets forgetful between 50% and 80%; compact. Never trust AI: define v1 with milestones, have the AI execute one, then ask a reviewer whether it was actually done. Everything on GitHub, always. Plan and progress as markdown in the repo. Scratchpad for instructions, purged weekly.

**AI products: the harness.** The model is the horse, the harness steers it. Don't build a harness this sprint; use an open-source one (Hermes for WhatsApp agents), get to users. Memory: keep it very simple.

**Seven short answers:** yolo mode on. Don't chase Play Store approval. Ignore WhatsApp API limits until scale. Sensitive data: solve trust in onboarding. Code breaks: you should know before the user does. Can't find users: your network and social media. Supabase vs Convex: Convex.

## Build with taste

- Most people don't have design taste. Admit it, then build it. Two things: **care** (open a page you like, refresh, scroll slowly, note every small thing) and **label** (name exactly what you noticed: which element, what it does). Don't say clean, minimal, classy, polished, white space, hierarchy, "this sucks", "make it 100x more premium". Say the element and the treatment, like Christopher Nolan directing.
- Teardown method: Shopify Renaissance Edition. Notice load sequence, layered worlds, deliberate low readability, 3D to 2D, light blasts, paper burn, magazine fonts, soft gradient to mark the AI feature, cards from behind at 70 degrees, texture.
- Fonts are how you say it. Colours and UI are the clothes, copy is the words, fonts are the voice. Fonts come later, once design and user flow are done. Font pairing sites exist.
- Teach your AI: find a reference on Pinterest with a label, notice the treatment not the picture, paste the image plus your words, run /learn at the end and keep principles, not tactical mistakes, in CLAUDE.md.
- Today's milestone: direct the landing page, make onboarding simple, get value in first, then notifications. Set milestones, time blocks and deadlines. V1, then V2, then V2 again.

## Plan before you build: the five decisions

1. **Break it down** before opening a tool: who is the one person (name, age, situation), when is the one moment, what is the core action (user does X, gets Y), what can go wrong (three failure modes). Skill: grill-me.
2. **Write the doc** that settles arguments, saved as IDEA_SCOPE.md in the project folder and pasted into every session. Five sections: user, problem, what v1 does (whole flow step by step), what v1 does not do (parked features), riskiest assumption.
3. **Cut to v1.** Must have (one user completes one whole thing), nice to have, not this sprint. Milestones you can demo in ten seconds, each starting "I can", simplest first, the last one: the data survives closing and reopening.
4. **Test the riskiest assumption in 30 minutes, no code.** A chat window, your phone, a conversation. If it fails, rewrite the doc for 15 minutes instead of rebuilding Thursday.
5. **Build, review, fix, repeat.** One milestone at a time. Make it tell you the plan first. Park new ideas. Review in a fresh session, not the one that built it. Issues as blocker, should-fix, cosmetic. Skills: checkpoint, keep-it-working, impeccable. Checklist: plan shared before code, every milestone verified before the next, fresh-session review, every blocker fixed, opened on your own phone.

## Where your code goes

Laptop (build) → GitHub (keep every working version, the submission, the proof) → Convex (one command puts it live, failed deploy breaks nothing) → the public (the only place that counts).

- Install checkpoint on day one. Everything on GitHub, always.
- First time: "Ship this. Put the code on GitHub, then set up Convex static hosting and deploy it. Ask me the repo name and whether it should be public."
- Every push after: `git add . && git commit -m "what changed" && git push && npm run deploy`, or "I like where we are. Commit, push and deploy."
- Once live: open your own link on your phone logged out on mobile data; make the first screen explain itself in one line; make it survive being used wrong (empty states, errors, slow network); turn feedback sentences into a push.
- Skills by stage: frontend-design, impeccable, agentation, convex-expert, keep-it-working (laptop); checkpoint (GitHub); convex-dev-static-hosting, convex-auth (Convex); copywriting, art-direction, keep-it-working (public).

## Inside your product

Four layers: frontend (what they see), backend (logic), database (what is remembered), integrations (AI models, voice, payments, maps). Name the layer when something breaks: screen looks wrong = frontend; result wrong = backend or integration; gone after refresh = database; worked yesterday = checkpoint and compare.

Five agent habits: ask for the plan first; one milestone at a time; describe the symptom not the fix; park new ideas; review in a fresh session.

Worked example PhotoCal: one person, one moment, core action, failure modes, the 30-minute test that came back wrong (poha read as upma) and moved "correct a wrong guess" to must-have; fresh-session review found selfie-as-food, data gone on refresh, correction not recalculating.

## Users and distribution (week two opens Monday)

- **Monday: watch three people use it.** Hand them the link, say nothing. Write where they stopped word for word, what they expected, whether they finished unaided, the first thing they asked for. Don't demo, don't defend, don't ask "do you like it", ask "what would you do next". Fix the point where they stopped, one thing at a time.
- **Tuesday: distribute before it feels ready.** Never write posts with AI. Your words: what I built, who it is for, why they would care, the link (live, no install, no waitlist). Ten DMs to ten named people beat one post to everyone. Use a new Instagram account, not your personal one; Instagram is the trust channel, "LinkedIn is dead".
- **Wed to Fri: their blockers are your tasks.** Daily note handed to the agent: sort observations into blocker, friction, wish; fix one blocker based on what people did; write next milestones; park the rest.
- Numbers: signups are in Convex already. Visitors need real analytics with read-only access, wired up in week one. Keep a running note from Monday. One stranger beats ten more hours of polish; one payer beats more.

## Scoring (rubric 2.2.0)

Pick one primary track. Each row scored L1 to L5; points = (L − 1) × weight. L4 or L5 needs verifiable evidence or caps at L3. Cross-track bonus at 0.5x weight, 50-point cap. Not live = zero on every track.

**Virality (164 base + overflow).** Impressions 1x (L5 30k to 50k). Reactions 2x (L5 301 to 600). Amplification quality 3x (L4 one notable 10k+ reshare). Visitors 10x (L5 3,000+; read-only analytics or capped at L2). Signups or meaningful actions 25x (L2 26+, L3 101+, L4 501+, L5 1,501 to 5,000; own test accounts don't count). Anti-spoof: visitors ≤ impressions ÷ 10, signups ≤ visitors ÷ 2. What goes viral: a personalised artifact about the user (stat, result, label, score, ranking) that is true, interesting and one-click shareable. Test: what does a user screenshot?

**Revenue (176 base + overflow, hardest).** Signups 20x (L2 1 to 50, L3 51+, L4 251+, L5 751+; email plus first-use event). Live product quality 8x (L3 does what it claims, L4 polished and better than alternatives, L5 can't tell it was built in a week). Revenue generated USD 4x (L2 up to $100, L3 $100+, L4 $500+, L5 $2,000+; product revenue only, not services or friends). Waitlist 4x (L3 151+). Pain point severity 2x (L4 named user, 3+ conversations, quotes; L5 5+ and a "can I pay now" moment). SOM 2x (users × ACV, calculator GPT linked on Scoring page). Right to win 2x. Why now 1x. Moat 1x.

**AI Agent as a Service (164 base + overflow).** Real output on real surfaces 20x (staged surface caps at L3). Agent org 5x. Observability 7x. Evals 5x. Handoffs and memory 2x. Cost and latency 1x. Management UI 1x.

Use the rubric while scoping: score yourself every evening; build for the two heaviest rows first; same evidence never raises two rows; plan the evidence (screenshot, URL, table count) before the feature.

## IDEA_SCOPE.md full template (control plane)

Sections: 0 scope status (milestone, live URL, repo, status language: specified, implemented, working locally, live, verified, demo-ready). 1 idea lock table (one-sentence product, one person, one moment, workaround, core action, outcome, hard input, primary track, riskiest assumption and its 30-minute test, first three users, Tuesday channel, personal artifact, Saturday numbers). 2 user and job. 3 product contract (golden path, inputs, outputs, what it remembers, human review boundary). 4 what makes it different (obvious version, non-obvious choice, the moment they screenshot, rejected ideas). 5 dependencies (verified capability matrix, secrets in Convex env vars). 6 rubric strategy (track, every row with current, target, proof). 7 GTM plan (channels, posts in own words, targets, analytics setup in week one). 8 milestone ladder M0 to M6 with acceptance tests and "if behind, cut to". 9 proof contract (the 2-minute walkthrough that doubles as the GTM video spine). 10 test plan. 11 risk register and pre-mortem. 12 non-goals. 13 parking lot. 14 current state. 15 decision log. End every session with one CHANGELOG.md line: what a user can now do that they could not before.

## Idea rules (already passed, kept for pivots)

Kill rules: ChatGPT can do it; AI not at the core; needs a licence; the whole game is data. Not a rule: too complicated. Why you: audience, workflow, data (1 of 3 passes, 2 is amazing). Lock: goal (money, time, status, life), Delta 4, a sin, user (trigger, today's path, trust, pay), product (onboarding, core loop, coming back, AI-first part), market (tailwinds, competitors as components, size 200 to 300 in extended network, 10 in close circle). Half pivot in week one, 70% by week two; pivot with a reason and re-lock the same way.

## Cheat sheet prompts worth reusing

- Start every session: "Read @IDEA_SCOPE.md. It's my plan for this build."
- Start a milestone: "Here is the doc and the milestone list. Build milestone [N] only. Tell me your plan first and ask anything unclear, do not guess. When you are done, tell me what you built, how I check it, and what you assumed."
- Review in a new session: "Review this build against my plan. For every milestone: does it work, what happens with empty or wrong input, does it hold up on a phone, does data survive a refresh? List issues as blocker, should-fix or cosmetic."
- Checkpoint this. It works. / Go back to the last version that worked.
- Deploy failed: "Read the output of npm run deploy, find the actual error, fix it, deploy again and push."
- Confused: "explain that like i've only used chatgpt."
- Numbers: "show me my Convex signups."

## Pre-sprint pages (done)

Setup (GitHub, Convex via GitHub sign-in, Claude Code, setup prompt, `ccd` alias, skills grill-me, frontend-design, convex-expert installed). Project 1 storefront (X, LinkedIn, Instagram profiles, headshot prompt). Project 2 builder card (launch post, pinned). Project 3 Hermes executive assistant on WhatsApp (morning brief 7:30; SOUL.md; `hermes status`, `hermes doctor`, `hermes gateway`).

## Help

Shaktimaan (growthx.club/community/shaktimaan) 24/7, trained on Udayan; #build-sprint for the rest. Ask before you lose the hour. Twenty minutes stuck is the limit.

## Handbook chapters saved verbatim (added 4 Oct 2026)

The three "thinking" sections of the handbook are saved verbatim (Advanced blocks included, marked `[Advanced]`) under `docs/`:

- `docs/product-thinking/` — overview + 5 chapters (`00-overview.md` to `05-cutting-to-v1.md`). Holds the empty PRODUCT.md template, per-chapter agent prompts and the Shaktimaan lock prompt. Read before writing or changing PRODUCT.md.
- `docs/design-thinking/` — overview + 4 chapters (learning to see, screens and states, words and type, teaching your AI). Holds the DESIGN.md template. Read before any UI work or DESIGN.md changes.
- `docs/tech-thinking/` — overview + 4 chapters (four parts, your agent, ship it, connecting the AI). Holds the AGENTS.md, PLAN.md and PROGRESS.md templates, the deploy chain and the AI-call cost caps. Read before changing the backend, deploy or the AI call.
