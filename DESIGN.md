# DESIGN.md
Read this before building or changing any screen. If a choice isn't covered here, ask me instead of guessing.

Written 4 Oct 2026 (night) by the coding agent on Prateek's go-ahead, from docs/design-thinking/. Brought up to date with what's built on 5 Oct (agent); the open contradictions are listed at the end of section 6 for Prateek to rule on. The agent made the choices needed to build a first version; each one Prateek had to own was marked MISSING (Shaktimaan's guardrail). On 5 Oct Prateek wrote the feeling (section 1), the chapter reference (section 2) and the first screen's words (section 5); what's left of the agent's is marked (agent).

## 1. The feeling, in labels
**Changed 4 Oct evening on the first user's words:** "far less interesting than the first version... the jump from Instagram into this plain text workbook is too wide. The roadmap has to be at least half as interesting as Instagram." The paper-and-serif field guide is retired for chapters and the roadmap. Chapters are now Stories: full-screen frames, one idea per tap, bold colour per frame (ink, marigold, green, indigo, coral, cream), big sans type, the key phrase highlighted as it appears, story bars on top, tap right or swipe to go on, tap left to go back. The roadmap is a journey: a dark gradient cover with the handbook's illustration, then a winding path of seven stops, each showing its hook like a teaser, tonight's stop pulsing. The cream page stays for the first screen, Make it yours and the sign-in.
**The feeling, in Prateek's words (5 Oct):** when someone finishes a chapter, they feel "I get it, and I want more."
The labels below are the agent's, describing how the screens are built toward that feeling (agent).
- The chapter: Instagram Stories, not a book. Full-screen frames, one idea per tap, bold colour per frame, big sans type, the one key phrase highlighted as it appears. Thin story bars across the top; tap right or swipe to go on, tap left to go back.
- The pictures: every teaching card opens with one printed plate in the risograph style Prateek picked (design/style-anchor.md): marigold, indigo and ink on cream, grain, flat figures with no detailed faces, never any text. The picture fades in when it's drawn and drifts slowly, like a camera over artwork. Only on a card's first frame; the frames after it are words only.
- The roadmap: a journey. A dark gradient cover, then a winding path of seven stops, each with its hook as a teaser; tonight's stop pulses; the seventh is the summit.
- Exercise frames: an ink frame, one question in big type, three tall cream options a thumb's height each. Tapping one answers it. The feedback rises from the bottom as a sheet: the named confusion first, the re-teach, one button.
- Motion: the frame slides in, the key phrase highlights, the picture drifts, the chosen option glides and pops on a pass, one confetti burst when a chapter is done. Nothing spins. Reduced-motion turns all of it off.
- The cream pages (first screen, pricing, Make it yours, sign-in, stats): a well-edited field guide. Warm paper, ink text, one column, one main button, full width, low on the screen.

## 2. References, one per component
**Picked by Prateek (5 Oct):** chapter pictures. Epified's illustrated explainers (named by Prateek) for the feel: narration-led, one art style throughout. The style itself he chose from 18 test pictures: B, a three-colour risograph print (design/style-anchor.md). Take: one medium, the app's palette, people as simple figures, nothing that must be exact. Ignore: video, moving characters, text inside pictures.

**Picked by Prateek (5 Oct): chapters feel like Instagram Reels.**
Take: broadly all of it. Full screen, slide up to the next card, one idea per screen, the pace.
Ignore: the endless feed (a chapter ends, and finishing is the win), likes, comments and shares.
Gap to build: chapters move sideways today (tap right, swipe left, like Stories); Reels moves up. The swipe direction should change to slide-up.

The references below are the agent's, chosen from memory for the smaller parts (exercise card, progress bar, feedback sheet, first screen), and sit under Prateek's Reels reference (agent). Two are retired by what's built (marked).
Plan screen (the handbook cover and chapter list): the GrowthX Build Sprint handbook's own section page, docs/product-thinking/00-overview.md, "The chapters" block.
Take: outcome line first ("By the end you'll have…"), then numbered chapters, each a title plus one plain line, the current one marked. Quiet numerals, not icons.
Ignore: the level pills, the "+2 advanced" tags, the sidebar.

Cream pages (first screen, pricing, Make it yours, sign-in, stats): a Readwise Reader or Instapaper article page on a phone (agent).
Take: serif body at 17 to 18 px, line length about 60 characters, 1.55 line height, headings in a bold sans one step up.
Ignore: the toolbars, highlights, the share row.

(Instagram Stories was the agent's chapter reference from 4 Oct evening; replaced on 6 Oct by Prateek's pick, Instagram Reels, above. The progress bars across the top stay.)

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

## 2b. Teardown: one Instagram Reel, by Prateek (6 Oct)
Ten things he noticed, in his words (the agent asked the questions and shaped each into element, what it does, how).
1. The content: the centre of the screen is the first and only place the eye lands.
2. The caption: barely 10% of the screen. You read it only if the video already got you.
3. The swipe: the thumb swipes up and the next one is there instantly. No lag.
4. What's next: you never wonder if there's more; it's an endless loop. (Kept out of I Get It: a chapter ends. Section 2.)
5. The buttons: like, comment, share, save sit bottom-right, under 10% of the screen, never over the content.
6. The like: one tap turns the white heart red and it fills. Instant, small, satisfying.
7. No frame: no background colour or border around the video; the content is the whole screen as it is.
8. The first 10 to 15 seconds: that's the decision to stay or swipe. Hooks and delivery decide it, then he watches the whole thing.
9. The surprise: you don't know what's coming next (friends, celebrities, knowledge creators), so it keeps you intrigued.
10. What to steal: the way content is presented. It holds interest, gives a small dopamine hit and keeps you going, again and again.

What this means for chapters (agent's reading, for Prateek to confirm):
- Slide up, and the next card must already be there (3). Pictures that fade in a minute later break this; ready topics already have theirs.
- Text should be the minority of the screen (2, 7). Today a teaching frame is mostly text; one idea per frame, shorter, with the picture as the screen.
- The tools (Say it simpler, Ask) belong small and in a corner (5), as they are now.
- A tiny instant reward on every answer (6), not only the green option.
- The first frame of each card is the hook (8); vary the shape from card to card so the next one is a small surprise (9).

## 3. Type and colour
Font: two. Bricolage Grotesque (already loaded) for the headline, headings, chapter numbers, buttons and labels. Newsreader (Google Fonts, optical size 16) for the teaching body, examples, the mistake card, the feedback sheet's re-teach text and the exercise prompt.
Sizes: display 34 (clamp 28 to 38) for the headline and the chapter title · heading 22 · body 17.5 (serif) · ui 16 (sans, buttons, options) · small 13.5 (labels, "Chapter 1 of 7", timings). No other sizes without asking.
Line height: body 1.55 · headings 1.15 · display 1.05.
Text: ink #1B1A17 on paper #FAF7F0. Secondary text ink at 62% (#5F5B53). Lines and tints: ink at 12% (#E3DED2).
Accent: marigold #F2A93B means "this is the way forward": the main button fill, the filled rung segments, the landing hero, and one of six chapter frame colours. Never for warnings or errors. Button text is ink, never white on marigold (contrast). (6 Oct)
Pass: #1F7A4D on a passed option, the "done" line and the love line; inside chapters it is also one of the six frame colours. (6 Oct)
Errors and misses: brick #B3402B, only on error text. A missed option gets an ink outline, never red fill.
Tokens, defined once as CSS variables and used by name only: --paper, --ink, --ink-2, --tint, --accent, --pass, --error; --display, --heading, --body, --ui, --small; --s 8, --m 16, --l 24, --xl 40; --radius 12 (options, inputs, buttons), --radius-sheet 20 (the bottom sheet). Nothing else is rounded.
Dark mode: not in v1. One theme, paper.
Chapter frame colours (Stories, 4 Oct evening): ink #1B1A17, indigo #3442B8, green #1F7A4D, marigold #F2A93B, coral #E8604C, cream #FAF7F0, one per frame in a fixed rotation by card type. Light frames (marigold, coral, cream) use ink text; dark frames use cream text. This breaks the "accent in two places" rule below; see section 6.
Picture palette (design/style-anchor.md): cream #FAF7F0, ink #1B1A17, marigold #F2A93B, indigo #3A4170, green #1F7A4D, coral #E0735A. The picture indigo and coral are softer than the frame indigo and coral on purpose (print ink, not screen colour); a picture always sits on a frame as a cream plate with rounded corners.

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

Landing (first-time visitors only; rebuilt 5 Oct evening after Prateek: "looks like a school project... where's the intrigue, the aesthetics, the marketing?")
For: a stranger from a shared link wants it before being asked for anything. People with a handbook on this phone never see it; "start another topic" still uses the plain first screen.
Look: a printed risograph poster, the same identity as the chapter pictures. Full-bleed colour spreads (marigold hero, ink, cream, indigo, sand, coral, cream), paper grain over every spread, headings in Bricolage at its heaviest and narrowest, the hero headline printed off-register with an indigo shadow that settles into place once on load. Hard black outlines and offset print shadows on the box, buttons, pictures and covers. Six illustrations drawn for it on Runway in the style anchor (public/images/landing/).
Top to bottom: a slim top bar (I Get It, "Start tonight"); hero: Prateek's headline and line (section 5), the box with "Show me the way", "New to this, talks like a friend. Change" opening level and voice, "Week 1 is free. No card, and no sign-up to start.", the hero picture (climbing out of a fog of phones to one summit); the itch, on ink: "You saved the reel. And the thread. And the three-hour video for the weekend. You still can't explain it."; "Tonight, in twenty minutes." three numbered illustrated steps; "Don't take our word for it." the real Public speaking chapter 1 as a tappable phone on indigo (plays itself to the quiz); "Seven nights to the summit."; "Ready tonight." printed covers, tap one to put it in the box; "Come early, pay less." the four early-bird tiers with real spots left and a "One-time payment · No auto-renew" pill, on coral; the summit picture and "What have you been meaning to learn?" with the box again; footer linking the live numbers and the code.
Main action: Show me the way (both boxes share one line; an empty box scrolls back to the hero box).
Copy (agent): everything except section 5's headline and line, and the button.

Waiting for a new plan (6 Oct; Shaktimaan: "the handoff jars"; Prateek: fill the wait with a story and send people to where it's from)
For: the 30 seconds after "Show me the way" on a topic that isn't ready.
Top to bottom: "Writing your seven nights", the topic large, three steps that light up (reading what you typed; choosing the seven nights and the one picture; writing chapter 1 while you read the plan), "Your plan in about 30 seconds. Chapter 1 is written while you read it.", a thin moving bar. Under it, "While you wait, a story from another handbook": one Story time card from a ready handbook with its picture, "From [topic], [chapter].", a ghost button "Add [topic] to my handbooks" (saves it to the library without leaving; then "Added. It's in Your handbooks.") and a quiet "Another story". Never the level and voice form again. Copy (agent).

Plan (the handbook cover, drawn as a journey since 4 Oct evening)
For: seeing the whole thing before the first chapter, so starting isn't skipping levels.
Top to bottom: a dark gradient cover with "Your handbook · N of 7", the topic, "By day 7 you'll be able to …", the handbook's drawing and its one picture (analogy) line; "Draws on" with up to three real works; then "The path": seven stops on a dashed winding line, each with its hook as the teaser, tonight's stop pulsing, the seventh drawn as the summit; days 14 and 28 as two quiet lines; the main button.
Main action: Start chapter 1 → Chapter. (Coming back mid-path: "Continue chapter N".)
Empty: never empty; it exists only after a plan.
Loading (chapter 1 still being written when they tap): button becomes "Writing chapter 1…", same thin bar, same 8 s line.
Error: "Chapter 1 didn't come through. The plan is saved; try again." Button: Try again.
Done: Chapter opens on card 1.
If the AI answer is wrong (the plan misses the point): a quiet link under the button, "Not what you meant? Change the line", back to Start with the line kept. Comments-and-regenerate is parked.

Chapter (Stories since 4 Oct evening: full-screen frames)
For: reading one thing and being checked on it, one frame at a time.
Top to bottom: story bars (one per frame), "Chapter 1 of 7" and the topic small, a close ×; the frame; a tool row at the bottom ("Say it simpler", "Ask or object", "Tap →"). A teaching card is split into frames, one paragraph each. Its first frame opens with its picture (4:3 cream plate, rounded, slow drift) above the words; the chapter's first frame also carries the chapter title. An exercise is one ink frame: kicker ("Quick guess", "Your call", "Lock it in"), the question in big type, three cream options.
Main action: tap right, swipe left, or → to go on; on the last frame, Finish chapter → Done.
Pictures: written after the chapter (one scene per teaching card, then drawn by Runway, about a minute for all of them). The chapter opens without waiting; each picture fades in when it lands. If pictures fail, the chapter's own drawing shows on the first frame, and the other frames are words only. Ready topics carry their pictures already.
Say it simpler: the card is rewritten in plainer words (pre-written for ready topics, live otherwise, "Rewriting…" while it happens), and the handbook stays simple until "Show the original" is tapped.
Empty: never empty.
Loading: cards are already written; pictures may still be arriving (no spinner, they fade in).
Error (an answer can't be saved): "Couldn't save that answer. Check your connection and tap again."
Miss: the feedback sheet rises: the named confusion in one bold line, the re-teach under it, button "Try again". The missed option is crossed out. A second miss shows the correct option, button "Got it".
Pass: the sheet: "That's it." plus one line on why, button "Keep going". The option glides and tints green.
Done: the last frame → the Done screen.

Done (the rung lights)
For: seeing the night's result and the next step.
Top to bottom: the rung bar with segment 1 filling, "Chapter 1 of 7 on [topic]: done.", "You can now [outcome line]" in serif, "Tomorrow: Chapter 2, [title]" in one line, the main button, a quiet second line under it.
Since 6 Oct: under the title, one line of love comparing their time and first-try score with our own 20-minute budget, cheesy on purpose ("6 minutes, 3 of 3 first try. We budgeted 20. Show-off."), never with an average we don't have (agent copy). "Next: Chapter N, [title]" replaces "Tomorrow": bingeing is fine (Prateek).
Teach it back (optional, 6 Oct; Prateek, from Karpathy's "teach/summarize everything you learn in your own words"): under the outcome line, a quiet dashed line "Teach it back (optional): explain today's idea in your own words." Tapping opens a box ("Explain today's idea in 2 sentences, as if to a friend."), "Check my explanation" and "Skip". The reply: "You nailed it." / "Close." / "Not quite yet.", what they got (in their own words), what's missing, one tip. Never required; the rung and the next chapter never wait on it. Copy (agent).
Main action (not signed in): Keep this handbook → Sign in. Quiet line: "Not now, start chapter N" → straight into the next chapter.
Main action (signed in): Start chapter N now (or "writing it, about a minute" while it's written); quiet "Back to the handbook"; the time picker stays for people who want a set time.
Main action (signed in): Pick when tomorrow is → Time. Then: See you at [time].
Empty/Loading: none.
Error (sign-in failed): "Sign-in didn't go through. Your chapter is saved on this phone." Button: Try again.
Done: the time is shown back: "See you at 9pm. Chapter 2 is ready when you are."

Make it yours (the profile)
For: saying how you want to be taught, once.
Top to bottom: "Make it yours.", one line on cost (one line sent with every chapter), persona chips and a free box, "what works" chips, examples-from, your words, avoid, the main button.
Main action: Save and use this from now on → back to Plan, with "N unread chapters will be rewritten when you open them".
States: saving "Saving…", error "Couldn't save that. Try again in a minute.", done the green line.

Compare (three writers, masked)
For: picking the writer by reading, not by name.
Top to bottom: topic and chapter, "Which one reads best?", tabs A B C (with "writing…" while a version is being written), the chosen version's illustration, title and cards stacked, the main button "A reads best".
States: writing "Writing version A… about a minute", failed "Version A didn't come through. Pick from the others.", done back to Plan with the chosen text as the chapter.

Your handbooks (library)
For: every topic in one place. Cards with the topic, a seven-segment progress bar, "Next: chapter N", and when it was last opened. Main action: Start another topic. Anonymous visitors see the sign-up nudge under the shelf.

Sign-up nudge
A white card: one lead line for the moment ("Starting another topic? Sign in so both stay safe and follow you."), four reasons with bold openers, a ghost button "Sign in to keep it all, free", and "Email and a password. No card." Compact version is the lead line and the button. Never blocks the screen it sits on.

Pricing
Since 7 Oct (Prateek): early-bird tiers. Headline "Come early, pay less, for as long as you stay." Four tier rows (First 50, Next 100, Next 200, After that), each with the month and year price; the open tier outlined in marigold with the real spots left ("49 of 50 left"), full tiers faded. A boxed line "One-time payment. No auto-renew." Four rules: no surprise on day 8, a year saves, your price stays yours, nothing to cancel. Month / Year chips, then one main button "Pay ₹199 for one month" (or "Sign in to pay"). "I'll decide later" is always there. Copy (agent). Reached from the rail, the library, and the Done screen after chapter 7.

Ask or object (under every card)
A quiet "Ask or object about this" opens a single-line input with an Ask button. Answers stack under the card, question in bold sans, answer in the serif. "Thinking…" while it runs; "Couldn't answer that one right now" on failure. Never a chat window, never a second main button. When the answer used the web, a small "Sources:" line of up to three links sits under it. The note under the input reads "Questions about this topic only. If the card doesn't cover it, the answer checks the web and shows its sources." (agent)

Watch card (at most one per chapter)
A bordered link block: the speaker in bold, the talk title in the serif, "Open in a new tab →". Kicker "Watch, N min". Under it, "Watch for:" and one line. Links only to known hosts (TED, YouTube, MIT OCW, archive.org and a few named sites); anything else renders as a dead link.

Laptop (900 px and up)
Two columns: a 260 px rail (topic, chapters done, chapter list, "The handbook", "Make it yours", "Start another topic") and a 38 rem reading column. The action bar sits at the bottom of the column, not across the window. The feedback sheet floats centred. "← Handbook" on every inner screen. Keys: → or Enter next, ← back, 1 2 3 answer, Esc closes the sheet.

Illustration (fallback, and the handbook cover): a flat SVG in the two accent colours plus ink, drawn by the chapter model, sanitised. Shown on the plan cover, and on a chapter's first frame only when its pictures failed. Exact things (a chessboard, a chart) are a known weakness of both the SVG and the pictures; app-drawn diagrams are the next job.

Numbers (/stats, public)
For: building in public, and the reviewer's read-only analytics.
Top to bottom: "The numbers, in public.", one line on what's counted (counts only, no names), a two-column grid of tiles (visitors today, visitors all time, started a handbook, passed chapter 1, signed up), a 14-day bar chart of visitors, where visitors came from, and a quiet "This is my phone: don't count it". The "Tapped Pay" number shows only to the owner, signed in. Copy (agent).

### Terms, Privacy, Refunds, Contact (7 Oct)
Four plain pages at /terms, /privacy, /refunds and /contact, linked in every footer (src/screens/Policy.tsx). Same shell as /stats: "Last updated", the title, then short sections in the serif. Every line states what the code does today (who sees which data, how payments work); change the page when the code changes. The refund rule (all of it back within 7 days, no questions) and every other line are (agent) until Prateek rewrites them. Not legal advice.

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

## 5. The first screen's words
Written by Prateek, 5 to 6 Oct 2026 (headline picked from three agent drafts and kept as his; the rest in his words).
Above it (6 Oct, after the five-second test; agent draft Prateek chose): For everything you saved and never got back to.
Headline: Seven nights from "I keep meaning to" to "I get it". (10 words, inside the lesson's limit.)
Under it: Twenty minutes a day: a small step. 7 days: a small jump. (Prateek's line; "28 days: a big leap." taken off on 6 Oct on Shaktimaan's review, "don't promise on the page what isn't built", until days 8 to 28 exist.)
Button: Show me the way (kept by Prateek over "Get my 7-night plan" and "Start night 1"; it leads to the path screen).
Earlier versions: "You keep saving it. Tonight, get it." (agent; Prateek's phone test found it unclear), then "From zero to one in 7 days, on any topic you want." (Prateek; 11 words).
Five-second test, 6 Oct, a project manager friend (on the current headline, line and button): "an AI tutor for non-technical folks who don't use ChatGPT, Claude etc."
What landed: what it does (an AI tutor). What missed: who it's for. The screen never names the reader PRODUCT.md is built for (someone who keeps saving reels about a thing and never learns it), so the tester guessed "people who don't use ChatGPT". Open for Prateek: name the reader on the first screen, or accept the broader read.

## 6. Principles (kept, not tactics)
- One main action per screen, full width, low enough for a thumb. Says what happens, never "Continue" or "Get started".
- The idea is the product. Each frame carries one idea, big enough to read at arm's length, with a picture that shows it. (Rewritten 6 Oct to fit the Reels-style chapters; agent draft, chosen by Prateek.)
- Marigold means "this is the way forward": the main button, the rung, and the hero. Inside chapters it's one of six frame colours, never used for warnings or errors. (Rewritten 6 Oct; agent draft, chosen by Prateek.)
- The rung moves only on a passed check. Motion is spent on arrival and on wins: a frame arriving, a picture settling, a pass, the rung. Nothing moves while the reader is working out an answer, and reduced-motion turns all of it off. (Rewritten 6 Oct by the agent on Prateek's go-ahead.)
- A chapter looks like a feed but ends like a book. One idea per frame, a picture that shows it, one vivid or dry-funny example; no memes, no video clips, no endless scroll. Every chapter has a last frame and a win, because finishing is the habit being built and the endless feed is the one being replaced. (Rewritten 6 Oct by the agent on Prateek's go-ahead.)
- Feedback names the confusion, never "wrong" or "incorrect", and always offers the next tap.
- Every screen has its empty, loading, error and done words written here before it is built. A loading state says what is happening and roughly how long.
- No sign-in, no name, no permission, no tour before the first exercise is passed.
- No new colour, size, font or radius without asking. Tokens by name, never raw values, outside the token block.
- Check every screen at 390 px wide and on a real phone before saying done.
- Copy that a user reads is a placeholder until Prateek has rewritten it. Mark it (agent) until then.

Contradictions between the old principles and what's built (listed 5 Oct, all resolved 6 Oct; 1 and 2 chosen by Prateek, 3 to 6 decided by the agent on his go-ahead: "Fix all the contradictions yourself"):
1. Reading vs the Reels-style frames: principle rewritten ("The idea is the product…").
2. The accent in two places vs marigold frames and pictures: principle rewritten ("Marigold means 'this is the way forward'…"); section 3's colour lines match.
3. No motion while reading vs frames arriving and pictures drifting: principle rewritten ("Motion is spent on arrival and on wins…"). The rule kept: nothing moves while an answer is being worked out.
4. No feed inside the chapter vs a feed-like chapter: principle rewritten ("A chapter looks like a feed but ends like a book…").
5. The old reading-page reference: kept only for the cream pages; the Stories reference marked replaced by Prateek's Reels.
6. Reels slides up, chapters moved sideways: chapters now also slide up (swipe up for the next frame, down to go back, frames arrive from below); tapping right and left still works.
