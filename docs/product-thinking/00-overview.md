<!-- Source: https://growthx.club/learn/build-sprint#/product-thinking · captured 2026-10-04 from the GrowthX Build Sprint handbook (login-gated). Verbatim text, converted to markdown. Advanced-level blocks included. -->

# Product thinking

By the end you'll have **PRODUCT.md**, the one page your agent builds from: the job, the switch, the core flow, onboarding, and what's in v1. 5 chapters, about 20 minutes at the Intermediate level.

Every product you have ever used, you hired.

Nobody wakes up wanting an app. They wake up with something to get done: lunch to keep track of, a client to chase, a cab to catch. They hire whatever gets it done, the way we hire people, and they quietly fire the old way. They don't hire it for its features.

**Product thinking** is deciding what to build, for whom and in what order, so that one person gets one job done far faster than today, and wants to come back.

It isn't choosing the idea: you did that on Lock your idea (handbook page #/lock-your-idea). It isn't how the product looks (design thinking (handbook page #/design-thinking)) or how it's built (tech thinking (handbook page #/tech-thinking)). It's the decisions in between: which job, which steps, what the first minute asks of people, and what you leave out.

You write those decisions down on one page, **PRODUCT.md**, in your project folder. Each chapter writes one part of it, and your agent builds from all of it. Write it first, then build: by Sunday evening the whole product should work end to end.

## You already know this

The good news: everything in these chapters, as a professional, you already know. The bad news: you've forgotten how to apply it to your own product, or you haven't had enough practice.

That's why it's hard. The words feel familiar, so it seems you know them. The main idea is so simple that it's hard to take in.

## One picture for the whole lens: hiring

The idea is called **jobs to be done**, from [Clayton Christensen (opens in a new tab)](https://www.christenseninstitute.org/theory/jobs-to-be-done/). We'll use its one picture all the way through:

- **The job description**: What they're hiring for, in one sentence. Chapter 1.
- **The person in the job today**: Whatever they do now, even nothing. People are slow to fire anyone. Chapter 2.
- **The work itself**: The steps from the moment it hurts to the job done: the user flow. Chapter 3.
- **The first day at work**: Onboarding: the smallest thing you ask before you're useful. Chapter 4.
- **The probation period**: Your first version: only what it takes to prove the hire. Chapter 5.

It isn't the process I use. It's the one I want you to follow this sprint. After about a year of doing this you won't need every step, and when your product doesn't feel right you come back and pick the part you need.

## What you'll have at the end

PRODUCT.md
- **1 · The job**: When my lunch arrives and I'm trying to lose weight, I want to know roughly what I'm eating without stopping to log it, so I can stay under my number without giving up food I like. Today he eyeballs it, or asks ChatGPT, or opens a calorie app he's already quit twice.
- **2 · The switch**: Anxiety: it won't know Indian food, and he'll quit this one too. Habit: eyeballing is free and instant. So PhotoCal reads his own lunch first, fixes a wrong guess in one tap, and takes seconds.
- **3 · The core flow**: Today: lunch arrives → he thinks of logging it → eats instead and guesses. With PhotoCal: lunch arrives → open PhotoCal → Snap your meal → “Reading your plate” → “Rajma chawal, about 480 kcal” → fix it if wrong → save → today's total. Must not: call a selfie food, or lose lunch by dinner.
- **4 · Onboarding**: He gives one photo of his lunch, nothing more. Open the link → one line and one button → the first photo → the first number. No sign-up. The worry it removes: “it won't know Indian food”.
- **5 · v1**: Does: photo to dish and calories, fix a wrong guess, save, today's total, catch a photo that isn't food. Doesn't: barcodes, macros, login, social, streaks, goals.
- **6 · Riskiest guess**: The AI can tell Indian dishes apart. Tested in a chat window: poha came back as upma, so fixing a wrong guess became a must-have.
- **7 · Milestones**: I can upload a food photo and see the dish name, and six more, ending with: I can close it, reopen it, and my data is still there.

*Figure: PhotoCal's finished page. PhotoCal is the example in every chapter: a calorie tracker for Indian food, for Rohan, who photographs his lunch and gets the dish and the calories in about five seconds. Each chapter writes one part of it.*

Your lock sheet, IDEA_SCOPE.md, says what you're building and why. PRODUCT.md says how one person uses it, step by step, and what's in the first version. Keep both in your project folder and tell your agent to read both before it writes any code. When, at 2 AM, it adds a login you never asked for, PRODUCT.md is the page you point at.

**PRODUCT.md, empty**

```
# PRODUCT.md

## 1. The job
When [the moment it hurts], I want to [what they want right then], so I can [the one thing it lets them do].
Other moments it happens: [ ]

Who, by situation (not age, city or title): [the situation they're in]
Today they hire: [what they use or do now, including nothing]

(More than one person in the product? Write a job for each, and mark the one you build for this weekend.)

(Advanced, optional) What needs doing: [ ]
(Advanced, optional) How they want to feel: [ ]
(Advanced, optional) How they want to look to others: [ ]

(B2B only) The bench: end user [ ], decision maker [ ], who pays [ ]
The one we serve first: [ ]

## 2. The switch
What they'd fire: [what they use or do today, including nothing]

The forces that matter (keep one to four, delete the rest):
Push, outside them (what's going wrong in their life right now): [ ]
Pull, inside them (what they've always wanted): [ ]
Anxiety (the risk of trying you: what they tried before, or a decision that's hard to undo): [ ]
Habit (the way they already do it): [ ]

What the product does about each: [force] -> [what it does] (you place these in your flow and onboarding next)
The one worry onboarding must remove: [one line, in their words]

## 3. The core flow
Today (what they do now, before your product):
1. [the moment it hurts]
2. [ ]
...
[where it ends today]

With my product:
1. [the moment it hurts]
2. [they ...]
3. [the product ...]
...
[last]. [the job done, in their terms]

Things it takes to get the job done today: [count] · With my product: [count]

What must not happen:
Step [n]: [ ]
Step [n]: [ ]

Other flows (stop when the job is covered): [ ]

## 4. Onboarding
First value (the moment it first does the job for them): [what they see]
The smallest commitment we ask for: [what they give, and nothing more]
The worry it removes (from section 2): [their worry about the outcome, in their words]

From opening the link to the first value:
1. [where they come from, and what they open] removes: [worry]
2. [ ] removes: [ ]
3. [the first value]

Login: [not in v1 / after step [n], because ...]
What we don't ask on day one: [profile, tour, permissions, ...]
What we ask later, and when: [question] after [moment]

## 5. v1
Does (the must haves: one person finishes the one job): [ ]
Doesn't (not this sprint: parked, not forgotten): [ ]
Nice to have (only after the must haves work): [ ]
How I'll know it worked (what they do again, not what they say): [ ]

## 6. The riskiest guess
If this is false, the product is pointless: [ ]
Thirty-minute check, no code (run it while you build), and what happened: [ ]

## 7. Milestones
1. I can [the riskiest part, in its simplest form]
2. I can [ ]
3. I can [ ]
...
Last: I can close it, reopen it, and my data is still there.
```

## Send it to Shaktimaan

When PRODUCT.md is written, in your own words, send it to [**Shaktimaan** (opens in a new tab)](https://growthx.club/community/shaktimaan) (the Build Sprint AI, trained on Udayan) with the prompt below, before your agent writes any code. It tells you what to fix, then locks your product scope: the version you build this week.

**Say this to Shaktimaan**

```
Shaktimaan, here's my PRODUCT.md for Build Sprint. Check it the way the Product thinking pages on the dashboard teach: the job in one sentence with one "so I can", the forces that matter and what the product does about each, today's journey, then the core flow from the moment it hurts to the job done, with what must not happen where it matters, onboarding that asks for the smallest commitment before the first value, what v1 does and doesn't do, and milestones that start with the riskiest part in its simplest form. Tell me the weakest part first and make me rewrite it. Don't write it for me. When every part holds up, lock my product scope.
```

## The chapters

Each chapter starts with the part of the page it gets you, teaches from there, and ends with that part to copy and fill in for your own product. Read them in order: each one uses the last.

1. The job: what people hire your product to do (see 01-the-job.md) Before flows or screens, you need one sentence: the progress your user wants, at the moment it hurts. This chapter gets you that sentence.

- 4 min
- You'll have: the job, in one sentence
- +2 advanced
2. Why people switch, and why they don't (see 02-the-switch.md) A better product doesn't win on its own. This chapter shows you the four forces that decide whether someone switches to you, and gets you the one or two that matter for your product.

- 4 min
- You'll have: the forces that matter
- +2 advanced
3. User flows: one story, step by step (see 03-the-core-flow.md) Your job sentence says what progress someone wants. The core flow says how they make it, one step at a time. This chapter gets you that flow: what your user does today, then where your product fits, then what must not go wrong.

- 4 min
- You'll have: the core flow, step by step
- +2 advanced
4. The onboarding journey: first visit to first value (see 04-onboarding.md) Onboarding isn't a sign-up form. It's the path from opening your link to the moment your product first does its job, asking as little as you can on the way. This chapter gets you that path.

- 4 min
- You'll have: the onboarding journey
- +2 advanced
5. Cutting to v1: what's in, what's out, in what order (see 05-cutting-to-v1.md) This weekend you can build almost anything, which is the danger. This chapter gets you a first version that does the job and nothing more, cut into milestones.

- 4 min
- You'll have: v1, cut and ordered
- +3 advanced

## Two levels

Every chapter has an **Intermediate** level, the main path, which is enough to get you the outcome. Switch to **Advanced** and deeper parts open in place, for when you already do this for a living or want the full method. The switch sits at the top of every chapter and is remembered on this device.

> **Doubts?**
>
> Ask [**Shaktimaan** (opens in a new tab)](https://growthx.club/community/shaktimaan) or post in [#build-sprint (opens in a new tab)](https://growthx.club/community/build-sprint). Ask before you lose the hour.
