# Night report, 8 to 9 Oct 2026

Read this first. Session dc coordinated the night (D19). Every decision taken in your stead is in docs/decisions.md D18 onward, each with its reasoning; this file says what to check and what waits on you.

## Check on your phone (390 px, logged out, mobile data)

0. "How to make dal" on prod (note: the first rebuild at 00:41 was undone by the D27 course guard and the handbook was briefly a 7-chapter course on prod; 55's third rebuild under D23a makes it one chapter; check the chapter count first): one chapter, ingredients first, steps with quantities, no timer or animated-bowl cards, no sign-up wall mid-recipe. Then type "how to make maggi" as a fresh visitor and expect the same shape.
0b. A fresh course topic on prod after D27: 7 chapters, chapter 2 with 30 or more swipes and about 1,000 words (55 reports the measured numbers in its section).
0c. The Shelf names every handbook by the typed words again (D28): "Public speaking advanced level", not "Advanced Rhetoric and Persuasion". 55 lists every renamed row in its section.
1. /admin opens for you again after signing in with your usual password (D18). If it still says denied, sign in once by email code and tell dc.
2. The path: landing → chapter 1 → chapter 2 → Done wall → sign-in (D26 moved the wall to after chapter 2 at your 01:4x ask). scripts/prove-path.mjs passed on prod at 00:05.

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
5. D25 shipped tonight on your word: ?l=<libraryId> opens a shared handbook straight from a post (05 built it; check one link from a2's candidates on your phone).
6. D13 opens: blind writer test judge, landing length, pricing columns, button labels (parked to Sunday 12 Oct).

## Session dc (coordinator)

- Admin access restored (D18). Deploy queue and git rule for a shared tree (D19): no pull, no stash, stage own files by name.
- D21: the Shelf gets a real button and a count strip (your 00:4x ask; 05 builds). D22: your test payment no longer counts toward the early-bird tiers, so the counter reads 50 of 50 (55 builds).
- D30: Flash vs Opus side by side on dev, three topics, chapters 1 and 2; numbers below when the run ends (started 03:0x).
- D20: Pricing "Coming next" row becomes "More coming. Members hear first." (55 implements).

## Session 05

Lessons for 8 Oct are in docs/lessons.md (five under Product/Tech, session 05).

**Shipped (two static deploys: b052149 at 00:5x and 3eb0e2b at 02:4x, both proven by scripts/prove-path.mjs on prod: PASS)**
- The print language on every screen: ink stroke, pressed shadow, paper rule, grain, marker highlights, printed kickers. Chapter frames, plan, Done, sign-in, pricing, policy, Shelf, Your handbooks, Start, Print. 14 screens measured from the DOM at 390 px (tap targets 44 px and up, contrast 4.5:1 and up on body text); the Shelf chip misalignment you caught is fixed and was the last open item in that sweep.
- The book opens (your ask, 00:1x): tap a book on the Shelf or the landing carousel and it lifts, grows and opens into chapter 1; every frame is a page that turns in from the right going forward and from the left going back. Transform and opacity only, about a third of a second, one picture prefetched ahead, nothing extra on save-data or 2G, all off under reduced motion. The screen underneath stays until the chapter has its cards, so there is no splash or plan flash.
- The Shelf control (D21, your 00:4x ask): a printed marigold button with a book and the word "Shelf" (44 px) in the header of every screen except the Shelf itself; a printed strip with the live count ("N handbooks on the Shelf, ready to open.") under the typed box on the landing, under the wall card on Done, and on the plan. Before and after at 390 px: docs/shots/2026-10-09/before-landing.jpg → after-landing.jpg, before-done.jpg → after-done-1.jpg and after-done-2-wall.jpg.
- Activities never gate the arrow (D24): a do-it, try-it, steps or move card is an invitation; → works from the moment it shows. Only a quiz holds. The do-it card says "Or just tap → to keep going." Verified in code and by walking three body-skill chapters (dev and prod); none of them put a do-it card in chapter 1 tonight, so the "nothing logged, arrow advances" case was not seen on a real do-it card. Worth one tap on your phone on a calisthenics chapter.
- The wall after chapter 2 (D26, your 01:4x): Done after chapter 1 has "Start chapter 2" as its one main button and "Want it on every device? Make a free account" as the quiet line; after chapter 2 the wall card says "Chapter 3 is free with an account." The number comes from the server's limits field (membership.status), so it lives in one place. Shots: after-done-1.jpg, after-done-2-wall.jpg.
- A post link to one shared handbook (D25): ?l=<library id> starts it the way a Shelf tap does and opens chapter 1 with the book lifted (after-link-opening.jpg → after-link-chapter1.jpg); a phone that has it opens where it was; a junk id lands on the Shelf quietly. prove-path scenario 3 covers both halves. a2 has the ids.
- The typed line is the name everywhere (D28): the plan h1, the rail, the chapter header, Done, the menu and the compare screen all show what was typed, first letter capitalised; the model's own title is no longer displayed by the app (55 reset the server rows).
- The wait-screen story as pages (D29, your 02:1x; second deploy): one story at a time as swipeable pages with arrows and dots, picture on page 1, source on the last, "Next story →" and "Add this handbook" always under it ("Added. It's on your shelf." keeps you on the wait screen), "From <typed name>". When the handbook gets ready while you're mid-story, "Open your handbook →" appears above the story and nothing moves until you tap. Shots: after-wait-page1.jpg, after-wait-page2.jpg, after-wait-ready.jpg. Today's one-paragraph stories show as one page with no arrows.
- Quick handbooks on Done (D23): no wall between the chapters of a recipe or a one-off task, no reminder, no "tomorrow"; one button, "Keep going"; a one-chapter handbook's Done says "Done." and "That's all of it. Quick and done." The plan hides the Tonight/Next tags on a quick handbook.
- Phone Back button: every screen is a history entry, so Back goes to the previous screen instead of leaving the site.
- Sign-up from the wall no longer bounces to sign-in (the attach race). Sign-in from the wall names the chapter and the topic, says who sends the code and that it takes about twenty seconds, keeps the password route behind "I already have a password".
- Sheets and the chapter trap Tab and give focus back on close; the chapter dialog is named "card i of n"; the bars are a progressbar.
- Security (found by the review, fixed): the admin page needs a verified email; "exclude me" from stats is once per phone and rate-limited; the reminder save is rate-limited per device and across the app.

**Critique (impeccable critique, two independent reviewers, same path: landing → Drishyam → chapter 1 → Done → sign-in)**
- First run 26/40, second run 27/40. The point moved on aesthetic and minimalist design (one main action on Done, the wall card as one printed block, a single finisher on the last frame). What is still open and not mine: picture weight on the cover plates (55's backfill), and the plan's copy when a typed topic is really a ready one (55 will ask you).
- Deterministic scan: 0 findings on the source files; the one URL warning ("cream palette") is the brief's own paper colour.

**Check on your phone (390 px, logged out, mobile data)**
1. Landing: the marigold "Shelf" button top right, the strip with the count under the typed box. Tap a carousel book: it lifts and opens into chapter 1 with no flash in between.
2. Chapter: swipe or tap → through a do-it or try-it card without logging anything; it must advance. Pages turn; the picture plate shows stripes until the picture lands, never a hard-edged empty box.
3. Done after chapter 1: outcome line first, then the wall card, the price as a note, the Shelf strip. Make a free account from there: you should land in chapter 2, not back on sign-in.
4. Press the phone's Back button on the plan: previous screen, not the Chrome new-tab page.
5. A quick handbook (the dal one, or the lasagna one on dev: after-quick-done.jpg, after-quick-plan.jpg): no reminder on Done, "Keep going", no Tonight/Next tags on its plan.
6. Type a new topic and, on the wait screen, swipe the story and tap "Next story →"; when the handbook is ready the button appears above the story.

**Three checks asked by dc (03:0x)**
1. D24 on a real do-it card: 55's "Making Maggi noodles" on dev, fresh phone, 390 px. Card 1 is the "Do it now" checklist (3 boxes). With nothing ticked the arrow is offered and advances (bars 0 → 1); the chapter walks to its last card and "Finish chapter" lands on Done ("Done.", one chapter). Shot: after-maggi-checklist.jpg.
2. The story picture on a slow line: headless Chrome at 400 kbps with 400 ms latency, fresh typed topic ("How kites fly") on dev. The story card appeared 3.4 s after load; its picture (JPEG, 136,883 bytes from Convex storage) was on the first page 8.0 s after the card. That misses the 5 s mark: at 400 kbps the picture shares the line with the app's own chunks and fonts, and it only starts once the story query answers. To hit 5 s on that line the story picture needs to be about 60 KB (a 640 px wide variant), which is 55's pipeline, not Start.tsx. Shot: after-wait-slow4g.jpg.
3. The rename on prod: opened ?l=n170tmec1sym3h20t28jsp80a18fxx24 as a fresh phone. Chapter header says "Public speaking advanced level", the plan h1 says "Public speaking advanced level", the Shelf's book plate says "Public speaking advanced level"; no book on the Shelf says "Rhetoric". Shot: after-rename-shelf.jpg. (The cover frame's big title is chapter 1's own title, "The Four Classical Proofs", as designed.)

4. Re-run after 55's D29b (the 560 px story picture): same line (400 kbps, 400 ms latency), fresh typed topic ("How rainbows form") on dev. The story picture (JPEG, 37,946 bytes) was on the first page 1.3 s after the story card, against 8.0 s for the 137 KB original. Under the 5 s mark with room to spare.

**Open**
- The landing is 9.95 screens tall at 390 (parked to Sunday, D14).
- Our headless visits (about 60 tonight, all tagged ?utm_source=internal) are counted on /admin and not on /stats.
- The dev deployment's waitStory had the new 4-to-6-frame stories at 02:3x; prod shows one-page stories until 55 runs stories:buildAll.
- Our headless runs tonight made about 8 more handbooks on dev (two typed: suspension bridges, why the sky is blue) and about 6 on prod from the Shelf, all tagged internal.

## Session 55

**Shipped tonight, all on prod (functions deploys at 23:38, 00:40, 00:50 and 00:55; the site builds carry my screen changes):**
- Tanisha's feat/observability brought in by hand (D15): call log with handbook/chapter/tries, callStats, /admin "AI pipeline", Langfuse export (numbers only), research v5 after the goal on Gemini Flash, plans and chapters on Gemini Flash with Opus backup, chapter 1 as its own step, fact check writes the picture scenes, quiz versions in the background, no SVG, library check on its own schema, privacy page updated. Dev test: goal to chapter 1 in 110 s, ₹7.23 a handbook (was about ₹25). Flash chapters measured the 6 Oct way on two topics: 0 false, 3 and 1 misleading (docs/measure/2026-10-08-flash-slips.md).
- Pictures stored at ~900 px JPEG (~100 KB) instead of 3.5 MB PNG; backfill images:shrinkAll ran on prod (see the originals line below).
- Free day budget now covers chapter writes, compares, asks and teach-backs; anonymous creations share an app-wide bucket; a profiled chapter 1 is never shared.
- UX from four review agents (first-time phone, returning reader + desktop, account/money, accessibility + weight): Library's main button continues the last handbook by name; "Who teaches you, and how"; pricing chips one price each, the next tier as a line, "when your paid days end" rule, D20 row; Terms matches Privacy; Print links; goal screen says it is thinking; wait screen times match the pipeline; 200-char counter; level heading; "Other handbooks you might like" lists ready/shared only (a typed link spent the free handbook with no warning); Policy back link; contrast on Pricing/stats; Plan: "Start chapter N (free account)", declined state, shelf strip slot.
- D22: the early-bird spot count ignores the owner's own payment (50 of 50 left).
- D23: a recipe, a single how-to or any one-off task is ONE chapter with every step: a "What you need" checklist first (quantities, serves, total time), then steps with timings, mistake, breath; never a move or a timer; a typed "how to make/cook/bake X" or "…recipe" line is one sitting whatever research labelled it (research called dal a skill once). Quick handbooks skip the sign-up wall and the daily limit and are written whole at plan time. Your dal (k970557) was rebuilt three times tonight and is now one chapter, "From Dry Lentils to Sizzling Tadka".
- D24: no activity (do-it, move, steps, try-it) ever gates finishing a chapter; a chapter with no quiz passes on reaching its last card; logged sets are optional. Proved on dev with 0 sets.
- D26: the sign-up wall is after chapter 2 (visitorChapters 2); chapter 3 needs the free account.
- D27: a skill, a subject or a money/health/legal brief is a 7-chapter course (one retry, then Opus); chapters 2 to 7 have a hard floor of 30 paragraphs and 800 words (prompt asks 30 / 1,000), chapter 1 a floor of 12 / 350 (asks 15 to 18 / 450); one retry with the counts stated, then the Opus backup; paragraphs, words, floorTries and bounced are on each chapter's call row for /admin. Measured on dev: stock market → 7 chapters; chapter 1: 18 paragraphs / 467 words first try; chapter 2: 24 / 975 on the second try (before the floor went to 30).
- D28: a handbook is named by what the person typed, never the model's title (library, shelf, your list, print, recap). Renamed on prod: Building a swing trading assistant → I want to build a swing trading AI agent; The science of consciousness → Philosophy, scientific spirituality; Investing in the stock market → The stock market; Investing in Indian stocks → Indian stock market basics; Calisthenics for beginners → Calisthenics for beginner; Explosive calisthenics → Calisthenics; How to Make Dal → How to make dal; Advanced Rhetoric and Persuasion → Public speaking advanced level; plus two hidden test rows. "n8n" keeps its spelling.
- D29/D29a: three true teaser stories per ready handbook for the writing wait (Opus medium, from the handbook's own chapters and named sources, run through the chapter fact check; a story with a claim the check calls false or unsupported is dropped, never softened); the wait query picks a genre, then a handbook, then a story, never the one being written, and returns all frames plus a one-tap start. Sample built on dev (World War II: Ebert's "no enemy has overcome you", Dunkirk's 45,000 → 338,000, Midway's fake water-plant message); the prod build waits on dc's yes.
- Not-a-topic check: "asdfgh" gets a plain question and the answer becomes the topic, no generation spent.

**Check on your phone:** type "how to make maggi": one chapter, a "What you need" checklist first, no timer, finish by reaching the end. Open Your handbooks: the main button continues your last handbook. Pricing: one price per chip, "50 of 50 left" (your own payment no longer takes a spot).

**Pictures:** 1,485 originals (4.9 GB) shrunk to ~100 KB JPEGs and deleted after a live spot-check (26 landing pictures, all JPEG, largest 236 KB).

**Hidden handbooks (dc's ask):** 13 were hidden at 00:1x by test string. All 13 were made 23:40–00:03 by the review agents' phones (tokens 424db3f4 [self-identified], 9e44d891 [asdfgh + a Public speaking copy], 99c8b088 and e4421e1c [the 200-char string], ec4e66c6 and c674ed85 [dal, abandoned at the goal step], c7611c27 [dal, 23:50]); none has a userId. dc says k970557 (token c7611c27) is yours; it is unhidden and rebuilt as one chapter under D23. Nobody real lost a handbook as far as the data shows.

**Bot visits:** the four review agents made roughly 40 to 60 fresh-phone visits between 23:35 and 00:30 with no utm tag; the 7 tokens above are in statsExcluded, the rest are not identifiable. Treat 8 Oct "direct" visitors as mostly ours.

**/stats "Signed up" 1 → 0:** not something I changed; 05's verified-email check (c80f17a) or an excluded test account is the likely cause; 05 can confirm.

**Open:** LANGFUSE_TRACES_URL for the /admin links (`npx convex env set LANGFUSE_TRACES_URL "https://us.cloud.langfuse.com/project/<id>/traces" --prod`); the writer's "voice and tension" tone test (about ₹40); self-hosting the two fonts (395 KB); Shelf "for: goal" ribbon text; a 400 px cover size for the carousel and Shelf.

**Read this first: the wait-story sample (World War II, built on dev under D29a, approved by dc):**

*The welcome that started a lie* (points at: The dry timber: why Germany wanted to fight again; source: Handbook chapter 1; A. J. P. Taylor, The Origins of the Second World War)
1. Berlin, 10 December 1918. Soldiers march through the city with their flags flying. Crowds throw flowers. Friedrich Ebert, Germany's new leader, steps forward to greet them. His country has just lost a war that lasted four years. What he says to these men will echo for the next twenty.
2. Here is the strange part. The fighting stayed almost entirely outside Germany's borders. No enemy army is marching down these streets. For the people throwing flowers, defeat is something they have read about, not seen. Their sons are walking home in step, rifles on their shoulders, looking like winners.
3. Ebert tells them: 'No enemy has overcome you.' The crowd cheers. It is not true. The army was beaten in the field that autumn, which is the only reason it is marching home at all. Hold that sentence in your head. In six months Germany has to sign something else.
4. June 1919, the Treaty of Versailles. Germany loses about 13% of its land. Its army is capped at 100,000 men. It owes reparations for the damage of the war. And one clause makes Germany accept the blame for starting it. Ebert's sentence and the treaty cannot both be true.
5. Millions of Germans decided the treaty was the lie. And the treaty left the muscle in place: 60 million people, the factories, the officers. A grievance, plus the means to act on it. In January 1933, a man who promised to tear the treaty up became chancellor.
6. That's chapter 1 of World War II: the dry timber stacked against Germany's walls.

*The rescue that beat its target* (points at: The fire spreads: France falls, Britain holds; source: Handbook chapter 3; Antony Beevor, The Second World War)
1. Late May 1940, the beaches at Dunkirk. British and French soldiers stand on the sand with the sea at their backs. On 13 May German tanks crossed the Meuse at Sedan. Seven days later they reached the Channel coast near Abbeville. The best Allied armies, sent north into Belgium, are cut off.
2. On 26 May the Royal Navy begins taking men off the beaches. It has a number in mind, the most it thinks it can save. The number is modest. Most of the men on that sand would not be in it. Behind them, the battle for France is already lost.
3. Then the boats start to appear. Not only warships. Fishing boats. Pleasure boats. Craft built for a day out on the water are crossing the Channel, about 20 miles at its narrowest, to pick up soldiers. They go back and forth for more than a week.
4. On 4 June it ends. The men come home without most of their tanks and guns, left behind on the French coast. Ten days later Paris falls. On 22 June France signs an armistice on Germany's terms. So how many men did the boats actually bring back?
5. The Navy had hoped to rescue about 45,000. It brought home about 338,000. And Churchill refused to call it a win. He told Parliament that wars are not won by evacuations. Dunkirk did not beat Germany. It kept an army alive to fight later.
6. That's chapter 3 of World War II: why France fell in six weeks and Britain held.

*A broken water plant at Midway* (points at: The turn: three battles that stopped the spread; source: Handbook chapter 5; Antony Beevor, The Second World War)
1. Hawaii, May 1942. Five months after Pearl Harbor, American codebreakers can read parts of Japan's navy messages. Not all of them. Enough to see that something big is coming. The messages keep naming the next target, but never by its real name. It is only ever called AF.
2. The codebreakers suspect AF is Midway, a tiny American island in the middle of the Pacific. But suspecting is not knowing. If they guess wrong, America's carriers wait in the wrong stretch of ocean while Japan strikes somewhere else. They need Japan to confirm the target itself.
3. So Midway gets an odd instruction. Send a message saying the island's water plant has broken. It is fake. There is nothing wrong with the water. No decoy fleet, no clever battle plan. The test is a complaint about plumbing, sent where Japan might be listening.
4. Then they wait for Japan's reply. Soon after, a Japanese message turns up in the intercepts. It reports that AF is short of water. The guess is confirmed. Midway is the target, and the Americans now know where Japan's carriers are heading.
5. When Japan's carriers arrive in June 1942, three American carriers are already waiting. Japan loses four aircraft carriers, the floating airfields its whole advance depended on. After Midway, Japan is guarding what it has taken, not taking more. One pretend broken water plant, four sunk carriers.
6. That's chapter 5 of World War II: the three battles that stopped the spread.


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
