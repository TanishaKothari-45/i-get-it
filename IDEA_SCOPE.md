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

## 5. Build plan (handbook sections, drafted 3 Oct by Claude from the docs above; Prateek to edit, this is a draft until he says so)

**What v1 does (the golden path, step by step)**
1. Open igetit on a phone. One line says what this is. Type the skill. Tap why (work, own thing, joy, life).
2. In 30 seconds: the day 7, 14, 28 vision for that reason.
3. Do one tiny real task. Get graded. The skill meter ticks (2 of 28).
4. "Want tomorrow's?" Sign in. Pick a routine anchor. Say why in one sentence.
5. Day 1 onward: open today's stack (hook, recall, guess, prose, do, teach-back), tutor on any card, confidence rating on every test, feedback says what you confused.
6. Tomorrow's stack is generated from today's results. A nudge email lands 30 minutes before your usual time.
7. Day 7: the boss task, graded. Share card: "I get it now."

**What v1 does not do (parked)**
Creator features (paste a link, name a creator, creator credits). Days 8 to 28 with real people (they generate, nobody reaches them). Payments (the ₹499 line is copy only). WhatsApp nudges. Cohorts. Leaderboards. Instagram saved-reel import. Hindi. A mobile app. Percentiles before 30 placed learners.

**Cut to v1**
- Must have: first session with no sign-up (topic, why, vision, first task, meter tick), sign-in with anchor and why, a generated day stack with the 5 renderers, tutor sheet on a card, test with confidence rating and specific feedback, progress saved in Convex (meter, streak, results), day 7 boss and share card, one nudge email a day.
- Nice to have: placement staircase and ladder rung, challenge mode, badges, binge guard line, bad-day 3-minute card, freezes and earn-back, 28-day roadmap view, "more / less like this", clip cards from YouTube.
- Not this sprint: everything in the parked list above.

**Milestones ("I can", simplest first, each demoable in 10 seconds)**
1. I can open the live URL on my phone and read one line that says what this is. (done 3 Oct, empty app live)
2. I can type the skill, tap why, and see the 7 / 14 / 28 vision written for that reason.
3. I can do the first task, get graded, and watch the meter tick to 2 of 28.
4. I can close the tab, reopen it, and my first win is still there. (Sunday night target)
5. I can sign in, pick my anchor, say why, and see day 1 waiting.
6. I can swipe through day 1's stack, ask the tutor on a card, and take the closing test with a confidence rating.
7. I can open the app the next day and see a day 2 that changed because of what I got wrong on day 1.
8. I get an email 30 minutes before my usual time with today's session.
9. I can finish day 7's boss task and get a share card.
10. Everything above survives closing and reopening, logged out, on a phone.

**Riskiest assumption**
A stranger who types "build my first AI agent, no code" gets a real first win in under 5 minutes: a tiny task they can actually finish, graded, that feels like doing and not like a demo. If that fails, the whole first session is wrong and nothing downstream matters.

**The 30-minute no-code test (today)**
In a plain Claude or ChatGPT chat: paste the topic and the motivation "get ahead at work", ask for the 7 / 14 / 28 vision and one 5-minute first task with a grading rubric. Hand the phone to two people from the Orbitshift team with a timer. Watch, say nothing. Pass: both finish inside 10 minutes and say some version of "oh, I did that". Fail: either gives up, needs you to explain, or finishes and shrugs. On fail: rewrite the first task shape (section 8 of docs/adaptive-engine.md lists the alternatives) before building milestone 3.

**Primary track**
Decided 3 Oct: pick after Monday's three users have been watched. Virality needs 26+ signups to score at all on its 25x row; Revenue scores from the first signup (20x) and rewards product quality (8x), pain conversations and right to win (the LLM-judge background). Until then, build sign-in and the share card so either track can use them: every sign-up writes a row in Convex (both tracks), and the share card is a personal artifact (Virality) that also carries the day-7 price line (Revenue).
