<!-- Source: https://growthx.club/learn/build-sprint#/tech-agent · captured 2026-10-04 from the GrowthX Build Sprint handbook (login-gated). Verbatim text, converted to markdown. Advanced-level blocks included. -->

# Working with your agent

Codex and Claude Code will build almost anything you describe, and tell you it's done before it is. This chapter gives you the loop that catches that, the files that keep your agent's memory outside the chat, and the rules it reads before every task.

> **By the end of this chapter you'll have**
>
> **Your agent's working rules.** One AGENTS.md with your rules (Codex reads it; Claude Code reads it too, through one line in CLAUDE.md if you have one), PLAN.md and PROGRESS.md in your repo, and one loop you follow for every milestone.
>
> Example **AGENTS.md:** “Say back what I'm after and your plan, then wait for my yes. One milestone at a time. Never say done until you've told me how to check it on my phone.” **PLAN.md:** seven milestones, the third one marked “now”. **PROGRESS.md:** “Milestone 2 done: a calorie estimate shows. Decided: round to the nearest 10. Still broken: nothing known.”

The most expensive word your agent says is “done”.

It says it with complete confidence, often before anything works on a phone. Believe it a few times and you'll spend Thursday untangling three days of features built on top of one that never worked.

That's the first thing I want you to learn: never trust AI.

AI isn't AGI (an AI as capable as a person at everything), none of that. It's a machine, and machines have always helped us do things faster. That's all it does. It's a very fast horse, and you should be able to direct it.

## Why “done” isn't done

Your agent writes code the way it writes everything: one likely next word at a time. It's very good at producing what a finished feature looks like. It can't see your phone unless you give it a way to.

And when you give the AI a goal, its understanding of that goal and yours might be slightly different.

So when it checks its own work, it checks against its own understanding, with the same blind spots that wrote the code. The check has to come from somewhere else: from you, on a phone, and from a chat that didn't write it.

> **Remember this**
>
> Your agent builds. You decide what “done” means, and you're the one who sees it work.

## The loop: plan, build one, check, review, save

Every “I can…” milestone in your PRODUCT.md (Cutting to v1 (see ../product-thinking/05-cutting-to-v1.md)) goes round the same five steps.

- **1**: Plan · It says back what you're after and how it will build it. You say yes, or correct it.
- **2**: Build one · Only the next milestone. Build three and you can't tell which one broke.
- **3**: Check · You do the milestone yourself, on your phone. Not its summary: the thing.
- **4**: Review · A separate chat reads the code cold and lists what's wrong.
- **5**: Save · Fix the blockers, commit (save this version) and push (send it to GitHub), and add a line to PROGRESS.md.
- **↻**: Again · Back to step 1 · Each turn starts from what the last one taught you.

*Figure: Five steps for every milestone. The agent does the building; the checking is yours, and that's the whole point.*

**Plan** is the cheapest step to get right. Anthropic's own walkthrough calls approving the plan “the [best place to course correct (opens in a new tab)](https://www.youtube.com/watch?v=xJQuF02NAK8&t=59s) because it's before any code is written”. If PRODUCT.md still has gaps, let the agent interview you first: the grill-me skill from Setup asks one question at a time and won't write code until the plan is clear.

**Build one** means one milestone that works end to end. Left alone, “[AI loves to code horizontally (opens in a new tab)](https://www.youtube.com/watch?v=-QFHIoCo-Ko&t=2573s)”, as the teacher Matt Pocock puts it: all the database, then all the logic, then all the screens, so nothing works until the very end. “I can upload a food photo and see the dish name” cuts through all four parts at once, which is why you can check it the same evening.

**Check** is the step nobody can do for you, but you can make it easier. Ask the agent to give itself a way to see its work, like a screenshot at phone width, and to try again before it reports. Boris Cherny, who leads Claude Code, says that “[if you let it iterate two or three times (opens in a new tab)](https://www.youtube.com/watch?v=6eBSHbLKuN0&t=691s), often it gets it almost perfect”.

One habit keeps the loop clean: **park new ideas.** Every mid-build “also add…” goes in the parked list in PLAN.md, not into the milestone.

**Say this to your agent**

```
Here are PRODUCT.md and PLAN.md. Next is milestone [n]: "I can [...]".
Before you touch anything, tell me in two or three sentences what you think I'm after, then your plan. Ask what's unclear. Wait for my yes.
Build that milestone only. When you're done, tell me what you built, exactly how I check it on my phone, and what you assumed.
```

> **[Advanced]**
>
> ### Advanced Which model plans, and which one builds
>
> Codex and Claude Code both let you choose the model underneath, and the models don't cost the same. The strongest ones think harder; the cheaper ones are faster and cost less per token (the small piece of text a model reads or writes; more on tokens below).
>
> One pattern spends each where it pays. Anthropic's Claude team [describes using a strong model as an “advisor” (opens in a new tab)](https://x.com/ClaudeDevs/status/2074606058128224365): a cheaper model does the work and calls the strong one for guidance, so “most tokens are billed at the lower executor rate”. The developer Peter Steinberger [runs the same idea across tools (opens in a new tab)](https://x.com/steipete/status/2074638582418231495), with Codex as the workhorse.
>
> For a builder that means three moments for the strong model: the plan, a bug the agent has failed to fix twice, and the review of a finished milestone. In between, a cheaper model builds from the plan.
>
> The easy way to do it across tools is through your files. Plan in a chat on the strongest model you have, and have it write the plan into PLAN.md. Build from PLAN.md on the cheaper one. Go back to the strong one when an error repeats, and for the review.
>
> Hear the other side before you adopt it. Boris Cherny's first tip is to use the most capable model, because a less capable one “[actually takes more tokens in the end to do the same task (opens in a new tab)](https://www.youtube.com/watch?v=We7BZVKbCVw&t=4172s)”. Both are true in their place. On a small, clear milestone a cheaper model is quick. On a vague or tangled one it wanders, and you pay twice: once in tokens, once in your evening.
>
> So the lever is clarity, not price. The sharper the plan in PLAN.md, the cheaper the model that can build from it.

## One build chat, and a second chat that only reviews

You'll hear two pieces of advice that sound opposite. One says stay in one chat. The other says review in a fresh one. Both are right, because they're about different jobs.

The building rule first, and it's a human rule. If you haven't built at least five to ten features with a coding agent, don't multitask across chats. It's exhausting, you'll start making mistakes in those chats, and it's very hard to stop them. At most you'll finish three hours later. If you've been coding for a long time, you already have the context-switching muscle, the way a marketer switches across campaigns; everyone else is still building it.

Start a new chat only if this one thing is going to pull in a lot of context, like a lot of your other code, data or research. That is literally the process I follow, and my engineers follow. I built the community feature in one single chat.

Reviewing is a different job. The chat that built a feature has no distance from it, and it will tell you it's fine. Matt Pocock's warning about reviewing inside the same long chat: “[the reviewer will be dumber than the thing that actually implemented it (opens in a new tab)](https://www.youtube.com/watch?v=-QFHIoCo-Ko&t=3965s)”.

So keep one build chat, and open a review chat that only reads. It hands you a list; you paste the list into the build chat. You're still building in one place, which is what the rule protects.

**Say this to your agent**

```
Review this build against PRODUCT.md and PLAN.md. Don't change any code.
For milestone [n]: does it work, what happens with empty or wrong input, does it hold up on a phone, does the data survive a refresh?
List every issue as blocker, should-fix or cosmetic, with the file it's in.
```

> **[Advanced]**
>
> ### Advanced Running several agents at once
>
> Once you've built five to ten features in one chat, you'll want to go faster by running agents side by side. Do it in the order that's safe: reading first, writing last.
>
> Two agents writing the same files at the same time is where it goes wrong. [Codex's guide (opens in a new tab)](https://developers.openai.com/codex/agent-configuration/subagents) says parallel agents suit read-heavy work (exploring the code, running tests, sorting bugs, summarising) and need more care for write-heavy work, because agents editing code at once create conflicts.
>
> The cheapest kind of parallel is the **subagent**: your chat spawns a helper for a side job, the helper works [in its own context (opens in a new tab)](https://docs.claude.com/en/docs/claude-code/sub-agents), and only its summary comes back. Your main chat stays clean, which protects its context window (its working memory, explained in the next section). The price is tokens: every subagent does its own model work, so a parallel run costs more than a single one.
>
> **Say this to your agent**
>
> ```
> Review milestone [n] with three subagents in parallel: one for what breaks on a phone, one for empty or wrong input, one for anything that could leak a key.
> Wait for all three, then give me one list, blockers first. Don't change any code.
> ```
>
> If two chats really must write at once, give each its own copy of the project. Git calls this a [worktree (opens in a new tab)](https://git-scm.com/docs/git-worktree): a second working folder on the same repository, on its own branch, so the two never touch the same file until you bring their work together.
>
> The industry norm two or three months ago was a new chat for every job: one for the user flow on the website, another for the back-end integration. That isn't true any more. The newest models let agents talk to each other while they work without the context deteriorating. Before that, people had agents post what they were doing on a shared board so the others could read it. You don't need that now.
>
> So tell them about each other. I ask my agent to check if there are any other agents working right now on the same project. It doesn't matter if it's Codex or Claude, it will know who is working on what. And if I tell it to tell the other chat that we're working on this, so they don't merge, it will understand that as well.
>
> In Claude Code this is built in: it can [list and message your other Claude Code sessions (opens in a new tab)](https://code.claude.com/docs/en/cross-session-messaging) on the same laptop (type `/list-agents` to see them). Check that a Codex chat shows up before you rely on it across tools.
>
> Milestones themselves rarely run in parallel. Each one builds on the last, so the third can't start until the second works. What runs in parallel well is the checking.

## Why long chats get forgetful

Everything in a chat (your messages, its replies, every file it opened, every command it ran) sits in its working memory, called the **context window**. It's measured in **tokens**, the small pieces a model reads and writes; in English, [100 tokens is about 75 words (opens in a new tab)](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them).

Today the context window is about a million tokens, and up to about half, the agent is good. Between 50% and 80%, it gets forgetful: the next-token predictions get bad, so the answers get bad and your output gets bad. That's why compaction keeps happening around there.

**Compaction** is the agent summarising the conversation to make room. It keeps the gist and drops details, which is how a rule you gave on Saturday can quietly vanish by Monday.

- **Forgetful**
- **Up to about half**: The agent is good · Each word it writes is a token, and the context window holds about a million of them.
- **Between 50% and 80%**: It gets forgetful · The next-token predictions get bad, so the answers get bad and your output gets bad. That's why compaction keeps happening around here.

*Figure: The whole bar is about a million tokens. You can always see how much is left at the bottom of the chat.*

**▸ Watch: Explore, plan, code, commit — Anthropic, 0:00 to 3:12**

Anthropic. Play [0:00 to 3:12 (opens in a new tab)](https://www.youtube.com/watch?v=xJQuF02NAK8): the whole build loop in three minutes.

**Watch for** the plan step: the agent proposes, you agree, and only then does it write code.

> **[Advanced]**
>
> ### Advanced Another approach: a fresh chat for every task
>
> Many practitioners go further than the one-chat rule and start a fresh chat for every task. This isn't the old habit of splitting one job across several chats at once; it's one chat at a time, cleared between tasks. It's a different way of working, not a correction, and the reason is the same context window you just read about.
>
> The teacher Matt Pocock, borrowing an idea from Dex Horthy of HumanLayer, says models “[have a smart zone and a dumb zone (opens in a new tab)](https://www.youtube.com/watch?v=-QFHIoCo-Ko&t=201s)”: sharp at the start of a conversation, worse as it fills. His habit is to size each task so it finishes inside the smart zone, then clear the chat and start the next one clean.
>
> A million tokens sounds endless, but it fills with more than your messages. Every file the agent opens and every test it runs goes in too, which is why [Codex's own guide (opens in a new tab)](https://developers.openai.com/codex/agent-configuration/subagents) warns that logs and command output make a long session less reliable.
>
> The two styles agree on more than they differ. Both keep the memory in files, not in the chat, so starting fresh costs a minute. Both review in a clean chat. The difference is only when you start a new one: when a task will pull in a lot of context, or every time.
>
> If you want to try it, the files do the work. End each task by updating PROGRESS.md, then open the new chat with: “Read AGENTS.md, PLAN.md and PROGRESS.md, then do the next milestone.” A long chat that starts forgetting rules you set on day one is the sign to try it.

- **Skills you already installed in Setup**: **`checkpoint`**Saves your work to git every time the app works, and gets you back when something breaks. **`keep-it-working`**Decides how much proof a change needs, from a glance to a test written first.

## Keep the memory outside the chat

The fix isn't a longer chat. It's files the agent can reread, so any chat can catch up in a minute.

Whatever you keep in local files, your plan, your progress, keep it as markdown files (plain text files ending in .md) on GitHub. A one or two day conversation is fine; as the project files get bigger, the AI starts messing up.

- **AGENTS.md**: The rules. [Codex reads it (opens in a new tab)](https://developers.openai.com/codex/guides/agents-md) before doing any work. Claude Code reads it too, directly or through one line in CLAUDE.md (below).
- **PLAN.md**: The milestones from PRODUCT.md, in order, the current one marked, and the parked ideas underneath.
- **PROGRESS.md**: One line after every milestone: what's done, what you decided, what's still broken.

> **Using Claude Code?**
>
> Look in your project folder for a file called CLAUDE.md. [Convex's setup (opens in a new tab)](https://docs.convex.dev/ai) and Claude Code's /init can both create one, and when it's there, Claude Code [reads it instead of AGENTS.md (opens in a new tab)](https://docs.claude.com/en/docs/claude-code/memory). If you find one, put this line at the very top of it: `@AGENTS.md`. Claude Code then reads your AGENTS.md first and the rest after it. To check, start a new chat, type `/context`, and look for AGENTS.md under Memory files.

The same files make switching tools painless. You'll need both Codex and Claude, because you'll run out of limits. When one runs out mid-milestone, the other reads the same three files and carries on.

If you're not doing any of this yet, that's fine: ask Shaktimaan to write you a prompt with these engineering principles, and give it to your AI.

> **When it asks for approval**
>
> For now, start every chat in yolo mode, so it stops asking you every single time and you allow everything. If you start with cdx or ccd from Setup, you already are. The price: it can also undo an hour's work without asking, which is why the loop ends by saving every version that works.

**▸ Where the loop usually breaks — Four near-misses**

- **Trusting the summary**: “All tests pass, the feature is complete.” You never opened it. Open it.
- **Five changes in one message**: Something breaks and nobody can tell which change did it. One change, check, next.
- **“Also add…” mid-milestone**: The milestone grows, never finishes, and the plan stops matching the code. Park it.
- **A three-day chat**: Past 80% it forgets the rules you set on day one. Update PROGRESS.md, start fresh, point it at the three files.

> **[Advanced]**
>
> ### Advanced Writing rules your agent actually follows
>
> AGENTS.md is read before every task, so every line in it costs a little attention every time. A good one is short, concrete and current.
>
> **Concrete beats virtuous.** [Claude Code's guide (opens in a new tab)](https://docs.claude.com/en/docs/claude-code/memory) gives the pattern: “Run npm test before committing” instead of “Test your changes”. For you, that's “keys live only in Convex environment variables” instead of “be secure”.
>
> **Short beats complete.** The same guide suggests staying under 200 lines, because longer files use more context and get followed less, and [Codex (opens in a new tab)](https://developers.openai.com/codex/guides/agents-md) stops reading project instructions at 32 KiB by default. History belongs in PROGRESS.md, not in the rules.
>
> **Prune, don't only append.** If two lines contradict each other, the agent may pick either. Rules written for older models can also get in the way of newer ones. Claude Code (v2.1.283 or later) can check this for you: `/doctor prompt-audit` looks for instructions written for older models, references to files that don't exist, and files that contradict each other, and proposes fixes.
>
> **Every mistake becomes a rule.** When the agent gets something wrong, ask why before you ask for the fix. Zevi Arnovitz, a product manager who builds without writing code, asks it “[what in your system prompt or tooling made you make this mistake (opens in a new tab)](https://www.youtube.com/watch?v=1em64iUFt3U&t=2798s)”, then updates the files. If you've said something twice, it belongs in AGENTS.md.
>
> **Procedures become skills.** When a rule grows into steps (how to ship, how to review), move it out. A **skill** is a procedure saved in its own file and called by name; Claude Code's [guide to skills (opens in a new tab)](https://docs.claude.com/en/docs/claude-code/skills) says to make one when you keep pasting the same instructions or checklist, or when a section of the rules file has grown into a procedure rather than a fact. [Codex skills (opens in a new tab)](https://developers.openai.com/codex/skills-and-plugins) work the same way. Your review prompt above is a good first one.
>
> Setup already gave your agent a global file about how to talk to you; it keeps loading alongside this one, which is about this product. One trap: if a CLAUDE.md appears in the project folder, Claude Code [reads that instead of AGENTS.md (opens in a new tab)](https://docs.claude.com/en/docs/claude-code/memory). Don't delete it, because Convex keeps its own section there. Start it with the line @AGENTS.md instead.
>
> And a scratchpad for the conversation itself. Tell your AI: whatever we chat, keep it in a scratchpad so you don't forget my instructions; at the end, validate it, check it off and delete it. Every week, purge or summarise those files. You can run a cron (a job your computer runs on a schedule) for it.

**AGENTS.md · 2. How we work**

```
## 2. How we work
- Read IDEA_SCOPE.md, PRODUCT.md, PLAN.md and PROGRESS.md before anything else, and DESIGN.md before any screen work.
- Before writing code, tell me in two or three sentences what you think I'm after, then your plan. Wait for my yes. Don't guess.
- One milestone at a time: the next one in PLAN.md, working end to end. Nothing outside it.
- If I ask for something new mid-milestone, add it to the parked list in PLAN.md and carry on.
- Never say "done" until you've seen it work (a test, or a screenshot at phone width) and told me how to check it on my phone.
- When I report a bug, find the cause before changing anything. Fix only that.
- After I confirm a milestone works: commit, push, and add one line to PROGRESS.md.
- Never put a key or password in code, in a VITE_ variable (those are sent to every visitor) or in a committed file.
- [a rule of your own: anything you've had to say twice]
```

**PLAN.md and PROGRESS.md**

```
# PLAN.md
Landing page first, one hour. Then the milestones from PRODUCT.md, riskiest part first, in its simplest form:
1. I can [ ]
2. I can [ ]   <- now
...
Last: the data survives closing and reopening.
Parked (not now):
- [ ]

# PROGRESS.md
[date] Milestone [n] done: [what works now]. Decided: [ ]. Still broken: [or "nothing known"].
```

> **Doubts?**
>
> Ask [**Shaktimaan** (opens in a new tab)](https://growthx.club/community/shaktimaan) or post in [#build-sprint (opens in a new tab)](https://growthx.club/community/build-sprint). Ask before you lose the hour.
