# Copy review, 7 Oct 2026

Every screen read against the homepage's language. Done by the agent on Prateek's ask; every changed line is still (agent) copy until Prateek rewrites it.

## The brand language, as the homepage uses it

- The unit is a **handbook** of **chapters**; the rhythm is **a chapter a night**, about **twenty minutes**; progress is a **rung**; the end is **the summit**.
- Short, plain sentences in second person. Headings are sentences and end with a full stop ("Ready tonight.", "Come early, pay less.").
- Errors say what happened and what's kept: "Couldn't … just now. Your line is still here; try once more in a minute."
- Never "wrong" or "incorrect". No internal talk (tokens, cost, models) on a reader's screen.
- Only promise what's built. Since 7 Oct: free means one handbook of your own and a chapter a night (plus a daily taste of ready ones); "week 1 is free" is retired.

## Changed (commit a4592df, pushed, not deployed yet)

| Screen | Before | After | Why |
|---|---|---|---|
| Pricing, kicker after chapter 7 | You finished week 1 | You reached the summit | "Week 1" no longer means anything; the homepage's word for the end is the summit. |
| Pricing, free vs member table | Topics you type: 1 handbook / Your own handbooks: 1 new chapter a day | Handbooks you type: 1 / New chapters of your own: 1 a day (member: up to 7 a day, across everything) | The two rows read as the same thing. Numbers unchanged; they match membership.ts LIMITS. |
| Pricing, rules | …your own handbook, a chapter a day… | …a chapter a night… | The lede and homepage say "a night"; one page said both. |
| Pricing, payment error | …if not, write to us… | …write to prateekksubs@gmail.com with the payment number… | Same help the Refunds page gives; "us" had no address. |
| Sign-in nudge (Done, Library, Make it yours) | No card. Week 1 is free whatever you choose. | No card. Signing in is free. | No longer true since free vs member went live. |
| Sign-in nudge | Several topics at once. | All your handbooks in one place. | Free readers can type only one handbook; "several topics" over-promised. |
| Sign in | We store the plan and the chapters you passed. Nothing else. | Your handbooks and your place in each one, on any phone or laptop. | "Nothing else" wasn't true (progress, settings, payments are kept; the Privacy page lists them). Says what sign-in gives instead. |
| Make it yours | …send it with every chapter, so it costs almost nothing and applies everywhere. | It's one line, and every chapter from here on is written with it. | Cost is our concern, not the reader's. |
| Explore | What others are learning / Pick | What others are learning. / Our pick | Headings end with a full stop; "Pick" alone read as a verb. |
| Numbers (/stats) | Passed chapter 1 | Finished chapter 1 | Chapter 1 has no quizzes since 7 Oct; it's finished, not passed. |
| Numbers, Policy footers | for GrowthX Build Sprint | for the GrowthX Build Sprint | Matches the homepage footer. |
| Compare writers (testers) | Check | Quick guess | Same kicker the chapter uses for a quiz. |

Left as they are, already on brand: homepage (the reference), Print (member and free), What's next, Ask or object, Teach it back, Privacy, Terms, Refunds, Contact.

## Proposed, not yet changed: these files are being edited by the other session (it asked for them to stay untouched until it commits)

| Screen | Now | Proposed | Why |
|---|---|---|---|
| Done, after the last chapter | That was week 1. | That's the summit. | Same reason as Pricing. |
| Done, sign-in lead | …lets you run several topics at once… Free. | Signing in keeps your handbooks on every device and carries your settings with you. Free. | Free readers type one handbook. |
| Done, reminder heading | When should chapter N remind you? | When should we remind you about chapter N? | A chapter doesn't remind anyone. |
| Plan, main button | Start chapter 1 ▸ / Play chapter N ▸ (and "Start chapter N" in Up next) | Start chapter N ▸ everywhere; "Pick up where you left off" when mid-chapter | Three verbs for one action. |
| Plan, the end of the path | Day 7 / You can do it | The summit / You can do it | "Day 7" clashes with nights and chapters; homepage says summit. |
| Plan, small link | Not what you meant? Change the line | Not what you meant? Change what you typed | "The line" is our word, not the reader's. |
| Library | Your handbooks / All 7 done | Your handbooks. / All 7 chapters done | Full stop on headings; "7 done" needs its noun. |
| Chapter, unfinished-quiz errors | "One quiz … is still open" and "One check is still open" | "One quiz is still open. Answer it, then finish." (both) | "Quiz" and "check" for the same thing. |
| Chapter, save error | Could not save the chapter. Try again. | Couldn't save that. Check your connection and tap again. | DESIGN.md's wording for this error. |
| Chapter, rewrite error | Can't rewrite this one right now. | Couldn't rewrite this one just now. Try again in a minute. | Same pattern as every other error. |
| Chapter, Ask sheet | Back to the story | Back to the chapter | Not every chapter is a story. |
| Start, waiting screen | Writing your seven nights / Choosing the seven nights… | Wait for the other session's quick 1-to-3-chapter handbooks, then: "Writing your handbook" / "Choosing the chapters and the one picture that carries them" | "Seven" will be wrong for quick handbooks. |
| Limit message, free-used (src/lib/limits.ts) | …Every ready and shared handbook stays free. | …Ready and shared handbooks are still open to you, a chapter a day from each. | "Stays free" hides the daily limit the free table shows. |

## For Prateek to decide (product, not copy)

- **Pricing, "Coming next" row**: promises a learning dashboard with streaks, Indian languages and days 8 to 28. PRODUCT.md says no streaks in v1, and Shaktimaan's rule is "don't promise on the page what isn't built". Keep it, soften it to "More coming: members hear first", or drop it?
- **"Seven nights" on the homepage and wordmark ("Seven chapters. Twenty minutes a night.")**: still right for full handbooks; once quick 1-to-3-chapter handbooks ship, these lines describe only the main kind. Fine as the headline, or reword?
