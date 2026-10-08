# Research prompt v1 vs v2 vs v3

Run 2026-10-08T10:24:45.246Z on the dev deployment. Researcher: Gemini 3.8 Flash with Google Search (the live path, no Claude fallback), so only the prompt differs. Judge: Claude Sonnet 5.5, blind to the version; alone with up to 5 web searches to check facts, and side by side in both orders. 12 research runs, 24 side-by-side judgements.

Topics:

| Genre | Typed | Goal | Mode | Level |
|---|---|---|---|---|
| physical skill | Swimming | swim my first full length of a pool without stopping | skill | new |
| history | World War I | understand why it started and how it changed the world | subject | new |

## Latency, tokens and cost (research call only)

| | Runs ok | Latency median / max | Tokens in avg | Tokens out avg | ₹ a run |
|---|---|---|---|---|---|
| v1 | 4/4 | 51 s / 78 s | 951 | 3268 | ₹2.27 |
| v2 | 4/4 | 31 s / 55 s | 855 | 2549 | ₹0.86 |
| v3 | 4/4 | 36 s / 49 s | 1031 | 3679 | ₹2.99 |

Tokens out include Gemini's thinking. Gemini rarely reports its searches (it searched: it had 7 Oct 2026 news right), so search counts are left out and the ₹ is tokens plus reported searches only.

## Output shape (code checks)

| | Facts avg | Outline parts avg | Words a sentence | Sentences over 20 words | Sources avg |
|---|---|---|---|---|---|
| v1 | 15.0 | – | 12.9 | 0 | 5.0 |
| v2 | 11.5 | – | 13.1 | 0 | 4.5 |
| v3 | 18.3 | 6.5 | 12.9 | 0 | 5.0 |

## Facts checked by the judge

| | Facts | Correct | Wrong | Outdated | Unsure | Help the goal |
|---|---|---|---|---|---|---|
| v1 | 60 | 98% | 0 | 0 | 1 | 90% |
| v2 | 46 | 96% | 1 | 0 | 1 | 100% |
| v3 | 73 | 95% | 0 | 0 | 4 | 100% |

## Quality scores (judge alone, 1 to 5, mean)

| Dimension | v1 | v2 | v3 | physical skill v1 / v2 / v3 | history v1 / v2 / v3 |
|---|---|---|---|---|---|
| accuracy | 4.75 | 4.50 | 4.50 | 4.5 / 5.0 / 4.5 | 5.0 / 4.0 / 4.5 |
| goalFit | 3.00 | 3.00 | 4.00 | 3.0 / 3.0 / 4.0 | 3.0 / 3.0 / 4.0 |
| breadth | 2.00 | 2.00 | 3.00 | 2.0 / 2.0 / 3.0 | 2.0 / 2.0 / 3.0 |
| depth | 2.00 | 2.00 | 2.00 | 2.0 / 2.0 / 2.0 | 2.0 / 2.0 / 2.0 |
| currency | 4.25 | 4.50 | 4.25 | 4.0 / 4.0 / 4.0 | 4.5 / 5.0 / 4.5 |
| specificity | 3.00 | 2.50 | 2.25 | 2.5 / 2.0 / 2.0 | 3.5 / 3.0 / 2.5 |
| decisions | 3.00 | 3.00 | 3.25 | 3.0 / 3.0 / 4.0 | 3.0 / 3.0 / 2.5 |
| sources | 3.75 | 3.50 | 3.00 | 4.0 / 3.5 / 3.0 | 3.5 / 3.5 / 3.0 |
| clarity | 4.50 | 4.25 | 4.00 | 4.0 / 4.5 / 4.0 | 5.0 / 4.0 / 4.0 |
| **all** | **3.36** | **3.25** | **3.36** |  |  |

## Side by side (blind, both orders)

A pair counts for a version only when the judge picked it in both orders; otherwise it is a split (position bias or a real tie).

### v1 vs v2 (4 pairs)

| Dimension | v1 wins | v2 wins | Tie | Split |
|---|---|---|---|---|
| accuracy | 1 | 0 | 1 | 2 |
| goalFit | 3 | 0 | 0 | 1 |
| breadth | 4 | 0 | 0 | 0 |
| depth | 3 | 0 | 1 | 0 |
| currency | 0 | 0 | 4 | 0 |
| specificity | 4 | 0 | 0 | 0 |
| decisions | 1 | 0 | 1 | 2 |
| sources | 2 | 0 | 0 | 2 |
| clarity | 0 | 0 | 3 | 1 |
| **overall** | 4 | 0 | 0 | 0 |

The judge's reasons (each order):

- **physical skill #1** → v1. v1 as A: Brief A covers the beginner's goal better: it defines the pool length, adds breathing mechanics and pacing to finish a length, and notes rotation. Its accuracy is weaker, though: it describes bilateral breathing as every three strokes, which is true but not essential for a first length, and the "800 times denser" figure is off-topic. Brief B is accurate and clear on arm mechanics but has no pacing or goal-specific content. I would give A to the planner and writer, with the bilateral-breathing and density facts treated cautiously. / v2 as A: Brief B ties its facts to the goal: it gives the pool length, relaxed pacing to finish 25 m without stopping, breathing rhythm, and body rotation. It also has a stronger source set that includes USMS beginner workouts. Brief A has good technique facts, including arm entry and pull, but nothing about pacing, pool length, or finishing a length.
- **physical skill #2** → v1. v1 as A: Brief A covers what a first full length needs: body position, breathing, kick, stroke phases, drills, equipment and safety. Its sources are beginner guides. Brief B is mostly about breathing, with one line on the wall push-off, and it cites a world-records list that does not help this reader. A is the one to give the planner and writer. / v2 as A: Brief B covers more of what a first-length swimmer needs: body position, breathing, kick, arm stroke, drills, equipment and safety. Its sources are beginner guides and drill programs. Brief A is almost all breathing, and its Wikipedia world-records source has no use for this reader.
- **history #1** → v1. v1 as A: Brief A has more facts covering both the causes (the July Crisis, alliances, the invasion of Belgium) and the consequences (the Treaty of Versailles, new nations, the League of Nations, the collapse of four empires). Its 'event' kind also suits WWI better, and its casualty range is hedged rather than stated as a firm count. Brief B is thinner and its 'more than 8 million soldiers and about 13 million civilians' figure is shakier, though its Britannica sources are somewhat stronger than A's Wikipedia-heavy list. / v2 as A: Brief B covers the July Crisis, the Belgium invasion, trench warfare and new technology, Brest-Litovsk, Versailles, and the new nations, so it supports both the 'why it started' and 'how it changed the world' parts of the goal. Brief A is thinner on aftermath, and its '8 million soldiers' versus '13 million civilians' figures and its 'subject' kind fit a specific event less well than B's 'event'. I would give Brief B to the planner and writer.

- **history #2** → v1. v1 as A: Brief A has more facts on both the causes and the aftermath, including the Central Powers and Allies membership, the borders redrawn in Europe and the Middle East, and the League of Nations. Its sources are also stronger. Brief B has a better death-toll range and fits the mode picked (kind: subject), but it covers less, so I would give Brief A to the planner and writer. / v2 as A: Brief B gives the reader more of what the goal needs: the combatants on each side, the redrawn borders, and the League of Nations, which cover how the war changed the world. It also labels the topic as an 'event', which fits better than 'subject', and its sources are more numerous and more relevant. Brief A's fact on how the war led to World War II is useful, but it does not make up for the gaps elsewhere. I would give Brief B to the planner and writer.

### v1 vs v3 (4 pairs)

| Dimension | v1 wins | v3 wins | Tie | Split |
|---|---|---|---|---|
| accuracy | 0 | 2 | 0 | 2 |
| goalFit | 0 | 3 | 0 | 1 |
| breadth | 0 | 3 | 0 | 1 |
| depth | 0 | 3 | 0 | 1 |
| currency | 0 | 0 | 4 | 0 |
| specificity | 2 | 0 | 0 | 2 |
| decisions | 0 | 3 | 0 | 1 |
| sources | 0 | 0 | 1 | 3 |
| clarity | 0 | 3 | 0 | 1 |
| **overall** | 0 | 3 | 0 | 1 |

The judge's reasons (each order):

- **physical skill #1** → split. v1 as A: no JSON: {"dimensions":{"accuracy":"B","goalFit":"B","breadth":"B","depth":"B","currency":"tie","specificity":"B","decisions":"B","sources":"B","clarity":"B"},"overall":"B","why":"Brief B follows a beginner's  / v3 as A: Brief A covers the full path for a new swimmer: gear, water comfort, breathing, floating, kick, arms, side breathing and pacing. It also has an explicit 7-chapter outline and practical steps such as chest-deep practice and 10-15 m segments. Brief B has fewer facts and no outline. It includes a questionable bilateral breathing definition ('every three strokes') and an odd 'water 800 times denser' claim that does little for the goal.
- **physical skill #2** → v3. v1 as A: Brief B follows the goal from water comfort through to pacing the first full length, and it includes an outline, so the chapter plan is concrete. Brief A has no outline and includes less useful items, such as the water density figure and an unusable definition of the stroke phases, and it says nothing on pacing or glide. B also gets the pool-length units right (yards in the US, meters internationally), where A writes '25 meters or 25 yards' with no distinction. / v3 as A: Brief A has a 7-chapter outline that leads from water comfort to pacing a full length, and its 19 facts cover breathing, kick, arms, rhythm and pacing. Brief B has no outline, fewer facts, and some off-goal or loosely worded items (water density, a hand 'in line with the shoulder' at entry, gear). It also gives nothing on pacing for a non-stop length.
- **history #1** → v3. v1 as A: Brief B centers on the reader's goal, covering why the war started (alliances, imperial rivalry, Balkan nationalism) and how it changed the world (empires, mandates, Versailles, WWII). It also includes an outline and kind=subject, which matches the chosen mode. Brief A is a more event-focused timeline with little on causes or long-term impact, though it is specific on dates and battlefield details. It also says Russia exited the war in 1918 but gives no 1917 revolution date, and its 'Bolshevik Revolution' line is vague. B has a small error: it says Germany declared war on France and Russia in August 1914 and implies Italy was in the Triple Alliance without noting that it later joined the Allies, which could mislead a beginner. / v3 as A: Brief A covers both halves of the goal: the causes (alliances, imperial rivalry, Balkan nationalism) and the consequences (fallen empires, Versailles, mandates, the road to WWII). It also gives an outline. Brief B is mostly a battle and event timeline with thin causes and little on how the war changed the world. A has one small slip: it says Germany declared war on France and Russia without the dates and the Italy detail, and its Triple Alliance fact omits that Italy later switched sides.
- **history #2** → v3. v1 as A: Brief B covers the 'why it started' half of the goal with causes (alliances, arms race, Balkan nationalism) and the 'how it changed the world' half with consequences through to WWII. It also provides an outline and the right kind (subject). Brief A is more precise on some numbers, but it has almost nothing on root causes, and its 'event' kind fits the subject mode less well. B has a few loose figures, such as 'over eight million soldiers' killed, but they are minor next to A's gaps. / v3 as A: Brief A covers both halves of the goal: the long-term causes (alliances, arms race, Balkan nationalism) and the consequences (empires falling, Versailles, new borders, the road to WWII). It also supplies an outline. Brief B is thinner on why the war started, and its 'event' kind is a slightly worse fit than 'subject'. B's casualty figure of about twenty million is a reasonable total, but A's military death and injury figures are more concrete.

A has a possible numeric issue: 'over eight million' military deaths fits common estimates of roughly 9-10 million, so it is low but defensible.

### v2 vs v3 (4 pairs)

| Dimension | v2 wins | v3 wins | Tie | Split |
|---|---|---|---|---|
| accuracy | 0 | 0 | 2 | 2 |
| goalFit | 0 | 4 | 0 | 0 |
| breadth | 0 | 4 | 0 | 0 |
| depth | 0 | 4 | 0 | 0 |
| currency | 0 | 0 | 4 | 0 |
| specificity | 0 | 3 | 0 | 1 |
| decisions | 0 | 4 | 0 | 0 |
| sources | 0 | 3 | 1 | 0 |
| clarity | 0 | 4 | 0 | 0 |
| **overall** | 0 | 4 | 0 | 0 |

The judge's reasons (each order):

- **physical skill #1** → v3. v2 as A: Brief B follows a beginner's path from water comfort and breathing through floating, kicking, arms and side breathing to pacing the full 25m length, and it includes an outline. Brief A is only front crawl technique, with no gear, water comfort, floating or pacing, and no outline, so it fits a new swimmer's goal less well. / v3 as A: Brief A covers the whole path to the goal for a new swimmer: water comfort, floating, kick, arms, breathing and pacing the first 25 m. It also includes a chapter outline and practical facts such as chest-deep water and 10 to 15 m practice segments. Brief B covers only front crawl technique, has fewer facts, and gives no outline, so it leaves out the beginner foundations and pacing the reader needs.

- **physical skill #2** → v3. v2 as A: Brief B covers the whole path to a first full length: water comfort, glide, kick, arms, breathing, rhythm and pacing. It also supplies a chapter outline and beginner-focused sources. Brief A is almost all breathing, omits arms and pacing, and cites a Wikipedia world-records list that has no use for a new swimmer. / v3 as A: Brief A covers the whole path to a first full length: water comfort, buoyancy, kick, arms, breathing, rhythm and pacing. It has 19 facts and a clear 7-chapter outline. Brief B is only about breathing, with 10 facts, no outline, and a world-records Wikipedia page as a source that doesn't fit a beginner's goal, so I'd give Brief A to the planner and writer.
- **history #1** → v3. v2 as A: Brief B covers the causes in depth (alliances, imperial rivalry, the Balkans, the July crisis, Belgium) and the consequences (Versailles, the end of empires, the mandates, the road to WWII), which is exactly what a new reader asking why it started and how it changed the world needs. Brief A is thin on causes, and its mention of 'more than 8 million soldiers' alongside 'about 13 million civilians' is less clean than B's range. B also provides an outline, which helps the planner. / v3 as A: Brief A covers both halves of the goal: the causes (alliances, imperial rivalry, the Balkans, the July crisis) and the consequences (fallen empires, Versailles, the Middle East mandates, the road to WWII). It also supplies an outline. Brief B is thin on causes and has no outline. Its figures are plainer, but A has a few flaws a writer should check: Italy's alliance status, and "declares war on Russia and France" in A against Germany's actual sequence of declarations.

I would give Brief A to the planner and writer.
- **history #2** → v3. v2 as A: Brief B covers the root causes (alliances, arms race, Balkan nationalism) that the reader's 'why it started' goal needs, and it spells out the consequences: new nations, the League of Nations, new borders and the road to WWII. It also supplies an outline and more varied sources. Brief A is thinner on causes and offers no outline. Brief A's 15–22 million death range is more defensible than B's 'over eight million soldiers' figure, but B's figure is still plausible and not clearly wrong. / v3 as A: Brief A covers the long-term causes (alliances, arms race, Balkan nationalism), the war itself, and the consequences (new nations, League of Nations, Middle Eastern borders). That fits a new reader who wants to know why it started and how it changed the world, and it also gives an outline. Brief B is thinner on causes and omits the arms race and Balkan context, though it is somewhat more accurate: A's 'over eight million killed' understates the toll and A's 'Wilson creates the League' oversimplifies, while B's 15–22 million deaths figure is better. I would give Brief A to the planner and writer, with those two facts corrected.

## Each topic

### physical skill: Swimming

| Run | Kind | Format | Chapters | Facts | Latency | ₹ | Judge mean | Outline / framing |
|---|---|---|---|---|---|---|---|---|
| v1 #1 | skill | course | 7 | 14 | 51 s | ₹3.35 | 3.22 | – |
| v1 #2 | skill | course | 7 | 14 | 32 s | ₹3.33 | 3.22 | – |
| v2 #1 | skill | course | 7 | 11 | 29 s | ₹1.00 | 3.33 | – |
| v2 #2 | skill | course | 7 | 10 | 31 s | ₹0.98 | 3.11 | – |
| v3 #1 | skill | course | 7 | 18 | 36 s | ₹3.57 | 3.33 | Gear and Water Comfort → Rhythmic Breathing and Submersion → Floating and Horizontal Balance → Flutter Kick Technique → Freestyle Arm Stroke → Side Breathing Mechanics → Pacing Your First Full Length |
| v3 #2 | skill | course | 7 | 19 | 41 s | ₹3.38 | 3.44 | Water Comfort and Bubble Breathing → Buoyancy and Gliding → Flutter Kick Mechanics → Front Crawl Arm Stroke → Side Breathing Technique → Stroke Rhythm and Body Rotation → Pacing Your First Full Length |

- **v1 #1**. Best: Every fact is correct, and the body position and breathing cues are the right ones for a new swimmer. Worst: The brief is thin. It has no progression to the first length, no arm-pull detail, and no practice plan. Missing: A step-by-step progression to 25 m: water comfort, floating and gliding, kick with a board, one-arm drills, then short swims with wall rests, plus how to build from 5 to 10 to 25 m; Basic arm stroke mechanics (entry, catch, pull, recovery), and pacing and rest cues, such as breathing every 2 strokes and stopping at the lane rope; Pool practicalities and safety: shallow versus deep end, lane etiquette, goggles, and checking whether the pool is 25 m, 25 yd or 50 m
- **v1 #2**. Best: The technique facts are accurate and practical: head position, exhaling, rotating to breathe, and the kick. Worst: The brief has no progression or practice plan for reaching a first full length, and it includes irrelevant trivia such as water density. Missing: A progression to the first full length: float and glide, kick with a board, breathing practice, short swims, then linking them with rest at the wall; How to handle fatigue and stopping: rest on the wall or lane line, use breaststroke or backstroke as a fallback, and take a breath every 2 or 3 strokes; Practical setup: check the pool depth and lane rules, how to use the wall, how to push off, and typical session length and frequency
  - unsure: "The freestyle stroke consists of four main phases: entry, catch, pull, and recovery." (Sources split the stroke differently. Some use entry, catch, pull, push and recovery, so the four-phase count is not universal. It also adds little for a new swimmer.)
- **v2 #1**. Best: All the technique facts are accurate and clearly written, and they cover the key beginner points of body position, breathing, kick and arm stroke. Worst: The brief covers technique only. It has no endurance or pacing plan, no progression to a full length, no numbers, and no safety or fallback options. Missing: A step-by-step progression to a full length, covering floating, pushing off, kick with a board, breathing practice, short swims and then a full length, with practice targets; Pacing and rest: how to stay relaxed, breathe every 2 or 3 strokes, and rest at the wall or switch strokes mid-length; Safety and setup: swim in a shallow lane or with a lifeguard, standard pool length, goggles, and what to do if tired
- **v2 #2**. Best: All ten facts are accurate and clearly written. They correctly identify side breathing as the main hurdle for new swimmers. Worst: The brief is too narrow. It is almost all breathing, with no progression, no drills and no arm stroke, so it can't support a 7-chapter course that gets a beginner to a full length. Missing: A progression from floating and kicking to arm stroke, then to breathing, then to the full length, with distances and rests (for example, 5 m, then 10 m, then 25 m).; Arm stroke and body position basics, along with a pacing and rest plan (for example, wall rests, backstroke or breaststroke as a fallback).; Safety and setup: shallow-end use, a lifeguard, goggles, and what 'a full length' means in the reader's pool (25 m, 25 yd, 50 m).
- **v3 #1**. Best: A clean, logical skill progression from water comfort through breathing, balance, kick, arms and side breathing to pacing, with accurate cues. Worst: It is shallow. It offers one-line cues with no drills, numbers, safety or troubleshooting, and it assumes a 25 m pool. Missing: Safety and the wall: how to rest at the wall, what to do if tired or in trouble, learning with a lifeguard or instructor, and knowing the pool length and depth (25 m, 25 yd or 20 yd).; Wall push-off and glide, plus a rest-and-continue plan, such as breathing every 2 or 3 strokes and a stroke-count target.; Practice plan: how many sessions, how long, and the common faults (sinking legs, lifting the head, holding the breath) with fixes.
  - unsure: "Practicing in chest-deep water ensures safe foot contact with the pool floor." (Shallow water is standard advice. 'Ensures' overstates it, and chest-deep is not safe for every new swimmer.)
  - unsure: "A slow and steady stroke rate conserves oxygen over the full 25-meter distance." (The pacing advice is sound. The 25 m figure is an assumption, since pools may be 25 yards, 25 m or 20 yards, and the reader never said which.)
- **v3 #2**. Best: All the technique facts are accurate, and the outline moves in a sensible order from comfort to the first full length. Worst: The facts are thin: no numbers, drills, progressions or safety guidance. A writer could not build a practical plan for the first full length from them. Missing: Safety: swim in a pool with a lifeguard, start in water where you can stand, and rest at the wall or lane rope when needed.; A concrete breathing pattern and progression, such as breathing every 2–3 strokes, plus drills (kick on a board, side kick, catch-up) and a distance build-up plan.; Practical tips for the first full length: use the lane edge, take short rests between attempts, and use goggles, a nose clip or fins as aids. Say whether a 'length' is 25 yards or 25 m.

### history: World War I

| Run | Kind | Format | Chapters | Facts | Latency | ₹ | Judge mean | Outline / framing |
|---|---|---|---|---|---|---|---|---|
| v1 #1 | event | quick | 3 | 17 | 78 s | ₹1.23 | 3.44 | "You do not need weeks of study to understand World War I. Let us review its causes, events, and aftermath quickly." |
| v1 #2 | event | quick | 3 | 15 | 74 s | ₹1.15 | 3.56 | "You do not need weeks of study to understand this war. Let us examine the causes and results quickly." |
| v2 #1 | subject | quick | 3 | 12 | 41 s | ₹0.55 | 3.11 | "This quick guide explains how World War I began and how it reshaped the modern world." |
| v2 #2 | subject | quick | 3 | 13 | 55 s | ₹0.90 | 3.44 | "Here is a quick overview of how World War I began and reshaped the modern world." |
| v3 #1 | subject | quick | 3 | 18 | 49 s | ₹1.36 | 3.22 | Imperial Rivalry and Alliances → The Balkan Crisis → Outbreak of Global Conflict → Fall of Four Empires → Treaty of Versailles and New Borders → Long-Term Global Impact |
| v3 #2 | subject | quick | 3 | 18 | 32 s | ₹3.64 | 3.44 | Root causes in Europe → The spark and mobilization → Modern industrial warfare → The fall of four empires → The Treaty of Versailles → Long-term global consequences |

- **v1 #1**. Best: Every fact is accurate, with precise dates and a clean timeline from assassination to treaty. Worst: It lacks the 'why' and the 'how it changed the world' depth: the underlying causes and the consequences are barely explained. Missing: Long-term causes: the alliance system (Triple Entente and Triple Alliance), nationalism in the Balkans, imperialism, the arms race and the Schlieffen Plan.; Treaty of Versailles terms: war guilt clause, reparations, territorial losses and military limits, and how they fed later instability.; Wider world changes: the Russian Revolution's legacy, the Middle East mandates, the League's weakness and the US absence, the 1918 flu, and the link to WWII.
- **v1 #2**. Best: Every stated fact is accurate and clearly worded, with solid Britannica sources. Worst: It does not explain why the war started beyond the assassination, so it fails half of the reader's goal. Missing: Long-term causes: militarism, alliance blocs (Triple Entente and Triple Alliance), imperial rivalry, nationalism in the Balkans, and the July Crisis steps (ultimatum, German blank check, Belgium); Why the war changed the world: the Russian Revolution and the USSR, the Versailles resentment that fed WWII, Middle East mandates (Sykes-Picot), and women's suffrage and social change; Key war-course facts: the Schlieffen Plan, the Marne and the start of trench stalemate, Somme and Verdun casualties, and Germany's unrestricted submarine warfare
- **v2 #1**. Best: The key dates are accurate and clearly stated. They cover the trigger, US entry and the armistice. Worst: The Bolshevik Revolution fact is wrong, and the causes are thin. There is no explanation of why the alliances turned a regional crisis into a world war. Missing: The deep causes (militarism, alliances, imperialism, nationalism) and the July Crisis chain, including the German 'blank cheque' and the invasion of Belgium; The Treaty of Versailles terms (war guilt clause, reparations, territorial losses) and their link to WWII; Wider effects: the end of the Ottoman, Austro-Hungarian, German and Russian empires, new nations, the Middle East mandates, the rise of the USSR, and the social changes
  - wrong: "The 1917 Bolshevik Revolution ends imperial rule in Russia and leads to Russia leaving the war." (The February 1917 revolution ended the tsar's rule. The Bolshevik (October) Revolution overthrew the Provisional Government. Russia left the war with Brest-Litovsk in March 1918.)
  - unsure: "Combat claims more than 8 million soldiers and about 13 million civilians die from war-related causes." (The figures are roughly Britannica's, but they are ambiguous. Common estimates are about 9–10 million military deaths and about 6–13 million civilian deaths. 'Combat claims' is imprecise.)
- **v2 #2**. Best: Every fact is accurate and the sources are real and authoritative. Worst: It barely explains why the war started. The causes are reduced to one assassination and vague alliances, and the effects are thin too. Missing: Underlying causes: militarism, alliance system (Triple Entente and Triple Alliance), imperialism, nationalism, and the July Crisis steps (ultimatum, German backing, mobilizations, Belgium invasion, British entry on Aug 4, 1914).; Concrete Versailles details: the war guilt clause, reparations of 132 billion gold marks, the territorial losses, and the League of Nations.; Wider consequences: new nations in Europe, the Middle East mandates, the 1918 flu and economic effects, women's roles, and the rise of fascism or communism.
- **v3 #1**. Best: The facts are mostly accurate and follow a clear cause-to-consequence line that fits the reader's goal. Worst: The brief is thin. It omits the war itself, and it has few names, dates or numbers. It also has a chapter-count mismatch (3 vs 6). Missing: The war itself and how it ended: the stalemate on the Western Front, new weapons, the US entering in 1917, and the armistice of 11 November 1918; The July Crisis details: the 23 July ultimatum, Germany's blank cheque, the Schlieffen Plan, and the Franco-Russian alliance; Wider effects of the war: Wilson's self-determination, the Armenian genocide, women's roles and the 1918 flu, and the US not joining the League
  - unsure: "Imperial competition for overseas colonies increases tension and fuels naval arms races among these powers." (Broadly accepted, but vague. The Anglo-German naval race is the main case and is not named. Colonial rivalry is also debated as a cause.)
  - unsure: "The Russian Empire falls to the Bolshevik Revolution in 1917, establishing Soviet rule." (The tsar abdicated in the February 1917 revolution. The Bolsheviks seized power in October 1917. The brief makes the monarchy's fall look like the Bolshevik act. The USSR was formally founded in 1922.)
- **v3 #2**. Best: All facts are accurate and in clear cause-and-effect order, from the assassination to the consequences. Worst: Facts are thin and generic. Names, battles, mechanisms and key events like US entry and the Senate's rejection are missing, and the count of 3 chapters conflicts with the 6-item outline. Missing: Named alliances (Triple Entente, Triple Alliance), the July Crisis, the blank check, the Schlieffen Plan and the German invasion of Belgium as Britain's reason for entering; US entry in 1917, and the fact that the US Senate rejected the Versailles treaty and the League; Civilian deaths, the 1918 flu, and social changes such as women's suffrage and the rise of the US as a world power

## What this eval cost

Research ₹24.44, judging ₹76.85, total ₹101.28 (estimates from list prices).
