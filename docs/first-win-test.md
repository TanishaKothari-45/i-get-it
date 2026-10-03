# The 30-minute no-code test (riskiest assumption)

Run before milestone 3 gets built. No code. A phone, a chat window, two people, a timer. Rewritten 3 Oct after the decision that the product guides and tests but never grades the artifact: doing is self-reported, understanding is tested.

**Assumption under test:** a stranger who types their chore in one sentence does one real first step in a tool they already have, ticks done, and can answer two questions about it, all inside 5 minutes, and it feels like doing and not like a demo.

## Step 1: make the first step and its test (5 minutes)

Open a plain Claude or ChatGPT chat and paste this:

```
I'm building a learning app. A user has just typed the chore "I check five competitor sites
every Monday and note what changed" and tapped the reason "get ahead at work". In the next
5 minutes, on their phone, they must do one tiny real step towards an agent that does this
chore, in a free tool they already have or can open without sign-up, then tick "done" and
pass a short test, before any sign-up.

Write:
1. One "first step" they can finish in 5 minutes with only their phone and a browser. Name the
   exact tool and what to type or click. It must make or decide something real, not watch or
   read. Instructions under 60 words.
2. A two-question test on that step: one question that checks they actually did it (an answer
   only someone who did it would know), one that checks they understood why. For each, the one
   line of feedback for a wrong answer that says what they confused, never "incorrect".
3. What the user sees after passing, in one line, as pride ("you just…").

Name only tools and steps you are sure exist. No "you'll learn". Use "you can", "people will".
```

Keep the answer open on your laptop. Don't edit it. The point is to see whether the raw output is already a win.

## Step 2: watch two people (20 minutes, 10 each)

Pick two people from the Orbitshift team who fit (saved reels on agents, built nothing, have a weekly chore). Show them only the step text on your phone. Start a timer. Say nothing. If they ask you something, say "whatever you'd do if I weren't here".

When they say they're done, ask the two test questions out loud and write their answers down word for word. Paste the answers into the same chat and ask it to mark them with the feedback lines.

Write down, word for word:
- where they hesitated or stopped
- what they expected to happen instead
- whether they finished without you saying a word, and the time on the clock
- whether they passed both questions, and whether they agreed with the feedback
- the first thing they said when it ended

## Step 3: decide (5 minutes)

- **Pass:** both finish inside 10 minutes without help, pass both questions, and say some version of "oh, I actually did that". Build milestone 3 as scoped.
- **Fail:** either gives up, needs you to explain, finishes and shrugs, fails the "did you do it" question, or disagrees with the feedback. Don't build. Change the first-step shape first (docs/adaptive-engine.md section 8: make a tiny thing, predict then reveal, say it now, spot the mistake, personal number, reverse the demo) and re-run with one person.

A tick with a failed "did you do it" question is the result to watch for. If both people tick done and fail that question, self-report alone is not enough and the test is doing all the work; the test must then be must-have on every session, not just the closing one.

Write the result under "Riskiest assumption" in IDEA_SCOPE.md either way, with the two times, the two test results and the two quotes.
