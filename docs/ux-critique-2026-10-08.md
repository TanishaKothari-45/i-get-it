---
date: 2026-10-08
type: critique
tags: [igetit, ux, critique]
ai-first: true
---

# UX critique of the link-to-wall path (8 Oct night)

## For future agent
Step 1 of docs/ux-roadmap.md. Two independent reviewers on the live site; synthesis below. Fix order is the Priority issues list. Re-run impeccable critique on https://www.igetit.now/ after fixes to see the score move (26/40 tonight).

Method: dual-agent (A: design review · B: detector and measurements), live site, 390 px and 1280 px, 8 Oct 2026 night.

## Design health score

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | On Done at 390 the fixed action bar (top 714 px) covers the Up next card's title; empty cream plates while a picture loads |
| 2 | Match system / real world | 2 | "Show me the way", "Light the first rung", "Last one", "Explore" vs "The Shelf" |
| 3 | User control and freedom | 2 | "Not now" returns to the same wall; "Back to the handbook" meets the same ask on the plan |
| 4 | Consistency and standards | 2 | Two marigold "Make a free account" buttons on Done; landing button ink, inside marigold |
| 5 | Error prevention | 3 | Email validated, code digits only; no resend cooldown |
| 6 | Recognition rather than recall | 3 | Sign-in names neither the topic nor chapter 2 |
| 7 | Flexibility and efficiency | 3 | Tap, swipe, keys, Enter, autofocus |
| 8 | Aesthetic and minimalist design | 2 | Done: 17 tappables, 2 identical primaries; landing 9.95 screens tall; "free" 20 times in source |
| 9 | Error recovery | 3 | Plain failure copy; expired and wrong code share one message |
| 10 | Help and documentation | 3 | Ask sheet explains itself; nothing says who sends the code or to check spam |
| Total | | 26/40 | Fair |

## Design specificity verdict
Authored up to the last frame of chapter 1; category-interchangeable from the moment the ask begins. The chapter (plates, marker highlight, printed kickers, a one-line coral beat, a dare at the end) could be no other product. Done and sign-in are every freemium wall in this product's outlines: confetti, rating chips, a marigold account button, a green "Free" box, a grey disabled "Email me a code". The one authored sentence on Done (the outcome line) sits fourth.
Deterministic scan: 0 findings on the nine source files (engine 0.1.5, exit 0). URL mode: 1 warning, "cream-palette" on the page background, which is the brief's own paper colour (DESIGN.md), so a false positive here. Browser overlay: attempted, injection blocked by Chrome's local-network permission prompt; the engine's URL scan and scripted measurements stood in.
Where the two agree: the duplicate main action on Done (A P0, B counted 2); content hidden under the fixed bar at 390 (A: Up next body at 782 px under a bar at 714; B: footer links 114 px under the bar on Done and sign-in, unreachable on sign-in). What the detector caught that the review missed: contrast and tap-target numbers below. What the review caught that no detector can: the order of the Done screen, the sign-in screen's missing anchor, pictures not prefetched, the copy.

## Priority issues
1. [P0] The wall's reason is under the fold and its button is doubled. At 390 the fixed bar covers the Up next card's title; the "Chapter 2 is free with an account" card is at 1044 px on an 844 px screen; "Make a free account" appears twice (upnext-btn and the bar), both marigold. 8 reached this screen, 0 signed up. Fix: one wall block directly under the outcome line (chapter 2's title, "free with an account", "your email and a code, no card", "chapter 1 stays on this phone either way") with the only main button; the bar keeps a quiet "Back to the handbook". Done.tsx 105-123, 139-144. Command: layout, distill.
2. [P0] Sign-in from the wall arrives with no anchor and loops. onKeep → signIn('done') sets no reason, so the why-here card never renders; h1 is the generic "Keep reading, free."; the topic is absent; "Not now" returns to the same wall. Fix: pass the reason ("To open chapter 2 of How Indian IPOs work. Chapter 1 stays on this phone whatever you choose."), name chapter 2 in the h1, add "From igetit.now; check spam if it's slow", hide "Use a password instead" behind "I already have a password", make "Not now" say where it goes. App.tsx 346, SignIn.tsx 82-112. Command: onboard, clarify.
3. [P1] Pictures are not prefetched. No preload anywhere in src; captures at 800 ms show an empty plate with a hard shadow, including on "The mistake everyone makes" (coral). Fix: warm frames i+1 and i+2 when frame i lands; the first three on open; keep the plate reserved. Chapter.tsx 231. Command: optimize.
4. [P1] Measured contrast and tap-target failures. Chapter topic line (.story-topic) on green 3.69:1 and coral 3.58:1 (fails 4.5); landing hero placeholder 4.31:1 (no ::placeholder rule on .lp-field input); landing step numerals coral on paper 2.90:1 at 51 px (fails 3.0). Under 44 px: landing segment chips 40, sort pills 37, "Explore everything →" 29, footer links 17-22; chapter "Ask or object" and "Tap →" 42; Done "Pick a time" 20; sign-in "Use a password instead" 20. Fix: lift --fg2 on green and coral, add the placeholder rule, deepen the numeral coral or outline it, min-height 44 on chips, pills and the story tools, 44 px rows for text links. Command: audit, adapt.
5. [P2] Done's order buries the reward and the cheer praises a skim. Title → "1 minute. We budgeted 20. Show-off." → rating → outcome line → Teach it back → Up next. The cheer fires for any reading-only chapter under 20 minutes. Fix: title → outcome line → wall → rating and Teach it back after; cheer only with a quiz score or 4+ minutes. Done.tsx 59-69, 78-110. Command: distill.
6. [P2] Reduced motion leaves four animations running (.story-opt.pass, .roadmap-pic img, .story-pic.real img, .intent-ghost); the sign-in page cannot scroll its footer out from under the bar at 390. Command: audit.

## Persona red flags
Jordan (Instagram reel, 390, 11pm): blank cover plates for the first beat; the first words inside are "Study aid, verify before you act." above the title; empty plates mid-chapter on mobile data; after confetti, a survey, then a button pasted over a picture with no visible reason; "Back to the handbook" meets the same ask. Leaves. Breaking element: the fixed bar over the Up next card.
Sam (skeptical coursemate): the price ladder on a first visit; "Show-off" as canned praise; "₹199" inside the free-account card against the X post that said "no sign-up"; "Free." three times then "Use a password instead". Breaking element: the price line inside the free-account card.
Priya (back from yesterday): lands on Your handbooks, taps chapter 2, meets a lock card; yesterday's nudge said "No sign-in needed for your first 3 chapters" (DESIGN.md 160 still says so). Nothing says the rule changed. Breaking element: the lock card contradicting yesterday's copy.

## Minor observations
Two finishers on the last frame ("Finish chapter 1" and "Last one"); "No spam, ever" twice on sign-in; the email field turns white on focus against the paper rule; "← Handbook" and "Back to the handbook" on one screen; the disabled grey "Email me a code" reads as a non-button; the landing fine print still says "Explore"; the "Study aid" chip competes with the title; sign-in h1 identical for every entry; no event splits "tapped Make a free account" from "reached sign-in from elsewhere", so 0 sign-ups cannot be read; landing 9.95 screens at 390 (parked to Sunday); load is fast (readyState complete at 488 ms, no horizontal overflow, fonts loaded, 0 images without alt, 0 unnamed buttons).

## Questions to consider
1. Why ask for the account on the Done screen rather than when the reader taps "Start chapter 2"? Asked there, the email is the price of their own request; asked on Done it interrupts a win.
2. The carousel leads with a money topic, so a stranger's first sentence inside is a disclaimer. Is "How Indian IPOs work" the right first door?
3. What would the wall say if it could not use the word "free" and had to say what chapter 2 teaches and what the reader keeps?

---

# Second run, 9 Oct 00:10 (same path, same two reviewers, after the night's fixes): 27/40

Reviewer A walked the live site again on a fresh headless phone profile and scored before reading the first run. Reviewer B's deterministic scan was clean on the source files. The full report is in `.impeccable/critique/` (the 9 Oct entry).

## 2. Nielsen heuristics (0–4)

| # | Heuristic | Score | Key issue (element, file:line) |
|---|---|---|---|
| 1 | Visibility of system status | 3 | The chapter plate pulses while a picture arrives (index.css:484); the carousel plate (Landing.tsx:53) and the Done wall plate (Done.tsx:97) have no arriving state, so a slow line shows a flat grey box with a 3 px shadow for seconds. "Opening…" label on the lifted card works (05-card-lifting). |
| 2 | Match between system and real world | 3 | "Chapter 2 is free with an account." is said three times in a row: wall card h2 (Done.tsx:100), sign-in h1 (App.tsx:346), and again in the orange why-here box (App.tsx:373). Three nouns for one place: "Back to the handbook", "← Handbook", "Your handbooks". |
| 3 | User control and freedom | 2 | "Not now, back to the handbook" lands on a plan whose two buttons both read "Start chapter 2 (free account)" (Plan.tsx:54 and :134; A2main/21-plan-top). The reader just declined that; the page offers it twice and nothing else above the fold. × from a chapter works and resumes at the card (x1). |
| 4 | Consistency and standards | 2 | Two pressed elements on sign-in: `.why-here` has `--press-sm` (index.css:888) and the main button `--press` (index.css:83), against DESIGN's "one thing on each screen is pressed". Shelf sizes leak out of the scale: `.book-title` 0.78rem = 12.5 px and `.book-goal` 0.62rem = 9.9 px (index.css:971–972) when the smallest token is 13.5. Landing input is 3 px / 14 px radius (index.css:518) next to the app's 2.5 px / 12 px (index.css:96). Last frame has two finish buttons: "Finish chapter 1" in the body (Chapter.tsx:310) and "Finish" in the tool row (Chapter.tsx:321; A2main/14). |
| 5 | Error prevention | 3 | Email validated before the button enables (SignIn.tsx:23, :113), code field numeric-only (SignIn.tsx:100), Finish catches an open quiz (Chapter.tsx:202). The last frame before Finish is "Tonight's dare (optional): Open your broker app, or the IPO section on the NSE website" (A2main/14): the one frame that sends an 11pm reader out of the app sits directly before the wall. |
| 6 | Recognition over recall | 3 | The wall card names chapter 2's title and hook; sign-in names the chapter and topic. But the card's picture takes 45% of the viewport (upnext-pic, 16:9 at 346 px = 195 px plus mat; A2main/15) and the one sentence that answers "what do I lose": "Chapter 1 stays on this phone whatever you choose" sits at y≈1450 under a bar fixed at 726. |
| 7 | Flexibility and efficiency | 3 | Keys, swipe up/down, tap zones, Surprise me, "Read it again ›" on a done stop. The landing puts five sort pills ("Trending this week / Most started / Most finished / New / Surprise me") above the first card for a person who has been here zero seconds (Landing.tsx:24, :45–48). |
| 8 | Aesthetic and minimalist design | 2 | The frames are minimal; the screens around them are not. Done has 11 tappable things (counted in §3). The landing hero holds 13 tap targets in the first 844 px. The ☰ menu is offered on the sign-in screen (App.tsx:345 passes `rail`), where the only job is one email. |
| 9 | Help users recover from errors | 3 | Copy is good and specific ("That code didn't work. Check the latest email, or send a new code."). One dead end: "Couldn't send the code just now. Try again in a minute, or use a password." (SignIn.tsx:36) is shown to new readers who have no password. Not exercised live. |
| 10 | Help and documentation | 3 | The sender, the 20 s, the 10-minute life and "No other emails, ever" are all on the email screen (SignIn.tsx:109). The tap-right/tap-left convention is explained only on the landing demo ("Tap the right side to go on, the left to go back", Landing.tsx:185), never inside the chapter; the first frame says only "Tap →". |

**Total: 27 / 40.**

Fixed after this run, the same night (session 05): the second finish button on the last frame; the wall card's picture (removed, the reassuring sentence is now in view); the Shelf's title and goal sizes (back on the type scale); the sender line on sign-in (names "I Get It", no "gmail" tell); the double "Start chapter 2 (free account)" on the plan after Not now (55's `declined` state); the arriving-picture state on the landing carousel and the Done card. Still open: the picture weight (2.4 to 3.9 MB PNGs; 55's shrink backfill), the ☰ on the sign-in screen, the landing's 13 tap targets above the fold (parked to Sunday, D14).
