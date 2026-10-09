# Plan: prompt v1 vs v3 and four models, one topic

Swimming (new, goal: swim my first full length of a pool without stopping). Frozen research brief. Judge: Claude Sonnet 5.5, no web search, blind, all five plans at once, run twice in different orders. One plan per row: a strong signal, not proof.

| Plan | Mean | Ranks (2 orders) | Latency | Tokens in / out | ₹ |
|---|---|---|---|---|---|
| Opus 5.5 high, v1 (saved) | **4.67** | 1, 1 | 29 s | 3593 / 2613 | ₹7.00 |
| Opus 5.5 high, v3 | **4.44** | 2, 2 | 32 s | 4180 / 2978 | ₹8.01 |
| Gemini 3.8 Flash (medium), v3 | **3.56** | 4, 3 | 34 s | 2930 / 2591 | ₹1.00 |
| Gemini 3.1 Pro, v3 | **3.28** | 3, 4 | 61 s | 2930 / 2771 | ₹3.29 |
| DeepSeek V4 Pro, v3 | **2.83** | 5, 5 | 74 s | 2863 / 4073 | not priced |

| Dimension | Opus 5.5 high, v1 | Opus 5.5 high, v3 | Gemini 3.8 Flash (medium), v3 | Gemini 3.1 Pro, v3 | DeepSeek V4 Pro, v3 |
|---|---|---|---|---|---|
| goalFit | 5.0 | 4.5 | 4.0 | 3.5 | 3.0 |
| coverage | 5.0 | 5.0 | 5.0 | 4.0 | 3.5 |
| progression | 5.0 | 4.5 | 4.0 | 3.5 | 3.0 |
| outcomes | 5.0 | 4.0 | 3.5 | 2.5 | 2.5 |
| hooks | 4.5 | 4.0 | 3.0 | 3.5 | 3.0 |
| picture | 5.0 | 5.0 | 3.0 | 3.0 | 2.0 |
| fidelity | 4.0 | 4.5 | 3.0 | 3.5 | 3.0 |
| sources | 4.0 | 4.0 | 3.0 | 2.0 | 2.5 |
| clarity | 4.5 | 4.5 | 3.5 | 4.0 | 3.0 |

Judge's notes:

- **Opus 5.5 high, v1**: Best: measurable outcomes (5-second look, 10 bobs, 3 to 5 m glide, 6 to 8 strokes, 10 m with breaths) build to the full length, and the boat picture adds the porthole and fuel; worst: the lifeguard mention and the 3 to 5 m figures go slightly beyond the brief. / Best: the boat picture maps hull, motor, oars, porthole and fuel across the chapters, and the outcomes are small, testable steps with distances. Worst: a few specifics, such as 6 to 8 strokes and 5 seconds, go beyond the brief, though a reader can test them.
- **Opus 5.5 high, v3**: Best: the boat picture maps hull, motor, oars, tilt and cruising speed across all seven chapters, and the outcomes are reachable; worst: some outcomes are vague, such as 'a few seconds' and 'every few strokes'. / Best: the boat picture carries through every chapter title, and the plan relies on one real source. Worst: the chapter 7 outcome is thin and some outcomes lack numbers.
- **Gemini 3.8 Flash (medium), v3**: Best: complete coverage that follows the brief's outline closely; worst: the kayak picture is not carried through, and claims such as goggles switching off a panic reflex, plus 100 m by day 28, are overreaching. / Best: the chapter-level outcomes are concrete and tie closely to the brief's facts. Worst: it makes up a goggle-panic-reflex claim, a 100 m horizon, and a 'settled hull' phrase that clashes with the kayak picture.
- **Gemini 3.1 Pro, v3**: Best: tidy, faithful chapters with question hooks; worst: the boat picture is thin and the sources look invented or generic (a SwimSwam guide, a USMS guideline title). / Best: the plan is tidy and every chapter has a clear hook. Worst: the outcomes are vague, such as 'a short distance', and the sources look invented (SwimSwam lap guide).
- **DeepSeek V4 Pro, v3**: Best: it covers the sequence and ends with a calm 25 m lap; worst: the orchestra picture does not fit swimming, chapter 1 asks for bobbing before the breathing chapter, chapter 5 is practised standing, and the 500 m by day 28 target is unrealistic. / Best: the hooks are readable and the chapter order is sound. Worst: the orchestra picture fits poorly, the chapter 5 outcome is only a standing arm drill, and the invented 500 m horizon and three obscure sources hurt it.

Judge's summary: C and A both use a boat picture that carries through every chapter and stay faithful to the brief; C wins on specific, testable outcomes and hooks that name the open question. The others have weaker pictures, vaguer or overreaching claims, and less credible sources or targets. / C has the most testable, step-by-step outcomes and carries a boat picture that maps several body parts to the skills. E is close but has vaguer outcomes; A, D and B are weaker because they invent claims, have thin outcomes, or use a picture that fits poorly.

Cost: plans ₹12.30 (DeepSeek not priced), judging ₹6.95.
