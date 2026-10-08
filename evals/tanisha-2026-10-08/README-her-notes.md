# Changes on 8 Oct 2026: observability, evals, prompts and the handbook pipeline

**Branch:** `feat/observability` (folder `i-get-it-evals`), based on Prateek's `main` at `c8aa33d`, pushed to `TanishaKothari-45/i-get-it`.
**Deployment:** dev only (`tame-llama-306`). Nothing deployed to production. Prateek to review before any of this reaches his `main`.

| Commit | What |
|---|---|
| `d424bd5` | Observability: latency, cost and Langfuse traces for every handbook |
| `e48ad4d` | Research prompt v4, chosen by a blind eval with a Claude judge |
| `1a3f871` | Research input labels match v4; Gemini thinking capped at medium |
| `45dbddc` | Goal-first pipeline on Gemini Flash, chapter-first writing, AI pipeline on /admin |

---

## 1. Summary

- **Every AI call is measured.** Model, tokens, time, retries, failures and estimated ₹ are logged per handbook and chapter, sent to Langfuse as one trace per handbook, and shown on `/admin` in a new "AI pipeline" section.
- **Prompts were tested, not guessed.** Each change was measured with blind LLM-judge evals on frozen inputs, so only the prompt (or only the model) changed. Full rewrites lost to Prateek's originals every time; small in-place edits held their quality and fixed the measured problems.
- **The pipeline was reordered and made cheaper:**
  - research waits for the reader's goal;
  - plans and chapters are written on Gemini 3.8 Flash, with Opus as the backup;
  - quizzes no longer hold up a chapter;
  - one Sonnet call less per chapter.
- **Nothing was deleted.** v1 of every prompt stays in the code. One constant switches each step back.

---

## 2. The pipeline, before and after

**Before:** type a topic → research and the goal question start **together** (research never saw the goal) → plan (Opus high) → chapter 1 (Opus medium, inside the plan action) → quiz versions → fact check → chapter saved → picture scenes → pictures.

**After:** type a topic → match with ready books **and** the goal question, in parallel → reader picks, types or skips a goal → **research with the goal** (Gemini Flash, Claude fallback) → **plan v7** (Gemini Flash, Opus medium backup) → plan saved and shown → **chapter 1 as its own action** (writer v4, Gemini Flash, Opus medium backup) → **fact check + picture scenes in one call** → chapter saved, reader can open it → quiz versions in the background → pictures when the chapter opens.

| Step | Model now | Backup | Time budget on Gemini |
|---|---|---|---|
| Match, goal question | Haiku | – | – |
| Research | Gemini 3.8 Flash, thinking medium, up to 3 searches | Claude Sonnet | 120 s |
| Plan | Gemini 3.8 Flash, thinking medium | Opus 5.5 medium | 90 s |
| Chapter | Gemini 3.8 Flash, thinking medium | Opus 5.5 medium | 150 s |
| Fact check + scenes, quiz versions | Sonnet 5.5 low | – | – |
| Pictures | Wikimedia (free), Runway for the cover | – | – |

A model pinned for a reader's profile or by an A/B test keeps its own model.

---

## 3. Decisions and the evidence for each

### Observability
| Decision | Why |
|---|---|
| Log every call with handbook, chapter and retries (`aiCalls`), plus a small `callStats` row | The full log holds prompt and reply text (up to 20,000 characters), too big to scan live; the small row lets `/admin` compute p50/p95/p99 live |
| Langfuse via OpenTelemetry (OTLP HTTP/JSON), exported every 2 minutes from the log | A reader never waits on it, and nothing is lost if Langfuse is down. The old ingestion API is closed to new organisations |
| Prompt and reply text go to Langfuse only with `LANGFUSE_INCLUDE_TEXT=1` | Readers' typed lines stay out of a third-party service unless switched on, and never in production without Prateek's OK |
| Log Wikimedia photo lookups (₹0) and test calls under their own labels | Picture waits were invisible; prompt tests were being counted as background jobs |

### Research prompt (v1 → v4 → v5, live)
| Decision | Evidence |
|---|---|
| Rewrite v1's examples as descriptions | v1's framing example was copied almost word for word |
| v2 (goal-aware, fewer facts) **not** adopted | Lost to v1 in both rounds (4–2 and 4–0 side by side): too thin |
| v3 (maps the topic's parts first) beat v1 3–0 and v2 4–0 | Breadth and goal fit up, but v1 kept better specificity and sources |
| **v4** = v3's outline + v1's specific facts and authoritative sources, up to 3 searches | Live from 8 Oct; tested on a fresh topic (Photography): 14 specific facts in 4 parts |
| Thinking capped at medium | Uncapped, one run spent 15,413 thinking tokens. Medium: 30 s, ₹1.16. Low: 23 s, ₹0.43, but quality not judged, so not adopted. Uncapped: 45 s, ₹1.48 |
| **v5** adds up to 3 true details a reader would retell | The writer must never invent, so story material has to come from research. Live, not yet evaluated |
| Research waits for the goal | It started before the goal existed, so v4's goal rules never ran live; a typed goal got generic facts. Costs only the reader's pick time (about 16 s typical), and saves research for readers who leave or get a shared copy |

### Plan prompt (v1 → v7, live)
| Version | Result | Decision |
|---|---|---|
| v2: full rewrite | Lost to v1 on Opus, 0–3 side by side | Rejected: the analogy stopped carrying through, and hooks and sources got weaker |
| v3: "tweaks", which turned out to keep only 33% of v1's words | Lost to v1 on Opus, 4.44 vs 4.67 | Rejected: a new rule made outcomes vague |
| v4: v1 + 3 edits (96% of v1's words) | Tied v1 on Flash; stopped the copied framing line | Kept as a base |
| v5: v4 in STE style (87% of v1's words) | Tied v1; best average place on Flash | STE wording does not hurt |
| v6: v5 + the analogy must be mapped (`picture.maps`) | Analogy score on Flash **2.25 → 4.25**; a v6 plan placed 1st in both reads | Kept |
| **v7**: v6 + hooks may only use the brief's facts | Flash had been inventing numbers in hooks | **Live** |

**Model comparison on one topic** (Swimming, blind ranking): Opus v1 4.67, Opus v3 4.44, Gemini Flash 3.56 (₹1.00), Gemini 3.1 Pro 3.28 (₹3.29), DeepSeek V4 Pro 2.83.
**Decision (yours):** plans on Gemini Flash with v7 and Opus medium as the backup. About ₹1 a plan instead of about ₹7. The prompt was improved specifically so it holds on any model.

### Writer prompt (v1 → v4, live)
| Version | Result | Decision |
|---|---|---|
| v2: restructured rewrite | Lost to v1 on Flash, 3.28 vs 3.72; put a quiz before any teaching | Rejected |
| v3: v1 edited in place (78% kept): contradictions fixed, one card list, no svg | All 6 shape checks passed; ₹1.21 vs ₹1.52 a chapter; 27 s vs 35 s | Kept as a base |
| **v4**: v3 + VOICE AND TENSION | Chapters read as "a claim and its answer": no stakes, no narrator, no humour | **Live**, not yet tone-tested |

VOICE AND TENSION is about how to write, never about a topic:
- a narrator with opinions;
- a question kept open until late in the chapter;
- the reader's stakes, named once;
- examples as small scenes;
- one moment of humour from the topic itself (warmth instead on money, health, legal or loss topics);
- one family of images;
- mixed sentence lengths.

No emojis.

### Chapter writing
| Decision | Why |
|---|---|
| A malformed quiz is dropped, never failing the chapter | One bad quiz used to fail the whole chapter ("try again") |
| Quiz versions in the background (`addQuizVersions`) | They sat on the chapter's critical path; the reader now gets standard quizzes until they land |
| Fact check writes the picture scenes in the same call | Both read the same cards; one Sonnet call fewer a chapter |
| No svg | Readers never saw it (only the internal Compare screen did); about 35% fewer output tokens |
| Chapter 1 as its own scheduled action | A slow or failed chapter no longer takes the plan step down with it |

### Reliability and cost
| Decision | Why |
|---|---|
| Gemini time budgets (120 / 90 / 150 s), then the backup | A busy Gemini could keep a reader waiting minutes. Budgets are typical time plus a margin |
| No extra Claude retry layer | The Anthropic SDK already retries 429, 5xx and 529 twice |
| Claude prompt caching built but off | A cache write costs 1.25×, a hit 0.1×, and the cache lasts 5 minutes; at today's traffic most calls would only pay the write. Gemini caches by itself |
| Library check given its own schema | It ran under the goal-question schema, so it failed every time and nothing typed was ever shared |
| Match and goal question in parallel | About a second sooner |
| Decline suggestions read the shelf | The old query loaded every ready book with all its chapters |

---

## 4. `/admin`: the "AI pipeline" section
Placed with the other AI cards (provider switch, AI pipeline, what we spend, doctor):
- **Top line:**
  - cost per handbook (typical and worst);
  - goal to chapter 1 (typical and slow);
  - time on the goal question;
  - failed and retried shares;
  - spend today;
  - background jobs and tests shown separately.
- **Each step:** calls, failed, retried, p50/p95/p99, tokens in and out (and cached), ₹ a call, ₹ total. Grouped as readers' handbooks, background jobs and tests.
- **Each handbook:** a call timeline, plus **Open in Langfuse** (project `cmuzbinp101t4ad0nhhg8fjtd`).

238 older calls were backfilled. Test calls before 20:05 on 8 Oct show as background jobs.

---

## 5. How to switch back
| Step | Constant | Switch back to |
|---|---|---|
| Research prompt | `convex/research.ts` `LIVE` | `"v1"` (or `"v4"`) |
| Plan prompt and model | `convex/handbooks.ts` `PLAN_LIVE`, `PLAN_MODEL` | `PLAN_PROMPT`, `undefined` (Opus high) |
| Writer prompt and model | `convex/handbooks.ts` `CHAPTER_LIVE`, `CHAPTER_MODEL` | `CHAPTER_PROMPT`, `undefined` (Opus medium) |
| Gemini thinking | `convex/research.ts` `GEMINI_THINKING` | `"default"` |
| Prompt caching | `convex/ai.ts` `CACHE_PROMPTS` | already `false` |

---

## 6. Open items
1. **A full handbook run** through the new pipeline on dev (about ₹4 on Flash). Not yet done.
2. **Check `/admin` in a browser** while signed in as the owner.
3. **Tone test, writer v4 vs v3,** on varied topics (a physical skill, technical, money, history, a sensitive topic), with "which card would you stop swiping at", plus a blind read by you. About ₹40.
4. **Goal question bias:** `INTENT_PROMPT` forces "doing / understanding / a situation" and still says "7-chapter handbook".
5. **Architecture, later:**
   - a circuit breaker for a struggling provider;
   - a shortlist before library matching (full-text search);
   - one row per chapter for shared and ready books (the 1 MB document limit, and write collisions);
   - clearing prompt text from the call log after 30 days.
6. **Prateek's decisions:**
   - the model and prompt changes;
   - the svg removal;
   - raising the 60-an-hour limit now that chapters cost less;
   - sending reader data to Langfuse in production.
7. **Prices missing in `costs.ts`:** Gemini search queries (rarely reported), Gemini 3.1 Pro, DeepSeek V4 Pro.

## 7. Where the evidence is
`evals/research-v1-v2/`, `evals/research-v1-v2-v3/` (with prompt texts), `evals/research-thinking/`, `evals/plan-v1-v2/`, `evals/plan-compare/`, `evals/plan-variants/`, `evals/plan-analogy/`, `evals/chapter-v1-v2/`, `evals/chapter-v3/`. Scripts are in `scripts/`; eval functions in `convex/evalResearchPrompt.ts`, `convex/evalPlanPrompt.ts`, `convex/evalChapterPrompt.ts`.
