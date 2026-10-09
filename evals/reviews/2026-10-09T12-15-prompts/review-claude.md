# Delivery review: MODE PROMPTS (9 Oct 2026)

Reviewer: Claude. Material: the intent spec, plus the pipeline (code summary and the live prompts for goal question, research, plan, chapter writer and fact check). There are no handbooks in this bundle, so this review asks whether the pipeline can deliver what the spec promises. It does not grade any output. Where I can't tell from the bundle how the code behaves, I say so (see section 6).

**In one line:** the prompts have clearly been written against this spec. The four shape questions, 3 to 7 chapters, pace deciding the format, India-first, and the rules for chapter 1 are all there in the research and plan prompts. But four structural things will keep pulling output away from the spec on almost every topic:
1. The facts are too thin for "complete, ready to use", and every chapter receives all of them.
2. "One thing per chapter" clashes with "several light pieces per chapter".
3. The writer can't see the other chapters, so the rules on variety and tics can't be enforced.
4. Several rules push an analogy, a joke, a reversal and a failure scene into every chapter, whether or not they fit.

---

## 1. The spec, section by section

### 1a. The product around the handbook

**What delivers it**
- **Goal question.** It gives three goals that differ in kind, plus a free answer, so the handbook is "made for their goal".
- **Plan.** It has the outcome line ("By day N you'll…", and "Never 'understand the basics'"), a hook for each chapter, and the brief's "start". That answers the "skipping levels" worry.
- **Rungs.** Each chapter has an outcome that starts "You can…", and the writer returns an `outcomeLine`.
- **No quizzes in chapter 1 or in story mode.** The writer prompt says so and the code enforces it ("chapter 1, quick and story chapters keep none").
- **The try card is optional and never checked.**
- **The closing line.** The "Next:" line leads to the next chapter. On the last chapter it says what the reader can now do.

**What works against it**
- **Quick handbooks get no quizzes at all.** The spec says quizzes check that a chapter landed, and the only exceptions it names are chapter 1 and a recap. The pipeline also removes them from every quick handbook. The plan says "A quick handbook has no exercise blocks", the writer says "NO exercises at all, not even polls", and the code agrees. So a quick handbook on a task or an idea never checks anything, and the reader's "rung" is lit by scrolling. This also breaks the proof rules: proof "result" needs "exactly one exercise of kind apply", and "predict" and "scenario" need exercises. The plan can choose those proofs for a quick chapter, and then the writer gets two contradictory instructions.
- **Chapter 1 can't contain a try card.** The writer says "no 'try' card" for chapter 1. The job is "turn tonight's 20 minutes into one real step … with something to show". For skills that aren't done with the body or a tool (writing, speaking, sketching, a habit), chapter 1 then leaves nothing done in the real world. The plan's kit also defines try as "a small thing to do tonight" and can place it in chapter 1, which the writer must then drop. That is a conflict between the two prompts.
- **Quick handbooks have no time check.** No step adds up the chapters' `minutes` against the format. A "quick" plan of 7 × 20 minutes is 140 minutes, which is not "one or two sittings".

**What is missing**
- **Sharing ignores the reader's settings.** "A later reader who types the same topic (with a matching goal) gets the same handbook." The bundle doesn't say whether level, language or voice are part of the match. If they aren't, a "some" reader can get a "new" handbook, which goes against "made for their goal". It also isn't clear how per-reader adaptation ("How the reader did so far", "Reader:" profile) works with shared chapters. One reader's "Before we go on" card could be stored and shown to everyone.

### 2. Shape comes from the goal

**What delivers it**
- **The research prompt.** It asks the four questions almost word for word ("Do not answer them for the topic in general"), sets depth per piece, and has the right chapter-count rules ("A small request still gets 3 chapters… Do not add chapters to fill days").
- **Format is decided by pace,** in both research and plan ("the pace … decides it, not the topic and not the count").
- **Code checks.** A plan under 3 chapters, or one with the same block list in every chapter, is asked again.
- **Default block shapes are labelled "Rough defaults, not rules".**

**What works against it**
- **"Each chapter teaches ONE thing" (plan),** with "the chapter's one idea" and "The three exercises test the same one thing from three angles" (writer). These conflict with the spec's "several light ones, one or two medium ones" per chapter, and with the plan's own "Several light pieces share a chapter". A chapter holding three phrases, three tools or three options will teach one of them well and skim the others.
- **Length can't follow depth for deep chapters.** The writer may build only from the plan's blocks plus "one teach card between two blocks … and nothing else", and "No single card over 120 words". Teach cards are also 60 to 110 words. A deep chapter of about 8 blocks, two of them exercises, tops out around 700 words, even when its Length line says 1,200. The pipeline also caps `minutes` at 20 and words at 1,200, so a deep piece is capped at one sitting unless the plan splits it.
- **`minutes` mixes reading time with doing time,** and code turns it into words at 60 a minute. A 15-minute body or tool chapter (mostly doing) gets a 900-word target, which invites padding there. A reading-only chapter gets about a third of what a reader could read in the same time.
- **Chapter 1 has no Length line,** so the writer falls back to "With no Length line, 600 to 900 words". The same prompt caps chapter 1 at 6 cards of 80 words, which is at most 480 words. The spec says "Chapter 1 is the way in: short".
- **The plan prompt opens with an analogy as the model:** "one analogy carried through the whole thing". That works against the later, better rule ("a strained picture is worse than none") and against spec section 3.

**What is missing**
- **Facts can't fill a deep shape.** Research allows "at most 3 searches" and "up to 20 facts" for the whole handbook. A 7-chapter course on a practical task (one with steps, amounts, forms and rules) gets about 3 facts per chapter. The writer is told "If unsure, leave the specific out", and the fact check is told to "remove the specific and keep the sentence's point". Together these push chapters to be accurate but vague, the opposite of "every step, amount, command … The reader should not need another source".
- **Facts aren't tied to pieces.** The research is told to put facts "in the same order as the pieces", but they aren't tagged by piece. Every chapter request carries all of them. With the writer unable to see earlier chapters, the same retellable detail and the same facts will turn up in several chapters.
- **Level has only two values, "new" and "some".** Someone who types "advanced" can't be placed above "some", and will be bored from card 1.

### 3. Every chapter

**What delivers it**
- The writer's "Go straight to what the plan's 'pieces' and 'covers' promise, and deliver it complete".
- "No 'In this chapter we will'".
- The one-idea-per-card length caps.
- Defining terms in the same sentence ("Never two new terms in one sentence").
- Teach before test.
- The VOICE AND TENSION section, which is a close and good translation of the spec's "holds attention honestly".
- The mistake-card rule "Never open with how common it is".
- The honest ending ("Next:" vs "Last chapter").
- Chapter 1 at most 6 cards, the hook paid off in card 1's first sentence, the central thing by card 3.

**What works against it (the tic engine)**
- **The writer never sees earlier chapters,** yet it must make the closing line "built differently in each chapter … not 'Next: why' every time". It can't know what the others did, so the rule can't be met. Openers, closers, example names, the retellable fact and the analogy's wording will repeat across chapters, and no later step checks them. The fact check is told "Do not fix style, tone or wording".
- **Every chapter is required to have:**
  - "One moment … makes the reader smile",
  - "one contrast or reversal ('you'd think X; it's Y')",
  - "at least one fresh concrete image per teach card",
  - "Keep one question open".

  In every chapter of a 7-chapter handbook these become the "same formula" and "forced jokes" the spec bans. "You'd think… it's…" in particular will turn up word for word.
- **Every example is told as a failure.** "Each 'example' and 'mistake' card is a small scene: someone wants something, it goes wrong, a moment of doubt, then the outcome." So every chapter has two failure stories. That leans toward fear-framing, and a worked example that "goes wrong" teaches the wrong case first.
- **The picture card can force the analogy.** The default card 1 is "the chapter's one idea seen through the handbook's analogy", and the idea default starts with a `picture` block. When the plan has no picture, or no pair fits this chapter, nothing says what card 1 should be instead. The quick-handbook rule "Carry the plan's picture through" pushes the analogy into chapters where it doesn't fit.
- **The fact check's picture scenes say "If the card is abstract, draw the handbook's analogy".** The illustrations then repeat the analogy even on cards where the text rightly left it out.

**What is missing**
- **Lists.** "No headings, no bullet lists" sits against decision mode's "a short checklist the reader can use", against "every step … check, option" being ready to use, and against the spec's "a resource they keep". The only checklist card (`doit` kind checklist) is for body skills only ("move, doit and proof 'set' are only for 'body': true"). A checklist written as prose isn't usable on a phone.
- **Warmth for emotional topics.** The writer's warmth rule covers "money, health or legal, or the topic is about loss or harm". Emotional topics (named in the spec and in the plan's picture rule) are left out, and the mandatory `mistake` card ("one person making the one mistake") is risky on grief, breakups or anxiety.
- **Minor inconsistencies.** "The three exercises" doesn't match the default shape (2 exercises in the chapter), "predict" (2 or 3) or "scenario" (1 or 2). The In one breath card allows "ONE closing line", but decision mode adds a "who to ask" line, and the last chapter also has an `outcomeLine`.

### 4. Never

**What delivers it**
- **Layered fact rules.** Research searches authoritative sources and drops what it can't support. Plan and writer both say "Never invent". A different model fact-checks every chapter against the reference material and Today, handles events after Today, absolute words, and literal versus figurative, and treats "a number on an invented person" as an example.
- **Exercise safeguards.** The fact check guards against giveaway options, option length and answers that are partly true.
- **Safety.** There is a precaution at the step, the body-skill rule that safety comes first, and decision mode's "names who to ask … SEBI-registered investment adviser, a doctor, or a lawyer" and "never call a personal choice … a mistake".
- **India first.** Research uses "Country: India" and the writer says "varied Indian names; money is in rupees; measures are metric … NSE and BSE, SEBI, RBI".
- **Harm.** The plan offers the good version with pushback, declines kindly, and gives Tele-MANAS 14416 for someone who may be in danger.

**What works against it**
- **The fact check is the only safety net, and it runs at low effort.** It is told to "Work through each claim carefully" while running at "low effort" with nine jobs in one call (facts, answer keys, wrong options, beginner terms, option length, giveaways, safety, consistency and picture scenes). If a fix is broken twice, the chapter is "stored as 'unchecked'". The bundle doesn't say whether readers are then shown it.
- **The beginner check may never run.** The fact check checks terms only "when the Level is 'complete beginner'". Everywhere else the level is "new" or "some". If code passes "new" as is, this check never fires (see section 6).
- **Nobody checks the plan.** The hooks ("A claim in a hook comes from the brief's facts"), the outcome, the horizon lines and the "Draws on" sources (from Flash's memory: "Only works you are certain exist") reach the reader without any fact check. The plan also isn't given Today, so a hook about a recent or coming event can be stale.
- **The plan step has no India default at all.** Titles, hooks, the outcome, "Draws on" works and the three "next" topics can come out American by default. The goal question has none either (its example "a trip"). The writer's India rule sits inside the bullet about example and mistake scenes. Exercise prompts and `recallQuizzes` ("brand-new examples, names and numbers") aren't clearly covered, and the fact check doesn't look for foreign defaults.
- **Body skills squeeze safety.** "the reader is moving by card 2", "chapter 1 states the one safety condition before the first move", "before any float, glide, lift or balance the reader learns how to get out of it safely", and "at most 6 cards" don't fit together well. The plan's default body shape ("move, doit, mistake, doit, breath") has no slot for safety.
- **Research has no harm guard.** If the flow still runs research after the goal question returns null for a harmful line, research will search for the harmful topic, and its facts reach the plan (unsure, see section 6).

**What is missing**
- **No "who to ask" for health or legal body-skill plans.** The decision-mode rule applies to "any plan whose caution is money, health or legal", but body mode's fixed shape gives no card for it. "Training" is explicitly caution health, and an exercise or fitness handbook will usually be `body: true`.
- **Mental health gets "a doctor".** For mental-health topics the spec and writer name "a doctor". A counsellor, or Tele-MANAS for non-crisis help, is the more useful contact in India.
- **The interactive "tryit" page isn't checked.** It "is built from this line afterwards", and the bundle shows no check on it. In a money chapter, a calculator with wrong formulas is a "never wrong" risk.

---

## 2. The requests most likely to come out wrong

| Kind of request | What will go wrong | Why (step) |
|---|---|---|
| **Practical results with many exact specifics** (file a return, open an account, set up a tool, apply for a document) | Chapters that sound right but leave out the amounts, steps, forms and deadlines, or state stale ones | Research: 3 searches, 20 facts for the whole handbook. Writer and fact check remove anything not supported. Plan has no Today. Steps cards are capped at 3 to 7 steps. |
| **Software or apps that change often** | Steps cards with clicks and screen text that no longer match; the "result" quiz asks "what your screen shows" | Steps come from model memory. Research rarely spends a search on UI, and the fact check can't verify a screen. |
| **Chapters holding several light pieces** (phrases in a language, a set of tools, options to compare, a collection the reader will keep) | One piece taught, the others skimmed; three quizzes on one piece; no list to keep | Plan: "Each chapter teaches ONE thing". Writer: "the same one thing from three angles". Writer: "no bullet lists". |
| **Deep skills or ideas** | Chapters shorter than their depth needs; deep pieces stopped at one sitting | `minutes` 5 to 20, 1,200-word cap, blocks plus one extra teach card, 120 words a card |
| **Quick handbooks** | No check that anything landed; repetition across chapters, all written at once and blind to each other; can be too long for "one or two sittings" | Writer and code remove all quizzes; facts not split per chapter; no total-minutes check |
| **Body skills that need a place, kit or partner** (water, courts, roads, partner dances, gym lifts) | Chapter 1 asks "Do it now" at night on the sofa. The proof "set" can't honestly be passed tonight, and safety is squeezed into 6 cards | The body-mode shape assumes the move can be done where the reader is. The escape rule is written in water and gym terms. |
| **Story recaps of long series or epics** | Thin recaps that leave out plot the reader needs, or plot that is guessed | 20 facts and "if the reference doesn't cover something, leave it out", unless a transcript happens to exist. Plan has no Today for "announced or expected". |
| **Money, health and legal** | Mostly safe. Risks: a forced "mistake" card next to personal choices, a who-to-ask line missing in body-mode health plans, and the tryit calculator | Mistake card is mandatory; body shape is fixed; tryit isn't checked |
| **Emotional topics** (grief, a breakup, anxiety, confidence) | A required "mistake" scene that reads as blame; a forced reversal; goal options like "doing it" that don't fit | Writer warmth rule leaves out "emotional"; goal question requires "doing it, understanding it, and one specific situation" |
| **Readers above "some"** | Bored by card 1 | Only two levels |
| **Other languages and Hinglish** | Goal question in English; facts in English and translated; fact-check fixes that may come back in English; possibly "Next:" and "In one breath" left in English | Goal question and fact check never mention Language; 60 words a minute assumes English |
| **Harmful lines and lines about being in danger** | Probably fine at the plan step; the risk is earlier, in research | Research has no harm rule; the flow after a null goal is unclear |

---

## 3. Rules that are rigid, conflicting or written for one past topic

**Conflicting**
1. **Chapter 1 length.** "With no Length line, 600 to 900 words" (writer, and chapter 1 never gets a Length line) conflicts with "at most 6 cards … no card over 80 words".
2. **One thing vs several pieces.** "Each chapter teaches ONE thing" conflicts with "Several light pieces share a chapter" (both in the plan prompt).
3. **Quick quizzes vs proofs.** "A quick handbook has no exercise blocks" conflicts with proofs "result", "predict" and "scenario", which need exercises. Neither is told what wins.
4. **Try card in chapter 1.** The plan's kit `try` ("a small thing to do tonight") can go in chapter 1, but the writer says no "try" card in chapter 1.
5. **Analogy.** "one analogy carried through the whole thing" and "Carry the plan's picture through" conflict with "Use the picture in a chapter only where a pair holds" and with "a strained picture is worse than none".
6. **Closing line.** "built differently in each chapter" can't work while "The writer never sees earlier chapters' text" (code).
7. **Checklists.** Decision mode's "a short checklist" conflicts with "no bullet lists" and with doit checklists being for body skills only.
8. **Fact check effort.** "Work through each claim carefully" conflicts with "low effort".
9. **Level label.** The fact check's "complete beginner" doesn't match the level values "new" and "some".
10. **Body safety order.** "moving by card 2" conflicts with "states the one safety condition before the first move" plus how to get out safely, within 6 cards.
11. **Closing lines.** "ONE closing line" conflicts with the extra who-to-ask line, and on the last chapter with `outcomeLine` as well.
12. **Number of exercises.** "The three exercises" conflicts with 2 exercises in the default shape, 1 or 2 for "scenario" and 2 or 3 for "predict".

**Rigid**
- **Required in every chapter:** a smile, a reversal, an open question, a fresh image per teach card. Each is fine once; across 7 chapters they become a formula.
- **Every example "goes wrong".**
- **Exactly 3 goals in fixed kinds.** "Make the 3 goals different in kind: doing it, understanding it, and one specific situation." This doesn't fit stories, emotional topics or a single task.
- **Exactly 2 levels.**
- **Length set by reading plus doing minutes.**
- **No lists anywhere.**
- **Code drops the chapter's quizzes on quick handbooks,** whatever proof the plan chose.

**Written for one past topic** (fine as examples, but some read as the rule itself)
- **Swimming.** "for water: never alone, a capable swimmer or lifeguard within reach, start at the wall in shallow water", and "before any float, glide, lift or balance". The general rule should be about any move the body commits to.
- **Indian stock-market syllabus.** "A NISM certification syllabus may come with the brief for Indian money topics" is a hook added for one source. It belongs in code or the brief, not in the planner's rules.
- **Films and sequels.** "like a friend who has seen it three times catching someone up before the sequel", "for films or series the order to watch in". This is written for a film franchise; books, myths and sport history get no equivalent.
- **Cooking.** "heat, hot oil, a pressure cooker".
- **Leftovers from older pipelines.** "Exercises of kind 'poll'" in the fact check, and "If the line is a URL" in the plan.

---

## 4. What is working (keep it)

- **The research prompt's shape section.** The four questions answered for this reader, "If the goal and the typed words do not agree, follow the goal", depth per piece, "A small request still gets 3 chapters", and format decided by pace. This is the best part of the pipeline and matches the spec closely.
- **Fact discipline in research.** "A fact without such a detail does not count", "Never add a fact to reach a number", and up to 3 true details worth retelling, but "If your results have none, add none".
- **Chapter 1 design.** No quizzes, at most 6 cards of 80 words, card 1's first sentence is the payoff, and the central thing by card 3.
- **Exercise integrity.** Same-length options, varied answer position, a `whyNot` that names what the wrong option was confused with, and a reteach that doesn't give the answer away. The fact check enforces all of these. Never "incorrect" or "wrong".
- **Fact check design.** A different model from the writer, reference material treated as "evidence, not proof of everything near it", events after Today, absolute words, literal versus figurative, and "A number on an invented person is fine as an example".
- **Safety and harm.** The good version with one kind sentence of pushback, a kind refusal, Tele-MANAS 14416, the decision-mode rules (the downside once, plainly, and no personal choice called a mistake), and a precaution at the step.
- **India first** in research and in the writer's example scenes, with Indian institutions named.
- **Code checks** that ask again when every chapter has the same blocks, or a course has no analogy and no reason given.
- **Teaching rules:** teach before testing, a term explained in the same sentence, never two new terms in one sentence.

---

## 5. The top 7 fixes, most useful across all topics first

**1. Give each chapter its own facts, and enough of them (research and code).**
- Research, replace: "facts: up to 20 facts, as many as your results support, in the same order as the pieces."
  - With: "facts: for each part, the facts it needs to be taught complete and ready to use (every step, amount, name, date, rule or option the reader will act on), each tagged with its part, up to 40 in all. A deep part gets more facts than a light one."
- Code: allow one extra search per part marked "deep", up to 5 searches in all. In each chapter request, pass the facts for that chapter's `pieces` as "This chapter's facts", and the rest as "Other chapters' facts (already used elsewhere: do not retell)".
- Effect: completeness on every practical topic, and no repeated retellable details.

**2. Let a chapter hold several pieces (plan and writer).**
- Plan, replace: "Each chapter teaches ONE thing,"
  - With: "Each chapter delivers its pieces in full: one deep piece, one or two medium ones, or several light ones,"
- Writer, replace: "The three exercises test the same one thing from three angles, not three different things."
  - With: "With one piece, the exercises test it from different angles. With several, each exercise tests one piece the chapter taught, and the most important piece gets two."
- Writer, replace: "No headings, no bullet lists, no emoji."
  - With: "No headings, no emoji. Use a short list (at most 7 lines) only where the reader will act on the items: a checklist, the steps of a fix, or options to choose between."

**3. Stop the writer repeating itself, and make the attention rules conditional (code and writer).**
- Code: pass "Already used:" with each earlier chapter's first sentence of card 1, its closing line, its invented names and its example situations. For a quick handbook, write the chapters in order and pass the same list.
- Writer, replace: "is built differently in each chapter (a question, a claim, a scene; not "Next: why" every time)"
  - With: "differs in form and wording from every closing line under "Already used" (a question, a claim, a scene)". Add "Never reuse a name, situation or opener listed under "Already used"."
- Writer, replace: "Each "example" and "mistake" card is a small scene: someone wants something, it goes wrong, a moment of doubt, then the outcome."
  - With: "Each "example" card is a small scene: someone wants something, uses what this chapter taught, and you see the result. Each "mistake" card is a small scene where it goes wrong, then how to spot it."
- Writer, replace: "One moment in each chapter makes the reader smile."
  - With: "Where the topic offers one, a moment that makes the reader smile; skip it rather than force it."
- Writer, replace: "one contrast or reversal ("you'd think X; it's Y")"
  - With: "a contrast or reversal where one is true and useful, never the same wording twice in a handbook".

**4. Use the analogy only where it fits (plan and writer).**
- Plan, replace: "outcome first, one analogy carried through the whole thing, concrete every line."
  - With: "outcome first, concrete every line, and one analogy only where it truly makes the topic clearer."
- Writer default card 1, replace: "then the chapter's one idea seen through the handbook's analogy."
  - With: "then the chapter's one idea, through the handbook's picture if a "maps" pair fits this chapter; otherwise through one concrete case."
- Writer, replace: "Carry the plan's picture through if the plan gives one."
  - With: "Use the plan's picture only in chapters where a pair holds."
- Fact check, replace: "If the card is abstract, draw the handbook's analogy."
  - With: "If the card is abstract, draw the analogy only if the card uses it; otherwise draw the card's example or a person using the idea."

**5. Make length follow depth, starting with chapter 1 (code and writer).**
- Code: have the plan return both `readMinutes` and `doMinutes`, and turn only `readMinutes` into words, at about 150 words a minute and at most 1,800. Give chapter 1 a Length line too (150 to 450 words).
- Writer, replace: "you may add one teach card between two blocks where an idea needs it, and nothing else."
  - With: "you may add teach or example cards between blocks where the pieces need room to reach the Length line, and nothing else."
- Writer, replace: "With no Length line, 600 to 900 words."
  - With: "With no Length line: chapter 1 is at most 450 words; later chapters 600 to 900."
- Code: warn when a quick plan's minutes add up to more than about 40.

**6. Hold the plan to the same standards as the chapters (plan, code and fact check).**
- Plan, add after "Never invent facts, tools, names or statistics.": "Unless the line or goal names another place, the reader lives in India: titles, hooks, examples, sources and next topics start from India, rupees and metric units."
- Code: pass Today to the goal question and the plan.
- Code: run the fact check on the plan's hooks, outcome, horizon lines and `sources` before the plan is shown. On any doubt about a source, remove it rather than rewrite it.
- Writer: move the India sentence out of the example/mistake bullet into Rules, ending "… in every card, exercise and recall quiz".

**7. Make the fact check strong enough to be the last line of defence (fact check and code).**
- Code: run it at medium effort, and write the picture scenes in a separate call.
- Code: pass Level as "complete beginner" when level is "new". Check this now, because if it already passes "new" the beginner check never runs.
- Code: include `recallQuizzes` and the tryit line in what it checks.
- Code: don't show an "unchecked" chapter to readers until it passes, or show it only after one retry with the error message.
- Fact check, add: "Write every fixed card in the chapter's language."

**Next after the seven (also topic-agnostic):**
- **Body skills (writer).** Replace the water-specific example with: "If the move carries physical risk, card 2 gives the one safety condition and how to stop or get out of the move, and the reader moves by card 3. If the move needs a place, kit or partner the reader may not have tonight, chapter 1's doit is the safe part they can do at home, and the full move is a try card for next time."
- **Quick handbooks.** Decide whether quick chapters after chapter 1 keep a light check (the spec suggests yes), then make the plan, the writer and code's "chapter 1, quick and story chapters keep none" agree. At minimum, tell the plan not to choose result, predict or scenario for a quick chapter.
- **Goal question.** Replace "Make the 3 goals different in kind: doing it, understanding it, and one specific situation" with "Make the 3 goals genuinely different reasons a person would have for this topic (for example doing it, understanding it, or one specific situation); write them in the language of the typed line." Add the India default.
- **Levels.** Add a third level ("know it well") that both research and the writer use.

---

## 6. Where I'm unsure how the code behaves

- **Does the fact check get "complete beginner" for level "new"?** If not, its beginner check never runs.
- **Is an "unchecked" chapter shown to readers?**
- **Are `recallQuizzes`, the tryit page and the Sonnet quiz versions checked against the India and level rules?** The quiz-version prompt isn't in the bundle.
- **After the retry, is a plan with 1 or 2 chapters accepted?** The code says counts from 1 to 7 pass.
- **Does sharing match on level, language and voice, or only on topic and goal?** And how do per-reader adaptations work with shared chapters?
- **When the next chapter is written "one ahead of the reader", which quiz results does "How the reader did so far" contain?** It may be results from two chapters back.
- **Does research run after the goal question returns null for a harmful line?**
- **Does any code look for the card titled "In one breath" or the "Next:" prefix?** If so, handbooks in other languages may break.

---

## 7. The spec itself

- **Quizzes in quick handbooks.** 1a only exempts chapter 1 and recaps. The pipeline exempts all quick handbooks. One of them should change; the spec should say which.
- **Skills that need a place, kit or partner.** The spec promises "something to show" tonight but doesn't say what a reader should do on night 1 when the real move needs a pool, a road or a partner.
- **Language.** "Never foreign" covers names, money and institutions but not language. Indian readers may type in Hindi or Hinglish.
- **Sharing.** The spec says handbooks are made for the reader's goal and level, but doesn't mention that they are shared across readers. It should say what must match for sharing to be fair.
- **Who to ask.** For mental health, "a doctor" is narrower than the help readers need. "A doctor or counsellor (Tele-MANAS 14416)" fits better.
- **Lists.** "A resource they keep and come back to" is a deliverable the spec names, but nothing says what form it takes on a phone. In practice it will need lists or a reference card.
- **Depth longer than one sitting.** "Deep (a long sitting, or more than one)" has no matching rule for how long one chapter may be. The pipeline's cap of 20 minutes and 1,200 words is stricter than the spec suggests.
