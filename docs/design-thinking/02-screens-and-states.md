<!-- Source: https://growthx.club/learn/build-sprint#/design-screens · captured 2026-10-04 from the GrowthX Build Sprint handbook (login-gated). Verbatim text, converted to markdown. Advanced-level blocks included. -->

# Screens and states

Your flow is a list of steps. This chapter turns it into the few screens a stranger will actually see, on a phone, each with one job, and writes the words for every version of each screen, not only the happy one.

> **By the end of this chapter you'll have**
>
> **Your screen list.** Every screen in your core flow and onboarding, each with one main action, and the words for its empty, loading, error and done versions.
>
> Example **Home:** today's total, today's meals, “Snap your meal”. **Camera:** the phone's own. **Result:** the photo, “Rajma chawal, about 480 kcal”, Change, Save. **Empty, first visit:** the first screen's words (chapter 3). **Empty, coming back:** “No meals yet today. Snap your lunch to see its calories.” **Error:** “That doesn't look like food. Try a photo of your plate from above.”

## Your flow already knows how many screens you need

In User flows (see ../product-thinking/03-the-core-flow.md) you wrote your core flow as numbered steps, from the moment it hurts to the job done. That list is the raw material for every screen. The steps decide the screens, not the other way round.

In the director's terms, these are your shots. Each one has a single job, and a good director plans every take a stranger might see, not only the one where everything goes right.

Most people go the other way. They picture an app (a home page, a dashboard, settings, a profile) and then squeeze the flow into it. That's how products end up with screens nobody needed, each one another place for a stranger to get lost.

The same holds inside a screen. Linear's co-founder Karri Saarinen puts it as [“taste is often what you refuse to add” (opens in a new tab)](https://x.com/karrisaarinen/status/2029790574354792781). Every extra label, icon, badge or second button makes the one main action a little harder to find. Before anything goes on a screen, ask which step of the flow it serves.

- **1**: Verbs · Write the flow as verbs · Open, snap, wait, see, fix, save, check the total. Each verb is something the person does or waits for.
- **2**: Group · One main action per screen · Group the verbs around the one thing each screen asks for. A screen that asks for two things usually gets neither.
- **3**: Merge · Count, then merge · Waiting and seeing the answer can share a screen. So can saving and seeing the new total. Every merge is one less place to get lost.
- **4**: Describe · Four lines per screen · What it's for, what's on it from top to bottom, its one main action, and where that action goes. Whatever you leave blank, your agent guesses.
- **5**: Sketch · Boxes on paper · Stuck? Draw each screen as boxes, photograph the page and give it to your agent with your four lines.

*Figure: Five moves turn a flow into screens. Run on PhotoCal, seven verbs become three screens. The flow decides the screens; the screens never decide the flow.*

PhotoCal: seven steps, three screens:

- **Home**: **For:** seeing today at a glance and starting a snap. **Top to bottom:** today's total, today's meals, one big “Snap your meal” button. **Action:** Snap your meal → Camera.
- **Camera**: The phone's own camera. You don't design it: a button on a web page can [open the camera directly (opens in a new tab)](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture), so this screen comes free.
- **Result**: **For:** seeing what the AI read, and fixing it. **Top to bottom:** the photo, “Rajma chawal, about 480 kcal”, Change, Save. **Action:** Save → Home, with the new total.

When you're stuck on how a step should look, a great place to look at interfaces and user flows is [Mobbin (opens in a new tab)](https://mobbin.com). Search for the flow, see how others solve it, and then understand why they do it. Don't blindly copy it. (Chapter 4 turns what you find into references your AI can use.)

**Say this to your agent**

```
Read PRODUCT.md. Here is my core flow: [paste it]. Here is my screen list, four lines per screen: [paste it].
Before any code, check it: is every step of the flow on a screen, does each screen have one main action, and could any two screens merge? Tell me what you'd change and why, and wait for my yes.
```

> **[Advanced]**
>
> ### Advanced Wireflows: every screen and arrow on one page
>
> A screen list tells your agent what exists. It doesn't show how a person moves between screens when something goes wrong, and that's where most bugs in a v1 live.
>
> A **wireflow** fixes that. [NN/g describes it (opens in a new tab)](https://www.nngroup.com/articles/wireflows/) as wireframe-style page layouts combined with a simplified flowchart, and says it suits products with a few core pages whose content changes, which is exactly what most Build Sprint products are.
>
> You don't need a tool. On one sheet of paper, draw each screen as a small phone-shaped box with its few elements roughed in. Under each box, write its states in a word each: empty, loading, error, done. Then draw the arrows: one for the main action, and one for every way out of an error. Label each arrow with the words on the button that causes it.
>
> For PhotoCal, the sheet shows three boxes and six arrows. Snap your meal goes from Home to Camera; the photo goes to Result; Save goes back to Home. Then the arrows people forget: Retake goes from the error state back to Camera, Change opens the dish name for editing, and closing the camera without a photo returns to Home with nothing changed.
>
> Three things show up on a wireflow that hide in a list: a screen with no arrow leaving it (a dead end), an error with no way back except the browser's back button, and two buttons with the same words that go to different places, which confuses people and agents alike.
>
> Photograph the sheet and give it to your agent with your four lines per screen. Ask it to list every arrow it sees before it builds, so you catch what it misread while it's still a drawing.

## Phone first, because that's where your link opens

You'll build this on a laptop. Most people will never see it on one.

In India, [77.3% of web page views in September 2026 (opens in a new tab)](https://gs.statcounter.com/platform-market-share/desktop-mobile-tablet/india) came from phones. Your link will travel on WhatsApp, and that's where it gets opened: on a phone, often one-handed, on mobile data, between two other things. So design every screen for the phone first, and let the laptop be the phone version with more room. Five checks catch most of what goes wrong, on your own phone, in two minutes.

- **Big tap targets**: [Apple (opens in a new tab)](https://developer.apple.com/design/human-interface-guidelines/buttons) asks for at least 44 by 44 points and [Android (opens in a new tab)](https://developer.android.com/guide/topics/ui/accessibility/apps) for 48 by 48, so a fingertip hits them easily.
- **The main button within thumb reach**: In [a 2013 study that watched 780 people tapping their phones in public (opens in a new tab)](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php), 49% held and tapped with one hand. Put the main action low, not in a top corner.
- **Nothing under the keyboard**: Tap every field and type. The keyboard covers the bottom of the screen, which is often where your button is.
- **Readable text**: Apple's [default text size (opens in a new tab)](https://developer.apple.com/design/human-interface-guidelines/typography) on iPhone is 17 points. If you have to pinch to read it, it's too small.
- **One column**: Stack everything top to bottom. Nothing should scroll sideways.

PhotoCal: “Snap your meal” runs the full width of the screen near the bottom, where Rohan's thumb already is. When the keyboard opens to change a dish, Save stays visible above it.

If your product lives in WhatsApp, you still have a UI. The best product UI in one GrowthX Build Week was a WhatsApp product: the UI was mostly how the chat came in, and even that looked really good. For a chat product, your screens are messages, and everything in this chapter applies to them.

> **[Advanced]**
>
> ### Advanced Contrast and size you can measure
>
> “Make the text readable” is a feeling. There are numbers behind it, and your agent can check them, which turns an argument about taste into a test.
>
> **Contrast** is measured as a ratio between the text colour and the background colour, from 1:1 (the same colour) to 21:1 (black on white). The web's accessibility standard, WCAG, asks for [at least 4.5:1 for normal text and 3:1 for large text (opens in a new tab)](https://webaim.org/resources/contrastchecker/). Light grey on white, a common way to make a page look “clean”, often fails it. So does white text on a bright accent button.
>
> **Target size** has a floor too. WCAG 2.2 sets [a minimum of 24 by 24 CSS pixels (opens in a new tab)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) at its middle level, well below Apple's 44 and Android's 48. Design to the platform numbers; treat the WCAG one as the line you never go under, for example for a small close button.
>
> These are standards, not taste, and they cost you very little: a slightly darker grey, a slightly bigger button. What they buy you is a product that works for the person reading in a sunny canteen, the person with weaker eyesight and the person with big thumbs, any of whom could be in your first fifty users.
>
> Ask for the check in words your agent can act on, after any screen is built:
>
> **Say this to your agent**
>
> ```
> Check every screen at phone width (390px):
> 1. List every text colour and its background, with the contrast ratio. Flag anything under 4.5:1 (3:1 for large text).
> 2. List every tappable element smaller than 44 by 44 points.
> 3. List any text smaller than 16px.
> Don't fix anything yet. Show me the list first.
> ```

## Every screen has four versions, and you only test one

Here's the part almost nobody designs, and it's where strangers decide whether your product works.

When you test your own product, you use a good photo, on fast wifi, with yesterday's meals already saved. So you see one version of each screen: the happy one, with everything in its place. That's also the only version you described to your AI, which means it's the only one it designed with any care. Every other version gets the average: a blank white page, a spinner that never says why, “Error 500”.

A stranger meets those other versions first. They arrive with no data, on a slow connection, and the first photo they take is of the menu card, not the plate. Designers call these versions **states**, and four of them matter on every screen.

EmptyPhotoCalKnow your lunch's calories in 5 seconds.

Snap your meal
LoadingPhotoCalReading your plate…

ErrorPhotoCalThat doesn't look like food. Try a photo of your plate from above.

Retake
DonePhotoCalSaved. Today: 1,240 kcal.

Snap another

*Figure: Four versions of one snap, from a first visit to the saved total. You'll test the last one; strangers meet the first three.*

- **Empty**: Say what will appear, and give the button that makes it appear. [NN/g (opens in a new tab)](https://www.nngroup.com/articles/empty-state-interface-design/), the Nielsen Norman Group, a usability research firm, warns that a totally empty screen leaves people wondering whether it's still loading or broken. Coming back is a different empty: skip the explaining and show where they left off.
- **Loading**: Per [NN/g (opens in a new tab)](https://www.nngroup.com/articles/progress-indicators/), under a second show nothing; from 2 to 10 seconds show something moving; past 10, show progress. For an AI answer, say what's happening and keep the photo on screen.
- **Error**: Plain words: [what went wrong and what to do next (opens in a new tab)](https://www.nngroup.com/articles/error-message-guidelines/). Keep what they gave you, don't blame them, and never show an error code.
- **Done**: Confirm it worked and show what changed. [People need feedback (opens in a new tab)](https://www.nngroup.com/articles/visibility-system-status/) to know their tap did something, or they tap again.

An AI product has one more, and it's the sneakiest: the answer arrives, looks confident, and is wrong. In PhotoCal's 30-minute test, poha came back as upma. Nothing failed, so no error appears. That's why “correct a wrong guess” is in v1, and why the Result screen's done state always carries a way out: “Not right? Change the dish.”

> **Remember this**
>
> The happy screen is the one you'll test. The other versions are the ones strangers meet first, so write their words before you build.

**Say this to your agent**

```
Here is my screen list, with the words I wrote for each state: [paste it].
Check that every screen has empty (first visit and coming back), loading, error and done, and, wherever an AI answer appears, what happens when it's wrong. List anything missing or unclear. Don't write the words for me; ask me.
After building, tell me how to see each state on my phone.
```

**▸ Common mistakes — Five screens and states that go wrong**

- **Designing on the laptop**: Everything fits at 1,400 pixels wide. Check at phone width from the first screen, not on the last day.
- **A spinner with no words**: An AI call takes seconds, not milliseconds. “Reading your plate…” beats a circle that spins.
- **A tour before anything happens**: Three swipes of welcome slides before the first action is a screen you weren't going to add. Let the empty state do the explaining.
- **Error codes**: “Something went wrong (500)” tells Rohan nothing he can do. Say what happened and the next step.
- **Settings and a profile in v1**: If the flow doesn't need it, it isn't a screen yet.

**▸ Watch: Mobile app screens in eight minutes — Kole Jain, 0:00 to 7:37**

Kole Jain. Play [0:00 to 7:37 (opens in a new tab)](https://www.youtube.com/watch?v=Gfsd8NNuD9g): how a screen is rebuilt for a phone, rule by rule.

**Watch for** around 6:27, where he calls the screen he designed the “ideal state” and then designs the empty ones.

> **[Advanced]**
>
> ### Advanced Skeletons, spinners and showing the result early
>
> Loading has more than one design, and the right one depends on how long the wait is and what you're waiting for.
>
> A **spinner** says “working” and nothing else. A **skeleton screen** shows grey boxes in the shape of what's coming, so the page's structure appears before its content. [NN/g (opens in a new tab)](https://www.nngroup.com/articles/skeleton-screens/) suggests either suits waits under 10 seconds, and a progress bar anything longer. Skeletons are for whole pages; a spinner suits one module, like a single card.
>
> For PhotoCal neither is quite right on the Result screen, because the wait is the product's best moment. Keep the photo on screen, dim it slightly, and put “Reading your plate…” over it. Rohan sees his own lunch while the AI works, which is more reassuring than any grey box.
>
> The opposite trick is to show the result before the server has confirmed it. Engineers call this an **optimistic update**. When Rohan taps Save, today's total changes instantly, and the save happens in the background. Convex [supports this directly (opens in a new tab)](https://docs.convex.dev/client/react/optimistic-updates): a temporary, local change shown while the real one travels to the server.
>
> The catch: optimism is honest only when the action almost always succeeds and undoing it is harmless. Saving a meal qualifies: if it fails, the total quietly corrects itself and a short message says the save didn't go through.
>
> The AI answer never qualifies. You can't show “rajma chawal” before the model has read the photo, and guessing would break the one promise the product makes. So the rule for an AI product is simple: be optimistic about your own database, and honest about the AI.

- **Skills you already installed in Setup**: **`frontend-design`**Building or reshaping any screen, so it doesn't read as a template. **`agentation`**Point at things on your running app instead of describing them in words.

## Your screen list

This is section 4 of DESIGN.md. Write it yourself first, from your flow, and only then ask your agent to check it.

**DESIGN.md · 4. Screens**

```
## 4. Screens
Flow: [step] → [step] → [step] → [the job done]

[Screen name]
For: [what this screen is for]
Top to bottom: [what's on it]
Main action: [button words] → [where it goes]
Empty, first visit: [words] [button]
Empty, coming back: [words]
Loading: [words]
Error: [what went wrong, what to do next] [button]
Done: [what changed]
If the AI answer is wrong: [how they fix it]

[Next screen]
...
```

> **Doubts?**
>
> Ask [**Shaktimaan** (opens in a new tab)](https://growthx.club/community/shaktimaan) or post in [#build-sprint (opens in a new tab)](https://growthx.club/community/build-sprint). Ask before you lose the hour.
