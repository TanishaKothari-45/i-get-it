# I Get It: the adaptive engine, v1 and the upgrade ladder

Created 3 Oct 2026 from five parallel research passes (learning science, motivation psychology, game design, recommender design, curriculum design). Each number below has a source in the section at the end. Starting values marked "untested" are ours, not the literature's.

This is the moat: a swipe feed that optimises for whether the skill sticks, not for attention. Per user it works from session 3. Across users it compounds.

## The one-line engine

Each card type is a slot machine arm. The reward is not a tap or a swipe. It is whether the learner correctly recalled, a day or more later, the concept that card taught. A fixed skeleton guarantees demand cards. Thompson sampling fills the flexible slots. SM-2 schedules reviews. Stated preference is a weak prior that fades after about four real observations.

## V1: what we build this week

### 1. Session skeleton (fixed, never traded away)

- 10 to 12 cards, about 20 minutes. Open with a hook, close with a test.
- Skeleton: hook, then up to 3 recall cards for concepts due today, then one teach-back (or boss on 7, 14, 21, 28). The rest are flexible slots, about 5 or 6.
- Floors and caps: demand cards (recall, guess-first, do, teach-back, boss) at least 4 and at least half the stack. Passive cards (prose, story, clip) at most 4. Funny at most 1, and it must carry content (a wrong answer from the internet, not a decorative meme). No card type more than 3 times. Never the same type twice in a row.
- Guess-first always comes before the prose card on the same concept. Wrong guesses are fine because every demand card gets immediate, specific feedback.
- After a prose card, one "why does this work?" card.
- Clips: 60 seconds max, narration plus visual, no verbatim on-screen text. Credited with title, channel and link.
- New skills: full worked example first, then fade from the end (learner does the last step, then the last two, then all of it).
- Card text under 60 words. One idea per card.

### 2. Difficulty: the 85% rule

- Target 80 to 90% success on demand cards. Rolling accuracy over the last 10 demand cards. Above 90%: level up, pull older or harder items. Below 75%: level down, insert a worked example or hint.
- Adjust silently. Never show "easy mode." A visible downgrade feels like a demotion.
- A concept failing 5 times in a row gets a different card type (story, do) or is dropped for now. More of the same doesn't work.
- Boss days: three attempts. Hint after attempt 1, half worked example after attempt 2. If first-attempt pass rate on a boss falls below 50%, the boss is a wall, not a lesson.

### 3. Spacing and review (by the clock, not by session)

- First review the next day, then roughly every 5 to 6 days, equal gaps. Not doubling intervals. For a 28-day horizon, optimal gap is 10 to 20% of the retention interval.
- A concept counts as learned after one correct recall in each of 3 separate later sessions. Not 3 recalls in one session. By week 2 about 40% of cards are reviews.
- From week 2, no two consecutive practice cards use the same skill (interleaving).
- Binge is allowed. Cap in-session repeats at the first correct recall. The 3 spaced relearn sessions are auto-scheduled afterwards. That recovers most of the loss.
- SM-2 per concept with an ease floor of 1.3 so nothing gets reviewed forever.

### 4. The bandit (which flexible cards to show)

- Per user, per card type: two integers, alpha and beta (a Beta distribution). Ten rows.
- Priors from population base rates: recall and guess-first 0.65, teach-back and do 0.60, boss 0.55, story, prose, clip, hook 0.50, funny 0.40. Prior strength 4, so it's half gone after 4 observations, a quarter after 12.
- Stated preference ("I learn by reading / watching / doing") adds 2 to the alpha of the matching type. That's all. Matching content to stated learning style has an effect size near zero in the research, so it earns a nudge, not a rule.
- Choosing a flexible slot: if any type has fewer than 3 observations or hasn't been seen in 3 sessions, show it (forced exploration). Otherwise sample from each Beta and take the best. One slot per session is random regardless (a 20% exploration floor, untested value; TikTok explores far more).
- Reward is delayed: when a recall or teach-back on a concept succeeds a day or more after it was taught, every card type that taught it gets alpha plus 1. On failure, beta plus 1. Nothing is rewarded for being watched or swiped.
- "More like this" adds 0.5 to alpha. "Less like this" adds 1 to beta (negative weighted heavier, as Instagram does). Two "less" taps on a type within 3 sessions excludes it for 2 sessions, then it re-enters as exploration. Taps never override the demand floor.

### 5. First session, placement and the expertise ladder

- Session 1 is the five-minute first win, before sign-up: hook, one clip or story, guess-first, prose, do, recall. Six cards. The remaining card types get their first showing in session 2, so every type has been seen once by the end of session 2.
- Placement comes right after the first win, inside session 1: a staircase of 3 to 5 questions, each harder than the last, stop at the first miss. About 90 seconds. It sets the rung on the ladder and the starting difficulty level (1 to 3).
- The ladder: every topic gets five named rungs, generated with the roadmap (Call A). Agents: Tourist, Tinkerer, Builder, Operator, Architect. Art history: Visitor, Spotter, Guide, Critic, Curator. The day 7, 14 and 28 results sit on the rungs, so the vision and the ladder are one picture.
- The placement result is shown as pride, and it's true from day one: "You're already a Tinkerer. Most people start as Tourists."
- Percentile is shown only once a topic has 30 or more placed learners: "Ahead of 62% of people who started this path." Before that, no number. An invented percentile is a fabricated claim.
- The rung moves on tested evidence only, like the meter. A rung change is a share-card moment.
- Session 2: the card types not yet seen, plus 2 recall cards on session 1 concepts. These create the first delayed rewards.
- Thompson sampling starts at session 3 with real counts.

### 6. The path (three Claude calls, not one)

- Call A, roadmap, once per topic: classify the topic as maker, knowledge or performance. Write the day 28 result first using GRASPS (goal, role, audience, situation, product, standards). Day 14 and day 7 are strict subsets of it. List 3 to 5 threshold concepts, each crossed before its boss day. Map 4 weeks, each on the activate, demonstrate, apply, integrate cycle. Bloom verb floor rises weekly: apply, analyse, evaluate, create. Output one demand task per day: "Today you will [verb] [object] so that [result]." Rubrics for boss days are written here, not at grading time.
- Call B, the day's card stack, one per day, after the previous day's result: takes the roadmap, the slot, the last 3 days' grades, and the learner's own artifact so far. Every fact card carries a source URL or a "common knowledge" tag. No source, no card. If yesterday's grade was below the bar, today re-teaches that threshold concept in a new context before moving on. The demand task is never skipped.
- Call C, grading: rubric with 3 or 4 criteria, 3 levels each, frozen at roadmap time. Returns a score, one strength, one fix, pass or fail on the threshold concept. Compute answers with tools where possible; never grade arithmetic by vibes.
- Automated QC on every generated day, pass or fail: one demand task with a verb at or above yesterday's; every claim sourced or tagged; minutes sum to 15 to 22; task is gradeable; no term before its threshold day; example names a real thing; card text under 60 words.

### 7. Result templates (so any topic has a gradeable day 7, 14, 28)

- Maker (agents, cooking): day 7 one working thing with one input and one output, graded by 3 test inputs. Day 14 handles 3 cases and one failure gracefully, 5 inputs including 2 edge cases. Day 28 finished build plus 2-minute demo recording and a written "how it works."
- Knowledge (art history, finance): day 7 a 150-word "explain to a friend" answer with 3 sourced facts. Day 14 a judgement with evidence, compare two things and pick one, 300 words. Day 28 a product for an audience (5-slide gallery talk, 1-page finance plan with real numbers) plus a 5-question oral quiz where the tutor asks "why" twice.
- Performance (public speaking, a language, guitar): CEFR-style can-do statements as the bar. Day 7 a 60-second recorded performance. Day 14 2 to 3 minutes with one unscripted element. Day 28 a performance for a real person, with one line from the audience.

### 8. First-win shapes (pick per topic type)

Make a tiny thing. Predict then reveal. Say it now. Spot the mistake. Personal number (enter your rent and income, get one real insight). Reverse the demo (judge a past learner's day 28 work). The common thread: the learner makes or decides something and gets graded on the first screen.

### 9. Motivation and return

- First session asks "why" (one of four motivations plus one free-text sentence) and "when" as a routine anchor, not a clock: "after coffee / commute / lunch." The why is shown back on day 1 and every boss day.
- Nudge at last session's start time minus 30 minutes, with an override. User-chosen fixed times fail because life gets in the way.
- One nudge a day. One extra "last chance" at 22:00 only on streak-risk days. Stop after 7 missed days; re-engage via the why, never the streak.
- Two streak freezes at sign-up, hold max 2, auto-applied, never purchasable. Earn-back: one completed card within 48 hours restores a broken streak. After a true break show "day 1 again, 9 days of skill kept," never a zero. The skill meter is untouched by breaks.
- Bad-day card: a 3-minute "keep the thread" version. Copy: "Short day. Still counts." No guilt language anywhere.
- Meter starts at 2 of 28 filled (picked a skill, did the first session), never 0. Days 1 to 14 show "X done." Days 15 to 28 show "Y left."
- Button copy: "Commit to my goal," not "Continue."
- Badges: only for behaviours a test can't see (came back after a miss, passed a boss first try). Max one a day. Given after the act, unannounced. Expected rewards for finishing cards undermine motivation.
- Juice (animation, sound) only on test passes and boss wins. Plain tick everywhere else.
- Share card shows the artifact, never a score.
- Mini-boss at day 21. Engagement with gamified products dips around week 4, so day 28 sits in the trough without it.
- North star to instrument from day one: CURR, active today and at least once in the last 6 days.

## Upgrade ladder (in order, with what each needs)

1. FSRS in place of SM-2. Three numbers per concept, 20 to 30% fewer reviews at the same retention. Needs nothing, just time to build. Don't fit per user before about 1,000 reviews.
2. Teach-back quality as a continuous reward (0 to 1 from the rubric) instead of pass or fail. Needs rubric consistency checks.
3. Day-7 opt-in streak wager (free, no currency): "commit to 7 more days," offered only on the boss screen. Duolingo reports a 14% day-7 retention lift.
4. Delayed judgements of learning: before a spaced test, ask the learner to predict their recall, then show the gap. Attacks the fluency illusion directly.
5. Population priors learned across users, per topic. Needs about 30 users per topic.
6. Contextual arms (card type by difficulty by topic). Needs about 50 observations per cell.
7. Temptation bundling: pair the session with a playlist or podcast the user picks. Field evidence of 10 to 14% more sessions.
8. Cohort of 5 to 10 who started the same day, shown only as "3 of your cohort passed day 7." Relatedness without leaderboards.
9. Grader-of-the-grader: a second model checks boss-day grades. Needed before any public claim about accuracy.
10. Half-life regression per user for forgetting rate. Needs months of recall logs.

## Things we will not do, because the research says no

- Route content by stated learning style. Preference exists, matching doesn't help. Multimodal for everyone, preference as a nudge.
- Reward anything on "did that feel easy?" Learners rate cramming higher while spacing beats it for 85% of them.
- Points or XP for completing cards. A semester-long study found it lowered motivation and exam scores.
- Random loot or chests. It rewards opening, not learning.
- Three or more freezes, or unlimited pause. Trains absence.
- More than one nudge a day, or any nudge that references guilt.
- Leaderboards by default. Opt-in at most, and never for "joy" or "run my life" motivations.
- A visible zero after a break.
- Doubling spacing intervals (1, 2, 4, 8). Equal intervals matched or beat them.
- Let "less like this" remove demand cards.

## What this changes in the scope doc

- Streaks: two freezes at sign-up, auto-applied, earn-back within 48 hours (was one freeze a week).
- Nudge: last session time minus 30 minutes with override (was user-picked slot). Stop after 7 misses.
- Spacing: next day, then every 5 to 6 days, equal gaps (was 1, 3, 6 days).
- Demand cards: at least 4 and at least half the stack (was at least 3).
- Funny card must carry content.
- Mini-boss at day 21.
- Placement: a 3 to 5 question staircase right after the five-minute first win, setting a rung on a five-rung ladder per topic. Percentile only after 30 placed learners per topic.
- Meter starts at 2 of 28. Progress framing flips at day 14.
- The path is three Claude calls with QC, not one.
- Creator input: after the first win, "paste a YouTube link" and "name a creator" (one YouTube search call). Instagram links accepted as caption-only hints, said plainly in the UI. Share-sheet and saved-folder import are out.

## Honest gaps

- The 20-minute session has no direct experimental support. The evidence says short, segmented, spaced. 20 minutes is consistent with it, not proven by it.
- The 20% exploration share, prior strength of 4, and the 0.60 / 0.85 staircase bands are starting values, not tested.
- The widely quoted Duolingo figures (streak freeze cut churn 21%, 7-day streak users retain 2.4x) come from secondary blogs. The 14% wager lift and the 2-freeze DAU lift are from Duolingo's own writing.
- Khanmigo has been caught saying "Excellent!" to wrong arithmetic. Our grader must compute, not judge by tone.

## Sources

Learning science: Rowland 2014 testing-effect meta-analysis; Wilson et al 2019 (85% rule, Nature Communications); Cepeda et al 2006 and 2008 (spacing); Karpicke and Roediger 2007 (equal vs expanding); Rawson and Dunlosky 2011, 2022 (successive relearning); Rohrer et al 2020 (interleaving RCT); Pan and Sana 2021 (pretesting); Renkl and Atkinson, Salden et al 2010 (worked-example fading); Noetel et al 2022 and Mayer (multimedia); Guo, Kim and Rubin 2014 (6-minute video ceiling); Pashler et al 2008 and the 2024 meta-analysis (learning styles); Kornell and Bjork 2008, Kornell 2009 (fluency illusion); Bjork, Dunlosky and Kornell 2013.

Motivation: Deci, Koestner and Ryan 1999 (rewards meta-analysis); Gollwitzer and Sheeran 2006 (implementation intentions); Nunes and Dreze 2006 (endowed progress); Kivetz, Urminsky and Zheng 2006 (goal gradient); Koo and Fishbach (small-area hypothesis); Silverman and Barasch 2022 (broken streaks); Dai, Milkman and Riis 2014 (fresh start); Kirgios et al 2020 (temptation bundling); Morrison et al 2017 (notification timing RCT); Yeager et al 2014 (purpose for learning); Duolingo blog and Jackson Shuttleworth on Lenny's Podcast and Sub Club (streaks, freezes, earn-back, 23.5-hour nudge, reactivation window); Mazal on Lenny's Newsletter (CURR).

Game design: Hunicke 2005 (dynamic difficulty); Koster, A Theory of Fun; Sailer et al 2017 and Sailer and Homner 2020 (gamification elements vs needs); Hamari, Koivisto and Sarsa 2014; Hanus and Fox 2015 (points lowered motivation and grades); Rodrigues et al 2022 (week-4 novelty dip); Jonasson and Purho, Juice It or Lose It; Zagal et al 2013 (dark patterns); Yu-kai Chou (white hat vs black hat, boss fights); Super Mario 1-1 and Portal developer commentary (onboarding by obstacle).

Recommender: Meta Engineering 2023, Scaling Instagram Explore; Vombatkere et al 2024 (TikTok exploration audit); Covington et al 2016 (YouTube); Russo et al, Tutorial on Thompson Sampling; Chapelle and Li (Thompson vs others); Settles and Meeder 2016 (Duolingo half-life regression); Duolingo Birdbrain; SM-2 and FSRS documentation; Jiang et al 2019 (degenerate feedback loops); wheel-spinning in tutoring systems.

Curriculum: Wiggins and McTighe (Understanding by Design, GRASPS); Merrill, First Principles of Instruction; revised Bloom; Meyer and Land (threshold concepts); CEFR can-do statements; Duolingo, Brilliant and Codecademy onboarding teardowns; Google Learn Your Way paper and its criticism; Khanmigo error and engagement reports; Dean of LLM Tutors (grader of the grader); RAG lesson-planning study (Uganda); YouTube transcript and fair-use guidance.

Full URL list is in the five research outputs; ask and I'll append them.
