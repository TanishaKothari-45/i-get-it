# PLAN.md
Milestones from PRODUCT.md section 7, riskiest first, each demoable in ten seconds. The current one is marked. Updated by the agent after each one works.

Before milestone 1: DESIGN.md (done 4 Oct night, taste choices marked MISSING for Prateek), AGENTS.md (done), the section 6 check (outputs ready, scores pending Prateek).

1. I can type a topic on the live link and read a generated chapter 1 with its first exercise checked on the spot.   DONE for cached topics (live generation waits on API credits)
2. I can see the 7-chapter plan with "by day 7 you'll be able to X" and chapter 1 marked tonight.   DONE
3. I can finish chapter 1: all exercises, a re-teach card on a miss, the rung lit, chapter 2 named.   DONE (checked on dev, 4 Oct 05:05)
4. I can close the tab, reopen it on the same phone, and I'm on the same card, no account.   DONE (checked by reload on dev)
5. I can sign in after the rung, pick when tomorrow is, and my night is attached to me.   DONE (checked on dev)
6. I can come back, answer recall on chapter 1, and get chapter 2.   DONE (checked on dev, chapter 2 passed)
7. I can open it on another device after sign-in and land on the same rung.   DONE (device token removed, sign-in kept, two rungs shown)
Last: I can close it, reopen it, and my plan and my rungs are still there.   DONE on dev; on production only the first screen and the failure path were checked   <- next: a real phone on mobile data

FROZEN 4 Oct 16:50 (Shaktimaan): no new features until one coursemate has used the live link on their phone with no help and we've written down where they stopped. Then Prateek's own phone test.

Acceptance test (not a milestone): a stranger, logged out, on their own phone, gets through night 1 without Prateek saying a word.

Parked (not now), in the order they'd come:
- Memes, AI-generated reels or clips inside a chapter (first user test, 4 Oct). Parked on purpose: the feed is the habit we're firing; the chapter earns attention with prose, examples and the checks instead.
- Regenerate the plan with comments, done chapters kept.
- "Go deeper" on a card, and language change mid-path. ("Say it simpler" shipped 4 Oct afternoon after a user asked for it.)
- Photo-real images per chapter (needs an image provider and credits: Prateek decides). Model-drawn SVG illustrations shipped 4 Oct afternoon instead.
- The tutor chat, scoped to the mission: a two-way "ask or object" on any card, in the handbook's voice. First thing after credits (user feedback 4 Oct: "it has to be a two-way street").
- More voices beyond friend / straight / stories (user feedback 4 Oct asked for many). Add one at a time, each read by Prateek before it ships.
- A second topic, with the three-slot rule and the forfeit.
- "Don't remember" on recall, counted as a miss.
- A reminder at the chosen time (needs an email or push provider: ask Prateek first).
- Share-to-app from Instagram or YouTube; reading a reel or video.
- Days 8 to 28.
- Streaks, badges, share cards, payments, anything social.
