# PROGRESS.md
One line per milestone: what works, what was decided, what's still broken. Newest at the bottom.

2026-10-03 Milestones 1 and 2 of the OLD product done (type the skill, tap why, see the vision). Superseded 4 Oct; the screens are being replaced.
2026-10-04 Product restarted from the job. PRODUCT.md written in the handbook format, reviewed twice by Shaktimaan, scope locked with two conditions (section 6 check to run; first user = coursemate, decided). DESIGN.md and AGENTS.md written by the agent on Prateek's go-ahead while he slept.

Decided by the agent in Prateek's stead, night of 4 Oct (read these first):
- Model for the live call: gpt-6-luna via OpenAI, because that key exists in Prateek's shell and the handbook recommends it. The key was set on the Convex dev deployment from the shell; the agent never saw it. The account has no credits, so live generation fails until credits are added at platform.openai.com. ANTHROPIC_API_KEY is supported as an alternative.
- Demo content: the same prompts run through Claude Code headless (Prateek's subscription) for about ten topics, stored in a cache table, so the live link works tonight for those topics.
- The Google API key in the shell is invalid (tested with a real call); not used.
- Two typefaces: Bricolage Grotesque (already in the project) and Newsreader for reading. Paper, ink, one marigold accent. See DESIGN.md.
- First-screen copy is the agent's draft from Prateek's own phrases; marked (agent) in DESIGN.md for him to rewrite.

2026-10-04 05:40 Milestones 1 to 6 done on the dev deployment and checked in Chrome by the agent: swimming handbook from the cache, plan, chapter 1 with a miss and the re-teach sheet, rung lit, reload lands on the same card, email+password sign-in attaches the night, night 2 opens with two recall cards from chapter 1, chapter 2 passed, time picker shown. Decided: the sheet's Next advances the card; a Back control on the stack; options shuffled server-side (the model put the key at B in 64 of 90 exercises). Still broken: nothing known. Not yet checked: milestone 7 (another device), the live link on a real phone, live generation for a new topic (needs API credits).

2026-10-04 06:05 Milestone 7 and the last one checked on dev. Production deployed three times tonight (last: after the failed-generation fix); live at https://sensible-mongoose-624.convex.site with the cache seeded. Decided: the next chapter is copied from the cache before any model call; after a failed generation a changed line creates a new handbook. Still broken: nothing known. Waiting on Prateek: API credits or an Anthropic key, DESIGN.md words, section 6 read, one coursemate interview, git push (12 commits local). Report: docs/night-report-2026-10-04.md.

2026-10-04 morning First user test (Prateek's girlfriend, public speaking, on the live link): wanted a glide on a right answer, a wow moment, bold and italics, got bored mid-chapter, suggested memes or reels. Done: pass glide and pop, confetti once when the chapter is done, bold/italic rendering, chapter prompt rewritten (10 shorter cards, first check by card 2, one vivid or dry-funny example, bold for the one idea), all ten handbooks regenerating. Decided: no memes or reels in a chapter (parked, see PLAN.md). Still broken: nothing known.

2026-10-04 13:30 User feedback (not Prateek's): no way to ask for plainer language when a chapter is over your head. Built "Say it simpler" under every teaching card: pre-generated for the ten ready topics (running now), live rewrite for new topics once credits exist, preference remembered on the phone. "Go deeper" parked until asked for.
