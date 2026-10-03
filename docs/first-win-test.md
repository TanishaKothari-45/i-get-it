# The 30-minute no-code test (riskiest assumption)

Run today, 3 Oct, before milestone 3 gets built. No code. A phone, a chat window, two people, a timer.

**Assumption under test:** a stranger who types "build my first AI agent, no code" gets a real first win in under 5 minutes: a tiny task they can actually finish, graded, that feels like doing and not like a demo.

## Step 1: make the first task (5 minutes)

Open a plain Claude or ChatGPT chat and paste this:

```
I'm building a learning app. A user has just typed the skill "build my first AI agent, no code"
and tapped the reason "get ahead at work". In the next 5 minutes, on their phone, they must do
one tiny real task and get graded on it, before any sign-up.

Write:
1. One "first task" they can finish in 5 minutes with only their phone and a browser. It must
   make or decide something real, not watch or read. Keep the instructions under 60 words.
2. The exact grading rubric: 3 criteria, pass or fail each, and the one line of feedback for a fail
   that says what they confused, never "incorrect".
3. What the user sees on the screen after passing, in one line, as pride ("you just…").

Name only tools and steps you are sure exist. No "you'll learn". Use "you can", "people will".
```

Keep the answer open on your laptop. Don't edit it. The point is to see whether the raw output is already a win.

## Step 2: watch two people (20 minutes, 10 each)

Pick two people from the Orbitshift team who fit (saved reels on agents, built nothing). Show them only the task text on your phone. Start a timer. Say nothing. If they ask you something, say "whatever you'd do if I weren't here".

Write down, word for word:
- where they hesitated or stopped
- what they expected to happen instead
- whether they finished without you saying a word, and the time on the clock
- the first thing they said when it ended

Then paste what they produced into the same chat and ask it to grade with the rubric. Read the feedback aloud to them. Note whether they agree with it.

## Step 3: decide (5 minutes)

- **Pass:** both finish inside 10 minutes without help, and say some version of "oh, I actually did that". Build milestone 3 as scoped.
- **Fail:** either gives up, needs you to explain, finishes and shrugs, or disagrees with the grade. Don't build. Change the first-task shape first (docs/adaptive-engine.md section 8: make a tiny thing, predict then reveal, say it now, spot the mistake, personal number, reverse the demo) and re-run with one person.

Write the result under "Riskiest assumption" in IDEA_SCOPE.md either way, with the two times and the two quotes.
