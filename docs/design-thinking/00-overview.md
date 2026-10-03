<!-- Source: https://growthx.club/learn/build-sprint#/design-thinking · captured 2026-10-04 from the GrowthX Build Sprint handbook (login-gated). Verbatim text, converted to markdown. Advanced-level blocks included. -->

# Design thinking

By the end you'll have **DESIGN.md**, the brief your AI follows: references, type and colour, every screen with its states, and your first screen's words. 4 chapters, about 30 minutes at the Intermediate level.

Every screen in your product gets designed by someone. If you don't decide how it looks, your AI decides, and it picks the average.

That isn't a flaw in the AI. A model writes code the way it writes sentences: it predicts the most likely next piece. Ask for a calorie tracker and nothing else, and you get the most likely calorie tracker: a white page, a blue button, a heading that says “Track your nutrition”. Nothing in it is wrong. Nothing in it is yours.

**Design thinking** is deciding how your product looks, reads and feels on a phone, for one person doing one job, and then saying it precisely enough that your AI builds it that way.

That second half matters, because it tells you what this lens is not. It isn't decoration, and it isn't about becoming a designer. You won't draw anything in a design tool this week. You'll notice, decide and describe, and your agent will do the drawing.

Most people have not had to build design taste in a very focused way. That's all it is. Taste isn't something you're born with or without, and it isn't something money buys. It's a muscle, and this lens trains it on your own product.

## The one fact this lens is built on

For a builder, taste is two skills. The first is noticing what's good or what's off on a screen, down to the small things. The second is naming it, in words exact enough for someone else to build.

I learned taste by being very particular about small things. It comes down to two things, caring and labelling. If you nail these two it's a great start, and we keep iterating from there.

Keep this in your head, because every chapter here is those two skills, aimed at one part of your product.

## One picture for the whole lens: you're the director

Think of yourself as a film director. If you want an element changed, describe it exactly how you want it, like you're Christopher Nolan and you want it exactly like this.

- **The crew**: Your AI. Very fast, never tired, and wherever the director says nothing, it does what most crews would do.
- **The director's eye**: Noticing, down to the small things. Chapter 1.
- **The director's vocabulary**: Labels: the exact words for what you noticed. Chapter 1, and every chapter after it.
- **The shots**: Your screens, each with one job, in every version a stranger might see. Chapter 2.
- **The script**: The words on screen, and the fonts that decide how they sound. Chapter 3.
- **The mood board and the shot list**: References, one per component, and DESIGN.md, the file the crew reads before it builds anything. Chapter 4.

A good director doesn't operate the camera. They know exactly what they want, they can say it, and they check every take. That's the whole job this week.

## What you'll have at the end

DESIGN.md
- **1 · The feeling, in labels**: Calm and quick, like glancing at a watch. One big number per screen. The food photo and the main button are the only colourful things. No charts, no confetti, nothing that scolds.
- **2 · References, one per component**: Calorie number: a weather app's current temperature (take: one huge number, the unit small beside it; ignore: the forecast). Result photo: a pin found with “overhead food photography, natural light” (take: the plate from above, warm light; ignore: the props). Meal list: a payments app's history (take: dish on the left, calories right-aligned, the time in grey under the dish).
- **3 · Type and colour**: One typeface, [Inter (opens in a new tab)](https://fonts.google.com/specimen/Inter), in three sizes: 40 for the number, 20 for headings, 16 for everything else. Near-black text on a warm off-white. One accent, turmeric yellow, only on the main button. Red only for errors.
- **4 · Screens**: Home: today's total, today's meals, “Snap your meal”. Camera: the phone's own. Result: the photo, the dish and its calories, Change, Save. Every screen has its empty, loading, error and done words written down.
- **5 · The first screen**: Headline: Know your lunch's calories in 5 seconds. Under it: Snap your plate. We name the dish and the calories. Built for Indian food. Button: Snap your meal.
- **6 · Principles**: One main action per screen, in thumb reach. Every AI answer can be corrected in one tap. Errors say what to do next, never a code. No new colour or size without asking. Check every screen at phone width before saying done.

*Figure: PhotoCal's finished page. Each chapter writes part of it, and your agent reads all of it before it touches a screen.*

Four chapters. The first trains your eye on someone else's page; the other three write DESIGN.md for your own product, one part at a time. Keep it next to PRODUCT.md in your project folder: PRODUCT.md says what the product does, DESIGN.md says how it looks and reads while it does it.

**DESIGN.md, empty**

```
# DESIGN.md
Read this before building or changing any screen. If a choice isn't covered here, ask me instead of guessing.

## 1. The feeling, in labels
[Three to five labels, each an element and what it does. Not "clean" or "minimal".]

## 2. References, one per component
[Component]: [image file or link]
Take: [exactly what to copy]
Ignore: [what isn't the point]

## 3. Type and colour
Font: [one typeface, two at most]
Sizes: [three or four, with what each one is for]
Colours: [text] on [background] · accent [colour], only on [the main action] · errors [colour]

## 4. Screens
[Screen]: for [what]. Top to bottom: [what's on it]. Main action: [button words] → [where it goes]
Empty: [words] · Loading: [words] · Error: [words] · Done: [words]

## 5. The first screen's words
Headline: [the outcome, in your user's words]
Under it: [how it works, and who it's for]
Button: [what happens when they tap]

## 6. Principles
- [a rule that holds on every screen]
```

## Send it to Shaktimaan

Write DESIGN.md down before you build a screen, and add a principle each time you correct your AI. Then send the whole page to [**Shaktimaan** (opens in a new tab)](https://growthx.club/community/shaktimaan) with the prompt below. It checks the same things these chapters teach and tells you what to fix.

**Say this to Shaktimaan**

```
Shaktimaan, here's my DESIGN.md for Build Sprint. Check it the way the Design thinking pages on the dashboard teach: labels instead of vague words, one reference per component with what to take and what to ignore, one font, a few sizes and the colours, every screen with its empty, loading, error and done states, first-screen words that say the outcome, and principles that hold on every screen. Tell me the weakest part first and make me rewrite it. Don't write it for me.
```

## The chapters

Each chapter starts with the part of the page it gets you, teaches from there, and ends with that part to copy and fill in for your own product. Read them in order: each one uses the last.

1. Learning to see: notice, then name (see 01-learning-to-see.md) Before your AI can build what you want, you have to be able to say it. This chapter trains the two skills under design taste, noticing the small things and naming them exactly, on one real page.

- 8 min
- You'll have: a teardown of one page
- +2 advanced
2. Screens and states (see 02-screens-and-states.md) Your flow is a list of steps. This chapter turns it into the few screens a stranger will actually see, on a phone, each with one job, and writes the words for every version of each screen, not only the happy one.

- 7 min
- You'll have: your screen list
- +3 advanced
3. Words and type (see 03-words-and-type.md) The words on your first screen are the first thing a stranger judges, and the fonts decide how those words sound. This chapter gets you a headline, the line under it and a button that you wrote yourself, and a font you chose last, on purpose.

- 7 min
- You'll have: your first screen, in your words
- +4 advanced
4. Teaching your AI your taste (see 04-teaching-your-ai.md) Everything you've noticed and named so far lives in your head, and your AI starts every chat without it. This chapter puts it in DESIGN.md, where the AI reads it every time, and gives you a small daily loop that makes each screen start closer to what you want.

- 8 min
- You'll have: DESIGN.md, and a loop
- +3 advanced

## Two levels

Every chapter has an **Intermediate** level, the main path, which is enough to get you the outcome. Switch to **Advanced** and deeper parts open in place, for when you already do this for a living or want the full method. The switch sits at the top of every chapter and is remembered on this device.

> **Doubts?**
>
> Ask [**Shaktimaan** (opens in a new tab)](https://growthx.club/community/shaktimaan) or post in [#build-sprint (opens in a new tab)](https://growthx.club/community/build-sprint). Ask before you lose the hour.
