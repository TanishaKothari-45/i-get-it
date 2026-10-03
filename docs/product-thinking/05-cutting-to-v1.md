<!-- Source: https://growthx.club/learn/build-sprint#/product-v1 · captured 2026-10-04 from the GrowthX Build Sprint handbook (login-gated). Verbatim text, converted to markdown. Advanced-level blocks included. -->

# Cutting to v1: what's in, what's out, in what order

This weekend you can build almost anything, which is the danger. This chapter gets you a first version that does the job and nothing more, cut into milestones.

> **By the end of this chapter you'll have**
>
> **v1, cut and ordered.** v1 does / v1 doesn't, your riskiest guess, and milestones that each start “I can”, the riskiest first.
>
> Example **Does:** photo to dish and calories, fix a wrong guess, save, today's total, catch a photo that isn't food. **Doesn't:** barcodes, macros, login, social, streaks, goals. **First milestone:** I can upload a food photo and see the dish name.

## Probation, not the whole career

A new hire on probation doesn't do everything the job will one day need. They prove one thing: that hiring them was right.

Your first version, **v1**, is that probation: one person, one job, done far better than today. Remove anything that isn't in the job.

Your flows already show what's in: the ones that give the first value. Build those first.

## Say no to “do you also want…?”

With an agent, v1 matters more. It keeps ending its replies with: do you also want to think about this? And this? You aren't building by hand any more, so it's easy to say yes.

Each yes is a new feature, and every feature brings bugs. v1 is how you stay focused.

> **Remember this**
>
> Your agent will build anything you say yes to. This weekend your job is to be the editor.

## The cut question, and three buckets

For every feature, ask: **can one person finish the one job without it?** If they can, it isn't v1.

That sorts everything into three buckets: **must have**, **nice to have** and **not this sprint**. Write the last one down anyway, so you can let go of it.

Must have
- Photo to dish and calories
- Fix a wrong guess
- Save to today
- Today's total
- Catch a photo that isn't food

Nice to have
- Weekly trends
- A calorie goal
- Protein, carbs and fat

Not this sprint
- Login
- Streaks
- Sharing
- Barcodes

*Figure: What makes PhotoCal look like a “real app” falls out. What's left is the job.*

Still too many? Build first for the use case with the biggest pain.

## The riskiest part goes first

Every plan rests on one guess that, if false, makes the product pointless: your **riskiest guess**. For PhotoCal, it's that the AI can tell Indian dishes apart.

Check it in thirty minutes with no code (real meal photos, sent to a chat window) while you start building.

PhotoCal's thirty-minute test:

- **What came back**: Rajma chawal: right. Poha: upma, wrong and confident.
- **What changed**: Fixing a wrong guess became a must-have, before a line of it was built.

Don't wait to be sure: AI is doing the building, so start today and change the plan when users surprise you. If your guess is about what people do over days, run a small version by hand today and watch the replies.

**Say this to your agent**

```
Read PRODUCT.md. My riskiest guess is: [the one thing that, if false, makes this pointless].
Design a thirty-minute test that uses no code: just a chat window, my phone or a conversation.
Tell me what to do, and what result would mean the guess is wrong.
If it fails, tell me which parts of PRODUCT.md change. Don't write any code.
```

> **[Advanced]**
>
> ### Advanced Decide what counts before you test
>
> A test only helps if you decide in advance what result counts. Decide afterwards and every result looks like good news. Write four lines first:
>
> - **We believe**: A vision model can name everyday Indian lunches from a phone photo.
> - **To check, we will**: Send 20 photos of real lunches from three people to a chat window.
> - **And measure**: How many dishes it names right, and how far off the calories are.
> - **We're right if**: At least 15 of 20 are named right, and every miss is one tap to fix.
>
> To find the guess in the first place, imagine it has already failed. “It's next Friday, and nobody used PhotoCal twice. Why?” List every reason in ten minutes. The one that would really kill it is your riskiest guess. The one you already suspect and haven't said out loud: write that down too.

> **[Advanced]**
>
> ### Advanced Do the AI part by hand first
>
> The cheapest test of a product is to be the product for a few days. Three friends send you their lunch photos on WhatsApp, and you reply within a minute with the dish and the calories.
>
> Three days of that tell you whether they photograph every meal, which dishes are hard, and what they actually do with the number. For an AI product this is especially useful, because the AI part is both the riskiest and the hardest to get right.
>
> The price: it doesn't scale and it eats your time. Use it when you aren't sure anyone wants the result at all, before you spend a day on the AI call. If it looks automatic, only use people who'd be fine finding out it was you.

## Milestones: things you can show in ten seconds

Now break v1 into **milestones**: checkpoints you can demo in ten seconds. Three rules. Each starts with “I can”. The riskiest part goes first, in its simplest form. The last is always that the data survives closing and reopening (or a restart).

- **1**: Milestone · I can upload a food photo and see the dish name · The riskiest part, first.
- **2**: Milestone · I can see a calorie estimate too · Now it does the job, once.
- **3**: Milestone · I can edit the dish and the calories recalculate · The fix the test asked for.
- **4**: Milestone · I can upload a photo that isn't food and get an error, not a number · No more 200-calorie selfies.
- **5**: Milestone · I can save an entry to a “today” list · The first thing that lasts.
- **6**: Milestone · I can see today's total update with each save · The job done.
- **7**: Milestone · I can close it, reopen it, and my data is still there · The one everyone forgets.

*Figure: Seven milestones, each a ten-second demo.*

Hand them to your agent one at a time, and check each one yourself (Working with your agent (handbook page #/tech-agent)). Decide now how you'll know v1 worked: something people do again, not something they say.

> **[Advanced]**
>
> ### Advanced When simplest and riskiest disagree
>
> For PhotoCal the two agree: photo in, dish name out is both the simplest slice and the riskiest guess. When they disagree, build what you learn the most from first.
>
> Take the legal-counsel assistant. The simplest first milestone is “I can add it to a WhatsApp group”. The riskiest is “it picks the right hearing date out of a messy chat”, with dates like “next Tuesday” or “14/10”. Build the second first, even by pasting a chat into a test page: if it can't read dates, connecting it to WhatsApp proves nothing.
>
> The week is fixed, so the scope has to move. When you're behind, cut a milestone or a nice-to-have. Don't move the demo.

## This weekend's order

- **1**: Before any code · Write your user flows down · Whatever else you do, the flows come first.
- **2**: Next · Build your landing page, in one hour · Think of it as the spec of what you're building, written for your user. Stop at the hour: people end up spending a lot of time there.
- **3**: Then · Build your product loop · Your core flow, end to end, one milestone at a time, the riskiest part first.

*Figure: Flows, landing page, loop.*

By Sunday evening the whole product should work end to end. Stay up all night if you have to; from Monday, you'll only have time to tweak.

**▸ Watch: How to build an MVP in the AI coding era — Dalton Caldwell and Michael Seibel, YC, 0:00 to 7:30**

Dalton Caldwell and Michael Seibel, YC. Play [0:00 to 7:30 (opens in a new tab)](https://www.youtube.com/watch?v=rQtrzBcf_Us): why cheap features make cutting harder, not easier.

**Watch for** around 3:29, the trap of handing interview notes to a coding agent, which then builds every feature anyone asked for.

- **Skills you already installed in Setup**: **`grill-me`**: Interviews you one question at a time and won't write code until the person, the problem, the core action and the scope are written down. Say “grill me on my plan”.

## Write your v1 and your milestones

This is the last part of PRODUCT.md. Send it to Shaktimaan (below). Once it's locked, tell your agent to read IDEA_SCOPE.md and PRODUCT.md before any code. It builds the landing page in one hour, and after that milestone 1 only.

**PRODUCT.md · 5 to 7. v1, the riskiest guess, milestones**

```
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

> **Doubts?**
>
> Ask [**Shaktimaan** (opens in a new tab)](https://growthx.club/community/shaktimaan) or post in [#build-sprint (opens in a new tab)](https://growthx.club/community/build-sprint). Ask before you lose the hour.
