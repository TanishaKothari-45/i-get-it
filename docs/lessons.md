# Lessons, day by day

What each day taught us, not what shipped (that's PROGRESS.md). Every build day gets two halves, Product/Tech and GTM, written by whichever session did the work (Prateek, 8 Oct: "Product/Tech and GTM lessons every single day we build"). Each lesson: what we thought, what we learned, what we do now. Numbers over adjectives. Newest day on top.

Feeds the 9:30 X draft (scripts/x-nightly.sh reads yesterday's day) and the end-of-sprint write-up. A message that starts with "learned:" lands under "Noted during the day" at the bottom; fold those into the day before the session ends.

## Thu 8 Oct (day 7)

### Product/Tech

**Chapter 1**
- Learned: the 6-short-card chapter 1 works. Before: 4 of 17 who opened it finished. After: 7 of 17.

**Sign-ups**
- Learned: 126 visitors, 58 started a handbook, 14 finished chapter 1, 0 sign-ups. People read; nobody makes an account yet. The next problem is the step after chapter 1, not traffic.

**Testing in production**
- Learned: an A/B test left running on a topic that was in a live post gave about half its new readers a blank chapter 1 (fixed 14:10). Topics in live posts stay frozen (convex/frozen.ts).
- Learned: our own testing pollutes the numbers. Today's UX review replays alone made about 20 visits and 17 handbooks, all counted as direct.
- Now: mark a phone or browser as ours (?utm_source=internal) before any test run.

**Own domain**
- Learned: on Convex's paid plan a custom domain is two DNS records and about 4 minutes. GoDaddy can't point a bare domain at Convex, so igetit.now forwards to www.igetit.now; https on the bare domain waits a few hours for GoDaddy's certificate. Sign-in is a typed code, so nothing in auth had to change.

**Link previews**
- Learned: the site sends no preview image, so a shared link shows no picture. A 1200x630 image is ready in docs/launch/link-image; adding it to the page is still to do.

**Lesson shape, one size doesn't fit (the calisthenics reader)**
- Thought: one chapter shape (story card, teach, three quizzes) works for every topic.
- Learned: a reader doing push-ups said the story time and the quizzes were in the way and it took too long to get to the point. The same shape scored 9/12 on "how tides work".
- Now: the plan picks each chapter's blocks from a kit (picture, teach, example, mistake, try, move, do it, steps, try it, quiz, watch, one breath) and its proof (set / result / predict / scenario / retell). Body skills pass on a logged set, no quiz. Calisthenics ×2 and Pool swimming chapter 1 rebuilt: picture → move (a drawn figure with cues) → do it (timer) → mistake → do it → one breath.

**Pictures**
- Thought: free Wikimedia photos could replace Runway drawings on 4 of 5 picture cards (last night's "Runway for the cover only").
- Learned: Wikimedia has almost no photos for teaching ideas ("owning versus lending"). New chapters got 0 or 1 picture; a reader called the lack of visuals an impediment. 19 of 24 ready topics still had 5 to 8 drawings a chapter; everything written after 7 Oct 20:00 had 1.
- Now: Runway draws every picture card again (up to 5 a chapter, ₹4.25 once, shared). Photos with an ink-and-wash filter (OpenCV, 0.8 s, ₹0) only for real things. Backfilled 162 pictures in 40 minutes.

**Interactive explainers**
- Thought: readers would need video for anything that moves.
- Learned: a one-call Sonnet page (drag the bakery's value, bend the screen, drag the Moon) lands about 2 in 3 one-shot, costs ₹3 once, 12 to 15 s, 3.5 to 4.6 KB. The weak third needs a look-and-fix pass.
- Now: "try it" is a block in the kit, in a locked iframe (sandbox allow-scripts + a CSP), done-message as proof but never a wall.

**Research model**
- Thought: moving research off Claude would need Cheaper Inference.
- Learned: Cheaper Inference has no web search at all. Gemini 3.8 Flash with Google Search costs about ₹1 to ₹1.4 a topic against Claude's ₹5 to ₹10, takes 28 to 66 s, and found the same current facts (Nifty's Tuesday expiry, lot size 65). Google's main key answered 503 on every call for hours; the backup key worked 3 of 3.
- Now: research runs on Gemini with Google Search, Claude Sonnet as the backup, two Google keys, a schema on the reply.

**Schemas on every model reply**
- Thought: JSON "mostly works".
- Learned: a Gemini chapter put prose in a card's "type"; an old rewrite shipped a "poll" card the screen could not show, which blanked chapter 1 for half of a frozen topic's new readers. And the schema you send shapes the reply: with only type/title/body described, Gemini dropped the quiz fields.
- Now: zod schemas on plan, chapter, check, versions, scenes, intent, match, teach, research and the explainers; one corrective retry, then a failure; the JSON schema goes with Cheaper Inference requests as a full union of card shapes.

**Writers, blind**
- Learned: DeepSeek V4.1 Flash wrote chapters 1 and 2 for ₹13 against Claude's ₹74, but planned 3 chapters where Claude planned 7, and its own fact check found 0 errors where the judge found several. Gemini 3.8 Flash end to end: ₹10 for research, plan and 4 chapters; judge 5 to 8 of 12 against Opus's usual 9. The neutral judge's verdict on A vs B is still open.

**Navigation**
- Thought: the ☰ menu was enough to get around.
- Learned: a visitor who finished a chapter could not find other topics (logo → Your handbooks → Start another → logo), reported by a reader who could have paid. The code read had rated it P2.
- Now: The Shelf (books on planks, one shelf per kind) is a header button on every screen; Start another starts empty with a back link; returning readers land on Your handbooks, not inside a chapter; sign-in copy says it is optional for the first 3 chapters.

**UX review method**
- Learned: a full-page screenshot draws the sticky action bar at the viewport's bottom edge over whatever scrolled there; 3 of 51 findings were withdrawn after a viewport check. A headless walk plus a code read found 51 items in an hour; 29 fixed the same day.
- Learned: a running A/B test outlived the frozen list that was meant to protect the topic. Gate at the moment of assignment, not only at creation.

**Small build traps**
- Learned: a raw line break inside a JavaScript string in prompts.ts broke the build twice today; prompt edits need `\n`. A Convex query cannot live in a "use node" file.

**The design pass (print shop)**
- Thought: "vastly improve the UI" meant a new look. Learned: the identity was already there (the poster, the books, the frames); the inside just didn't use it. Bringing one language inside took about 90 minutes of CSS and three JSX lines, not a redesign. Now: when a screen looks generic, ask which existing world it should belong to before inventing one.
- Learned: a highlight colour has to be chosen per background. The same 55% marigold wash read fine on ink and turned brown on indigo; a solid second ink with its own text colour per frame fixed all six at once.
- Learned: show the direction as the same screen drawn three ways and ask once; Prateek answered in under a minute. A written list of options would have taken longer to read than the pass took to build.
- Learned: three sessions on one working tree means a deploy ships whatever is on disk. Say which files you hold, commit only yours, and hand the deploy to whoever has the riskier change (today the wall), with a "go".

- **The sign-up wall.** Thought: sign-in optional until chapter 4 would show whether readers sign up when they don't have to. Learned: after a full day, 0 sign-ups and 1 reader at chapter 3, so a wall nobody reaches tests nothing. Now: the wall is after chapter 1 (live 20:37), and the first number to read tomorrow is how many of the chapter-1 finishers make an account. Second lesson from the same hour: a server rule written to rescue a post link (first opened chapter free) was reverted in ten minutes because Prateek wants every arrival to meet the same wall; ask before writing an exception for marketing.

- **Two sessions deploying at once took the site down for 12 minutes.** Thought: one session doing a clean-worktree function deploy while another runs npm run deploy from the shared tree is safe because pushes are atomic. Learned: the static-hosting component is not atomic with the function push; overlapping uploads left index rows whose blobs were gone ("Storage error", every page 500, 22:51 to 23:03). Now: one deploy at a time, announced before and after, and the static upload only from the session that owns the build; a readers-see-500 check (curl / and /stats) right after every deploy.
- **Cheaper writer, more fixes.** Thought: Gemini Flash chapters at ₹0.70 would need the same light fact check as Opus. Learned: on the first Flash chapter the check made 7 fixes (Opus chapters needed 0 to 3), so the check is now carrying more of the quality and costs ₹3.49 of the ₹7.23 handbook. Now: before 20 readers pass a Flash chapter, measure false and misleading claims the 6 Oct way (docs/measure) and compare with the Opus numbers; the switch back is one constant.

**The night pass (8 to 9 Oct)**
- Learned: a two-reviewer critique (design review in one head, detector and measurements in another) found the same two P0s independently, and each found things the other could not: the detector the contrast and 44 px numbers, the reviewer the order of the Done screen and the missing anchor on sign-in. Worth the two agents.
- Learned: three sessions deploying from one working tree can ship each other's half-edited files; a push that fails mid-upload leaves the static site serving index rows whose files never landed ("Storage error"). Now: announce every deploy, commit only your own files, and when the tree is mid-edit upload the static site from a clean worktree or with `npx vite build` only.
- Learned: a "fresh phone" proof script (scripts/prove-path.mjs) catches more than screenshots do: it caught the doubled wall button, the chapter-2 link, and my own stale assertion. Run it after every deploy; 40 s.
- Thought: the splash between a tap and the chapter was unavoidable. Learned: it was two renders (the query reload and the plan before chapter 1's cards). Keeping the Shelf or landing mounted through both, with the tapped book lifted, removed it and made the animation possible.
- Learned: a full-page screenshot lies about lazy images and sticky bars. Check the DOM (img.complete, class lists) before calling something a defect, and look at the chapter's own plate, not the first .story-pic in the document.

### GTM

**One permanent link**
- Thought: each ad can point at its own topic with a deep link in the bio.
- Learned: the bio link can't keep changing; every ad would break the last one.
- Now: www.igetit.now/?utm_source=ig stays in the bio for good.

**Reels**
- Thought: the 84-days reel was done.
- Learned (outside feedback): it looked like two videos stitched together at the cut into the app, and the jargon pile felt like the salary-day reel. The stronger angle is learning in bits from everywhere (saved reels, Watch later, a course at 4%, 47 tabs) with nothing sticking.
- Now: v2 opens on a New Year's resolution, pushes the camera into the laptop so the screen becomes the app, and ends on "still time". Every reel follows the 5-step formula (hook in 0-3 s, one step, rehook, save/share payoff, one CTA; captions on screen 2 s or more).
- Learned: a countdown line ("84 days left") is only true on the day it's made. Date-stamped posts go out the same day or get the number changed.

**Channels**
- Learned: communities beat feeds so far. GrowthX: 47 visitors, 5 finished chapter 1. Instagram: 12 visitors, 2 started, 1 finished (the first reader from a feed).

**Numbers we post**
- Thought: /admin and /stats would tell the same story.
- Learned: same data, different filters. /admin opens on Today and leaves out only phones marked as ours; /stats leaves out direct, LinkedIn and test setups. All time on /admin: 126 / 58 / 14. /stats: 64 / 29 / 7. Say which one a post uses.

**Copy**
- Thought: "Quickly go from 0-1 in any topic via personalised micro learning."
- Learned: startup and industry words ("0-1", "micro learning") aren't our voice. A one-line promise works when it names the reader's own habit: "That thing you keep saving? Get it in 7 nights."

**Build-in-public posts**
- Learned: a numbers-only post talks at people. Asking other builders what got their first 100 users invites replies, and readers' feedback with what we changed is a story in itself.

## Noted during the day
