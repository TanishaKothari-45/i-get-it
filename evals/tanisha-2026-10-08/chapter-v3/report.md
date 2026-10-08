# Writer prompt v1 vs v2 (Gemini 3.8 Flash)

Run 2026-10-08T14:10:24.963Z. Frozen Opus v1 plans and research briefs. 2 chapters per prompt per case. Judge: Claude Sonnet 5.5, no web search, blind; per case the four chapters ranked together, read twice in different orders. Place 1 is best of 4. The svg field is not shown to the judge.

| Prompt | Judge mean | Mean place (of 4) | swimming ch1 mean / place | swimming ch2 mean / place | world war I ch1 mean / place | Latency median | Tokens in / out | ₹ a chapter |
|---|---|---|---|---|---|---|---|---|
| v3 | **0.00** | – | 0.00 / – | 0.00 / – | 0.00 / – | 27 s | 4448 / 2952 | ₹1.21 |

| Dimension | v3 |
|---|---|
| hook | – |
| followsPlan | – |
| teachBeforeTest | – |
| quizzes | – |
| clarity | – |
| concreteness | – |
| picture | – |
| fidelity | – |
| pace | – |

## Code checks

| Case | Prompt | Run | Cards | Quizzes | Shape right | Words | Longest card | Cards over the limit | Option length spread (max) | Right answer is longest | whyNot keys right | reteach gives it away | svg chars | Next: line |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| swimming ch1 | v3 | 1 | 6 | 0 | yes | 303 | 61 | 0 | – | 0 | 0/0 | 0 | 0 | "breathing out calmly underwater so you never feel out of air." |
| swimming ch1 | v3 | 2 | 6 | 0 | yes | 339 | 68 | 0 | – | 0 | 0/0 | 0 | 0 | "What do your lungs do once your face is underwater?" |
| swimming ch2 | v3 | 1 | 9 | 2 | yes | 616 | 91 | 0 | 4 | 1 | 2/2 | 0 | 0 | "Look straight down at the tiles to make your hips and legs float effortlessly." |
| swimming ch2 | v3 | 2 | 9 | 2 | yes | 465 | 68 | 0 | 2 | 0 | 2/2 | 0 | 0 | "Look straight down to float flat like a boat hull." |
| world war I ch1 | v3 | 1 | 6 | 0 | yes | 301 | 59 | 0 | – | 0 | 0/0 | 0 | 0 | "A nineteen-year-old student in Sarajevo pulls a trigger and sets Europe's alliance fuses alight." |
| world war I ch1 | v3 | 2 | 6 | 0 | yes | 314 | 59 | 0 | – | 0 | 0/0 | 0 | 0 | "One bullet in Sarajevo fires, and five great powers rush to war." |

## Judge's notes

- **swimming ch1, v3 #1** (places ): 
- **swimming ch1, v3 #2** (places ): 
- **swimming ch2, v3 #1** (places ): 
- **swimming ch2, v3 #2** (places ): 
- **world war I ch1, v3 #1** (places ): 
- **world war I ch1, v3 #2** (places ): 

Judge's summaries:


Cost: chapters ₹7.26, judging ₹0.00.
