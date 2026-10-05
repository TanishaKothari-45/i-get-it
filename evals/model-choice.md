# Model choice for I Get It: comparison, 6 Oct 2026

Shaktimaan's spec: 5 fixed topics, every model on plan, chapter 1 and fact check; record seconds, cost and quality; plant exactly 10 known false facts for the fact check; stop past $10; change nothing live. Run on the dev deployment through the app's own prompts (convex/evalModels.ts). One fixed judge for all: Claude Opus 5.5 at high effort (note: it is the same family as two of the candidates). Prices per million tokens: Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 4.5 $1/$5, Fable 5.1 $10/$50. ₹84 per $.
Total spent: $6.316.

Topics: Public speaking, Indian stock market basics, how tides work, chess openings, Nifty options for beginners.

## Plan (the reader waits for this)

Score: 1 to 5 against the plan rules in PLAN_PROMPT, by the judge.

| Model | Effort | Finished | Median s | Slowest s | Avg score /5 | Avg cost |
|---|---|---|---|---|---|---|
| claude-haiku-4-5 | - | 5/5 | 2.6 | 14.1 | 2.0 | ₹1.57 |
| claude-sonnet-5-5 | low | 5/5 | 11.2 | 12.6 | 3.6 | ₹2.97 |
| claude-sonnet-5-5 | medium | 5/5 | 11.7 | 12.7 | 3.2 | ₹2.80 |
| claude-opus-5-5 | low | 5/5 | 14.9 | 16.5 | 3.6 | ₹3.98 |
| claude-opus-5-5 | medium | 5/5 | 26.0 | 31.0 | 4.0 | ₹6.76 |
| claude-opus-5-5 | high | 5/5 | 33.0 | 39.0 | 4.0 | ₹7.80 |
| claude-fable-5-1 | low | 5/5 | 30.8 | 45.0 | 3.8 | ₹11.59 |

Every plan, raw:

| Topic | Model | Effort | Seconds | Score | Judge's reason |
|---|---|---|---|---|---|
| Public speaking | claude-haiku-4-5 | - | 2.5 | 1 | No plan was delivered, only a clarifying question, so there are no chapters, day-7 outcome, analogy, hooks, or sources to check against the rules, though the qu |
| Public speaking | claude-sonnet-5-5 | low | 10.5 | 3 | Solid seven-step build with a specific day-7 outcome and 'You can' outcomes, but chapter 1's hook rests on an unsupported '90%' statistic, the guided-walk analo |
| Public speaking | claude-sonnet-5-5 | medium | 2.9 | 2 | The clarifying question is specific and fair, but 'public speaking' could be planned with a sensible default, so asking leaves no chapters, outcome, analogy, or |
| Public speaking | claude-opus-5-5 | low | 3.3 | 2 | It asks a clear, useful clarifying question but delivers no chapters, outcome, analogy or sources, even though 'Public speaking' was specific enough to plan, fo |
| Public speaking | claude-opus-5-5 | medium | 27.4 | 4 | Strong plan with a specific day-7 outcome, a guided-walk analogy carried throughout, valid hooks and outcomes, and real sources, but chapters 6 and 7 each bundl |
| Public speaking | claude-opus-5-5 | high | 27.6 | 4 | Strong plan: specific day-7 outcome, real sources, hooks under 18 words and a mostly carried hike analogy, but chapter 5 drops the analogy, chapters 6 and 7 eac |
| Public speaking | claude-fable-5-1 | low | 30.8 | 4 | Seven ordered chapters, a concrete day-7 outcome, a well-carried guided-walk analogy, valid hooks and outcomes, and real sources, but the '30 seconds before the |
| Indian stock market basics | claude-haiku-4-5 | - | 2.6 | 2 | Asks a clear, useful clarifying question but delivers none of the required plan: no seven chapters, day-7 outcome, analogy, hooks, or sources to judge. |
| Indian stock market basics | claude-sonnet-5-5 | low | 12.6 | 3 | Strong order, a specific day-7 outcome and accurate facts (T+1, 9:15-3:30), but the bazaar analogy never appears in the chapters, the chapter 1 hook runs 19 wor |
| Indian stock market basics | claude-sonnet-5-5 | medium | 10.8 | 4 | Clear seven-step build with a specific day-7 outcome, real sources, and valid 'You can' outcomes and short hooks, but the mandi analogy fades after chapter 2 an |
| Indian stock market basics | claude-opus-5-5 | low | 16.5 | 4 | Strong plan: seven ordered chapters, a specific day-7 outcome, outcomes that all start 'You can', honest hooks under 18 words, a mandi analogy and real sources. |
| Indian stock market basics | claude-opus-5-5 | medium | 24.9 | 4 | Strong and well ordered, with a specific day-7 outcome, real sources and 'You can' outcomes, but the chapter 7 hook runs 20 words, 'thermometer' breaks the mand |
| Indian stock market basics | claude-opus-5-5 | high | 33.0 | 4 | Strong plan with seven ordered chapters, a specific day-7 outcome, accurate facts and real sources, but the chapter 7 hook is 18 words (the limit is under 18),  |
| Indian stock market basics | claude-fable-5-1 | low | 24.8 | 3 | Strong specific day-7 outcome, a carried mandi analogy and real sources, but the ch3 and ch5 hooks hit 18 words, ch5 and ch7 bundle several topics, the ch6 hook |
| how tides work | claude-haiku-4-5 | - | 13.8 | 3 | Seven chapters build in a sound order with 'You can' outcomes, but four hooks run 18+ words, the tug-of-war analogy is never carried through, the day-7 claim of |
| how tides work | claude-sonnet-5-5 | low | 12.2 | 4 | Seven chapters build in order toward a specific day-7 outcome, but the chapter 1 hook runs 19 words around a vague hair-dryer claim, chapter 6's hook answers it |
| how tides work | claude-sonnet-5-5 | medium | 12.4 | 3 | Seven chapters build in order and the facts and sources hold up, but the bathtub analogy never reappears after the intro, chapter 2's hook is 18 words (not unde |
| how tides work | claude-opus-5-5 | low | 13.4 | 4 | Seven well-ordered chapters, a specific day-7 outcome, accurate figures and real sources, but the water-balloon picture is barely carried past setup, several ho |
| how tides work | claude-opus-5-5 | medium | 31.0 | 4 | Strong and well built: seven ordered chapters, a specific day-7 outcome, a consistent 'two humps' picture and real sources. Gaps: the chapter 4 hook runs 19 wor |
| how tides work | claude-opus-5-5 | high | 39.0 | 4 | Seven well-ordered chapters, a specific day-7 outcome, accurate numbers and real sources, but the swing picture only really appears in chapter 6, and the chapte |
| how tides work | claude-fable-5-1 | low | 19.4 | 4 | Strong, well-ordered seven chapters with a specific day-7 outcome and real sources, but the bathtub picture only shows up in chapter 4 alongside a bulge model,  |
| chess openings | claude-haiku-4-5 | - | 14.1 | 2 | The house analogy is dropped after the intro. Ch3 crams four openings and claims an invented '80%' stat. Hooks overclaim and ch2's runs 19 words. The day-7 'thr |
| chess openings | claude-sonnet-5-5 | low | 10.0 | 4 | Seven well-ordered chapters, a specific day-7 outcome, 'You can' outcomes and short open-loop hooks, but the camp analogy fades after chapter 3 and the hook cla |
| chess openings | claude-sonnet-5-5 | medium | 11.7 | 3 | Strong order and a specific day-7 outcome, but the shop analogy disappears after chapter 3, the chapter 3 hook is exactly 18 words, and some hooks overclaim ('t |
| chess openings | claude-opus-5-5 | low | 14.9 | 4 | Solid plan with a well-ordered progression, a specific day-7 outcome, real sources and accurate facts, but hook 6 runs 19 words, hooks 2, 3 and 5 are statements |
| chess openings | claude-opus-5-5 | medium | 26.0 | 4 | Strong, specific, well-ordered plan with real sources and valid hooks; minor gaps are the house analogy fading after chapter 4, a hook that isn't an open loop ( |
| chess openings | claude-opus-5-5 | high | 32.2 | 4 | Seven ordered chapters, a specific honest day-7 goal, a moving-house analogy carried through and real sources, but chapter 4 bundles three mistakes plus the fou |
| chess openings | claude-fable-5-1 | low | 33.9 | 3 | Strong structure (seven ordered chapters, a carried shop analogy, real sources), but some hooks are false or invented ('grandmasters do not memorise', '9 out of |
| Nifty options for beginners | claude-haiku-4-5 | - | 1.6 | 2 | No plan delivered (no chapters, day-7 outcome, analogy, or hooks); the clarifying question is clear and specific, but a reasonable default plan could likely hav |
| Nifty options for beginners | claude-sonnet-5-5 | low | 11.2 | 4 | Seven well-ordered chapters, a concrete day-7 outcome, 'You can' outcomes, short hooks and real sources, but the insurance analogy fades after chapter 3, the ch |
| Nifty options for beginners | claude-sonnet-5-5 | medium | 12.7 | 4 | Seven well-ordered chapters, a concrete day-7 outcome and real sources, but two hooks (ch1 at 19 words, ch7 at 18) miss the under-18 limit, the ch1 hook reads c |
| Nifty options for beginners | claude-opus-5-5 | low | 14.9 | 4 | Seven ordered single-topic chapters, a specific day-7 outcome, valid hooks and outcomes, a mostly sustained insurance analogy and real sources; marked down for  |
| Nifty options for beginners | claude-opus-5-5 | medium | 25.0 | 4 | Strong plan: seven ordered chapters, a specific, honest day-7 outcome, insurance analogy carried through, hooks under 18 words, real sources. Gaps: chapter 7 pa |
| Nifty options for beginners | claude-opus-5-5 | high | 36.8 | 4 | Strong, well-ordered plan with an honest day-7 outcome, a carried analogy and real sources, but chapter 7's hook is 18 words (not under 18), chapter 7 bundles c |
| Nifty options for beginners | claude-fable-5-1 | low | 45.0 | 5 | Seven well-ordered chapters on one booking-token analogy, a specific and honest day-7 outcome, valid 'You can' outcomes and short honest hooks, hedged accurate  |

## Chapter 1 (written from the same Opus-high plan for every writer)

Score: the existing 12-check judge (docs/section6-check/judge.py). "Dubious" counts claims the judge doubted.

| Model | Effort | Finished | Median s | Avg score /12 | Dubious claims (5 chapters) | Avg cost |
|---|---|---|---|---|---|---|
| claude-haiku-4-5 | - | 5/5 | 28.8 | 5.2 | 26 | ₹6.69 |
| claude-sonnet-5-5 | medium | 5/5 | 22.1 | 9.0 | 7 | ₹6.93 |
| claude-opus-5-5 | medium | 5/5 | 50.2 | 9.0 | 3 | ₹14.40 |
| claude-fable-5-1 | low | 5/5 | 69.3 | 9.4 | 8 | ₹30.03 |

Every chapter, raw:

| Topic | Model | Seconds | Score | Failed checks | Dubious claims |
|---|---|---|---|---|---|
| Public speaking | claude-haiku-4-5  | 30.2 | 7 | concrete_images, facts_ok, hook, open_loop, would_keep_reading | Couch-to-5K 'has been around since 2009' (option a, exercise 2): Josh Clark created the program around 1996. 2009 is roughly when the NHS podcast version appeared. |
| Public speaking | claude-sonnet-5-5 medium | 23.2 | 9 | concrete_images, facts_ok, open_loop | Priya's draft is called 14 words; it is 12; "Composting turns your kitchen scraps into free soil in six weeks": typical home composting takes months; six weeks only applies to well-managed hot composting |
| Public speaking | claude-opus-5-5 medium | 50.2 | 10 | concrete_images, open_loop |  |
| Public speaking | claude-fable-5-1 low | 64.2 | 10 | hook, open_loop |  |
| Indian stock market basics | claude-haiku-4-5  | 35.7 | 7 | facts_ok, feedback_names_confusion, one_idea, short_cards, would_keep_reading | 10 Infosys shares for ₹6,000 implies ₹600 per share, but Infosys has traded far higher (roughly ₹1,400–1,900) in recent years.; 'You own part of its buildings': shareholders do not legally own a company's assets; the company does.; 'Bajaj got that money years ago when it first issued the shares': to |
| Indian stock market basics | claude-sonnet-5-5 medium | 24.2 | 10 | facts_ok, one_idea | 'The company only gets money when it first sells shares to the public, in an IPO' ignores follow-on public offers (FPOs), rights issues and QIPs, which also raise money for the company. |
| Indian stock market basics | claude-opus-5-5 medium | 55.5 | 8 | concrete_images, facts_ok, one_idea, open_loop | 'A company sells slices to the public once, at its listing': companies can issue new shares later via follow-on offers, rights issues or QIPs.; 'That money does reach the company': in an IPO, the offer-for-sale portion goes to existing shareholders, not the company. |
| Indian stock market basics | claude-fable-5-1 low | 58.2 | 9 | concrete_images, one_idea, open_loop |  |
| how tides work | claude-haiku-4-5  | 28.8 | 4 | answerable, concrete_images, facts_ok, feedback_names_confusion, no_cliche, open_loop, short_cards, would_keep_reading | Card 3: the near-side bulge forms because the rock is 'yanked away' from the water; actually the water is pulled more than Earth's centre; Exercise 1 answer b: 'The Moon pulls Earth's solid rock harder than it pulls the ocean water'; false, and not what card 3 says either (rock vs centre); Exercise  |
| how tides work | claude-sonnet-5-5 medium | 21.5 | 10 | facts_ok, would_keep_reading | 'Earth's solid body barely stretches': solid-Earth tides are roughly 20-30 cm, a large fraction of the under-a-metre open-ocean bulge, so the contrast is overstated. |
| how tides work | claude-opus-5-5 medium | 59.9 | 10 | concrete_images, open_loop |  |
| how tides work | claude-fable-5-1 low | 69.3 | 9 | concrete_images, facts_ok, open_loop | Card 9: a tide table for any coastal town should show two high tides a day. Many places, such as parts of the Gulf of Mexico, have one high tide a day (diurnal) or mixed tides.; Card 1: the swing/push metaphor sits awkwardly with a pull-based explanation and is never used again. It is not false, but |
| chess openings | claude-haiku-4-5  | 25.1 | 5 | answerable, concrete_images, facts_ok, feedback_names_confusion, laugh_or_sit_up, short_cards, would_keep_reading | Card 2 option a: 'move the pawn two squares forward to a2' is impossible because the pawn already starts on a2.; Card 5 whyNot c: '1…d5 does hit d4 and e4' is false; a d5 pawn attacks c4 and e4.; Card 6: new players move 'a rook or knight or bishop' on move one, but only knights (or pawns) can move  |
| chess openings | claude-sonnet-5-5 medium | 20.1 | 9 | feedback_names_confusion, open_loop, would_keep_reading | Calling b and g 'edge columns' and implying early g-pawn or b-pawn moves cede the centre ignores fianchetto setups that are standard, centre-focused play. |
| chess openings | claude-opus-5-5 medium | 46.7 | 8 | answerable, laugh_or_sit_up, open_loop, would_keep_reading |  |
| chess openings | claude-fable-5-1 low | 69.9 | 10 | facts_ok, open_loop | 'White's first move in most games is pawn to e4': it is the most common first move but well under half of games in major databases, with d4 close behind.; 'Capablanca built his teaching around exactly this: control the centre first, bring pieces out second': this is a loose, unsourced attribution; h |
| Nifty options for beginners | claude-haiku-4-5  | 28.8 | 3 | answerable, concrete_images, facts_ok, feedback_names_confusion, laugh_or_sit_up, one_idea, open_loop, short_cards, would_keep_reading | Nifty index options are European-style, exercisable only at expiry, not 'on or before' expiry, so the early-use framing in card 4 and exercise 2 is wrong for Nifty.; Card 6: 'the option falls further into the red… The seller does [pay the difference]' is false for a call buyer when Nifty falls.; Car |
| Nifty options for beginners | claude-sonnet-5-5 medium | 22.1 | 7 | concrete_images, facts_ok, laugh_or_sit_up, open_loop, would_keep_reading | 'within the month' and 'by a set date' imply the holder can use the lock any time before expiry, but Nifty index options are European-style and can only be exercised at expiry.; 'the right to buy or sell Nifty' implies delivery of the index, but Nifty options are cash-settled; no one actually buys o |
| Nifty options for beginners | claude-opus-5-5 medium | 48.1 | 9 | concrete_images, facts_ok, open_loop | Ravi's option runs 'until Thursday', which implies a Thursday Nifty expiry. NSE moved Nifty weekly and monthly expiries to Tuesday from September 2025, so a reader today would find no Thursday Nifty expiry. |
| Nifty options for beginners | claude-fable-5-1 low | 79.6 | 9 | concrete_images, facts_ok, open_loop | Nifty options can be exercised 'any time up to' expiry: they are European-style and settle only at expiry.; 'Buy or sell Nifty' at the lock level: index options are cash-settled, so no index units change hands.; 'Ravi's two Thursdays': the card never mentions Thursdays, and Nifty weekly expiry is re |

## Fact check: 10 planted false facts

The chapter: Indian stock market basics, chapter 1 (ready topic), with these 10 planted (listed before any run):

| # | Card | Planted | The truth |
|---|---|---|---|
| 1 | 0 | can change only once a minute | Prices change many times a second during trading. |
| 2 | 2 | cut into exactly 1,000 pieces | Big companies have crores of shares, not exactly 1,000. |
| 3 | 2 | you usually buy your slice directly from the company | After the first sale you buy from other owners, not the company. |
| 4 | 3 | up 6% | ₹500 to ₹503 is a 0.6% rise. |
| 5 | 5 | Benjamin Graham, who was taught by Warren Buffett | Graham taught Buffett, not the other way round. |
| 6 | 8 | the Bombay Stock Exchange, opened in 1995 | The BSE dates from 1875. |
| 7 | 6 | at 8:30 am, buys at 8:40 | Regular trading on NSE/BSE opens at 9:15 am; there is no buying at 8:40. |
| 8 | 2 | with a guaranteed share of the profits every month | Dividends are not guaranteed and are not paid monthly. |
| 9 | 8 | 40 hands up, 4 slices left, and the price falls | More buyers than sellers pushes the price up. |
| 10 | 7 | marked answer a | the right answer is b: It rises when buyers want it more than owners want to sell, whatever the reason. |

Caught = the checker rewrote that card and the planted words are gone (for #10, the marked answer was put back). False flags = cards it changed that had nothing planted (may include real problems in the original chapter).

| Model | Effort | Caught /10 | Missed | False flags | Seconds | Cost |
|---|---|---|---|---|---|---|
| claude-haiku-4-5 | - | 6 | 2, 3, 7, 8 | 0 (cards []) | 15.0 | ₹0.96 |
| claude-sonnet-5-5 | low | 10 | - | 0 (cards []) | 13.5 | ₹2.70 |
| claude-sonnet-5-5 | medium | 10 | - | 0 (cards []) | 12.8 | ₹2.73 |
| claude-opus-5-5 | low | 10 | - | 1 (cards [4]) | 48.9 | ₹6.10 |
| claude-opus-5-5 | medium | 10 | - | 2 (cards [1, 4]) | 38.8 | ₹9.38 |
| claude-opus-5-5 | high | 10 | - | 2 (cards [1, 4]) | 38.0 | ₹9.52 |
| claude-fable-5-1 | low | 10 | - | 2 (cards [1, 4]) | 45.5 | ₹21.59 |

What each checker said, raw:

- claude-haiku-4-5 : The 'body' version says price changes only once per minute, but the 'simpler' version says it changes several times per second. These contradict each other. The / The calculation of the percentage is wrong: from ₹500 to ₹503 is a rise of ₹3, which is 0.6%, not 6%. The example says '6%' but should say '0.6%'. / The attribution is reversed: Benjamin Graham was Warren Buffett's teacher, not the other way around. The card says 'Benjamin Graham, who was taught by Warren Bu / The 'reteach' line gives away that the answer is option (b) by repeating its core idea (buyers want it more than sellers, or vice versa) without explaining the  / The card claims 'India's first stock exchange, the Bombay Stock Exchange, opened in 1995', but the Bombay Stock Exchange was established in 1875, not 1995. This
- claude-sonnet-5-5 low: False claim that a share's price can change only once a minute; prices can change many times per second. / False: big Indian companies are not cut into exactly 1,000 pieces (they have crores), profits are not guaranteed monthly, and you usually buy from another owner / ₹500 to ₹503 is up 0.6%, not 6%. / Benjamin Graham was not taught by Buffett; Buffett was Graham's student. / Market opens at 9:15 am, so a purchase at 8:40 am is impossible. / Marked answer 'a' is false (good day doesn't always lift price); the correct option is 'b'. Also whyNot/reteach must not reveal it. / Contradictory (4 hands vs 40 slices flips to falling, but first case said falls too) and false claim that BSE opened in 1995 (it was 1875).
- claude-sonnet-5-5 medium: A share's price does not change only once a minute; it can change many times per second. / Companies are not cut into exactly 1,000 pieces (big ones have crores), profits are not guaranteed monthly, and after the first sale you buy from another owner, / ₹503 vs ₹500 is up 0.6%, not 6%. / Benjamin Graham was Buffett's teacher, not the other way round; the sentence implied the reverse. / Priya's story: 8:30 am and 8:40 am are before the market opens (9:15 am), so she could not have bought then. / The marked answer is wrong: option a is false (good news doesn't always raise the price); option b is the always-true statement. Option a's whyNot also gives aw / With 4 hands up and 40 slices on offer the price falls, but the body says a falling price in the first case; the first case (40 hands, 4 slices) should climb. A
- claude-opus-5-5 low: A share's price can change many times a second, not only once a minute. / Big companies have crores of shares, not exactly 1,000; profit payouts are not guaranteed or monthly; and after the first sale you usually buy from another owne / ₹500 to ₹503 is a 0.6% rise, not 6%. / The whyNot for c repeats the correct option's wording (sellers keener than buyers), giving away the answer. / Benjamin Graham was Warren Buffett's teacher, not taught by him. / Indian regular trading starts at 9:15 am, so Priya could not buy at 8:40 am. / The marked answer a is wrong; b is the always-true statement, and the whyNot must cover b instead of a. / With 40 buyers and 4 slices the price climbs, not falls; and the Bombay Stock Exchange opened in 1875, not 1995.
- claude-opus-5-5 medium: The body says a share's price can change only once a minute, but on Indian exchanges it can change many times in a single second. / The reteach repeats the correct option's words ('sellers can ask for more', 'the price climbs'), and the whyNot for a echoes 'compete', so both give away the an / This card has three errors: big Indian companies have crores of shares, not exactly 1,000; profit payouts are not guaranteed and not monthly; and after the firs / A move from ₹500 to ₹503 is a rise of 0.6%, not 6%. / The whyNot for c and the reteach both state the correct answer outright (sellers keener than buyers, sellers agreeing to less). / The body says Benjamin Graham was taught by Warren Buffett, but it was the other way round: Graham was Buffett's teacher. / Normal trading on Indian exchanges starts at 9:15 am, so Priya could not have bought at 8:40 am; the body now matches the simpler version's 9:30 and 9:40. / The marked answer a is wrong, since good company days don't always lift the price (as Priya found), so b is the correct option; the reteach and the whyNot for a / The body says the price falls when many buyers chase few slices, but it climbs; it also says the Bombay Stock Exchange opened in 1995, when it began in 1875.
- claude-opus-5-5 high: A share's price does not change only once a minute; on a busy stock it can change several times in one second. / The reteach gave away the answer by repeating its words ('sellers can ask for more', 'the price climbs'). / Big Indian companies have crores of shares, not exactly 1,000; profit payouts are neither guaranteed nor monthly; and after the first sale you usually buy from  / A move from ₹500 to ₹503 is a rise of 0.6%, not 6%. / The reteach and the whyNot for c repeated the correct answer's wording (sellers keener than buyers, sellers agreeing to less), and 'opens'/'closes' were market  / Benjamin Graham was Warren Buffett's teacher, not his student. / Indian stock exchanges are not open for normal trading at 8:40 am; trading starts at 9:15 am, so Priya could not have bought then. / The marked answer 'a' is false (a good company day can still bring a falling price); 'b' is the correct option, and the reteach and whyNot repeated b's wording. / With 40 buyers and 4 slices the price climbs, not falls; and the Bombay Stock Exchange opened in 1875, not 1995.
- claude-fable-5-1 low: A share's price can change many times a second, not only once a minute. / The reteach says the price climbs, which gives away the correct option. / Big Indian companies have crores of shares, not exactly 1,000; profits are not guaranteed or monthly; and after the first sale you usually buy from another owne / A move from ₹500 to ₹503 is a rise of 0.6%, not 6%. / The reteach and whyNot c repeat the correct option's wording (sellers keener than buyers), and "opens"/"closes" are unexplained market terms for a beginner. / Benjamin Graham taught Warren Buffett, not the other way round. / Indian share trading starts at 9:15 am, so Priya could not buy at 8:40 am; the simpler version's 9:30/9:40 timing is correct. / The marked answer a is false (a good day alone does not lift the price); b is the correct option, and the reteach and whyNot a repeated b's wording. / With 40 buyers and 4 slices the price climbs, not falls, and the Bombay Stock Exchange dates from 1875, not 1995.

## GLM through Cheaper Inference (added 6 Oct, Prateek's credits)

Same topics, prompts, judge and planted chapter. GLM ids via api.cheaperinference.com; "low" = thinking off, "medium" = thinking on. Chapters written from the same Opus-high plans as above. Our spend (judge only): $1.161. Failures were errors from the marketplace or broken JSON.

| Part | Model | Setting | Finished | Median s | Score | Doubtful / caught |
|---|---|---|---|---|---|---|
| Plan | glm-5.3 | low | 5/5 | 22.0 | 3.2 /5 | |
| Plan | glm-5.3 | medium | 5/5 | 46.7 | 3.8 /5 | |
| Plan | glm-5.3-flash | low | 4/5 | 30.6 | 3.5 /5 | |
| Chapter 1 | glm-5.3 | medium | 2/5 | 105.1 | 9.5 /12 | 1 doubtful |
| Chapter 1 | glm-5.3 | low | 4/5 | 60.0 | 9.2 /12 | 11 doubtful |
| Chapter 1 | glm-5.3-flash | low | 3/5 | 101.7 | 8.3 /12 | 12 doubtful |
| Fact check | glm-5.3 | low | 1/1 | 18.2 | | 9/10 caught, 0 stray changes |
| Fact check | glm-5.3 | medium | 1/1 | 197.6 | | 10/10 caught, 2 stray changes |
| Fact check | glm-5.3-flash | low | 1/1 | 172.9 | | 10/10 caught, 1 stray changes |

Read: GLM failed 6 of 15 chapters outright and was slower than Opus on chapters and fact checks, so it stays off the reader's path (dev only).
