# Product

<!-- impeccable:product-schema 1 -->

Written 3 Oct 2026 from IDEA_SCOPE.md, docs/pitch-and-scope.md, docs/adaptive-engine.md and docs/idea-lock.md. Where those files disagree, idea-lock.md wins (it cut the creator path), then adaptive-engine.md. Facts below come from those files unless marked "inferred".

## Platform

web

## Stack

Vite + React + TypeScript for the frontend. Convex for everything else: database, backend functions, sign-in (Convex Auth) and hosting (Convex static hosting, `npm run deploy`, live at the `.convex.site` address). Claude for the tutor, roadmap, daily card stack and grader. Fixed by the owner; no other host, database or auth service, ever.

Mobile-first web app. Inferred from the brief: the session is a vertical swipe card stack modelled on Reels, the nudge lands on a phone, and the use scene is evenings. Desktop must still work (first sessions this week happen at an office).

## Users

People who have saved 50+ educational reels or follow 5+ creators who teach, have started the thing at least once and stopped, and would say "I keep meaning to learn X" without prompting. The trigger moment: "I just saved another reel on this" or "I finished the video and still can't do it."

Sprint cohort (this week): five PMs and engineers from the owner's Product Ops team at Orbitshift who have said they want to build AI agents, not just use them. Nine people total in reach. First session happens at work or in the evening, on a phone, with the owner nearby.

Not the user: anyone who needs a credential, students in a formal course, anyone who wants to browse rather than finish.

## Product Purpose

I Get It takes one skill from "saved a reel" to "did it" in 7 days, 20 minutes a day, and tomorrow's session changes based on what stuck today. One topic this sprint: build your first AI agent with no code.

The goal it serves: move a life goal the person has carried for months. Every feature is judged on "did they reach the day 7 result": a thing built, performed or judged, graded by the tutor, shown on a share card.

Success: 30% of people who reach the first win complete day 7. First win in under 5 minutes. At least half of first-session visitors sign in after the win. Day 2 done within 24 hours of day 1. North star to instrument: CURR (active today and at least once in the last 6 days).

Kill triggers: fewer than 2 of 5 visitors reach the first win, or fewer than half of those sign in.

## Positioning

The loop, not the content. A course teaches everyone the same way; ChatGPT can teach but forgets your misses and waits to be asked. I Get It remembers what you recalled, skipped and got wrong, generates tomorrow's 20 minutes from it tonight, and shows up at your time without being asked. The skill meter and the ladder rung move only on tested evidence, never on watching. Closest product shape (Grasp, grasp.study) has a curriculum generator and a mentor chat but no daily session, no spaced recall, no nudge.

## Operating Context

- First session, no sign-up: type the topic, tap why (four motivations: get ahead at work, build something of my own, for the joy of it, run my life better; skippable, defaults to joy), see the day 7 / 14 / 28 vision written for that reason within 30 seconds, do one tiny real task, meter ticks at minute 5. Then a 90-second placement staircase (3 to 5 questions, each harder, stop at first miss) puts you on a rung of a five-rung ladder. Agents ladder: Tourist, Tinkerer, Builder, Operator, Architect. Only then: sign in, pick a routine anchor ("after coffee / commute / lunch"), say why in one sentence.
- Daily session: a nudge at last session's start time minus 30 minutes. A 10 to 12 card vertical swipe stack, about 20 minutes. Opens with a hook, then up to 3 recall cards from earlier days, then the mix, closes with a test. A tutor can be summoned on any card as a bottom sheet (the comment-sheet gesture from Reels). Every test asks a confidence rating before the answer. Feedback says what you confused it with, never "incorrect".
- Card types (10) and renderers (5): text (hook, story, prose, funny), video (clip, 60 seconds max, credited), question (guess-first, recall), task (do, boss), free text (teach-back).
- Boss days 7, 14, 21 (mini), 28: do the thing, three attempts (hint after 1, half example after 2), share card, meter moves a band. Unlock by passing tests, not by calendar.
- Binge mode always allowed. After three sessions in a row, one line: "you'll remember more if you stop here", with a "keep going" button. No lock.
- Missed day: "fresh start, here's a 5-minute catch-up." Bad-day card: a 3-minute version, copy "Short day. Still counts."
- 28-day roadmap view; days generate one at a time the night before.
- Price test on day 7 (copy only this sprint): "keep going to day 28 for ₹499 a month."

## Capabilities and Constraints

- Skill meter starts at 2 of 28, never 0. Days 1 to 14 show "X done"; days 15 to 28 show "Y left". Moves only when a test is passed.
- Streak counts days, not sessions. Two freezes at sign-up, auto-applied, max 2, never purchasable. Earn-back: one completed card within 48 hours. After a true break: "day 1 again, 9 days of skill kept", never a visible zero.
- Badges only for what a test can't see (came back after a miss, boss first try). Max one a day, given after the act, unannounced.
- Challenge mode: opt-in harder test, double meter gain.
- "More like this" / "less like this" on cards; never removes demand cards.
- Difficulty adjusts silently. Never show "easy mode" or a visible downgrade.
- Percentile ("ahead of 62% of people on this path") shown only once 30 people have been placed on the topic. Before that, no number.
- Share card shows the artifact, never a score. Line: "I get it now."
- Juice (animation, sound) only on test passes and boss wins. Plain tick everywhere else.
- Deliberately absent: leaderboards, coins, shops, XP for watching, loot, more than one nudge a day, guilt language, more than two freezes.
- English only this sprint. One topic. Creator features (paste a link, name a creator, creator credits) are cut for the sprint per idea-lock.md.
- Convex Auth for sign-in. Convex scheduled function for the nudge (email first).
- Undecided: email vs WhatsApp for the nudge (email ships for sure). Which creator takes a call after the sprint. Domain igetit.now not yet bought.

## Brand Commitments

- Name: I Get It. Domain (planned): igetit.now. Share-card line: "I get it now."
- Voice: the owner's PM writing style (`Business/AI PM Claude Code/starter-files/templates/writing-style.md` in the vault). Write like you talk. Cut filler. Numbers over adjectives. Active voice. One idea per sentence. Avoid: utilize, leverage, synergy, paradigm, actionable, learnings, circle back, deep dive.
- Fixed copy: button "Commit to my goal" (not "Continue"). "Short day. Still counts." "Fresh start." "You're already a Tinkerer. Most people start as Tourists." Vision copy always "you can", "people will", "while you", never "you'll learn".
- The vision writes to pride (day 7), vanity (day 14), status and sloth (day 28), aimed at the chosen motivation.
- Reference flows to borrow as specific components, never as a whole: Reels vertical swipe and comment sheet (tutor sheet), Duolingo streak freeze / lesson-complete / earn-back, ChatGPT study mode's Socratic turn, Grasp's path builder. Never "make it like Duolingo".
- No logo, mark or colour exists yet.

## Evidence on Hand

- Full vision copy for the agents topic across all four motivations, and for art history as the generalisation example: docs/pitch-and-scope.md.
- Engine rules, card skeleton, difficulty bands, spacing, streak and nudge rules with sources: docs/adaptive-engine.md.
- Reach: 9 named people, 5 committed from Orbitshift: docs/idea-lock.md.
- Absent, must not be fabricated: real users, testimonials, completion numbers, percentiles, creator partnerships, pricing beyond the stated day 7 test copy, competitor screenshots (not taken yet).

## Product Principles

1. The result, not the content. Every screen points at the day 7 thing you'll be able to do. Watching earns nothing.
2. Progress is evidence. Meter, rung and badges move only on passed tests. Nothing is invented, no fake numbers.
3. Proactive beats reactive. The product opens the conversation; the learner never starts from a blank box.
4. Demand over passive. At least half of every session asks something back.
5. Mercy, not guilt. Fresh starts, freezes, earn-back, never a visible zero, no guilt language anywhere.

## Accessibility & Inclusion

No product-specific standard established. Baseline: mobile web first, touch targets and keyboard focus visible, reduced motion respected, English only this sprint (Hindi next).
