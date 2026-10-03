<!-- Source: https://growthx.club/learn/build-sprint#/tech-thinking · captured 2026-10-04 from the GrowthX Build Sprint handbook (login-gated). Verbatim text, converted to markdown. Advanced-level blocks included. -->

# Tech thinking

By the end you'll have a live link a stranger can open on a phone, a public repo with no keys in it, **AGENTS.md** with your agent's rules, and an AI call with a spending cap. 4 chapters, about 28 minutes at the Intermediate level.

Every app on your phone is four things pretending to be one.

There's the screen you tap. Behind it, rules decide what happens when you tap. Somewhere, the app remembers what you did. And for the hard parts, like signing you in with Google or reading a photo, it calls a service someone else runs.

**Tech thinking** is knowing those four parts well enough to direct an agent to build them, to catch it when it's wrong, and to put the result on the internet where a stranger can use it.

That tells you what it isn't: learning to code. You won't write the code this week, Codex or Claude Code will. What you need is the map, the words and a few habits. It also isn't deciding what to build, which is product thinking (see ../product-thinking/00-overview.md), or how it looks, which is design thinking (see ../design-thinking/00-overview.md).

## The one fact this lens is built on

Your agent writes code faster than you can read it.

So reading everything it writes is impossible, and it isn't your job. Your job moves from writing to deciding and checking: say exactly what you want, say which part broke, and never trust “done” until you've seen it work on a phone.

Every chapter here is one of those moves. The first gives you the words to say which part broke. The second is the loop that checks the agent's work. The third gets it onto a phone. The fourth connects the AI without letting it spend whatever it likes.

## One picture for the whole lens: a restaurant

To keep the four parts straight, picture a restaurant.

- **The dining room and the menu**: The **interface**: what the guest sees and orders through.
- **The kitchen**: The **business logic**: it takes the order and decides what happens.
- **The order book and the pantry**: The **database**: what the restaurant remembers.
- **The suppliers**: **Third parties**. The AI is a specialist supplier you call for every order.

The picture keeps going. The supplier's account card never sits on a dining table, which is why an AI key never goes in public code. And shipping is opening the doors: until then, the only guest is you.

One more picture, for the AI itself. The model is a horse: it keeps running. The thing on top that lets you control the horse is the harness, and you ride. The picture fits both your coding agent and the AI inside your product, because they're the same kind of animal.

By the end of the four chapters you'll have four things: a live link a stranger can open on a phone, a public repo with no keys in it, your agent's working rules in a file it reads every time, and the AI call running from your backend with a cap on what it can spend. Most of it ends up in one file your agent reads before every task. Here it is for PhotoCal.

## What you'll have at the end

AGENTS.md
- **1 · How the product works**: Interface: a web page on Rohan's phone; the camera button opens his camera. Business logic: a Convex action (kitchen code allowed to call the outside world) sends the photo to the vision model and checks the answer. Database: a Convex table of meals. Third party: the vision model's API (the door other programs use to reach it), its key stored in Convex.
- **2 · How we work**: Read IDEA_SCOPE.md, PRODUCT.md, PLAN.md and PROGRESS.md first, and DESIGN.md before any screen work. Plan before code and wait for a yes. One milestone at a time. Never say done until you've said how to check it on a phone.
- **3 · Shipping**: Live at its .convex.site link. Code public on GitHub. Deploy with npm run deploy after every milestone that works. Keys only in Convex environment variables (named settings kept on Convex, outside the code), for dev and for prod.
- **4 · The AI call**: A low-cost model that reads photos (gpt-6-luna), told to think only briefly, each reply capped at 500 tokens. Photos shrunk before sending. At most 100 AI calls an hour across the app. A hard monthly spending limit set at OpenAI. No login in v1.

*Figure: PhotoCal's working rules. Each chapter writes one part, and your agent reads all of it before every task.*

Read the four chapters in order once. After that, each one is a place to come back to: How a product works when something breaks, Working with your agent when a chat goes strange, Ship it when a deploy fails, Connecting the AI before you share the link. Codex reads AGENTS.md before it does any work. Claude Code reads it too, as long as any CLAUDE.md in your project starts with the line @AGENTS.md (Working with your agent shows how), so one file serves both.

**AGENTS.md, empty**

```
# AGENTS.md

## 1. How the product works
Interface: [where people use it: a web page on a phone, WhatsApp, voice] and the one thing they do there: [the core action]
Business logic: [what happens automatically when they do it, in one or two lines]
Database: [what you remember: each table and what's in it]
Third party: [each outside service, what it does for you, and where its key is stored]
Not in v1: [parts you're deliberately not building yet, e.g. login]

When I report a bug, I'll name the part. Look there first, and tell me if you think I named the wrong one.

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

## 3. Shipping
Live link: [your .convex.site link]
Repo: [github.com/you/your-repo], public
Deploy: npm run deploy. A push never deploys by itself. After I say a milestone works: commit, push, then deploy.
Keys: [VARIABLE_NAME] lives in Convex environment variables, set for dev and for prod. Never in code, a VITE_ variable or a committed file. Never ask me to paste it into chat.
.gitignore covers .env.local.
Real people's data (chats, names, phone numbers) never goes in the repo, not even as a test file. Tests use made-up examples.
Every limit and every "is this allowed" check happens in a Convex function, never only on screen.
Before I share the link: I open it on my phone, logged out, on mobile data, and do the core flow once.

## 4. The AI call
Model: [gpt-6-luna, Claude Haiku 4.5, or your choice], thinking [low, or off]
What goes in, and its limit: [a photo shrunk to 1024 pixels on the longest side, on the phone / at most [300] messages]
Where it runs: a Convex action. Never in the interface.
Key: [VARIABLE_NAME] in Convex environment variables, dev and prod.
Reply cap: max_output_tokens [500]
Calls cap: at most [100] AI calls an hour across the app, checked in the kitchen (Convex rate limiter)
Provider limit: a hard monthly limit of [$ amount], set by me
When a cap is hit or the call fails: show "[Busy right now. Try again in a few minutes.]"
Login: [none in v1, or when and why]
The AI must never: [e.g. give medical advice, answer off-topic]
```

## Send it to Shaktimaan

Write AGENTS.md down before you build, and keep it up to date. When your link is live, send AGENTS.md, the live link and the repo link to [**Shaktimaan** (opens in a new tab)](https://growthx.club/community/shaktimaan) with the prompt below. It checks the same things these chapters teach and tells you what to fix.

**Say this to Shaktimaan**

```
Shaktimaan, here's my AGENTS.md, my live link and my public repo for Build Sprint. Check them the way the Tech thinking pages on the dashboard teach: the product in four parts, my agent's working rules, no keys in the repo, and the AI call runs in a Convex action, never in the interface, with a reply cap, a calls cap and a spend limit. I opened the link on my phone, logged out, on mobile data: [what happened]. Tell me the weakest part first and make me fix it. Don't fix it for me.
```

## The chapters

Each chapter starts with the part of the page it gets you, teaches from there, and ends with that part to copy and fill in for your own product. Read them in order: each one uses the last.

1. How a product works: four parts (see 01-four-parts.md) Every product, from Justdial to PhotoCal, is built from the same four parts, and each one runs somewhere different. This chapter gives you that map, so that when something breaks you can tell your agent exactly where to look.

- 6 min
- You'll have: your product in four lines
- +2 advanced
2. Working with your agent (see 02-your-agent.md) Codex and Claude Code will build almost anything you describe, and tell you it's done before it is. This chapter gives you the loop that catches that, the files that keep your agent's memory outside the chat, and the rules it reads before every task.

- 7 min
- You'll have: your agent's working rules
- +4 advanced
3. Ship it: from your laptop to a link (see 03-ship-it.md) A product that only works on your laptop has no users. This chapter takes yours from your laptop to a link anyone can open on a phone, keeps your keys out of the public repo on the way, and tells you what to do when a deploy fails.

- 7 min
- You'll have: your live link and public repo
- +3 advanced
4. Connecting the AI (see 04-connecting-the-ai.md) Your product calls an AI model the way a kitchen calls a supplier: for every order, on your account. This chapter wires that call into your backend, shows you what each call costs before you share the link, and puts three caps in place so a busy day can't become an expensive one.

- 8 min
- You'll have: your AI call, capped
- +3 advanced

## Two levels

Every chapter has an **Intermediate** level, the main path, which is enough to get you the outcome. Switch to **Advanced** and deeper parts open in place, for when you already do this for a living or want the full method. The switch sits at the top of every chapter and is remembered on this device.

> **Doubts?**
>
> Ask [**Shaktimaan** (opens in a new tab)](https://growthx.club/community/shaktimaan) or post in [#build-sprint (opens in a new tab)](https://growthx.club/community/build-sprint). Ask before you lose the hour.
