# IDEA LOCK · Build Sprint

Filled 3 Oct 2026 from IDEA_SCOPE.md and docs/pitch-and-scope.md, reach and trust answered by Prateek the same day. Creator path (paste a link, name a creator, creator credits on the share card) cut the same day; this file overrides IDEA_SCOPE.md and docs/pitch-and-scope.md where they still mention it. Competitor screenshots still to take.

**The idea, in one line:**
I Get It takes one skill from "saved a reel" to "did it" in 7 days, 20 minutes a day, and the next day changes based on what stuck. Sprint topic: build your first AI agent with no code.

**Why me (at least 1 of 3):**
Inside the workflow, on the hard half, for six months not years. Six months building and grading LLM judges at Orbitshift: eval harnesses, 50-sample human review, a pre-registered kill criterion that fired. The grader that decides "you actually did it" is the hard part of this product and the part I've already shipped once. Audience that trusts me: a Product Ops team of 8 and the PMs and engineers who've told me they want to build agents, not just use them. No proprietary data (yet; the skip/miss/time-of-day memory becomes it).

## GOAL

**The one goal they hire it for:** Life. Move a goal they've carried for months. Every v1 feature is judged on "did they reach the day 7 result."

**Delta 4 (today → with my product):**

Today, someone who wants to build an AI agent:
1. Saves a reel about it
2. Forgets it for two weeks
3. Searches YouTube
4. Picks one video out of 40
5. Watches it, does nothing
6. Searches "how to practice"
7. Tries, gets stuck, nobody to ask
8. Asks ChatGPT, pastes context again
9. Loses the thread, no idea what's next
10. Stops

With I Get It:
1. Type the skill, tap why, first real task done in 5 minutes
2. Open today's nudge
3. Do 20 minutes: recall, clip, do, test

Ten steps to three, and a different end state: a working agent on day 7, graded by the tutor, plus a skill meter that only moves on evidence. Not a watched video.

**The sin it rides:** Pride. The day 7 share card and a meter that only moves when you prove it. Secondary: sloth. 20 minutes replaces an hour of scrolling and still feels like progress.

## USER

**The trigger:** "I just saved another reel on this." Or: "I finished the YouTube video and still can't do it." The first session is built for that exact moment: type the skill, do one real thing in five minutes.

**Today's path, step by step:** The ten steps above. Most common path: step 10 straight away, which is not solving it at all. Alternatives people actually use: a Udemy course bought on sale and abandoned at lecture 4, ChatGPT study mode (reactive, forgets you), a paid tutor (scheduled, expensive), or a friend who built one (one WhatsApp message, then nothing).

**Who they trust on this decision:** A colleague who has already built one. Not a creator, not a course review. So the growth loop is the share card going to a colleague, not to a feed: the first five users recruit the next five, and the share card reads "I built this, here's what it does."

**Would they pay? (what exists today that people pay for):** Yes, this is a paid category. Udemy, Maven cohorts, Skool communities, Duolingo Super, private tutors. Grasp (closest shape) charges $6 a month. Price test on day 7: "keep going to day 28 for ₹499 a month." Zero of five clicking means the pain is not big enough.

## PRODUCT

**Onboarding (first-time user feels value fastest):** No sign-up. Type the topic, tap why you want it (work, own thing, joy, life). Within 30 seconds see the day 7, 14, 28 vision written for that reason. Do one tiny real task (describe a boring job in one sentence, the tutor turns it into a one-step automation you run right there). Minute 5: the skill meter ticks. Then a 90-second placement staircase puts you on a rung ("You're already a Tinkerer"). Only then: sign in, pick a routine anchor, say why in one sentence.

**The core loop (user stories, written by me):**
- As a learner who forgets things in a day, I want each session to open with three questions from yesterday before anything new, so that what I learned sticks instead of fading.
- As someone who gets stuck and quits, I want a tutor that only talks about today's step, has the clip's transcript, and tells me what I confused when I get a test wrong, so that I get unstuck in a minute instead of leaving.
- As someone who has watched ten videos on AI agents and built nothing, I want to see in the first 30 seconds what I'll be doing on day 7, 14 and 28, so that I know this ends with me doing something and not with more videos.
- As someone burned by sign-up walls, I want to do something real in five minutes before anyone asks for my email, so that I know it's worth coming back for.
- As someone who finally built an agent, I want a share card showing what it does, so that I can post it and day 8 is already waiting.

Shape of a session: a 10 to 12 card swipeable stack (hook, recall, story, clip, guess-first, prose, do, teach-back), tutor summonable on any card, confidence rating on every test, close with a test. At least half the cards demand something back.

**Coming back:** One nudge a day at last session's start time minus 30 minutes. Day-based streak with two auto-applied freezes and a 48-hour earn-back. Missed a day: "fresh start, here's a 5-minute catch-up," never guilt, never a visible zero. Spacing reviews by the clock, so bingers still get them. Boss days at 7, 14, 21, 28 unlock by passing tests, not by calendar.

**The AI-first part:** The core loop. Tomorrow's session is generated tonight from what you recalled, skipped and got wrong today. Three Claude calls: roadmap once per topic, day stack each night, grader on every test and boss. Each card type is a bandit arm whose reward is whether the concept was recalled a day later, not whether it was swiped. ChatGPT can teach; it cannot remember your misses and show up unasked.

## MARKET

**Tailwinds:**
- Money is going in at exactly this stage. In 2026 AI-in-education funding, seed and Series A are 25 of 32 deals and $161M. AI tutor platforms are the busiest category at 11 rounds. Gizmo (adaptive difficulty, "keep learners in flow") raised a $22M Series A in May 2026. Wild Zebra $6M seed, Vimi $12M seed. (Source: newmarketpitch funding analysis, GeekWire, angelinvestorsnetwork.)
- Grasp (London, €3.6M seed from Balderton, Aug 2023) proved investors fund "AI builds you a path for any topic." Three years on, no public user numbers, which says the curriculum generator alone is not the product. The loop is.
- Behaviour is trained. ChatGPT study mode, Pulse and Google's Learn Your Way have taught people to expect AI that teaches and shows up unasked. 85 to 92% of college students use AI for study (BestColleges 2026).
- Short-form made "I saved it to learn later" a universal habit with no follow-through tool.

**Competitors (and the flows I liked):**
- Saved reels folder and YouTube watch-later. Free, zero follow-through. The save flow is the moment we intercept.
- Grasp (grasp.study). $6 a month, 12 hour-long self-study lessons from curated articles and videos, AI mentor chat, syllabus adjusts to feedback. No daily session, no spaced recall, no nudge. Flow to steal: the path builder. Screenshot: [not taken yet]
- ChatGPT study mode. Reactive, no memory of your misses. Flow to steal: the Socratic quiz turn. Screenshot: [not taken yet]
- Duolingo. The bar for habit mechanics. Flows to steal: streak freeze, lesson-complete screen, earn-back. Never "make it like Duolingo." Screenshot: [not taken yet]
- Instagram Reels / TikTok. The feel. Flows to steal: vertical swipe card transition and the comment sheet, which becomes the tutor sheet. Screenshot: [not taken yet]
- Maven / Skool / Kajabi creator courses. Same lesson for everyone. Flow to steal: the landing-page hook. Screenshot: [not taken yet]
- A paid tutor. Personal, scheduled, expensive.
- Nothing. The most common one.

**Size and fit (people in my extended network who fit):**
Fit test: saved 50+ educational reels or follows 5+ creators who teach, started the thing at least once and stopped, would say "I keep meaning to learn X" unprompted.
- Orbitshift Product Ops team of 8, plus PMs and engineers who've said they want to build agents: 5
- PMs and operators from this year's interview loops: 2
- LinkedIn connections who are PMs posting about AI tools: 2
- Groups where "I want to build an agent" comes up, where posting is allowed and people know me: none
- Total: 9. Five through the first session by Sunday comes from Orbitshift alone; the other four are margin for no-shows.

---

Shaktimaan, this is what I have thought about user, product and market. Lock it in.
