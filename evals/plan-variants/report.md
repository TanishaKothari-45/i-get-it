# Plan prompt v1 vs v4 vs v5 (Gemini 3.8 Flash, medium)

Run 2026-10-08T12:57:21.603Z. Frozen research briefs. 2 plans per prompt per topic. Judge: Claude Sonnet 5.5, no web search, blind; per topic all six plans ranked together, read twice in different orders. Place is 1 (best) to 6.

| Prompt | Judge mean | Mean place (of 6) | World War I mean / place | Swimming mean / place | Latency median | Tokens in / out | ₹ a plan | Framing copied from v1's example |
|---|---|---|---|---|---|---|---|---|
| v1 | **3.63** | 3.6 | 3.19 / 4.0 | 4.06 / 3.3 | 17 s | 2475 / 1478 | ₹0.62 | 1/2 |
| v4 | **3.53** | 3.9 | 3.36 / 3.3 | 3.69 / 4.5 | 19 s | 3245 / 1940 | ₹0.82 | 0/2 |
| v5 | **3.57** | 3.0 | 3.36 / 3.3 | 3.78 / 2.8 | 13 s | 2648 / 1712 | ₹0.71 | 0/2 |

| Dimension | v1 | v4 | v5 |
|---|---|---|---|
| goalFit | 3.88 | 4.00 | 4.00 |
| coverage | 4.25 | 4.50 | 4.13 |
| progression | 4.13 | 4.13 | 4.25 |
| outcomes | 3.75 | 3.25 | 3.75 |
| hooks | 3.38 | 3.38 | 3.25 |
| picture | 2.25 | 1.88 | 2.13 |
| fidelity | 2.75 | 3.00 | 3.00 |
| sources | 4.38 | 4.13 | 3.88 |
| clarity | 3.88 | 3.50 | 3.75 |

## Code checks

| Prompt | Plans ok | Chapter count right | Outcomes start "You can" | Hooks 18+ words | Asked a question despite a goal |
|---|---|---|---|---|---|
| v1 | 4/4 | 4/4 | 20/20 | 2 | 0 |
| v4 | 4/4 | 4/4 | 20/20 | 0 | 0 |
| v5 | 4/4 | 4/4 | 20/20 | 1 | 0 |

## Framing lines (World War I, quick)

- v1 #1: "This doesn't need weeks. Let's run through it quickly and get you going."
- v1 #2: "This doesn't need weeks. Let's walk through how the dominoes fell and reshaped our map."
- v4 #1: "You don't need weeks of military history to see how a regional crisis dragged six empires into catastrophe and shaped today's global map."
- v4 #2: "You don't need weeks of study to understand World War I: three short chapters give you the full picture from Sarajevo to Versailles."
- v5 #1: "You do not need weeks to understand World War I: three focused chapters give you the root causes, the trigger, and the map-shifting fallout."
- v5 #2: "You do not need weeks of battle maps to grasp how World War I broke the old world and built the one we live in today."

## Judge's notes

- **world war I, v1 #1** (places 5, 1): Best: it separates alliances from the July crisis, which builds well; worst: '20 million soldiers dragged to war in a month' is a made-up claim, and the framing is thin. / Best: the cleanest build from alliances to outbreak to aftermath with outcomes the reader can check; worst: '20 million soldiers to war in a month' is a made-up number and the framing is generic.
- **world war I, v1 #2** (places 6, 4): Best: the 'Tripwires' title is compact and ties in the naval arms races; worst: chapter 2 combines the Sarajevo spark with the empires' fall, and 'centuries-old' and 'Europe and Asia' are loose. / Best: ch1 cleanly frames alliances as the foundation and the sources are apt; worst: ch2 puts the Sarajevo spark and the empires' collapse together, and the 'two minor powers' and 'six empires within thirty days' claims are loose.
- **world war I, v4 #1** (places 1, 3): Best: the cleanest progression of causes, then collapse, then aftermath, with the League of Nations and mandates covered; worst: 'six empires' and 'secret treaties' go beyond the brief. / Best: a clean three-part arc (causes and outbreak, collapse, settlement) with the League of Nations included; worst: 'secret treaties' and 'six-nation war in thirty days' overreach the brief.
- **world war I, v4 #2** (places 4, 5): Best: Versailles chapter ties in the League of Nations and the death toll; worst: chapter 2 mixes the July 1914 declarations with the empires' collapse, and the 'wrong turn' hook is not in the brief. / Best: concise and covers all outline parts; worst: chapter 1 jumps straight to the spark, and '20 million deaths' is stated flatly while the brief gives a range of 15 to 22 million.
- **world war I, v5 #1** (places 3, 6): Best: the day-by-day July 28 to August 4 outcome is concrete and testable, and the chapters build in order; worst: it credits 'The War That Ended Peace' to MacMillan, which is correct, but the hook says 'mathematically unavoidable' and the empires' collapse and Versailles are crowded into one chapter. / Best: dedicates a chapter to the July crisis with vivid hooks; worst: invents the motorcade wrong turn and 'mathematically unavoidable', and 'breakdown' is a grammar slip.
- **world war I, v5 #2** (places 2, 2): Best: clean three-part structure with accurate sources and a solid causes, collapse, aftermath arc; worst: 'six global powers' and 'most of Europe' overstate the facts, and the Versailles hook is a bit grand. / Best: each chapter has one clear job with testable outcomes like naming the four empires; worst: the hook that the dynasties vanished before fighting ended is slightly off, and chapter 1 crams alliances and Sarajevo together.
- **swimming, v1 #1** (places 2, 6): Best: the chapters follow the brief's outline in order, and the kayak picture covers balance and sinking; worst: the day-7 promise to swim 25 m with side breathing is aggressive, and the chapter 5 outcome has no number. / Best: the facts and chapter order follow the brief closely. Worst: several outcomes have no number or test, and the hooks are long and contain errors, such as 'holding your breath makes you sink'.
- **swimming, v1 #2** (places 1, 4): Best: outcomes are specific and testable (10 bobs, 6 strokes, 5-second glide), and the hooks are punchy; worst: the 500 m in 30 minutes horizon and the claim that breath-holding causes fatigue faster than hard swimming overreach the brief. / Best: it has strong, specific hooks such as 'you only need to roll'. Worst: it adds 'pressing your chest down' beyond the brief, and the 500 m in 30 minutes month goal is aggressive.
- **swimming, v4 #1** (places 4, 3): Best: the 10-meter build-up pacing idea fits the brief's short segments; worst: the metaphor titles (Exhaust Pipe, See-Saw, Motor) mix several images, and the picture says lungs are buoyancy while the hull is the spine. / Best: the picture is the richest, with chapter titles like hull, exhaust pipe, see-saw and motor. Worst: some titles and hooks are cryptic, and the claims that standing stops panic faster than any breathing trick and that swimmers waste half their pull are unsupported.
- **swimming, v4 #2** (places 6, 5): Best: the titles follow the brief's outline closely; worst: the log picture is weak, outcomes like 'turn your head into your armpit pocket' are odd and untestable, and the chapter 5 hook is a bare question. / Best: the chapter titles match the brief's outline and the hooks are real open loops. Worst: the floating-log picture is weak and carries little through the chapters, and the 500 m month target is unrealistic.
- **swimming, v5 #1** (places 3, 1): Best: the outcomes are concrete and the kick/glide numbers are testable; worst: the chapter 3 hook is self-answering, and the 'rolling your cheek' and 'relaxed elbow' wording departs from the brief's high-elbow point. / Best: the outcomes are measurable and match the brief (10 bobs, 15 m kick, 4 side breaths, 25 m). Worst: the 'panics start with goggles' and 'exhausts lungs faster than swimming hard' hooks overstate the brief, and the 300 m goal is a stretch.
- **swimming, v5 #2** (places 5, 2): Best: the hooks are clear and the chapter order is sound; worst: the last outcomes are vague ('full stroke path', 'relaxed pace'), and 'hip flexors' plus bilateral breathing at day 28 go beyond the brief. / Best: it follows the brief's order and has a clear 25 m end outcome. Worst: the kayak analogy mixes up parts (lungs as hull, legs as rudder), the 'ten seconds' claim is invented, and the 200 m month goal is a stretch.

Judge's summaries:

- swimming: B and A cover the whole outline in a sound order, with a picture that carries through the chapters, and B's outcomes are the most specific and testable. The lower plans have vaguer outcomes, weaker or muddled pictures, or hooks that give away their answer.
- world war I: E gives the clearest one-theme-per-chapter order (alliances and outbreak, the four empires' fall, then Versailles with the mandates and the League), and its claims stay close to the brief. The lower plans either cram unrelated topics into one chapter or add claims the brief does not support, such as 20 million soldiers.
- swimming: B combines measurable, brief-faithful outcomes with an analogy that fits and clear wording. The others either have vague outcomes, weaker pictures, or overreaching claims and month-goal numbers.
- world war I: The top plans give each chapter a single job in order (alliances, outbreak, aftermath) and set outcomes the reader can test. The lower ones invent details such as the motorcade wrong turn, merge unrelated topics in one chapter, or state numbers the brief does not support.

Cost: plans ₹8.57, judging ₹14.30.
