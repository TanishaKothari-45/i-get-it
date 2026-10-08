---
date: 2026-10-08
type: decision-log
tags: [igetit, decisions, learnings]
ai-first: true
---

# Decisions and learnings

One entry per decision: what, why, what it replaced, and when to look at it again. Newest day first. PROGRESS.md says what was built; docs/lessons.md says what each day taught; this file says why we chose what we chose.

How to add: at the end of a session, append under today's date. A decision Prateek made says "(Prateek)"; one the agent made in his stead says "(agent, authorised)". Never rewrite an old entry; add a new one that supersedes it.

## 2026-10-08

### Decisions

- **D1. Lessons are built from a kit, not a rubric (Prateek).** The plan gives every chapter its blocks (picture, teach, example, mistake, try, move, do it, steps, try it, quiz incl. scenario, watch, one breath) and a proof (set, result, predict, scenario, retell), chosen for this reader and this thing. The five kinds (body, tool, understand, story, decide) are defaults in the prompt, not an enum. Replaced: one chapter shape for every topic (story card, teach, three quizzes). Why: a calisthenics reader said the story time and quizzes were in the way; "a push-up is proved by a push-up". Revisit when a topic needs a block the kit lacks: add a block, not a kind.
- **D2. Body skills pass on a logged set (Prateek).** "Do it" cards log reps, seconds or ticks plus how it felt; the first set passes the chapter. No quizzes. A "try it" page is a bonus, never a wall. Revisit if readers log sets without doing them (a "feel" of easy on every set is the tell).
- **D3. Chapter 1 is the one shot (Prateek).** It gets to the win fast: the reader does or sees the central thing by block 2 or 3, and it is at most 6 blocks. Existing chapter 1s stay as they are except the ones Prateek named (calisthenics ×2, Pool swimming), which were rewritten in the new shape. Revisit after 20 readers finish a body-skill chapter 1.
- **D4. Runway draws every picture card again (Prateek).** Replaced the night's "Runway only for the cover" rule. Why: with Wikimedia alone, new chapters got 0 or 1 picture, and a reader said the lack of visuals was an impediment. Wikimedia photos (with ink and wash) stay for real things and as the fallback. Ready topics draw all chapters at build; typed topics draw chapters 2+ on first open. Cost: up to ₹4.25 a chapter, once.
- **D5. Research runs on Gemini 3.8 Flash with Google Search, Claude Sonnet as the backup (Prateek).** Facts written "80% of the way to ASD-STE100". Two Google keys; the main one answered 503 all day, the backup worked. Revisit if Gemini's facts prove weaker than Claude's in the judge (not yet measured head to head beyond the 3-topic bench).
- **D6. Every model reply has a schema (Prateek).** zod schemas in convex/schemas.ts; one corrective retry, then a failure; Cheaper Inference gets the JSON schema with the request. Why: a Gemini chapter put prose in a card's type; the doctor's rewrite shipped a card the screen could not show.
- **D7. Frozen topics block A/B tests entirely (agent, authorised; 71's ask).** assignVariant and doctor.start refuse FROZEN topics; running tests on them were stopped. Why: Public speaking's test put half of new readers on a chapter 1 that crashed and did not match the Instagram carousel.
- **D8. The Shelf replaces Explore and is always one tap away (Prateek).** Books on planks, one shelf per kind, each book once; a header button on every screen. Returning readers land on Your handbooks, not inside a chapter; first visits still go straight into chapter 1 (Prateek).
- **D9. Sign-in is optional until chapter 4, and the screens say so (Prateek, via the review).** After chapters 1 and 2 the next chapter is the one main action; sign-in is a quiet line; "Keep this handbook" from chapter 3.
- **D10. Interactive explainers are in (Prateek).** One "try it" page per chapter where the plan asks for it, Sonnet, about ₹3 once, in a locked iframe with a CSP. Why: 2 of 3 one-shot tests were good. Revisit the brief if readers skip them (the done message is tracked).
- **D11. Test replays never count (agent, authorised).** Every headless phone used today is in statsExcluded and its handbooks hidden. Going forward a replay should set a flag before it starts.
- **D12. Replies to Prateek in plain, ASD-STE100-leaning English (Prateek).** Short sentences, one idea each, no jargon.
- **D14. Tomorrow's plan, with Shaktimaan (8 Oct, late; Prateek: "discuss all with Shaktimaan, interact with him freely").** (1) A free sign-up wall after chapter 1 (email code, no card); chapters 2 and 3 stay free; the early-bird price shown on that screen as information, not a gate ("Chapters 2 and 3 are free. Chapters 4–7 are ₹199 early-bird"). This reverses today's D9 for the done screen: 0 sign-ups and 1 reader at chapter 3 means the "optional until chapter 4" test never runs. The reel copy changes "no sign-up" to "no card". (2) The pricing page: fix the false Free-column line first, then one price, one button, the no-auto-renew line. (3) One person asked to pay. (4) Typed suggestions marked "(writes a new one)" tonight. Parked until Sunday 12 Oct: the landing page cut (#1, #2), button labels (#39), any new lesson-kit rebuilds. Pricing bet: a heavy member can cost up to about ₹1,300 of writing against ₹199; acceptable with zero paying members and a cap; no second price now. Trigger to revisit: three members hit the monthly cap of 6 typed handbooks.
- **D13. Open, not decided:** the blind writer test (A = Claude, B = DeepSeek V4.1 Flash) awaits the neutral judge; Opus stays on plans at effort high; the landing page length, the pricing columns, the button labels and the typed-suggestion marks await Prateek (review #1, #2, #30, #31, #39, #40).

### Learnings

The day's learnings live in docs/lessons.md (Product/Tech and GTM, thought / learned / now). This file keeps the decisions.

## 2026-10-07 (from PROGRESS.md "Decided" lines, for the record)

- Chapters are written once and shared through the library; quizzes come in three stored levels chosen per reader; typed topics are matched by meaning to the shelf before anything is written; research starts while the reader picks a goal.
- Razorpay live; early-bird tiers by paying-customer count; no refunds except a double charge or a payment that did not activate.
- Visitors get 3 chapters without sign-in; free account opens the rest; members get 3 typed handbooks on the go and 7 chapters a day.
- "Say it simpler" removed; "In one breath" moved to the start of the next chapter as "Last time".
