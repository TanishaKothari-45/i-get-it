# Judge report

2026-10-04 17:38. 70 cached chapters. Judge: Claude via Claude Code headless, 12 binary checks. Bar: 10 of 12 and no doubtful fact. Weak chapters got a targeted repair (the model sees the judge's objections and changes only those cards), then a re-judge.

| chapter | score | facts ok | result | still doubtful |
|---|---|---|---|---|
| ai-agents-software-that-uses-a-model-lik.ch1 | 11 | True | already passing |  |
| ai-agents-software-that-uses-a-model-lik.ch2 | 11 | True | already passing |  |
| ai-agents-software-that-uses-a-model-lik.ch3 | 12 | True | already passing | Card 6 says private details can leak 'if a send key is also on the ring'. That's incomplete, not false: a read_page or search_web tool can also leak data by fetching a web address  |
| ai-agents-software-that-uses-a-model-lik.ch4 | 11 | True | already passing | Not a false fact, but exercise 2 has a mismatch: the prompt says the agent 'did fine for 10 steps' and never mentions a step 2 booking, yet the right answer and its explanation poi |
| ai-agents-software-that-uses-a-model-lik.ch5 | 10 | True | already passing |  |
| ai-agents-software-that-uses-a-model-lik.ch6 | 11 | True | already passing |  |
| ai-agents-software-that-uses-a-model-lik.ch7 | 10 | True | already passing |  |
| an-agent-that-tracks-my-competitors.ch1 | 10 | True | already passing | 'An AI like Claude or ChatGPT' calls ChatGPT a model, but ChatGPT is an app built on GPT models. This is minor, but a product manager may notice.; Defining an agent by its trigger  |
| an-agent-that-tracks-my-competitors.ch2 | 11 | True | already passing |  |
| an-agent-that-tracks-my-competitors.ch3 | 10 | True | already passing | Card 7: 'a file with one or two lines means the page never arrived' is a rule of thumb stated as a sure thing. A short but real page, or a long cookie-banner page, would break it. |
| an-agent-that-tracks-my-competitors.ch4 | 11 | True | already passing |  |
| an-agent-that-tracks-my-competitors.ch5 | 11 | True | already passing | 'the model has to stick to what's in front of it' (card 6) overstates it: asking for a quote makes the model more likely to stay on the clipping, but it doesn't force it to. Models |
| an-agent-that-tracks-my-competitors.ch6 | 11 | True | already passing |  |
| an-agent-that-tracks-my-competitors.ch7 | 10 | True | already passing |  |
| indian-stock-market-basics.ch1 | 12 | True | already passing | 'a sliver of the profits' is loose: shareholders only get profits as dividends if the company decides to pay them; 'Benjamin Graham built his whole approach on this gap' is fair in |
| indian-stock-market-basics.ch2 | 10 | True | already passing | 'The bazaar has two big buildings' is a simplification: India also has a third, smaller exchange, the Metropolitan Stock Exchange. Fine for teaching, but not literally complete. |
| indian-stock-market-basics.ch3 | 11 | True | repaired 8->11 facts_ok=True |  |
| indian-stock-market-basics.ch4 | 9 | True | repaired 8->9 facts_ok=True |  |
| indian-stock-market-basics.ch5 | 10 | True | already passing |  |
| indian-stock-market-basics.ch6 | 10 | True | already passing |  |
| indian-stock-market-basics.ch7 | 10 | True | already passing | Priya's 'Tax: ₹0' assumes she has no other long-term gains that financial year, and the card doesn't say so; Meera's '₹29,000 now' and '₹2,500' leave out the 4% cess and any surcha |
| n8n-automations-for-my-job.ch1 | 10 | True | repaired 11->10 facts_ok=True |  |
| n8n-automations-for-my-job.ch2 | 10 | True | already passing |  |
| n8n-automations-for-my-job.ch3 | 11 | True | already passing |  |
| n8n-automations-for-my-job.ch4 | 11 | True | already passing |  |
| n8n-automations-for-my-job.ch5 | 11 | True | already passing |  |
| n8n-automations-for-my-job.ch6 | 9 | False | repaired 10->9 facts_ok=False | 'Tomorrow: one switch, and your line runs while you're asleep': newer n8n versions (2.x) may have swapped the old on/off 'Active' switch for a 'Publish' button, so 'one switch' cou |
| n8n-automations-for-my-job.ch7 | 11 | True | already passing |  |
| public-speaking.ch1 | 11 | True | already passing | Patrick Winston's 'build a fence around your idea' is about not confusing your idea with other people's ideas. The card's second job for it, deciding what to cut, is the chapter's  |
| public-speaking.ch2 | 11 | True | already passing |  |
| public-speaking.ch3 | 11 | True | already passing |  |
| public-speaking.ch4 | 10 | True | already passing |  |
| public-speaking.ch5 | 11 | True | already passing |  |
| public-speaking.ch6 | 10 | True | repaired 9->10 facts_ok=True |  |
| public-speaking.ch7 | 10 | True | already passing |  |
| read-a-balance-sheet.ch1 | 11 | True | already passing |  |
| read-a-balance-sheet.ch2 | 10 | True | already passing | Teaser says assets are listed 'in strict order' by speed to cash: the order depends on the reporting rules. US sheets put the fastest-to-cash items first, but many UK and internati |
| read-a-balance-sheet.ch3 | 11 | True | already passing |  |
| read-a-balance-sheet.ch4 | 10 | True | already passing | Card 7 (Priya): a long-term loan that comes due is usually listed as 'current portion of long-term debt', not 'short-term borrowings'. Some companies merge the two, so this is a lo |
| read-a-balance-sheet.ch5 | 10 | True | already passing |  |
| read-a-balance-sheet.ch6 | 10 | True | already passing | 'Check three' (cash against short-term loans only) is a made-up variant. The standard cash ratio compares cash with all current liabilities. It's fine as a teaching shortcut but sh |
| read-a-balance-sheet.ch7 | 10 | True | already passing | 'Miss it and every number is off by a factor of 1,000' only holds for 'in thousands'. If the sheet says 'in millions' and you miss it, every number is off by a factor of a million. |
| swimming-to-be-safe-and-comfortable-in-a.ch1 | 10 | True | already passing |  |
| swimming-to-be-safe-and-comfortable-in-a.ch2 | 11 | True | already passing |  |
| swimming-to-be-safe-and-comfortable-in-a.ch3 | 11 | True | already passing | Card 8 says 'To get up, chin to chest, knees in, hands press down' after teaching both floats, which suggests chin-to-chest for the front float too; card 6 only teaches the chin-le |
| swimming-to-be-safe-and-comfortable-in-a.ch4 | 11 | True | already passing | Exercise cards 2 and 5 go over 120 words once the prompt, options, one wrong-answer note and the re-teach text are counted together (about 130 to 150 words each).; 'Around 4 metres |
| swimming-to-be-safe-and-comfortable-in-a.ch5 | 11 | True | already passing | Priya's numbers (about 3 m in 20 s thrashing, 12 m in about 30 s with a good kick) are made up for the example. They're believable but should be read as illustration, not data.; Th |
| swimming-to-be-safe-and-comfortable-in-a.ch6 | 10 | True | already passing |  |
| swimming-to-be-safe-and-comfortable-in-a.ch7 | 11 | True | repaired 7->11 facts_ok=True |  |
| vibe-coding-with-claude-code.ch1 | 10 | True | already passing | 'Before Claude creates or changes a file, it shows you what it's about to do and asks' is only true in the default permission mode. If a user switches on auto-accept for edits, it  |
| vibe-coding-with-claude-code.ch2 | 10 | True | already passing |  |
| vibe-coding-with-claude-code.ch3 | 12 | True | repaired 11->12 facts_ok=True | Not false, but simplified: the 'one file per job' split fits a plain HTML/CSS/JS app. In a React + Tailwind app, which is common for Claude-built apps, the button's colour and its  |
| vibe-coding-with-claude-code.ch4 | 10 | True | already passing |  |
| vibe-coding-with-claude-code.ch5 | 10 | True | already passing | 'The first push asks you to sign in to GitHub once' is oversimplified: a first push also needs a GitHub repository to be created and linked, and the try card never mentions setting |
| vibe-coding-with-claude-code.ch6 | 11 | True | already passing | 'a Git commit from chapter 5' and 'make it better from chapter 2' point to other chapters I can't see, so I can't confirm those chapters cover that.; The Pragmatic Programmer claim |
| vibe-coding-with-claude-code.ch7 | 10 | True | already passing |  |
| western-philosophy.ch1 | 11 | True | repaired 11->11 facts_ok=True |  |
| western-philosophy.ch2 | 11 | True | already passing | The chapter suggests that asking 'why' five times is Socrates' method. 'Five whys' is a modern technique from Toyota, and Socratic questioning had no fixed count. This isn't stated |
| western-philosophy.ch3 | 10 | True | already passing |  |
| western-philosophy.ch4 | 10 | True | already passing | In Meditation I, the doubt about simple sums comes mainly from the idea of an all-powerful deceiving God, which Descartes raises before the 'evil demon'. Saying the demon fakes 'ev |
| western-philosophy.ch5 | 11 | True | already passing | 'Kant said it's more like glasses' makes the glasses metaphor sound like Kant's own words. It is a modern teaching image, not his.; 'Kant ... later said it woke him from his dogmat |
| western-philosophy.ch6 | 11 | True | already passing |  |
| western-philosophy.ch7 | 10 | True | already passing |  |
| wwii-how-the-war-started-and-was-won-193.ch1 | 10 | False | repaired 11->10 facts_ok=False | 'Britain and France watched Hitler grab land for three years and did nothing' oversimplifies: Britain and France negotiated at Munich, began rearming and guaranteed Poland's border |
| wwii-how-the-war-started-and-was-won-193.ch2 | 11 | True | already passing | Card 4 runs two papers together. The paper Chamberlain held up when he landed was the separate Anglo-German declaration, not the Munich Agreement, so 'The paper lasted less than si |
| wwii-how-the-war-started-and-was-won-193.ch3 | 10 | True | already passing | Card 6 is exactly 120 words, right at the limit, and says RAF pilots took on 'German bombers' when the fighting was mostly against German fighter escorts. The claim isn't false, bu |
| wwii-how-the-war-started-and-was-won-193.ch4 | 12 | True | already passing |  |
| wwii-how-the-war-started-and-was-won-193.ch5 | 11 | True | already passing |  |
| wwii-how-the-war-started-and-was-won-193.ch6 | 10 | True | repaired 9->10 facts_ok=True |  |
| wwii-how-the-war-started-and-was-won-193.ch7 | 10 | True | already passing |  |

Pass: 67 of 70. Mean score 10.5 of 12.
