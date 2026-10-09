# Pipeline review — MODE: PROMPTS

## Overall verdict

**This pipeline can produce useful handbooks, but cannot reliably deliver the full promise across arbitrary requests.** Its strongest feature is goal-led research and planning. Its weakest links are the conversion of depth into fixed word budgets, limited evidence for “complete and ready to use,” incomplete safety validation, and reuse that may erase reader differences.

These are pipeline risks, not findings from delivered handbooks. No outputs were supplied, so I cannot score actual attention, identify a stop-swiping card, or count how often a gap occurs.

---

## 1. Against each section of the spec

### Section 1a — The product around the handbook

**What delivers it**

- The flow broadly matches: typed line and level → goal question → research → plan → chapter 1.
- Goal selection offers a free answer, not just three preset buttons.
- The planner requires an observable outcome: “what they will actually be able to do or explain.”
- Chapter 1 is explicitly designed for early payoff: “By card 3 the reader does or sees the central thing.”
- `outcomeLine`, chapter outcomes, proof types, quizzes and real-world practice provide ingredients for visible progress.
- Writing the next course chapter one ahead supports the next-day flow; writing quick handbooks together supports immediate continuation.

**What works against it**

- The goal question must produce doing, understanding and a specific situation, even when those are not three sensible goals for the request. This can manufacture a use case rather than discover one.
- A single binary level is treated as detailed knowledge. “Some” means “they know the vocabulary and have tried once,” which may not be true.
- The writer’s expected plan includes `goal`, but the planner’s output schema has no `goal` field. The supplied code description does not show the goal being passed separately to the writer.
- Shared handbooks are matched by “same topic (with a matching goal).” Matching on level, language, voice, location and freshness is not shown.
- Chapter 1 prohibits a `try` card. Tool and body blocks can still create a real result, but other skill chapters can settle for explanation when the promise is a real step tonight.
- Quick handbooks lose every quiz. The spec excludes quizzes in chapter 1 and recaps, not all quick handbooks.

**What is missing or not demonstrated**

- The plan UI marking chapter 1 **“tonight.”**
- How chapter completion lights a rung and displays the earned ability.
- What actually counts as passing each proof type.
- Whether the real-world `try` remains optional and unchecked in the app.
- Whether adaptive reader information reaches the writer. The writer can accept it, but the chapter-request description does not show it being passed.
- A verified link between “chapter completed” and “reader can now do this.” Malformed quizzes are dropped without failing the chapter.

**Assessment:** The content pipeline supplies much of the intended flow, but the visible-progress contract and reader-specific delivery are only partly demonstrated.

---

### Section 2 — Shape comes from the reader’s goal

**What delivers it**

The research prompt is unusually close to the spec:

- It asks all four shaping questions.
- It defines independently useful pieces.
- It assigns depth per piece.
- It distinguishes pace from chapter count.
- It tells the planner to cover the full path to the goal without adding irrelevant parts.
- The planner retains `pieces`, `minutes`, outcomes and a suggested format.
- Both prompts reject background-only chapters and padding.

This is the right foundation. It should be kept.

**What works against it**

1. **Depth becomes a bounded budget.**  
   The planner assigns every chapter “5 to 20” minutes. Code turns those minutes into words at “60 words a minute, 300 to 1,200.”

   But `minutes` includes **reading and doing**. A ten-minute practical task is not necessarily a 600-word explanation. Conversely, a deep conceptual piece may need more than 1,200 words or a genuinely long sitting.

2. **Whole-piece grouping conflicts with “ONE thing.”**  
   The spec permits several light pieces or one or two medium pieces in a chapter. The planner later says: “Each chapter teaches ONE thing.” The writer and quiz instructions reinforce that narrowing.

   A model may reduce a useful bundle to one concept, or call several pieces one thing without teaching them fully.

3. **Urgency can override necessary practice.**  
   Research says a goal with “tonight,” “tomorrow” or “this weekend” points to quick. An urgent deadline does not eliminate the need for practice, external action or settling.

4. **“Some” can cause unjustified omissions.**  
   “Leave out pieces this reader already has (Level)” assumes the two-level selector identifies those pieces. It does not.

5. **The clarification route is too narrow.**  
   The planner asks a question only when there is no goal or earlier answer and a course is too broad for seven chapters. A selected goal can still be ambiguous, infeasible or dependent on missing context.

6. **A research failure does not stop unsupported planning.**  
   The plan “decides alone.” That preserves availability, not the research-led shape or factual basis.

**What is missing**

- A checked mapping from every required piece to a chapter.
- A way to distinguish unfamiliar essentials from genuinely known foundations.
- A check that the proposed result is achievable within seven chapters.
- A shape validator beyond chapter count, analogy justification and repeated block lists.
- A rule for staging an overlarge goal honestly rather than silently shrinking it.

**Assessment:** Shape is adaptive on paper, but bounded in code. The likely default is **3–7 chapters, 5–20 minutes each, with compressed first-chapter coverage and increasingly template-shaped later chapters**.

---

### Section 3 — Every chapter

**What delivers it**

- Strong instructions for completeness: “every step, amount, command, check, option or event.”
- Foundations taught through a small real use rather than a definitions chapter.
- Terms explained at first appearance.
- Exact tool steps and success states.
- Specific, true hooks rather than generic introductions.
- Tension that must not withhold a step or safety point.
- Last-chapter handling and explicit earned outcomes.
- Quizzes taught before tested, with plausible options and feedback.
- Appropriate warmth instead of jokes on sensitive topics.
- Stable analogy mappings, with permission not to use an analogy when it does not fit.

**What works against it**

**Completeness is instructed, not verified.**  
The fact checker checks truth and local safety, not whether the chapter delivered all its promised pieces. A chapter can be accurate and still omit the command, quantity, prerequisite, exception or recovery step that makes it usable.

**Chapter 1 has contradictory length instructions.**  
It receives no Length line, so the general fallback is “600 to 900 words.” But it must have at most six cards, none over 80 words: at most 480 words. The special chapter-1 rule may win, but the conflict is avoidable.

**The block contract constrains repair.**  
The writer may add one teach card “and nothing else.” That can prevent adding a necessary worked example, safety card or troubleshooting step. The plan is not guaranteed to foresee every content need.

**The writer cannot see previous chapter text.**  
It cannot reliably know:

- which terms were already explained;
- which examples, names or openers were already used;
- whether an earlier foundation was actually delivered;
- what wording needs a genuinely different reteach;
- whether it is repeating the same joke or closing rhythm.

The full plan helps with order, not actual teaching continuity.

**Some attention rules become mandatory tics.**

- “At least one fresh concrete image per teach card.”
- “One contrast or reversal.”
- “One moment in each chapter makes the reader smile.”
- Every example and mistake must involve something going wrong and doubt.
- Every continuation begins “Next:”.

These can make concise technical, reference or sensitive material perform a scene it does not need.

**Proof rules contradict the exclusions.**  
`result`, `predict` and `scenario` require exercises. Chapter 1 and quick handbooks prohibit them. Story and body modes have additional exemptions. There is no explicit precedence rule resolving these combinations.

**The fallback shape is especially rigid.**  
“About 9 cards,” two teaching halves, example, mistake and exercises is a sensible teaching pattern for some ideas, not a universal chapter structure.

**What is missing**

- A delivery check against `pieces`, `covers` and outcome.
- Cross-chapter continuity information.
- Validation that a quiz only tests taught material, not merely that its answer is true.
- Validation that fact-check edits preserve beginner clarity and card limits.
- Evidence that `tryit` becomes a correct, usable interactive page. Its builder is not supplied.
- Instructional visual support when exact visual information matters. The picture rules explicitly prohibit diagrams, formulas, labelled screens and exact positions.

**Assessment:** The pipeline can write engaging cards, but it can mistake a well-written sequence for a complete sitting.

---

### Section 4 — Never

#### Never wrong

**Support:** Search-grounded facts, source restrictions, future-event handling, checks for absolutes, attribution and invented examples are all useful.

**Gaps:**

- Three searches and up to 20 facts may be sufficient for a narrow request, but inadequate for seven chapters of exact procedures, chronology or rules.
- Unsupported details are softened or removed by the checker; the resulting chapter may remain unusable.
- The plan’s displayed “Draws on” works are selected separately from the research’s sources. They are required to be real, but no supplied step verifies the plan’s attributions.
- No fact-check browsing is shown. The checker works from the research plus what it knows.
- Reused chapters may become stale. No expiry or date-sensitive revalidation is shown.
- The checker is not instructed to validate the earned outcome against the delivered material.

**Severity:** Potentially critical for false claims; high for truthful but incomplete instructions.

#### Never unsafe

**Support:** The writer has step-local precautions, physical-risk conditions, exit instruction requirements and money/health/legal caveats. The plan can redirect or decline harmful requests.

**Gaps:**

- The checker does not explicitly check harmful instruction, personal advice, personal-choice-as-mistake, risk downside or the required professional referral.
- Its safety check asks for a precaution “beside” a dangerous step, but does not explicitly validate safety conditions and exits **before** a risky physical move.
- “A cost appears only inside a mistake card’s scene” conflicts with showing downside plainly where the risk is taught.
- A safety fix must preserve “same type,” “same length” and “smallest change.” Some unsafe content needs replacement, another card or refusal.
- A broken fix can lead to storage as “unchecked.” Whether readers receive it is not stated; the shown flow does not demonstrate quarantine.
- Declines use zero chapters, while the code’s stated chapter-count requirement is 1–7. A special decline path may exist, but is not shown.
- Research receives the raw typed request before the planner’s harmful-content handling. The goal question’s empty result is not shown to be a safety gate.
- The danger/self-harm response names mental-health support, but does not distinguish immediate physical danger from a non-urgent mental-health concern.

**Severity:** Critical where unsafe material reaches the reader.

#### Never foreign

**Support:** Research prioritises India; the writer explicitly requires Indian examples, rupees, metric units and relevant institutions.

**Gaps:**

- The fact checker has no locale check.
- Country is not an explicit retained field in the plan schema.
- Sharing may mix readers with different location requirements.
- Language is supplied to plan and writer, but multilingual review is not explicit.
- The English Wikipedia field is metadata, not necessarily a reader-facing foreign default. It should not be counted as a violation by itself.

#### Never harmful

**Support:** The planner contains broad refusal and good-version redirection instructions.

**Gaps:** This protection is concentrated in one generation step. No supplied validator checks whether the writer stayed within the safe version or whether a free goal answer reintroduced harmful intent.

---

## 2. Requests most likely to come out wrong

| Request type | Likely gap | Why |
|---|---|---|
| A tiny task, recipe or reference request | Stretched or fragmented | Three chapters are mandatory; four non-quiz cards are mandatory per chapter. |
| A broad or advanced goal | Compressed coverage or an overstated outcome | Seven-chapter limit, bounded duration, binary level and restricted clarification. |
| Several independently useful light pieces | Pieces omitted or awkwardly merged | Whole-piece grouping conflicts with “ONE thing” and one-idea quiz design. |
| A practical skill needed tomorrow | Wrong pace | Near-time wording points toward quick even when practice is essential. |
| A long real-world task with little reading | Too much prose | Reading-and-doing minutes are converted directly into words. |
| Software setup, repair or workflow | Missing prerequisites, variants or recovery | Exact steps require current tool/version evidence; steps cards allow only 3–7 steps; no completeness check. |
| A story, fandom or historical catch-up | Missing events or motivations | Strict reference-only plotting is good, but the brief may not contain enough events for the requested recap. |
| A keep-and-return resource or collection | Forced narrative/course shape | The schema recognises a resource deliverable, but the later prompts favour one concept, tension and scenes. |
| Money, health or legal decisions | Generic, incomplete or unsafe actionable content | Missing context cannot always be clarified; final validation omits several explicit safety requirements. |
| Physical skills with risk | Moving before adequate safety or exit teaching | Fast action is mandatory, while safety validation is incomplete. |
| Loss, emotional distress or immediate danger | Forced scene or inappropriate route | Scene/tension rules are broad; danger handling is not urgency-specific. |
| A URL, unfamiliar name or niche subject | Handbook about the wrong thing | The planner is told to use “recognisable words” rather than establish what the request refers to. |
| A non-English or code-switched request | Wrong nuance, awkward prose or weaker source coverage | Translation quality is not checked; English-derived style rules are imposed globally. |
| A later reader of a saved handbook | Wrong level, language, locale or current facts | Only topic and matching goal are named in reuse. Other match criteria are unknown. |

---

## 3. Rigid, conflicting and topic-shaped rules

### The most consequential conflicts

1. **Depth-led length vs 5–20 minutes and 300–1,200 words.**
2. **Several whole pieces vs “Each chapter teaches ONE thing.”**
3. **Chapter 1’s maximum 480 words vs its 600–900-word fallback.**
4. **Proof requires quizzes vs quick/chapter-1/body/story quiz bans.**
5. **Ready-to-use completeness vs adding only one teach card.**
6. **First-appearance teaching vs no previous chapter text.**
7. **Safety/downside instruction vs “cost appears only” in a mistake scene.**
8. **No forced humour vs a compulsory smile moment.**
9. **General beginner level `new` vs checker condition “complete beginner.”**  
   The supplied chapter-request description also does not explicitly list Level for the checker. Unless code translates and passes it, this check may never activate.
10. **Safe decline with `chapters: []` vs the stated 1–7 count check.**

### Rigid rules that may be useful defaults, but not requirements

- Three goal options must follow doing/understanding/situation.
- Every scene must go wrong before resolving.
- One contrast per chapter and an image per teach card.
- Three to seven steps for every real tool task.
- Exactly two recall quizzes, including a general output instruction that conflicts with mode exemptions.
- Rejecting identical block lists across chapters. Repeated structures can be appropriate for progressive practice; varying block names does not prove a better lesson.
- No exact instructional visuals, even when the learning task depends on them.

### Topic-shaped remnants

- The detailed water-safety parenthesis is useful, but much more operational than the general treatment of other physical risks.
- The NISM paragraph is expressly optional, so it is not itself a forced finance syllabus. It is nevertheless a topic-specific exception in otherwise universal prompts.
- Day 14/day 28 horizons and the field name `outcome7` reflect a fixed-duration product framing that no longer matches every shape.

These are signs of topic-specific or earlier-format scaffolding, not proof that any rule was written for a particular past handbook.

---

## 4. What is working — keep it

- **The four-question research model.** It makes goal, pieces, depth and pace explicit.
- **Concrete outcomes instead of “confidence” or “basics.”**
- **Early use of the central thing**, rather than a preparatory chapter.
- **Step-local safety and exit-before-move instructions.**
- **Indian defaults stated explicitly**, not left to inference.
- **Search-grounded surprising details**, rather than invented hooks.
- **Quiz answer, option and feedback checks.**
- **Analogy mappings and permission to omit a strained analogy.**
- **Separate last-chapter handling**, avoiding a nonexistent next chapter.
- **Source restraint:** fewer supported facts are preferable to invented completeness.

---

## 5. Top 7 fixes, ranked

Each fix below is topic-independent. These are targeted changes, not whole-prompt rewrites.

### 1. Make safety and harmful-content validation a release gate

**Step:** Code and fact check  
**Impact:** Critical

**Code change:** Handle safe redirects and declines before ordinary chapter-count validation. Do not release an unchecked chapter after failed repairs. Store it for retry if useful, but present a safe failure state rather than its content.

Add this to the fact-check checklist:

> “Check the final content against the safe scope of the plan. Do not allow instructions that teach harm, personal recommendations, or a personal choice labelled a mistake. For risky physical actions, verify that necessary conditions and the safe stop or exit are taught before the action. For money, health and legal content, verify the relevant downside and who to ask. If a safe correction needs another card, restructuring or refusal, return that requirement rather than preserving the existing shape.”

Replace the writer sentence:

> “A cost appears only inside a mistake card’s scene, never as a warning to the reader, and a small slip is never made into a disaster.”

with:

> “State a relevant downside plainly where the reader needs it to understand the risk. Do not exaggerate a small slip or use fear to hold attention.”

---

### 2. Validate delivery and evidence, not just truth

**Step:** Research, code and final review  
**Impact:** Critical/high

Replace the research sentence:

> “facts: up to 20 facts, as many as your results support, in the same order as the pieces.”

with:

> “facts: organise supported facts by piece. Include the prerequisites, steps, quantities, checks, options and events needed to deliver each piece at its chosen depth. Identify any essential detail that remains unsupported; do not substitute a generic statement for it.”

**Code change:** Expand the brief schema accordingly. If an essential gap remains, narrow the promised result, seek clarification or return a bounded failure. Do not let “no brief” silently become permission to produce an equally specific handbook.

Add a post-write delivery check using the brief and chapter plan:

> “For each promised piece, identify where it is delivered. Check that the reader has what they need to use it without another source. An accurate but incomplete chapter fails. Verify the outcome line and any displayed source attribution against the delivered content and evidence.”

This catches the largest unreviewed gap: prose that is true but does not do the job.

---

### 3. Let pieces determine length; separate reading from doing

**Step:** Plan, writer and code  
**Impact:** High

Replace:

> “Each chapter teaches ONE thing”

with:

> “Each chapter has one coherent purpose and may hold several whole pieces when their depth permits. Teach and check every piece it promises.”

Replace the minutes constraint:

> “5 to 20, set by the depth of its pieces”

with:

> “estimated from the actual reading and doing required by its pieces; chapter 1 remains short. Report reading time and doing time separately.”

**Code change:** Remove the universal minutes-to-words formula and 300–1,200-word clamp. Use piece-level content requirements to estimate a drafting budget, then validate completeness and padding.

Replace:

> “With no Length line, 600 to 900 words.”

with:

> “With no Length line, use only the space needed to deliver the promised pieces. Chapter 1’s short-card limits take precedence; move a whole deeper piece to a later chapter rather than compressing it into an unusable introduction.”

Also preserve practice needs when deadlines are near; urgency should affect staging, not erase necessary pace.

---

### 4. Preserve reader context and make reuse conditional

**Step:** Code and schemas  
**Impact:** High; potentially critical for changing rules or safety context

**Code change:** Retain and pass the original line, selected/free goal, level, language, locale and relevant tool or situation constraints to every content step. Add `goal` and locale to the plan schema rather than relying on implication.

Do not reuse solely on topic and goal. Require compatibility on:

- learning outcome and scope;
- starting level;
- language;
- jurisdiction/location where relevant;
- tool/version where relevant;
- safety-relevant context;
- evidence freshness.

Date-sensitive content should be revalidated before reuse.

The current description does not prove these dimensions are ignored; this change makes them an explicit contract.

---

### 5. Make proof rules consistent and validate learning checks

**Step:** Plan, writer, fact check and code  
**Impact:** High

Replace:

> “A quick handbook has no exercise blocks.”

with:

> “Chapter 1, story recaps and body-skill chapters have no quiz blocks. Later non-recap chapters may use a brief in-app check in either quick or course format. Real-world try cards remain optional and unchecked.”

Make the corresponding writer and code changes so quick format alone no longer removes quizzes.

Add:

> “Quiz exclusions take precedence over proof defaults. When a chapter cannot use quizzes, choose a compatible completion method; do not claim that a quiz verified its outcome.”

Replace the checker condition:

> “Only when the Level is ‘complete beginner’”

with:

> “When Level is ‘new’”

**Code change:** Pass Level and the chapter plan explicitly. Validate taught-before-tested, mode exclusions and required proof before storing. Repair malformed required checks rather than silently dropping them and treating the chapter as verified.

---

### 6. Allow clarification whenever it changes what can honestly be delivered

**Step:** Goal question and plan  
**Impact:** High

Replace:

> “Make the 3 goals different in kind: doing it, understanding it, and one specific situation”

with:

> “Offer three genuinely distinct, plausible outcomes for this typed request. Do not force doing, understanding or a named situation when it does not fit. Preserve any goal already stated in the line.”

Replace the planner’s narrow clarification condition with:

> “Ask one focused question when a missing detail materially changes the outcome, required pieces, starting point, safety, jurisdiction or feasible scope, even if a goal was already selected. If the full goal cannot fit honestly, propose a bounded first result and make that limit explicit.”

Replace:

> “If the line is a URL or a name you don’t recognise, treat the recognisable words as the topic”

with:

> “If a URL or unfamiliar name cannot be identified reliably, ask what the reader wants from it or request its relevant content. Do not replace it with a guessed topic.”

---

### 7. Remove compulsory performance and carry teaching continuity forward

**Step:** Writer and code  
**Impact:** Medium/high

Replace:

> “at least one fresh concrete image per teach card … one contrast or reversal”

with:

> “Use concrete examples, images and contrasts where they make this piece clearer. Do not add a scene, reversal or metaphor merely to satisfy a pattern.”

Replace:

> “One moment in each chapter makes the reader smile.”

with:

> “Use humour or warmth when it fits the topic and voice. Neither is required; useful, direct content can hold attention on its own.”

Replace:

> “someone wants something, it goes wrong, a moment of doubt, then the outcome”

with:

> “show the relevant action and consequence in a small concrete scene. A scene need not contain failure or doubt.”

**Code change:** Pass a compact record of earlier teaching: terms introduced, pieces completed, examples used, unresolved questions and safety prerequisites. The next chapter need not receive all previous text, but it needs evidence of what was actually taught.

This should also support genuine reteaching without inventing a “different” explanation blind.

---

## Separate notes on the spec

Three issues originate in the standard itself:

1. **A minimum of three chapters cannot always coexist with no padding and whole independently useful pieces.** Some requests genuinely need one sitting. The pipeline should not be blamed for following that minimum.
2. **“Never personal advice” needs a boundary.** Tailored teaching necessarily recommends practice actions. The spec should distinguish ordinary instructional guidance from individual medical, financial or legal recommendations.
3. **Exact visual teaching is missing from the standard.** Short cards alone cannot make every physical, spatial or interface task ready to use. The spec should state when instructional diagrams, annotated screenshots or demonstrations are necessary—and when text cannot safely deliver the claimed result.