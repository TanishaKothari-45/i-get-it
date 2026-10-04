# DESIGN.md
Read this before building or changing any screen. If a choice isn't covered here, ask me instead of guessing.

Written 4 Oct 2026 (night) by the coding agent on Prateek's go-ahead, from docs/design-thinking/. The agent made the choices needed to build a first version; each one Prateek must own is marked **MISSING: Prateek to pick** (Shaktimaan's guardrail). Until he does, those lines are placeholders that happen to be built.

## 1. The feeling, in labels
**MISSING: Prateek to pick.** The labels below are the agent's; keep, cut or replace them in your words.
- The page: a well-edited field guide on a phone, not an app. Warm paper, ink text, generous margins, one column. Reading is the product, so the reading column is the biggest thing on every screen.
- The chapter number and the rung bar: a seven-segment bar at the top of every chapter screen, segments fill left to right as chapters pass. It is the only place the accent appears besides the main button. It moves only when a check is passed.
- Teaching cards: book typography. A serif for the body at reading size, a short bold sans heading, paragraphs separated by space not lines. One bold phrase per card for the one idea, italics for a term or an aside, nothing else. No icons in the prose, no bullet soup. Cards under 120 words; the first check by card 2. (Changed 4 Oct morning: "I got bored in between".)
- Exercise cards: one question, three tall full-width options, a thumb's height each. Tapping one answers it. The feedback rises from the bottom as a sheet: the named confusion in ink, the re-teach in the same serif, one button.
- Motion: on a pass and on the rung, nowhere else. Cards slide in from the right, 240 ms, ease-out. The chosen option glides and pops on a pass (420 ms). The rung segment fills with a 400 ms ease-out. One confetti burst, in the paper palette, when a chapter is done, once a night. Nothing spins, nothing moves for reading or tapping. (Changed 4 Oct morning after the first user test: "the glide when you get it right", "a wow moment".)
- The main button: full width, low on the screen, accent fill with ink text, one per screen. Says what happens.

## 2. References, one per component
**MISSING: Prateek to pick.** The agent chose these references from memory of shipped products, not from a Pinterest or Mobbin search; swap any for one you actually like, with your own take/ignore lines.
Plan screen (the handbook cover and chapter list): the GrowthX Build Sprint handbook's own section page, docs/product-thinking/00-overview.md, "The chapters" block.
Take: outcome line first ("By the end you'll have…"), then numbered chapters, each a title plus one plain line, the current one marked. Quiet numerals, not icons.
Ignore: the level pills, the "+2 advanced" tags, the sidebar.

Teaching card (the reading surface): a Readwise Reader or Instapaper article page on a phone.
Take: serif body at 17 to 18 px, line length about 60 characters, 1.55 line height, paragraph spacing of one line, headings in a bold sans one step up. Text starts near the top, no hero image.
Ignore: the toolbars, highlights, the share row.

Exercise card: a Duolingo lesson screen.
Take: one question at the top, three stacked full-width options with a 1.5 px ink outline, 56 px tall, 12 px radius, selected state fills; the feedback panel slides up from the bottom and holds until the one button is tapped; the correct option tints green only on reveal.
Ignore: the mascot, hearts, streak flame, sounds, the green brand colour as a surface.

Rung bar (progress): Instagram's story progress bars.
Take: seven thin segments across the top with 4 px gaps, filled segments in accent, unfilled in a 12% ink tint; the active segment fills with an ease-out.
Ignore: autoplay, the avatar row, the time-based fill.

Feedback sheet (after an exercise): the comment sheet in Instagram Reels (the bottom sheet that rises over the content).
Take: rounded top corners (20 px), a 36 px drag handle, content starts with one bold line, the sheet covers about 45% of the screen, the card behind dims to 60%.
Ignore: the keyboard, avatars, the reply thread.

First screen: the GrowthX handbook cover page at growthx.club/learn/build-sprint#/home.
Take: one headline, one line under it, one box and one button, nothing else above the fold. Warm paper, lots of air.
Ignore: the login, the badges, the countdown.

## 3. Type and colour
Font: two. Bricolage Grotesque (already loaded) for the headline, headings, chapter numbers, buttons and labels. Newsreader (Google Fonts, optical size 16) for the teaching body, examples, the mistake card, the feedback sheet's re-teach text and the exercise prompt.
Sizes: display 34 (clamp 28 to 38) for the headline and the chapter title · heading 22 · body 17.5 (serif) · ui 16 (sans, buttons, options) · small 13.5 (labels, "Chapter 1 of 7", timings). No other sizes without asking.
Line height: body 1.55 · headings 1.15 · display 1.05.
Text: ink #1B1A17 on paper #FAF7F0. Secondary text ink at 62% (#5F5B53). Lines and tints: ink at 12% (#E3DED2).
Accent: marigold #F2A93B, only on the main button fill and the filled rung segments. Button text is ink, never white on marigold (contrast).
Pass: #1F7A4D, only on a passed option and the "done" line. Never as a surface.
Errors and misses: brick #B3402B, only on error text. A missed option gets an ink outline, never red fill.
Tokens, defined once as CSS variables and used by name only: --paper, --ink, --ink-2, --tint, --accent, --pass, --error; --display, --heading, --body, --ui, --small; --s 8, --m 16, --l 24, --xl 40; --radius 12 (options, inputs, buttons), --radius-sheet 20 (the bottom sheet). Nothing else is rounded.
Dark mode: not in v1. One theme, paper.

## 4. Screens
Flow: open the link → type the thing, pick a level → see the plan → read chapter 1, pass its exercises → the rung lights → sign in and pick a time → tomorrow: recall, chapter 2.

Start (the first screen, and the empty state of the whole product)
For: typing the one line and getting a handbook.
Top to bottom: wordmark small, headline, the line under it, the text box ("What do you keep meaning to learn?"), two level chips (New to this · Know some), the main button.
Main action: Write my handbook → Plan.
Empty, first visit: section 5's words.
Empty, coming back (no handbook yet on this device): same screen, no change.
Loading: the button becomes "Writing your handbook…" with a thin indeterminate bar under it; the typed line stays visible; after 8 s a second line: "About 30 seconds. Seven chapters take a moment to plan."
Error: "Couldn't write it just now. Your line is still here; try once more in a minute." Button: Try again. If the one clarifying question comes back: show it under the box as a single question with the box ready, button "That's it".
Done: goes to Plan.

Plan (the handbook cover)
For: seeing the whole thing before the first chapter, so starting isn't skipping levels.
Top to bottom: the topic as a title, "By day 7 you'll be able to …" in the serif, the one picture (analogy) in one line, the seven chapters as a numbered list (title, one line), chapter 1 marked "Tonight", days 14 and 28 as two quiet lines at the end, the main button.
Main action: Start chapter 1 → Chapter. (Coming back mid-path: "Continue chapter N".)
Empty: never empty; it exists only after a plan.
Loading (chapter 1 still being written when they tap): button becomes "Writing chapter 1…", same thin bar, same 8 s line.
Error: "Chapter 1 didn't come through. The plan is saved; try again." Button: Try again.
Done: Chapter opens on card 1.
If the AI answer is wrong (the plan misses the point): a quiet link under the button, "Not what you meant? Change the line", back to Start with the line kept. Comments-and-regenerate is parked.

Chapter (the card stack: teaching cards and exercises)
For: reading one thing and being checked on it, one card at a time.
Top to bottom: the rung bar, "Chapter 1 of 7 · card 3 of 9" small, the card (heading, serif body), the main button low. On an exercise card: the question in serif, three options, no button until one is tapped.
Main action: Next → the next card. On the last card: Finish chapter → Done.
Quiet row under every teaching card: "Lost? Say it simpler" → the card is rewritten in plainer words (pre-written for ready topics, live otherwise, "Rewriting in plainer words…" while it happens), and the handbook stays simple until "Show the original" is tapped. Never a second main button. (Added 4 Oct afternoon, first user test.)
Empty: never empty.
Loading: cards are already written; nothing to load. If the chapter failed to save, the Plan screen's error.
Error (an exercise tapped offline): "Couldn't save that answer. It still counts here; try the next one when you're back online."
Miss: the feedback sheet rises: the named confusion in one bold line, the re-teach under it, button "Try again". The question returns with the missed option outlined. A second miss shows the correct option with its one-line reason, button "Got it", and the rung does not move for that exercise.
Pass: the sheet rises: "That's it." plus one line on why, button "Next". The option tints pass green.
Done: the last exercise passed → the Done screen.
If the AI answer is wrong (a question with a bad key): "Report this question" as a small link in the sheet; it logs the card id and the answer given, and lets them continue. Never blocks.

Done (the rung lights)
For: seeing the night's result and the next step.
Top to bottom: the rung bar with segment 1 filling, "Chapter 1 of 7 on [topic]: done.", "You can now [outcome line]" in serif, "Tomorrow: Chapter 2, [title]" in one line, the main button, a quiet second line under it.
Main action (not signed in): Keep this handbook → Sign in. Quiet line: "Not now" → stays on Done; the handbook stays on this phone.
Main action (signed in): Pick when tomorrow is → Time. Then: See you at [time].
Empty/Loading: none.
Error (sign-in failed): "Sign-in didn't go through. Your chapter is saved on this phone." Button: Try again.
Done: the time is shown back: "See you at 9pm. Chapter 2 is ready when you are."

Tonight (coming back, signed in or on the same phone)
For: the daily 20 minutes from night 2.
Top to bottom: the rung bar as it stands, "[topic] · Chapter N tonight", two or three recall exercises from earlier chapters first (same exercise card), then chapter N's cards.
Main action: Start → recall card 1.
Empty, coming back after a long gap: same screen, no scolding, no streak; one line: "Chapter N is where you left off."
Loading (chapter N being written): "Writing chapter N…" with the thin bar; recall cards show first because they already exist.
Error: the Plan screen's error words.
Done: the Done screen for chapter N.

Sign-in (Convex Auth)
For: attaching the night to a person.
Top to bottom: "Keep this handbook on every device", one line on what we store (the plan and the chapters you passed, nothing else), the sign-in control, a quiet "Not now".
States: loading "Signing you in…", error as above, done returns to Done with the time picker.

Navigation (added 7 Oct, agent)
For: getting between handbooks and screens. Every screen has its own address (/, /new, /library, /signin, /h/:id, /h/:id/chapter/:n, /h/:id/chapter/:n/done), so back, refresh and a shared link land where they should.
Laptop (768 px and up): the wordmark on the left, three quiet links on the right in small sans, ink-2, the current one in ink and underlined: My handbooks · New topic · Sign in (or Sign out). No accent.
Phone: a three-line menu button (44 px) on the right opens the bottom sheet (same sheet as the feedback): rows of 56 px, ink, with a small ink-2 line under "Sign in" ("Keep your handbooks on every device") and "You're here" under the current one; a ghost Close button.
Also: the topic name on a chapter screen links back to its plan; on the plan, chapters already reached are links (re-read a passed one).

My handbooks (/library) (added 7 Oct, agent)
For: seeing and picking any handbook.
Top to bottom: "Your handbooks", (not signed in) "These live on this phone. Sign in to keep them on every device.", one row per handbook, newest first: the topic, one status line, the rung bar.
Status lines: "Being written…" · "Waiting on one answer from you" · "Didn't come through. Open it to try again." · "Chapter 1 is next" · "Chapter N is next · K of 7 done" · "All 7 chapters done".
Main action: Start a new handbook → /new.
Empty: "Nothing here yet. Type the one thing you keep meaning to learn, and its handbook starts here."

Recap (added 8 Oct, agent)
For: picking up where you left off. Chapter 2 onward opens with the previous chapter's "In one breath" card (its outcome line if it has none), before recall and the new cards. Header: "Recap · from chapter N". Kicker: "Last time · Chapter N: [title]". No "Say it simpler" on it. The summary also stays as the last teaching card of its own chapter.

Go deeper (bonus) (added 8 Oct, agent)
For: someone who got every exercise in a chapter right first time and wants more of the same idea. Optional; never the main action, never moves the rung.
Done screen, under the night's lines: a dashed box (like the "try it" card), label "Bonus, if you want it", "Every exercise right, first time. Want to go one layer deeper on this idea?", an outlined button "Go deeper". After it's done: "You've done this chapter's bonus." / "Read the bonus again".
Plan: under that chapter's line, "Go deeper (bonus)", then "Bonus done · read it again".
Bonus screen (/h/:id/chapter/:n/deeper): the card stack, header "Bonus · chapter N · card x of y", last button "Finish the bonus" → back to the plan.
Loading: "Bonus · chapter N" / "Going deeper." / "One layer deeper on [chapter title]: the nuance, the edge cases, a harder real case. Optional, and it doesn't change your plan." Button "Writing your bonus…" with the thin bar; after 8 s: "About 30 seconds. It reads the chapter you just did first." Quiet link: "Back to the handbook".
Error: "It didn't come through. Your chapter is saved; try again." Button: Try again. Busy: "Busy right now. Try again in a few minutes."

Another way (added 8 Oct, agent)
For: someone who missed at least one exercise in a chapter: the same idea explained from a different angle (a new comparison, a slower worked example, the usual confusion named, fresh gentler questions). Nothing new, nothing harder, never framed as a failure. The mirror of "go deeper": a chapter offers exactly one of the two. Optional; never moves the rung.
Done screen: the same dashed box, label "If you want it", "That one took a few tries. Want to see it explained another way?", outlined button "Explain it another way". After: "You've seen it the other way too." / "Read it again".
Plan: "See it another way", then "Seen it another way · read it again".
Screen (/h/:id/chapter/:n/another-way): header "Another way · chapter N · card x of y", last button "Finish" → back to the plan.
Loading: "Another way · chapter N" / "Another way in." / "[chapter title], explained from a different angle: a new comparison, a slower example, fresh questions. Optional, and it doesn't change your plan." Button "Writing it…". Error as for go deeper.

Someone else's handbook link (added 7 Oct, agent)
"This handbook is someone else's." / "You can start your own on the same thing: [topic]." Button: Start my own (busy: "Starting yours…").
A link that leads nowhere: "Nothing here." / "This link doesn't lead to a handbook." Button: Go to my handbooks.

## 5. The first screen's words
**MISSING: Prateek to write.** The lines below are the agent's draft from Prateek's own phrases in PRODUCT.md, built as placeholders; the handbook says the user never ships AI copy. Rewrite before the five-second test.
Headline: You keep saving it. Tonight, get it.
Under it: Type the one thing you keep meaning to learn. You get a seven-chapter handbook written for it, and you pass chapter 1 tonight. No sign-up.
Button: Write my handbook
Five-second test: not yet run. First two coursemates on Monday.

## 6. Principles (kept, not tactics)
- One main action per screen, full width, low enough for a thumb. Says what happens, never "Continue" or "Get started".
- Reading is the product. The serif column is the largest thing on every teaching screen; nothing decorative competes with it.
- The accent appears in two places only: the main button and the filled rung segments. If it appears anywhere else, that's a bug.
- The rung moves only on a passed check. Motion is spent on a pass and the rung, never on reading or time.
- The prose carries the engagement: one vivid or dry-funny example per chapter, bold for the one idea. No memes, no clips, no feed inside the chapter: the feed is the habit being fired. (Added 4 Oct after the first user test.)
- Feedback names the confusion, never "wrong" or "incorrect", and always offers the next tap.
- Every screen has its empty, loading, error and done words written here before it is built. A loading state says what is happening and roughly how long.
- No sign-in, no name, no permission, no tour before the first exercise is passed.
- No new colour, size, font or radius without asking. Tokens by name, never raw values, outside the token block.
- Check every screen at 390 px wide and on a real phone before saying done.
- Copy that a user reads is a placeholder until Prateek has rewritten it. Mark it (agent) until then.
