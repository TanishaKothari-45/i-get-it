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
