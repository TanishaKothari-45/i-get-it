<!-- Source: https://growthx.club/learn/build-sprint#/design-brief · captured 2026-10-04 from the GrowthX Build Sprint handbook (login-gated). Verbatim text, converted to markdown. Advanced-level blocks included. -->

# Teaching your AI your taste

Everything you've noticed and named so far lives in your head, and your AI starts every chat without it. This chapter puts it in DESIGN.md, where the AI reads it every time, and gives you a small daily loop that makes each screen start closer to what you want.

> **By the end of this chapter you'll have**
>
> **DESIGN.md, and a loop.** DESIGN.md in your project with a reference for each component, read by your agent before any screen work, and a habit where each correction you make becomes a principle it keeps.
>
> Example **Reference, Result photo:** a pin found with “overhead food photography, natural light”. Take: the plate from above, warm light. Ignore: the props. **Principle kept on day two:** every AI answer can be corrected in one tap.

## Your AI starts from the average, every time

Every new chat with your agent starts from zero: it doesn't remember yesterday's “no, smaller” unless it's in a file it reads. With nothing to go on, it picks the most likely choice, which is the most common one.

Karri Saarinen, Linear's co-founder, put it plainly: with AI [“you can get to the average level maybe” (opens in a new tab)](https://www.youtube.com/watch?v=AVRVMSHjrac&t=1785s), but going beyond it still takes your own work, and “when something is easy to do, you stop paying attention to it.”

That's why “make it premium” never works. If you ask it to make it 100x more premium, it's going to do something you'll call good enough. Don't do it.

The fix has two halves. Show it exactly what you mean, one **component** at a time (one piece of a screen: a button, a card, a list, the big number on PhotoCal's Home): those are your **references**, the director's mood board. Then write down what you decided, so it never has to guess again: that's **DESIGN.md**, the shot list.

## A reference for every component, not for the website

In design, it's not enough to give a reference of a website. You have to give a reference for every component. For this component I'll search Pinterest and a few other places, find a similar component, then tell AI to build that.

Here's why. A whole website is thousands of decisions, and “make it like Airbnb” leaves your AI to choose which ones you meant, so you get the average of Airbnb. One component holds a handful of decisions, and with your words next to it there's almost nothing left to guess. (You met this rule on Lock your idea (handbook page #/lock-your-idea); here's how to do it.)

### Search with a label

Pinterest is the best place for inspiration. Say you're building a habits app. If you search “workout”, you get workout. A habits app is about motivation, so search “motivation, inspiring workout”.

That's chapter 1's label skill, used as a search box.

### Like the treatment, not the picture

Say one of the results is a quote poster: a gym photo with a line of motivation printed across it.

Screw the quote on it. I like the treatment. See how the image fades, the contrast is reduced, the face isn't shown, the muscle is implied through the t-shirt, and the sweat is shown more than the muscle. I like that implication.

The **treatment** is how a thing is done, separate from what it shows: the crop, the light, the contrast, what's left out. You're never copying the picture. You're copying the treatment onto your own content.

### Give it the image and your words

Paste the image and describe it. If you just say “analyse this image and tell me what you've understood”, it won't understand it the way you want it to. Label, describe, give the image, and your outputs will be ten times better.

**Say this to your agent**

```
Here's a reference for one component: [the component, e.g. the Result screen's photo]. [attach the image]
Take: [exactly what to copy, as labels: the crop, the light, the spacing, the motion]
Ignore: [what's in the image that isn't the point]
Build only this component, on my real screen, with my own content. Show me at phone width and wait for my yes before touching anything else.
```

## Where to find references

Pick the place by what you need:

- **Mood and treatment**: [Pinterest (opens in a new tab)](https://www.pinterest.com), searched with precise words, as above. [Cosmos (opens in a new tab)](https://www.cosmos.so) is smaller and more curated, and lets you search by colour.
- **App screens and flows**: [Mobbin (opens in a new tab)](https://mobbin.com): real screens and recorded flows from shipped apps, searchable by flow, like onboarding or an error. Study the steps and the words, not the colours. [Page Flows (opens in a new tab)](https://pageflows.com) has recorded flows, step by step.
- **Websites and first screens**: [Land-book (opens in a new tab)](https://land-book.com) for landing pages; [Recent (opens in a new tab)](https://recent.design) (formerly Godly) for more ambitious sites.
- **Motion**: [60fps (opens in a new tab)](https://60fps.design): animation and interaction details from real apps, the motion words from chapter 1 made visible.
- **Type**: [Fonts In Use (opens in a new tab)](https://fontsinuse.com): typefaces in real work, not as specimens.

One warning. When everyone references the same few galleries, [everyone ends up at the same answers (opens in a new tab)](https://x.com/armondme/status/2094077384404443466). So look outside screens too: a film poster, a menu, a magazine. [One designer (opens in a new tab)](https://x.com/tani_visual/status/2094128171582972297) finds the best thumbnail ideas in movie posters, not Pinterest. Treatments travel.

Screenshot what you find and write your label next to it straight away: the designer Nikhil Pawar's rule is [one screenshot, one clear reason (opens in a new tab)](https://www.youtube.com/watch?v=e1dXUoqal6k&t=163s). A reference without its words is only half a reference.

> **[Advanced]**
>
> ### Advanced Let your agent search real apps: Mobbin's MCP
>
> An **MCP** (Model Context Protocol) server is a connection that gives your agent a new tool. [Mobbin's (opens in a new tab)](https://mobbin.com/mcp) connects agents to over 600,000 real product screens, so your agent can look up how shipped apps handle a step before it designs yours. It's available on Mobbin's paid Pro and Team plans.
>
> Used well, it changes the order of work. Instead of describing a screen and hoping, you ask the agent to find five real versions of that screen first, show them to you side by side, and say what each one does differently. You pick one, label what you're taking from it, and only then does it build.
>
> Used badly, it brings the average straight back. If the agent picks the references, it picks the most common pattern, which is exactly what you were trying to escape. The choosing and the labelling stay with you. That's the director's job, and no tool does it.
>
> **Say this to your agent**
>
> ```
> Use the Mobbin MCP to find five real examples of [the screen or step, e.g. an empty state for a food log] from shipped apps.
> Show them to me side by side, and for each one say in one line what it does differently.
> Don't build anything. I'll pick one and tell you exactly what to take from it.
> ```
>
> If you don't have the paid plan, do the same by hand: search Mobbin's site, screenshot the five, and paste them in with the same request.

## DESIGN.md: the shot list your AI reads

A director doesn't explain the film to the crew every morning. There's a shot list, and everyone reads it first.

DESIGN.md is that list: one file in your project folder with everything you've decided about how the product looks and reads. You've already written most of it in chapters 2 and 3. This chapter adds the three parts only you can write: the feeling in labels, the references, and the principles.

You don't have to start from a blank page. [getdesign.md (opens in a new tab)](https://getdesign.md) and [Refero Styles (opens in a new tab)](https://styles.refero.design) collect DESIGN.md files modelled on real products' styles, and [shadcn/ui (opens in a new tab)](https://ui.shadcn.com) is a set of ready-made components whose code lives in your project; [its creator suggests (opens in a new tab)](https://x.com/shadcn/status/2097011536367931596) starting there and asking your agent to customise them. The price: borrowed taste shows. Karri Saarinen recalls a product whose standard component library [“made it look like a hack project” (opens in a new tab)](https://www.youtube.com/watch?v=AVRVMSHjrac&t=306s). Use the borrowed base for the basics, then replace it with your own decisions.

One thing trips people up: your agent doesn't read DESIGN.md just because it exists. Add one line to AGENTS.md telling it to read DESIGN.md before any screen work. The line is at the end of this chapter, and Working with your agent (see ../tech-thinking/02-your-agent.md) sets up AGENTS.md.

> **[Advanced]**
>
> ### Advanced Design tokens: names your agent must use
>
> Even with DESIGN.md, an agent building its fifth screen will sometimes reach for a slightly different grey or a 15-pixel gap, because nothing stops it. **Design tokens** stop it.
>
> A token is a named value. Instead of “#1A1A1A”, the colour is called `text`; instead of “16px”, the size is `body`. You decide the list once, and every screen uses the names, never the raw values. Change the token and every screen changes with it.
>
> - **Colours**: `text` near-black · `bg` warm off-white · `accent` turmeric, main action only · `error` red, errors only
> - **Type**: `display` 40 · `heading` 20 · `body` 16
> - **Space**: `s` 8 · `m` 16 · `l` 24 · `xl` 40
> - **Shape**: `radius` 16 on cards and buttons, nothing else rounded
>
> That's PhotoCal's whole set, and it's enough. Notice the short lists: four colours, three sizes, four spaces, one radius. Each extra token is one more choice the agent can get subtly wrong.
>
> Put the tokens in DESIGN.md and ask your agent to define them once in the code (as CSS variables or in your styling setup) and use only those names. Then you can check: ask it to search the code for any colour or size written as a raw value outside the token file. Each hit is a place your taste leaked.
>
> Tokens even have a shared format. The [Design Tokens Community Group (opens in a new tab)](https://www.designtokens.org/) publishes a standard way to write them as a file that design tools and code can both read. You don't need it this week; a list in DESIGN.md does the job. It matters when a designer joins and you want their tool and your code to share one source.
>
> The price: tokens make the first screen slightly slower to set up and every later screen faster and more consistent. For a product you'll touch for one evening, skip them. For one you'll change daily for a week, they pay back by the third screen.

## Small things, over three days

When you tell your AI small, small, small things, after three days someone says, I really like your product, the UI is great. How did you do it? It took three days. Not a single-shot prompt.

This is the hard part, because it's slow. Most people write one long prompt, get something average back, and decide the AI has no taste. It has exactly as much of your taste as you've written down.

- **1**: Find · A reference for one component, searched with a label.
- **2**: Hand over · The image and your words: what to take, what to ignore.
- **3**: Build · The agent builds that one component, on your real screen.
- **4**: Label · You name exactly what's off, as an element and what it does.
- **5**: Keep · The lesson goes into DESIGN.md as a principle. The one-off fix doesn't.
- **↻**: Again · Back to step 1 · Each turn starts from what the last one taught you.

*Figure: Every turn makes the next screen start closer to your taste. Three days of small turns beat one long prompt.*

All of this is teaching the AI how to think, the way I'm teaching you. Once it takes in that kind of instruction, the next time you create a website it creates it with a lot more detail. It's a slow process, and you're still the person on top of the horse.

At the end of a long chat I run a command called /learn. It proposes what it thinks it should learn, and I keep one, two or three, or correct them. Keep principles, not tactical mistakes, in your CLAUDE.md file. When it proposes a learning like “I made a mistake here, I should always have checked”, drop it. That's not a learning: it might do it this time and not next time, it's a probability thing.

In this sprint, design principles go in DESIGN.md, section 6, and rules about how your agent works go in AGENTS.md. AGENTS.md tells your agent to read DESIGN.md, so it sees both.

You don't need the command itself. At the end of a long chat, ask for the same thing in plain words, and keep the answers in DESIGN.md:

**Say this to your agent**

```
We've done a lot in this chat. Propose up to five things you learned about how I want this product to look and read.
Write each as a principle that would hold on every future screen, not as a fix to one screen or a note about a mistake you made.
Don't save anything. I'll pick which ones to keep and correct the wording.
```

**Tactics: drop them**
Fixed the padding on the Result button
I forgot to check the phone width that time
Changed the green to a darker green

**Principles: keep them**
One main action per screen, in thumb reach
Every AI answer can be corrected in one tap
No colour or size outside the ones in DESIGN.md without asking

*Figure: Keep the right-hand column. Drop the left.*

> **Remember this**
>
> A prompt is used once. A principle in DESIGN.md is used on every screen you haven't built yet.

You can use AI to learn the labels, too. Ask it what this treatment means, and give it several images, not one. Sometimes ask: is this the same treatment as that one? Learn the difference so it doesn't get confused. It will still make mistakes, and that's okay. We keep improving.

**Say this to your agent**

```
Here are [four] images I like. [attach them]
Don't describe what they show. Name the treatment they share, in exact design words (crop, contrast, letter spacing, radius, shadow, easing), and say where they differ.
Then tell me the one phrase I should use when I ask for this treatment.
```

**▸ Common mistakes — Five ways the brief fails**

- **A brand as the reference**: “Like Airbnb” or “like Notion” hands your AI thousands of decisions to guess between.
- **One image and “analyse this”**: It describes the picture, not the treatment you liked. Give several images and your words.
- **A whole screenshot for one change**: If you want the button, crop to the button.
- **Saving every correction**: A DESIGN.md full of one-off fixes becomes noise the AI half follows. Keep principles, and prune it every couple of days.
- **Rules that fight**: “Minimal” in one line and “rich, layered visuals” in another: the AI satisfies one at random. Read the file top to bottom once a day.

**▸ Watch: Ideas from references — Tom Creighton, The Futur, 1:00 to 3:00**

Tom Creighton, The Futur. Play [1:00 to 3:00 (opens in a new tab)](https://www.youtube.com/watch?v=qyjQ3qtvjBw&t=60s): a five-step process from a brief to references to an idea of your own.

**Watch for** around 2:10, “step two is stop thinking”: collect widely before you judge.

> **[Advanced]**
>
> ### Advanced Point at the screen instead of describing it
>
> Labels are the director's vocabulary, but sometimes the fastest way to say “that one” is to point. Three habits make your corrections far more precise.
>
> **Annotate the running app.** [Agentation (opens in a new tab)](https://agentation.dev) adds a small toolbar to your app while you build. You click any element, type a note, and it copies a structured description (which element, a selector your agent can search the code for, your note) that you paste into Claude Code or Codex. “Make this smaller” stops being ambiguous, because the agent knows exactly which “this”. It works on desktop browsers, so use it on your laptop with the window narrowed to phone width.
>
> **Screenshot and compare.** After each component is built, ask the agent to open the app at phone width, screenshot the screen and each of its states, and compare them against the reference and DESIGN.md before telling you it's done. If your agent can't drive a browser, take the screenshots on your own phone and paste them in. Either way, the comparison is against something you can both see, not against its memory of what you said.
>
> **Say this to your agent**
>
> ```
> Open the app at 390px wide. Screenshot [the screen] in each of its states (empty, loading, error, done).
> Compare each screenshot with the reference I gave you and with DESIGN.md. List every difference, smallest first: spacing, sizes, colours, alignment, words.
> Don't fix anything until I've read the list.
> ```
>
> **Ask for options, then reject most.** The designer Sara Vienna describes trying [ten directions and self-editing before showing three winners (opens in a new tab)](https://www.youtube.com/watch?v=Ni353KPXuzU&t=1244s). With an agent that's cheap: ask for three versions of one component side by side, keep one, and say in labels why the other two lost. Taste with an AI is mostly editing, and rejecting is where your labels get sharp.
>
> All three habits cost a few minutes per component and save the round trips where you and the agent argue about different screens. They also make your labels better over time: when the agent's description of a difference uses a word you didn't have, write it down. That's a new label for chapter 1's list.

- **Skills you already installed in Setup**: **`impeccable`**When it works but looks rough. Type /impeccable for its menu: critique, polish, distil. **`art-direction`**Gives the project one visual point of view before any image is made: the hero, the share image, empty states.

## Your DESIGN.md

These are sections 1, 2 and 6 of DESIGN.md, plus the line that makes your agent read it. With chapters 2 and 3, the file is done for today. It'll be better tomorrow.

**DESIGN.md · 1, 2 and 6, plus the line for your agent**

```
Add this line to your AGENTS.md:
Before building or changing any screen, read DESIGN.md and follow it. If a choice isn't covered there, ask me instead of guessing.
(If your project also has a CLAUDE.md, its very top line should be: @AGENTS.md)

## 1. The feeling, in labels
- [element]: [what it does], [how]
- [element]: [what it does], [how]
- [element]: [what it does], [how]

## 2. References, one per component
[Component]: [image file in /references, or a link]
Take: [exactly what to copy]
Ignore: [what isn't the point]

[Next component]: ...

## 6. Principles (kept, not tactics)
- [a rule that holds on every screen]
- [added on day _]: [ ]
```

## Send it to Shaktimaan

Write DESIGN.md down before you build a screen, and add a principle each time you correct your AI. Then send the whole page to [**Shaktimaan** (opens in a new tab)](https://growthx.club/community/shaktimaan) with the prompt below. It checks the same things these chapters teach and tells you what to fix.

**Say this to Shaktimaan**

```
Shaktimaan, here's my DESIGN.md for Build Sprint. Check it the way the Design thinking pages on the dashboard teach: labels instead of vague words, one reference per component with what to take and what to ignore, one font, a few sizes and the colours, every screen with its empty, loading, error and done states, first-screen words that say the outcome, and principles that hold on every screen. Tell me the weakest part first and make me rewrite it. Don't write it for me.
```

> **Doubts?**
>
> Ask [**Shaktimaan** (opens in a new tab)](https://growthx.club/community/shaktimaan) or post in [#build-sprint (opens in a new tab)](https://growthx.club/community/build-sprint). Ask before you lose the hour.
