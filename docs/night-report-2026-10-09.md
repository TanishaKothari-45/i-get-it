# Night report, 8 to 9 Oct 2026

Read this first. Session dc coordinated the night (D19). Every decision taken in your stead is in docs/decisions.md D18 onward, each with its reasoning; this file says what to check and what waits on you.

## Check on your phone (390 px, logged out, mobile data)

1. /admin opens for you again after signing in with your usual password (D18). If it still says denied, sign in once by email code and tell dc.
2. The path: landing → chapter 1 → Done wall → sign-in. scripts/prove-path.mjs passed on prod at 00:05.

## Numbers (admin:numbers, pulled 00:20 IST)

| Day | Visitors | Started | Passed chapter 1 | Started chapter 2 | Signed up | Tapped Pay |
|---|---|---|---|---|---|---|
| 8 Oct | 88 (78 direct, 5 ig, 2 growthx) | 54 | 15 | 4 | 0 | 0 |
| 9 Oct, first 20 min | 5 | 5 | 1 | | 0 | 0 |

Caution: 78 "direct" visitors on a day with no post out likely includes our own review agents (asked 05 and 55 to confirm whether their runs carried utm_source=internal). Read the sign-up count, not the visitor count. The wall moved to after chapter 1 at 20:37; nobody has signed up since. The wall_tap event (00:15) will show taps against sign-ups from its deploy on.

## Waits on you (in order)

1. Live posts and the X ad still say "First 3 free, no sign-up"; false since 20:37 (D14). a2 lists every place below.
2. Razorpay webhook secret is still unset on prod (RAZORPAY_WEBHOOK_SECRET), so a payment is recorded only if the checkout reply reaches the app. Set it from the Razorpay dashboard: `npx convex env set --prod RAZORPAY_WEBHOOK_SECRET <value>`.
3. D13 opens: blind writer test judge, landing length, pricing columns, button labels (parked to Sunday 12 Oct).

## Session dc (coordinator)

- Admin access restored (D18). Deploy queue and git rule for a shared tree (D19): no pull, no stash, stage own files by name.
- D20: Pricing "Coming next" row becomes "More coming. Members hear first." (55 implements).

## Session 05

Before you write here: add your lessons for 8 Oct to docs/lessons.md (Product/Tech and GTM, thought / learned / now). AGENTS.md section 2, every build day.


(05 writes here: what shipped, the second critique score against 26/40, what to check, what's open.)

## Session 55

(55 writes here: what shipped, the picture shrink and originals delete status, what to check, what's open.)

## Session a2

(a2 writes here: the true facts for the morning posts, every live claim to fix, what's ready, the three decisions waiting on Prateek.)
