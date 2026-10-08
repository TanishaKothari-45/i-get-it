# Night report, 8 to 9 Oct 2026

Read this first. Session dc coordinated the night (D19). Every decision taken in your stead is in docs/decisions.md D18 onward, each with its reasoning; this file says what to check and what waits on you.

## Check on your phone (390 px, logged out, mobile data)

0. "How to make dal" on prod, after 55 and 05 deploy D23: one chapter, ingredients first, steps with quantities, no timer or animated-bowl cards, no sign-up wall mid-recipe. Then type "how to make maggi" as a fresh visitor and expect the same shape.
1. /admin opens for you again after signing in with your usual password (D18). If it still says denied, sign in once by email code and tell dc.
2. The path: landing → chapter 1 → Done wall → sign-in. scripts/prove-path.mjs passed on prod at 00:05.

## Numbers (admin:numbers, pulled 00:20 IST)

| Day | Visitors | Started | Passed chapter 1 | Started chapter 2 | Signed up | Tapped Pay |
|---|---|---|---|---|---|---|
| 8 Oct | 88 (78 direct, 5 ig, 2 growthx) | 54 | 15 | 4 | 0 | 0 |
| 9 Oct, first 20 min | 5 | 5 | 1 | | 0 | 0 |

Caution: /admin's 88 visitors include our own review agents (05 alone ran about 45 tagged headless runs, roughly 60 "visitors"; 55's agents on top). /stats excludes tagged tokens; /admin's visitor count does not. Read /stats for visitors. Read the sign-up count, not the visitor count. The wall moved to after chapter 1 at 20:37; nobody has signed up since. The wall_tap event (00:15) will show taps against sign-ups from its deploy on.

## Waits on you (in order)

1. Live posts and the X ad still say "First 3 free, no sign-up"; false since 20:37 (D14). a2 lists every place below.
2. Razorpay webhook secret is still unset on prod (RAZORPAY_WEBHOOK_SECRET), so a payment is recorded only if the checkout reply reaches the app. Set it from the Razorpay dashboard: `npx convex env set --prod RAZORPAY_WEBHOOK_SECRET <value>`.
3. Shaktimaan's two pieces of advice collide and only you can resolve it: on 8 Oct morning he said to read your moonlighting clause before the first real rupee comes in ("the clause is about earning, not only about being seen"); that evening he set today as "the wall, the pricing fix, and one ask". Asking someone to pay ₹199 today invites the event he said to check first. dc's view: read the clause before the ask; if a real rupee is not allowed yet, make the ask a research question ("would you pay ₹199 for this?") and record the yes, not a Razorpay link. I did not put this to Shaktimaan: the permission check blocked a message carrying your employment details to an outside service, so it stays here for you.
4. One question for Shaktimaan that dc could not send (the permission check blocked the channel for this session twice; a2 reached him earlier tonight): "What's the smallest sample at the wall before the result means anything? Write the number down now (10 or 20 wall hits) so Friday's call is made on data, not flipped back on three people's noise." Ask it yourself in the morning, or let a2 send it. Also tell him his line "Chapters 4 to 7 are ₹199" is wrong for our model (a free account opens every ready handbook; paying buys more of your own), and that the 49-of-50 counter is fixed (D22).
5. Small build proposed for Friday, not done tonight (dc, D19: nothing beyond the P0s under tonight's load): a link that opens one shared handbook straight from a post, e.g. ?l=<libraryId>, the way ?t= opens a ready topic. a2's "Someone typed this" Sunday post needs it, and Shaktimaan's rule is "link straight in, each extra tap loses cold visitors". Ten-minute build in App.tsx and library.ts; say yes and 55 does it in the morning.
6. D13 opens: blind writer test judge, landing length, pricing columns, button labels (parked to Sunday 12 Oct).

## Session dc (coordinator)

- Admin access restored (D18). Deploy queue and git rule for a shared tree (D19): no pull, no stash, stage own files by name.
- D21: the Shelf gets a real button and a count strip (your 00:4x ask; 05 builds). D22: your test payment no longer counts toward the early-bird tiers, so the counter reads 50 of 50 (55 builds).
- D20: Pricing "Coming next" row becomes "More coming. Members hear first." (55 implements).

## Session 05

Before you write here: add your lessons for 8 Oct to docs/lessons.md (Product/Tech and GTM, thought / learned / now). AGENTS.md section 2, every build day.


(05 writes here: what shipped, the second critique score against 26/40, what to check, what's open.)

## Session 55

(55 writes here: what shipped, the picture shrink and originals delete status, what to check, what's open.)

## Session a2

**First thing in the morning, before anything new goes out: the free-chapters claim changed at 20:37 (D14).**

What's true now, for any caption or reply you write:
- Chapter 1 of any handbook: free, no sign-up.
- Chapters 2 onwards: free with an account (your email and a 6-digit code). No card.
- Paying only buys more handbooks of your own: from ₹199 a month early-bird, paid once, nothing auto-renews.
- Retired since 7 Oct, never use: "week 1 free", "first 3 chapters free, no sign-up", "day 28".

Live posts that still say the old thing (checked 00:30 IST in your accounts, read-only):
1. Instagram reel, 8 Oct, "Ready to crush your 2026 goals?" (instagram.com/prateek.kurkanji/reel/DePEAgnB0-G): caption says "The first 3 chapters are FREE, no sign-up needed". Edit the caption to the line above. If the video you uploaded was made before 20:50, its end card also says "The first 3 chapters are free. No sign-up."; the corrected file is docs/launch/ad-2-84-days/v2/igetit-ad2-v2-ig-nosound.mp4 (a reel's video can't be swapped, so either leave it and fix the caption, or repost).
2. Instagram reel, 7 Oct, mutual funds ad (reel/DeMjsMQRI9U): caption says "The first 3 chapters…". Edit the caption.
3. Instagram reel, 6 Oct, "Her talk is in 7 days" (reel/DeJYLT9hqL9): mentions 28 days ("7 days: a small jump. 28…"), retired since 7 Oct. Edit the caption.
4. X, ad 1, 7 Oct (x.com/KurkanjiPrateek/status/2107843593956401413): "First 3 free, no sign-up". Edit the post (Premium allows it) to "Chapter 1 free, no sign-up. The rest free with an account. No card."
5. X, pinned post, 5 Oct (status/2107230503355232712): "No sign-up to start. Week 1 free." and the old sensible-mongoose link. Edit "Week 1 free" out, or pin a newer post.
6. Fine as they are: the Instagram bio (igetit.now), the 6 Oct carousel caption, the 2 Oct reel, X Day 6 and Day 7 posts. The link image (docs/launch/link-image) and the ad 2 v2 end card were already corrected at 20:50.
7. docs/content-plan.md (untracked, your safe-claims list) still has the old line under the claims list; fix it when you next touch the plan.

**Ready for you (all local, nothing posted):**
- docs/content-system.md: the weekly routine. You record every day (about 25 minutes); the agent writes the script the night before and returns the finished reel by 5 PM; post at 7 PM. Mon countdown, Tue lesson, Wed building in public, Thu common mistake, Fri proof, Sat the series on camera, Sun your story. Two banked reels for days you can't record. A retention checklist for every edit.
- docs/launch/scripts/2026-10-10.md to 2026-10-16.md: a script for every day this week, built from the real chapters. Sun (your saved-reels number), Wed and Fri (that day's numbers) have blanks only you can fill.
- docs/launch/series-first-app/out/: "Your first app with AI, Night 1-7" carousels (74 slides, from the real Vibe coding chapters, ending on a send line) plus a 3-slide hook slideshow per night (21 slides).
- docs/growth-playbook.md: the research behind it, with sources and how strong each one is: 12 rules, Instagram and X specifics, creators to copy, a hook bank for our 3 topics, where experts disagree, learning-app patterns, Dot's first two weeks, and 15 communities with their posting rules. It stays out of the public repo (local only).
- docs/content-week-2.md: this week's calendar with targets (60 followers on each, 10 sign-ups, 5 people asked to pay, 1 paying reader), which community gets which day, and the evening X slot (7-8 PM IST reaches India and the US morning).
- docs/launch/dot/dot-options.png: three looks for Dot. A and B (round black fuzz with white eyes) are close to Studio Ghibli's soot sprites; C (Dot sitting on the "i", slumping off it when you put things off) is the most clearly ours. My pick is C.
- docs/launch/dot/out/meet-dot-1..5.jpg: today's "Meet Dot" carousel, drafted in look C (Dot sits on the "i" when you get it, slides off when you save and never read; last slide asks people to comment what they keep meaning to learn). Swaps to A or B in a minute if you pick another look.
- docs/launch/guests/out/: carousels for the guest days, from the real chapters: Tue "Owning versus lending" (Stocks, chapter 1, 7 slides) and Thu "Open with a promise" (Public speaking, chapter 2, 11 slides).
- docs/growth-playbook.md section 11: ready-to-paste profile text for Instagram (name field, bio, link, what to pin, highlights) and X (display name, bio, what to pin instead of the 5 Oct post, header idea). It keeps any day-job line off both profiles on purpose.
- docs/launch/edit/edit.py: a reel editor for your daily raw take. It cuts pauses, crops to vertical, puts the hook on screen from frame 1, cuts to your app screen recording at the rehook line, burns in captions (speech-to-text runs on the Mac), and adds the end card. Built tonight; both test runs were stopped to free the Mac for the night's deploys (coordinator's call), so it's not proven yet. It gets tested once the deploys are out, before your first take is due.

**Changes the research made (already applied in the docs):** Instagram hashtags 3-5, not 11-13 (Instagram's own guidance; "always hashtags" stands); X link in the post itself, not the first reply (X's head of product); learning AI leads, money and speaking are weekly guests (one clear subject lets Instagram learn who to show you to).

**Decisions waiting on you:**
1. Which Dot look (A, B or C). Dot's launch post is on today's plan.
2. Switch Instagram to a professional (creator) account before Saturday's first reel: it unlocks skip rate, sends and retention in Insights, and lets posts show up on Google.
3. Do you have a Reddit account with some karma? Most of the communities in the plan filter brand-new accounts; if not, start commenting this week and post later.

One more item for you only, in docs/growth-playbook.md section 7 (local).
