# IDEA_SCOPE: I Get It

Locked: 2 Oct 2026, named 3 Oct. Domain: igetit.now (not yet bought). Full pitch and pedagogy in docs/pitch-and-scope.md.

## One line

I Get It takes one skill from "saved a reel" to "did it" in 7 days, 20 minutes a day, and the next day changes based on what stuck.

## 1. Goal

**Move a life goal forward.** Learning a skill you've wanted for months. Every v1 feature serves "did they reach the day 7 result."

**Delta 4.** Today, for someone who wants to build an AI agent:
1. Save a reel about it
2. Forget it for two weeks
3. Search YouTube
4. Pick a video out of 40
5. Watch it, do nothing
6. Search "how to practice"
7. Try, get stuck, nobody to ask
8. Ask ChatGPT, paste context again
9. Lose the thread, no idea what's next
10. Stop

With I Get It:
1. Type the skill, tap why, first win in 5 minutes
2. Open today's nudge
3. Do 20 minutes: recall, clip, do, test

Better result, not just fewer steps: a tested skill meter and a result you can show on day 7 (built, performed or judged, graded by the tutor), instead of a watched video.

**Sin:** Pride. The day 7 share card and a skill meter that only moves on evidence. Secondary: sloth, 20 minutes replaces an hour of scrolling and still feels like progress.

## 2. User

Pain, not demographics: has saved 50+ educational reels or follows 5+ creators who teach, has started the thing at least once and stopped, and would say "I keep meaning to learn X" without prompting.

Not the user: people who need a credential, students in a formal course, anyone who wants to browse rather than finish.

**Reach (people I can put through the first session this week):**
- Orbitshift: my Product Ops team of 8, plus PMs and engineers who've told me they want to build agents, not just use them: [YOUR NUMBER]
- PMs and operators from this year's interview loops: [YOUR NUMBER]
- LinkedIn connections who are PMs posting about AI tools: [YOUR NUMBER]
- Groups where "I want to build an agent" comes up, active, posting allowed, people know me: [NAME THEM, with size]
- Total: [YOUR NUMBER]. Five through the first session by Sunday comes from the first two lines.

## 3. Product

**First session (no sign-up):** type the topic, tap why you want it (work, own thing, joy, life), see the 7, 14 and 28 day vision written for that reason in 30 seconds, do one tiny real task, meter ticks at minute 5. A 90-second placement staircase after the win puts you on a rung of the topic's five-rung ladder ("You're already a Tinkerer"). Then sign in, pick a routine anchor, say why, and optionally paste a YouTube link or name a creator you watch. Engine rules in docs/adaptive-engine.md.

**Core loop (daily, or on demand if you want to binge):** nudge arrives at your slot, a 10 to 12 card swipeable stack (recall, story, clip, guess, prose, funny, do, teach-back), tutor on any card, test with confidence rating, results rewrite the next session. Spacing reviews follow the clock, so bingers still get them.

**Third loop (boss days 7, 14, 28):** do the thing, get the share card crediting the creators, meter moves a band. The roadmap is 28 days, each day generated the night before.

**Example user story (AI-written, the one the handbook allows):**
As someone who's saved a dozen reels on building AI agents and never built one, I want a message at 8pm with one 20-minute session that starts with what I learned yesterday and ends with a small test, so that by Sunday I have a working agent and proof I understand it, instead of a folder of saved videos.

**User stories (have Shaktimaan check them):**
- Onboarding: As a PM who has watched ten videos on AI agents and built nothing, I want to see in the first 30 seconds what I'll be doing on day 7, day 14 and day 28, so that I know this ends with me doing something and not with more videos.
- Onboarding: As someone who's been burned by sign-up walls, I want to type what I want to learn and do something real in five minutes before anyone asks for my email, so that I know it's worth coming back for before I commit.
- Core loop: As a learner who forgets things in a day, I want each session to open with three questions from yesterday before anything new, so that what I learned sticks instead of fading.
- Core loop: As someone who gets stuck and quits, I want a tutor that only talks about today's step, has the clip's transcript, and tells me what I confused when I get a test wrong, so that I get unstuck in a minute instead of leaving.
- Core loop: As someone who misses days, I want a message at my slot that says "fresh start, here's a 5-minute catch-up," so that one bad day doesn't end the week.
- Day 7: As someone who finally built an agent, I want a share card showing what it does and which creators taught me, so that I can post it and day 8 is already waiting.

## 4. Market

**Tailwinds**
- ChatGPT study mode, Pulse and Google's Learn Your Way have trained people to expect AI that teaches and shows up unasked.
- Creator economy: creators want products beyond courses and sponsorships, and engagement data they've never had.
- Short-form has made "I saved it to learn later" a universal habit with no follow-through tool.
- Claude and voice models are good enough for a tutor that grades teach-backs, not just multiple choice.

**Real competitors (what the user does today instead)**
- Saved reels folder and YouTube watch-later: free, zero follow-through. Study their save flow.
- Grasp (grasp.study, London, €3.6M seed from Balderton in Aug 2023, 9 people, live): the closest product shape. $6 a month for 12 hour-long self-study lessons curated from articles and videos, with exercises and an AI mentor chat; syllabus adjusts to feedback. No daily sessions, no spaced recall, no adaptive difficulty, no proactive nudge, no creators, no feed. Three years in with no public user numbers, which says a curriculum generator alone isn't enough. Our difference is the loop: 20 minutes, it comes to you, tomorrow changes on what you recalled today. Screenshot their path builder and mentor chat.
- ChatGPT study mode: reactive, no creator content, no memory of skips and misses. Screenshot the quiz flow.
- Duolingo: the gamification bar. Screenshot streak, freeze and lesson-complete screens. Copy specific components, never "make it like Duolingo."
- Instagram Reels and TikTok: the swipe and the feel. Each session is a swipeable card stack. Screenshot the card transitions and the comment sheet (that becomes the tutor sheet).
- Creator courses on Maven, Skool, Kajabi: same lesson for everyone. Screenshot a course landing page for the first-screen hook.
- A paid tutor: personal but expensive and scheduled.
- Nothing: the most common one.

**Size:** the reach count in section 2, not TAM.

## Topic for the sprint

One topic: build your first AI agent with no code. All five users are on it, so the loop gets a clean test. The generator is topic-agnostic by design (one roadmap call, one day call, one grader), so opening topics later is a config change, not a rebuild. No featured list, no "any skill" marketing this week.

**Why 28 days in the roadmap costs nothing this week:** days generate one at a time. The build is seven days of screens plus one boss screen reused. Nobody reaches day 8 before Sunday.

**Why ten card types is five renderers:** text (hook, story, prose, funny), video (clip), question (guess, recall), task (do, boss), free text (teach-back).

## Kill or pivot triggers

- Fewer than 2 of 5 visitors reach the first win, or fewer than half of those sign in: the first session is wrong, fix before building more.
- Nudged users complete at the same rate as cold openers: proactive isn't the edge, rethink.
- Can't find five people to start: pivot, using the same lock steps.

## The four conditions

- **Why you:** six months building and grading LLM judges at Orbitshift (eval harnesses, 50-sample human review, a pre-registered kill criterion that fired). The grader is the hard part of this product and the part already shipped once. One of three, which passes.
- **Trigger:** "I saved another reel on this" or "I finished the YouTube video and still can't do it." The paste-a-link flow is built for that exact moment.
- **Would they pay:** people already pay Udemy, Maven, tutors and Duolingo for this. Price test on day 7: "keep going to day 28 for 499 rupees a month." Zero of five clicking means the pain isn't big enough.
- **Reach:** see section 2.
