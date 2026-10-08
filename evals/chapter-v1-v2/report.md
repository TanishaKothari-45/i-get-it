# Writer prompt v1 vs v2 (Gemini 3.8 Flash)

Run 2026-10-08T14:03:49.289Z. Frozen Opus v1 plans and research briefs. 2 chapters per prompt per case. Judge: Claude Sonnet 5.5, no web search, blind; per case the four chapters ranked together, read twice in different orders. Place 1 is best of 4. The svg field is not shown to the judge.

| Prompt | Judge mean | Mean place (of 4) | swimming ch1 mean / place | swimming ch2 mean / place | world war I ch1 mean / place | Latency median | Tokens in / out | ₹ a chapter |
|---|---|---|---|---|---|---|---|---|
| v1 | **3.72** | 1.8 | 3.83 / 2.5 | 3.78 / 1.5 | 3.56 / 1.5 | 35 s | 4393 / 3941 | ₹1.52 |
| v2 | **3.28** | 3.3 | 3.56 / 2.5 | 3.08 / 3.5 | 3.19 / 3.5 | 26 s | 3867 / 2549 | ₹1.05 |

| Dimension | v1 | v2 |
|---|---|---|
| hook | 4.08 | 3.42 |
| followsPlan | 4.08 | 4.00 |
| teachBeforeTest | 3.42 | 2.58 |
| quizzes | 3.25 | 3.00 |
| clarity | 3.83 | 3.42 |
| concreteness | 3.75 | 3.83 |
| picture | 3.50 | 2.88 |
| fidelity | 3.25 | 2.67 |
| pace | 4.33 | 3.58 |

## Code checks

| Case | Prompt | Run | Cards | Quizzes | Shape right | Words | Longest card | Cards over the limit | Option length spread (max) | Right answer is longest | whyNot keys right | reteach gives it away | svg chars | Next: line |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| swimming ch1 | v1 | 1 | 6 | 0 | yes | 324 | 61 | 0 | – | 0 | 0/0 | 0 | 1159 | "why holding your breath underwater makes you tire out twice as fast." |
| swimming ch1 | v1 | 2 | 6 | 0 | yes | 312 | 60 | 0 | – | 0 | 0/0 | 0 | 1045 | "why holding your breath underwater wears you out before you even swim." |
| swimming ch1 | v2 | 1 | 6 | 0 | yes | 338 | 64 | 0 | – | 0 | 0/0 | 0 | 0 | "How do you breathe underwater without choking or gasping for air?" |
| swimming ch1 | v2 | 2 | 6 | 0 | yes | 331 | 63 | 0 | – | 0 | 0/0 | 0 | 0 | "why does holding your breath underwater exhaust you so quickly?" |
| swimming ch2 | v1 | 1 | 9 | 2 | yes | 548 | 85 | 0 | 1 | 0 | 2/2 | 0 | 789 | "why looking straight down lifts your sinking hips instantly." |
| swimming ch2 | v1 | 2 | 9 | 2 | yes | 495 | 71 | 0 | 2 | 1 | 2/2 | 0 | 624 | "why looking straight down makes your legs float instead of sink." |
| swimming ch2 | v2 | 1 | 10 | 3 | yes | 664 | 120 | 0 | 3 | 1 | 3/3 | 0 | 0 | "What keeps your legs from dragging on the bottom when you try to glide?" |
| swimming ch2 | v2 | 2 | 10 | 3 | yes | 587 | 85 | 0 | 2 | 0 | 3/3 | 0 | 0 | "Lie flat and glide across the surface without sinking your hips." |
| world war I ch1 | v1 | 1 | 6 | 0 | yes | 280 | 54 | 0 | – | 0 | 0/0 | 0 | 999 | "how one murder in Sarajevo pulled five great powers into war in five weeks." |
| world war I ch1 | v1 | 2 | 6 | 0 | yes | 325 | 66 | 0 | – | 0 | 0/0 | 0 | 1184 | "how one murder in Sarajevo pulled five great powers into war in five weeks." |
| world war I ch1 | v2 | 1 | 6 | 0 | yes | 350 | 64 | 0 | – | 0 | 0/0 | 0 | 0 | "One shot in Sarajevo triggered the whole chain reaction." |
| world war I ch1 | v2 | 2 | 6 | 0 | yes | 259 | 53 | 0 | – | 0 | 0/0 | 0 | 0 | "How did one murder in Sarajevo pull five great powers into war?" |

## Judge's notes

- **swimming ch1, v1 #1** (places 0, 4): Best: the 'chest-deep' definition is vivid and the suction test is explained clearly. Worst: the quiz about the shallow lane uses the 'waist-deep with a rail' option, which is ambiguous. 'Tire out twice as fast' and 'last Tuesday' are made up, and the text says a plain 'Chest-deep means below your mouth', which is off.
- **swimming ch1, v1 #2** (places 0, 1): Best: the hook is the plan's own sentence, and the boat and dock picture is used lightly. Worst: the claim that looking ahead 'triggers worry' is a small unsupported reach. Quiz option c in the first quiz is an obvious throwaway.
- **swimming ch1, v2 #1** (places 0, 2): Best: it covers all three plan elements, including a dedicated face-in card and the lifeguard. Worst: its distractors are weak, and 'shoulder-deep' is a distractor that is wrong in an unclear way. Some details are invented, such as 'four-foot marker' and the pool drain.
- **swimming ch1, v2 #2** (places 0, 3): Best: the 'mistake' card teaches that hair under the rim breaks the seal. Worst: the first card says 'shallow water', and the seal card says to hold the cups on 'without looping the strap' and then to slide the strap on, which is muddled. The lifeguard is mentioned only once and the face-in step is thin.
- **swimming ch2, v1 #1** (places 1, 1): Best: teach comes before every quiz, the 'bob' is defined clearly, and Sam's ten bobs ties to the outcome. Worst: the whyNot lines are weak, such as 'that is the correct technique', and the wiping-eyes mistake is a stretch. / Best: the opening line mirrors the plan's hook and Sam's ten bobs is concrete and ties to the outcome. Worst: the Elena mistake card is about wiping her eyes, which the quiz then tests though it is a minor point, and one whyNot says the correct technique is wrong.
- **swimming ch2, v1 #2** (places 2, 2): Best: tidy quizzes with clear whyNots that name the confusion, and a consistent exhaust image. Worst: the outcome line drops the 10 bobs, and the 'chest burns after five seconds' claim and the 'starved' line are shaky. / Best: the teaching order is clean and every quiz follows a card that taught it. Worst: the outcome line is reworded, and some whyNot lines are shaky, such as claiming that exhaling in one puff leaves you starved.
- **swimming ch2, v2 #1** (places 4, 4): Best: Marcus's bassline example and the bouncing-cork image are vivid. Worst: the first quiz comes before any teaching, the 'ventilation pipe' picture is muddled, and the legs-sink-to-the-bottom claim and the 'bruised' chest are invented. / Best: the whyNot lines name the exact confusion clearly. Worst: the first quiz comes before any teaching, the cards are long, and it makes up claims such as chest feeling 'bruised' and that panic is only about carbon dioxide.
- **swimming ch2, v2 #2** (places 3, 3): Best: the long-exhale, short-inhale timing is clear and the example is vivid. Worst: a quiz comes right after the picture card, before any teaching, and the correct options are often the longest. / Best: the Marcus story and the 'hum' image are vivid and the timing card is clear. Worst: the first quiz, on exhaling underwater, comes before any teaching card, and the Elena mistake card says she held her breath but then blames exhaling above the surface.
- **world war I ch1, v1 #1** (places 0, 1): Best: tight, short cards with an explained 'entente'. Worst: quizzes are present though none are due, the right answer in the second quiz is conspicuously longer, and 'secret pacts' is unsupported.
- **world war I ch1, v1 #2** (places 0, 2): Best: clear Balkan-to-Russia chain and the dreadnought example. Worst: this is a quick handbook, so quizzes are not due, and the 1912 skirmish quiz is a hypothetical; it also claims Britain 'ordered twice as many ships' and that treaties legally obligated mobilization, both invented or overstated.
- **world war I ch1, v2 #1** (places 0, 3): Best: defines the new terms inline. Worst: calls the Entente 'informal' and says Britain, France and Russia formed it in alarm; it adds quizzes where none are due, and 'six empires' is loose.
- **world war I ch1, v2 #2** (places 0, 4): Best: the Morocco gunboat crisis is a concrete real example. Worst: it adds quizzes where none are due, claims war was 'inevitable' and 'guaranteed', and the Morocco detail is not in the reference facts.

Judge's summaries:

- swimming ch2: B and C teach before they test and stay close to the facts, and B also keeps the 10-bob outcome and a concrete example. A and D put a quiz before any teaching, and A also invents details and muddles its picture.
- swimming ch1: no JSON: {"versions":[{"label":"A","scores":{"hook":3,"followsPlan":4,"teachBeforeTest":5,"quizzes":3,"clarity":4,"concreteness":4,"picture":4,"fidelity":3,"pace":4},"note":"Best: clear suction test, a concret
- world war I ch1: no JSON: {"versions":[{"label":"A","scores":{"hook":4,"followsPlan":4,"teachBeforeTest":5,"quizzes":3,"clarity":4,"concreteness":4,"picture":null,"fidelity":3,"pace":4},"note":"Best: the Morocco gunboat exampl
- swimming ch2: C and B teach each point before testing it, keep cards short, and stay close to the plan, while C adds the most concrete, outcome-linked example. A and D open with a quiz before any teaching card, and D is also wordier and invents more detail.
- world war I ch1: C is the most concise and stays closest to the plan and facts, with an inline term explanation. D loses points for overstating inevitability and adding unreferenced detail; all four wrongly include quizzes in a quick handbook.
- swimming ch1: C stays closest to the plan and the facts, with a strong hook, short cards, and quiz options that are plausible but clearly distinct. The others add invented details or muddled instructions, or lose some of the plan's elements.

Cost: chapters ₹15.39, judging ₹22.81.
