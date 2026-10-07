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
Last: I can close it, reopen it, and my plan and my rungs are still there.   DONE on dev; production checked by Prateek on his own phone, logged out, on mobile data (4 Oct evening, chess basics: found the missing picture and false facts, fixed by the live fact check)

FROZEN 4 Oct 16:50 (Shaktimaan): no new features until one coursemate has used the live link on their phone with no help and we've written down where they stopped. Then Prateek's own phone test.

Next builds, decided by Prateek 5 Oct evening (in this order unless he reorders):
1. First-screen copy batch: headline "Seven nights from 'I keep meaning to' to 'I get it'.", the line under it "Twenty minutes a day: a small step. 7 days: a small jump. 28 days: a big leap.", the button (open question). Done screen: "Next: Chapter N" and a main "Start chapter N now" button instead of "Tomorrow" (bingeing is fine: Prateek).
2. DONE 6 Oct (live topics; ready topics don't adapt). Adaptive chapters, one at a time, roadmap titles unchanged: chapter N+1 is written knowing how chapter N went. Missed quizzes are re-taught another way first; all right on the first try and fast means harder quizzes (more apply-to-a-tricky-case, a harder third question), progressively. Writing starts when the reader answers chapter N's last quiz, so the closing card and the Done screen hide most of the wait (Prateek: readers may wait a little for personalisation; keep latency in check).
1b. Done screen love: a cheesy, funny line that compares the reader's time and first-try score with our own 20-minute budget ("6 minutes. We budgeted 20. Show-off."), never with an invented average; real comparisons ("faster than 7 in 10 readers") once 50 chapters are finished. Lines are (agent) until Prateek rewrites them.
6. Placement before chapter 1: 10 questions, each harder, with "I'm completely new, skip this"; the plan starts where the reader is (Prateek). Measured 5 Oct: chapters take about 4 to 16 minutes, and 16 of 18 quizzes were right first try.
3. DONE 6 Oct. Chapters slide up like Reels (DESIGN.md section 2), instead of sideways.
4. PAUSED 6 Oct (Shaktimaan: nothing new until the coursemate test; the promise is off the page). Days 8 to 28, live before 12 Oct (the first day 8 for anyone who starts on 5 Oct). Generated once a reader finishes chapter 7. Day 8 is also where week 1's free time ends, so it's where the Pay sheet belongs. About ₹15 a chapter.
5. Rewrite Prateek's live options chapter 1 with the beginner check (later).

7. Exact pictures for exact things (Prateek, 6 Oct: chess, options trading need boards, graphs and tables): the chapter names what to show as data (a board position, a payoff line from strike and premium, a small table) and the app draws it, correct every time and ours. Runway keeps the scenes. Web-found images only from Wikimedia Commons with their licence shown, never general web search (copyright, and they won't match the numbers in the text).
8. Model table (Prateek, 6 Oct): plan on Opus 5.5 max, chapter on Opus 5.5 medium, fact check on Opus 5.5 max, Say it simpler on Sonnet 5.5 max, Ask unchanged. Quality first; cost and wait to be handled later with prices or limits. Measure time to chapter 1 and cost per chapter right after switching.

9. DONE 6 Oct. Teach it back, optional (Prateek, 6 Oct, from Karpathy's note on learning: "Teach/summarize everything you learn in your own words"): on the Done screen, the reader may explain the chapter's idea in 2 sentences; a short reply says what they got, the one piece missed, and a tip. Never required, never holds the rung. Sonnet 5.5 low, capped per person and per hour.

Acceptance test (not a milestone): a stranger, logged out, on their own phone, gets through night 1 without Prateek saying a word.

Order from 6 Oct evening (Prateek, from /admin data: 27 started, 5 passed chapter 1; Shaktimaan: fix the leak inside chapter 1 first):
1. DONE 6 Oct. Per-person journeys on /admin: device, time spent, every step, probable reason they stopped. Optional "How was chapter N?" on Done.
2. Understand intent: after a typed topic, 3 tappable goals ("What's it for?") set the handbook's mode: skill (a real win in the first 5 cards, practice early), story (Avengers, Odyssey, K-pop: no exam quizzes, playful guesses, who's-who, watch order), subject (as now), money/health/legal (caution line).
3. An exquisite chapter 1: a card-by-card "would a busy 30-year-old keep swiping?" pass that rewrites weak cards; then every ready topic's chapter 1 (Avengers, Git first).
4. Shared library: every safe new handbook (plan + chapter 1) goes on the shelf for others; Explore on the homepage; honest badges (🔥 most started this week, ✨ most finished, Pick), never random.
5. Learn from what you saved: paste a reel, link or photo; the handbook is built around it.
6. Installable app and reminders (web push).
7. Real images for real things: Wikimedia Commons with licences shown; official YouTube embeds for films.
8. Self-improving handbooks: when 2+ readers quit a topic early, diagnose and write a better version; A/B on chapter 1 completion in /admin.
9. Indian-language translations.
Days 8 to 28 wait until 20 or more readers have passed chapter 1 (Shaktimaan, 6 Oct).

Parked (not now), in the order they'd come:
- Ideas from Tanisha Kothari's PR #2 (a coursemate; merged on GitHub 5 Oct by mistake, none of its code is in the product). The sprint is solo only, so never copy her code: if one of these ideas is wanted after the coursemate test, rebuild it ourselves. Chapter recap; "go deeper" bonus lessons; an "another way" lesson after a missed exercise; in-app navigation, cache expiry and AI retry.
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
- Streaks, badges, share cards, payments, anything social.
