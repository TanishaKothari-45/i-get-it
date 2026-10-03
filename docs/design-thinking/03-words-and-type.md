<!-- Source: https://growthx.club/learn/build-sprint#/design-words · captured 2026-10-04 from the GrowthX Build Sprint handbook (login-gated). Verbatim text, converted to markdown. Advanced-level blocks included. -->

# Words and type

The words on your first screen are the first thing a stranger judges, and the fonts decide how those words sound. This chapter gets you a headline, the line under it and a button that you wrote yourself, and a font you chose last, on purpose.

> **By the end of this chapter you'll have**
>
> **Your first screen, in your words.** The headline, the line under it and the button on your first screen, written by you, plus your type and colour.
>
> Example **Headline:** Know your lunch's calories in 5 seconds. **Under it:** Snap your plate. We name the dish and the calories. Built for Indian food. **Button:** Snap your meal. **Type:** one typeface, three sizes, the calorie number biggest.

## Never let your AI write your copy

This is the script. Your crew can build any set you describe, but it can't write your lines: left alone, it says what every other film says.

Rule number one on design and copy: you cannot let AI write. The copy of your website, and the rest. Whenever you do, you have to enable an editor mode, so even if it generates something, you delete it and edit it.

That sounds strict until you see why.

Can AI write really good content? It doesn't yet, and the reason is verification. In code, you know if it works or not: you run it, there's no error, and the model gets a loop, so it keeps getting better. You can't do that with content. How do you tell good content from bad?

Take Diwali. It's a season when people buy a lot, so the copy should talk about the sale. Do you think that's going to work? It won't. At Diwali everyone is shouting “sale”. If we can't figure out what will work, AI 100% can't.

So AI copy isn't wrong. It's average: the sentence most likely to come next, which is the sentence already on a thousand other pages. Your words come from somewhere it can't reach: the person you spoke to, the phrase they used, the thing they were worried about. Back in Product thinking you wrote the job (see ../product-thinking/01-the-job.md) in their words. That sentence is your raw material.

**Editor mode**, in practice: if your agent drafts anything a user will read, treat it as a placeholder. Rewrite every line yourself, out loud, in the words your user would use.

It's a skill, so practise it. [Shreyas Doshi suggests (opens in a new tab)](https://x.com/shreyas/status/1730660040124887260) rewriting the mediocre email and app copy that big companies send you, and your inbox has plenty. Try one a day, in words a person would actually say.

> **[Advanced]**
>
> ### Advanced Where the words come from: reviews and long-running ads
>
> Your user's words are the best raw material for copy, and you don't have to invent them. People describing the same problem have already written them down, in public.
>
> **Reviews first.** The copywriter Joanna Wiebe [took a winning headline word for word from an Amazon book review (opens in a new tab)](https://www.youtube.com/watch?v=hAGHdhK4o2g&t=222s). Do the same: read the one- to three-star reviews of the apps your user has already quit, and copy out the phrases that describe the pain. For PhotoCal, a line like “takes forever to log one meal” is worth more than anything you'd write from your desk.
>
> **Then ads.** The [Meta Ad Library (opens in a new tab)](https://www.facebook.com/ads/library) shows the ads running on Facebook and Instagram, searchable by advertiser. Look up the products your user would compare you with, and find the ads that have been running for months: someone chose to keep paying for those. Break each one into its parts: the hook, the pain it names, what it shows, the worry it answers, and what it asks you to do.
>
> The risk here is false confidence. An ad that runs a long time hints at what works; it doesn't prove the ad makes money. And copying a competitor's promise puts you back at the average, the same sentence on two pages.
>
> So use what you find as evidence, not as copy. Note the phrases that repeat across reviews and ads, then write your own headline from them, in editor mode. If it says exactly what every competitor's ad says, start again.

> **[Advanced]**
>
> ### Advanced The words your AI says
>
> In an AI product, a lot of what people read is written live by the model: every answer, every follow-up question. You can't write those one at a time, so the rule moves up a level. You don't write the replies; you write the rules and the examples the replies are written from.
>
> Those rules live in the instructions your backend sends with every request, the part of the harness covered in Connecting the AI (see ../tech-thinking/04-connecting-the-ai.md). Most builders leave the voice out of them entirely, which is how a friendly app ends up answering like a nutrition textbook.
>
> Four things are worth writing down:
>
> - **Length**: How long an answer is allowed to be. For PhotoCal: one line. The dish, then the calories.
> - **Certainty**: How it sounds when it isn't sure. “Looks like rajma chawal, about 480 kcal” is honest. “I believe this may be rajma chawal” is a disclaimer, and “Rajma chawal: 482 kcal” claims a precision it doesn't have.
> - **Never**: What it must not do. PhotoCal never comments on the meal, never mentions diets, never says “great choice”. Rohan opened it to know, not to be judged.
> - **Examples**: Two good replies and one bad one, written by you. Examples steer the tone far more precisely than adjectives like “friendly” or “concise”, which every model reads as average.
>
> Then read a sample. Run twenty real photos, read the replies aloud, and mark anything you wouldn't say yourself. When something's off, change the rule or the example, not the one reply, so the fix applies to every answer after it. That's editor mode, for words you'll never see written.

## The first screen has about ten seconds

A stranger opens your link from a WhatsApp message. You aren't there to explain it.

People often leave a web page within 10 to 20 seconds, and to hold them longer, [NN/g found (opens in a new tab)](https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/), a page has to make its value clear within the first 10. For most v1 products the first screen is the empty, first-visit version of your main screen (chapter 2), so its words do two jobs at once: they explain the product and they start the flow. For PhotoCal, a first visit to Home shows the three lines below; “No meals yet today” is what Rohan sees when he comes back the next day. Three pieces of text carry nearly all the weight.

- **The headline**: The outcome, in your user's words. What they get, not what you built.
- **The line under it**: How it works and who it's for, in one sentence.
- **The button**: What happens when they tap. [NN/g (opens in a new tab)](https://www.nngroup.com/articles/get-started/) found “Get started” is ambiguous, because it could mean almost anything. A button is a promise; make it one they can check.

Nothing else goes on the part of the screen you see before scrolling, which designers call “**above the fold**”. Every extra line competes with the one thing you want them to do.

The hardest of the three is the headline, because the first one everyone writes describes the product. Here is PhotoCal's, rewritten four times.

- **Try 1Describes the product. Rohan doesn't want nutrition tracking: he's quit it twice.**: AI-powered nutrition trackingNot yet
- **Try 2Still the product, with a verb in front**: Track your calories with AINot yet
- **Try 3Better: says who it's for. Still no outcome.**: Calorie counting for Indian foodNot yet
- **PassesThe outcome, in his words, with the one number that beats today**: Know your lunch's calories in 5 secondsPasses

*Figure: Each rewrite moves from what you built to what they get.*

Before you keep a headline, run the copywriter Harry Dry's [three questions (opens in a new tab)](https://www.youtube.com/watch?v=OkehiNcC5zw&t=4s) on it: can you visualise it, can you falsify it, and could nobody else say it? “Know your lunch's calories in 5 seconds” passes: you can picture the plate, you can time it, and an app built around barcodes can't claim it.

**Says nothing**
Get started
Submit
Learn more
Continue

**Says what happens**
Snap your meal
Save to today
Retake the photo
Change the dish

*Figure: The same button, before and after. The right-hand ones can only mean one thing.*

Think of your landing page as the product spec of what you're building.

Which gives you a test that runs both ways. If you can't write the headline, you don't yet know what you're building, and no amount of design will fix it. Go back to the job.

**The five-second test.** Show your first screen to someone for five seconds, hide it, and ask two questions: what does this do, and what would you tap? If they can't answer both, rewrite it. A friend on a video call is enough.

**Say this to your agent**

```
Here is my first screen. Headline: [ ]. Line under it: [ ]. Button: [ ].
Don't rewrite any of it. Pretend you're a stranger who opened this from a WhatsApp message and saw it for five seconds.
Tell me what you think it does, what you'd tap, and which word you skimmed past or didn't understand. Then ask me questions until I've fixed it myself.
```

> **[Advanced]**
>
> ### Advanced Letter spacing and line breaks in a headline
>
> Once the words are right, two small things decide whether the headline looks set by hand or poured in: the space between its letters, and where its lines break.
>
> **Letter spacing.** Fonts are spaced for reading sizes, so at headline sizes the same spacing tends to look loose. That's why headlines are tightened by a few percent (the extension in chapter 1 uses minus 4%) and small uppercase labels opened up. Change it in tiny steps, on a phone, not a laptop.
>
> **Line breaks.** A browser breaks a line wherever it runs out of room, which can leave one word alone on the last line, or split a phrase that belongs together. On the first screen, break the headline by hand: “Know your lunch's calories / in 5 seconds” keeps the promise in one piece. For other short headings, a CSS setting called [text-wrap: balance (opens in a new tab)](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap-style) evens out the line lengths automatically.
>
> **Sizes that follow the screen.** On the GrowthX extension, letter spacing and font size change with the viewport. The usual way to do that is CSS [clamp() (opens in a new tab)](https://developer.mozilla.org/en-US/docs/Web/CSS/clamp), which lets a size grow with the screen between a minimum and a maximum you set. That way the headline is big on a laptop and still fits in two lines on a small phone.
>
> The price of all three is attention to detail on every screen width. A hand-made line break that looks perfect at 390 pixels can strand a word at 320. So check the first screen at three widths, the smallest phone, a normal phone and a laptop, before you call it done.
>
> **Say this to your agent**
>
> ```
> Set my first-screen headline by hand: break it after "[word]" on phones, tighten its letter spacing slightly, and make its size follow the screen width (smallest on a 320px phone, largest on a laptop) without ever going over two lines.
> Then show me screenshots at 320px, 390px and 1280px wide.
> ```

## Fonts are how you say it

If a website were a person:

- **Colours and UI**: The clothes I'm wearing.
- **Copy**: The choice of words, and how crisp they are.
- **Fonts**: How I'm saying it: loud or soft, articulate or not. Very few people care about fonts. Fonts make or break it.

You saw it on the Shopify page: the design is a website, but the fonts are a magazine. Same words in another typeface, and it would have said something else.

Fonts come later, by the way. Once your design and user flow are done, that's when you start looking at fonts.

There are websites that do font pairing: just search for font pairing. They show you pairs and generate new ones, so you don't need to use your brain too much. Then build your own taste and opinion. [Fontjoy (opens in a new tab)](https://fontjoy.com) generates pairings in one click; [Typewolf (opens in a new tab)](https://www.typewolf.com) shows fonts in use on real sites, with the combinations that work.

For a v1, one typeface is enough and two is the most you need: one for headings, one for everything else. PhotoCal uses one, [Inter (opens in a new tab)](https://fonts.google.com/specimen/Inter), in three sizes, and the calorie number is the biggest thing on every screen, because it's the one thing Rohan came for.

If you've never chosen any of this before, five defaults from designers who teach non-designers hold up well:

- **Emphasis**: Try weight and colour before size. [Steve Schoger (opens in a new tab)](https://x.com/steveschoger/status/910162010754748416), co-author of Refactoring UI, shows that a bolder or darker line often does the job of a bigger one.
- **Space**: Start with [more spacing than you think you need (opens in a new tab)](https://x.com/steveschoger/status/1351552879715344384).
- **Letter spacing**: Headlines [slightly tighter, small uppercase labels slightly looser (opens in a new tab)](https://x.com/steveschoger/status/1204433950518792192).
- **Colour**: One accent, used only on the main action, plus one colour for errors. When the accent appears only on the thing to tap, every screen tells the thumb where to go.
- **Shape and size**: [One corner radius, and two or three type sizes (opens in a new tab)](https://x.com/andriidesign1/status/2074879421610094601), across the whole product.

Not sure which numbers? Start from PhotoCal's and change one only when you can say why: 16 for body text, 20 for headings, 40 for the one number or headline per screen; near-black text on an off-white background; one accent colour on the main button, and red only for errors.

**▸ Common mistakes — Five ways the first screen goes wrong**

- **A headline about you**: “Welcome to PhotoCal” or “Meet your AI nutritionist” is about the product. The stranger is asking what's in it for them.
- **Clever over clear**: A pun the reader has to decode costs seconds you don't have.
- **AI placeholder left in**: Your agent's draft copy ends up live more often than anyone admits. Read every screen aloud before you share the link.
- **Fonts first**: Choosing fonts before the flow works is decorating a house before the walls are up.
- **Three fonts and seven sizes**: Every extra size is one more thing the eye has to rank. Three or four sizes cover a whole product.

**▸ Watch: Three copywriting rules — Harry Dry with David Perell, 0:00 to 8:40**

Harry Dry with David Perell. Play [0:00 to 8:40 (opens in a new tab)](https://www.youtube.com/watch?v=OkehiNcC5zw): one test for any sentence on your first screen.

**Watch for** his three questions: can you picture it, could it be proven false, and could nobody else have said it.

> **[Advanced]**
>
> ### Advanced A type scale: three or four sizes, measured
>
> A **type scale** is the short list of text sizes your product is allowed to use. Without one, your agent picks a size on the spot every time: 15 here, 17 there, 22 for a heading that should have been 20. Each choice is fine alone. Together they make a product feel slightly off, in the way a subtle page does, without anyone being able to say why.
>
> Most products need three or four: a display size for the one number or headline per screen, a heading size, a body size, and perhaps a small one for labels. PhotoCal's are 40, 20 and 16. The time under each meal is 16 in grey, not a fourth size: weight and colour do the rest, so a bold 16 reads as more important than a grey 16.
>
> Keep the steps far apart. If two sizes are close, like 16 and 17, the eye can't tell which matters more, so the difference looks like a mistake rather than a decision. One simple way to choose is to start from the body size and multiply by the same number each step up (16, 20, 25, 31, 39 at 1.25; PhotoCal rounds the last to 40), then keep only the steps you need.
>
> Line height travels with size. Body text usually reads well at roughly one and a half times its size; a big headline needs much less, or its lines drift apart.
>
> Then measure, because your agent's “I used the type scale” and the page it built are two different claims. Ask for a list of every font size actually rendered on each screen at phone width. Anything not on your list is either a bug or a size you forgot to decide. Write the scale into DESIGN.md as named sizes (display, heading, body, small) and add one rule: no other sizes without asking.

- **Skills you already installed in Setup**: **`copywriting`**Ask it to critique your headline and buttons: what's unclear, what a stranger would miss. You still write the words.

## Your first screen, and your type

These are sections 3 and 5 of DESIGN.md. The words are yours; the agent only gets to check them.

**DESIGN.md · 3. Type and colour, 5. The first screen**

```
## 3. Type and colour
Font: [one typeface, two at most]
Sizes: display [ ] for [the one number or headline] · heading [ ] · body [ ] · small [ ]
Text: [colour] on [background]
Accent: [colour], only on [the main action]
Errors: [colour]

## 5. The first screen's words (written by me, not the AI)
Headline: [the outcome, in my user's words, under ten words]
Under it: [how it works, and who it's for, in one sentence]
Button: [what happens when they tap]
Five-second test: [who I showed it to] said it does [their answer] and they'd tap [their answer]
```

> **Doubts?**
>
> Ask [**Shaktimaan** (opens in a new tab)](https://growthx.club/community/shaktimaan) or post in [#build-sprint (opens in a new tab)](https://growthx.club/community/build-sprint). Ask before you lose the hour.
