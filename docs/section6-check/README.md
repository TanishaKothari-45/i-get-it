# Section 6 check: raw outputs and draft scores

Run 4 Oct 2026, night, by the coding agent. Model: Claude (via Claude Code headless, Prateek's subscription), because the OpenAI key had no credits. Prompts: prompt_plan.txt and prompt_chapter.txt in this folder (identical to convex/prompts.ts). Level: new. Raw outputs: *.plan.json, *.ch1.json, *.ch2.json, *.ch3.json.

**Scores are the agent's draft, pending Prateek.** Criteria (a) and (d) are human judgements; a generator scoring its own output isn't a test (Shaktimaan, 4 Oct). The ChatGPT study-mode column is Prateek's to fill unless the agent manages it in his browser tonight.

| Line typed | Day-7 outcome (start) | Chapters | Chapter 1 shape | One picture |
|---|---|---|---|---|
| AI agents | By day 7 you'll be able to draw the loop an AI agent runs (goal, think, act, check, repeat), name the 4 parts every agent has, read a simple agent's l… | 7 | 9 cards, 3 exercises, 3 options each | A new intern |
| Building a competitor-tracking agent | By day 7 you'll be able to run a small agent that checks 3 to 5 competitor web pages every day, spots what changed, and sends you a short plain-Englis… | 7 | 9 cards, 3 exercises, 3 options each | a newspaper clipping service |
| Indian stock market basics | By day 7 you'll be able to open a demat and trading account with a SEBI-registered broker, place a limit order for 1 share of a Nifty 50 company, read… | 7 | 9 cards, 3 exercises, 3 options each | One big organised bazaar |
| jev-s-agent-thing | asked one question first: By "agent" do you mean AI agents (software that uses a model like ChatGPT to take steps on its own, such as se… |  |  |  |
| n8n workflow automation | By day 7 you'll be able to build and switch on one n8n workflow for a real task at your job, for example a new form response gets added to a spreadshe… | 7 | 9 cards, 3 exercises, 3 options each | A small assembly line |
| Public speaking | By day 7 you'll be able to plan, rehearse and deliver a 3-minute talk to a small group, with one clear point, a steady opening, and a close you don't … | 7 | 9 cards, 3 exercises, 3 options each | Taking someone on a walk |
| Reading a balance sheet | By day 7 you'll be able to take any company's balance sheet, say in plain words what it owns, what it owes and what is left for the owners, check that… | 7 | 9 cards, 3 exercises, 3 options each | A house with a mortgage |
| Pool swimming for safety and comfort | By day 7 you'll be able to float on your back for 30 seconds, put your face in and breathe out underwater, push off the wall and glide, and swim a slo… | 7 | 9 cards, 3 exercises, 3 options each | Water holds you up |
| swimming | asked one question first: Swimming to be safe and comfortable in a pool, or to swim lengths for fitness?… |  |  |  |
| Vibe coding with Claude Code | By day 7 you'll be able to open Claude Code in a terminal, describe a small web app in plain English, get it built and running on your own computer, f… | 7 | 9 cards, 3 exercises, 3 options each | Hiring a contractor |
| Western philosophy | By day 7 you'll be able to take a claim like 'you should always keep your promises', ask the 4 questions philosophers ask of it (what does it mean, ho… | 7 | 9 cards, 3 exercises, 3 options each | A long argument |
| World War II, 1939 to 1945 | By day 7 you'll be able to tell the story of the war in about 10 minutes, from the 1919 peace treaty to Japan's surrender in September 1945, naming 8 … | 7 | 9 cards, 3 exercises, 3 options each | A street fire |
| wwii | asked one question first: WWII is too big for 7 chapters. Which thread do you want: how the war started and was won (the big story, 1939… |  |  |  |

## What the agent saw (draft, to be checked by Prateek)

- 10 of 10 lines produced a plan. 3 of 10 (swimming, WWII, "Jev's agent thing") asked one narrowing question first and produced the plan on the answered line. That's the rule working, and it costs one extra step before first value.
- (a) Specific, honest day-7 outcome: draft 10 of 10. None says "understand the basics"; each names a thing the person can do or explain, with numbers where they exist (30 seconds on the back, a 3-minute talk, 8 to 10 turning points).
- (b) Seven distinct chapters, no invented facts on a spot-check of two claims: draft 10 of 10 on structure; facts spot-checked on WWII (Versailles signed 28 June 1919, about 13% of land lost) and balance sheet (assets = liabilities + equity). Prateek should spot-check two claims per topic he knows.
- (c) Chapter 1 exercises answerable from the chapter and gradable by a rule: 3 of 3 required topics (swimming, AI agents, WWII) have three 3-option exercises with one key and a named confusion per wrong option; the app grades them by rule. Whether every question is answerable from the cards is a human read.
- (d) Written for the topic, not a template: draft 10 of 10 on a read of chapter 1's teach card; the n8n, Claude Code and stock-market chapters name the real buttons, commands and institutions.
- Known tell, fixed in the app: the model put the right answer at option B in 64 of 90 exercises. Options are now shuffled deterministically server-side.
- Not run: the two timed people (can't be done at night).
- ChatGPT study mode: the agent opened chatgpt.com in Prateek's browser at about 05:30 on 4 Oct; the tools menu on this account showed no "Study and learn" entry (it listed files, images, projects, web search, sketch, deep research, templates, presentations, PDF, documents, spreadsheets, platform, visualize, Gmail, GitHub). Per Shaktimaan's guardrail the agent did not substitute a plain chat and label it study mode. Column left for Prateek: open ChatGPT, turn on study mode if it exists in the account, paste the same 10 lines, score on the four criteria.
