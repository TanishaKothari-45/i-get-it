<!-- Source: https://growthx.club/learn/build-sprint#/product-flows · captured 2026-10-04 from the GrowthX Build Sprint handbook (login-gated). Verbatim text, converted to markdown. Advanced-level blocks included. -->

# User flows: one story, step by step

Your job sentence says what progress someone wants. The core flow says how they make it, one step at a time. This chapter gets you that flow: what your user does today, then where your product fits, then what must not go wrong.

> **By the end of this chapter you'll have**
>
> **The core flow, step by step.** What your user does today, as steps; then your core flow as numbered steps from the moment it hurts to the job done, with what must not happen at each step.
>
> Example **Today:** lunch arrives → he thinks of logging it → eats instead and guesses. **With PhotoCal:** lunch arrives → open PhotoCal → Snap your meal → “Reading your plate” → “Rajma chawal, about 480 kcal” → fix it if wrong → save → today's total. **Must not:** call a selfie food.

## Write today's journey first

A **user flow** is the steps a person takes to get the job done. The one they repeat every time, the reason they hired you, is your **core flow**.

Don't start with your product. Start with what they do today, because they're already solving the problem somehow. Journey first, not product first.

- **1**: Trigger · Lunch arrives · Rajma chawal at his desk, 1:15 PM on a Tuesday.
- **2**: He · Thinks about logging it · In the app he quit, that's about three minutes of searching and guessing.
- **3**: He · Eats instead · The food is getting cold.
- **4**: He · Guesses · “About 500, probably.”
- **5**: Not done · The day's number is a guess · And the scale isn't moving.

*Figure: Rohan's lunch today. The job never gets done, and step 2 is where every calorie app loses him.*

Today's journey shows you where it hurts, and what the user cares about that you'd miss if you only wrote the steps you want to build. Write it all down first, then cut.

Stuck? Voice-note what your user goes through, then edit the transcript.

## Then your product, from the moment it hurts to the job done

Now write the same moment with your product in it. Start with the situation, then how they reach you, then exactly what they do: step one, step two, step three, down to the screen (or the message, on WhatsApp). If two people take turns, mark whose step it is.

- **1**: Trigger · Lunch arrives · The flow starts here, before your product.
- **2**: He · Opens PhotoCal · From his home screen.
- **3**: He · Taps “Snap your meal” · The phone's camera opens.
- **4**: He · Takes the photo · The whole plate.
- **5**: It · “Reading your plate” · About five seconds. This is the AI call.
- **6**: It · “Rajma chawal, about 480 kcal” · The dish and a number.
- **7**: He · Fixes it if it's wrong · One tap, and the calories follow.
- **8**: He · Saves · It goes on today's list.
- **9**: Job done · Sees today's total · He knows where he stands.

*Figure: From the plate to the total.*

Both ends matter. Start at the moment it hurts, never at “signs up”. End at the job done in his terms, not at “taps save”.

Then count what getting the job done takes. In the app he quit, eight things: open it, search, pick a result, guess the portion, the same three for the rice, save. With PhotoCal, four. That's the Delta 4 from Lock your idea (handbook page #/lock-your-idea): today's steps cut to three or four.

## Steps first, features after

Most first drafts are a list of features. A list has no order and no ending, so your agent builds all of it, scattered across a dashboard. A flow has an order, so the agent knows how to stitch the features into one product.

**A feature list**
AI food recognition
A calorie database of Indian dishes
A daily dashboard
Login with Google
Streaks and badges

**A flow**
Lunch arrives at his desk
He opens PhotoCal and taps “Snap your meal”
He photographs the plate
He reads “Rajma chawal, about 480 kcal”
He saves it and sees today's total

*Figure: The list can't tell you what to build first. The flow can, and it has no login in it.*

You don't need to think about features. They come out of the flow, and AI will build them. If you think of features first and then write the flow, you're still just writing features.

## At each step, what must not happen

Go back through your steps and ask: what's a weird input? What's a wrong answer? Then write, at that step, what must not happen.

- **4 · Takes the photo**: A selfie or a menu must not come back as “200 kcal”.
- **6 · The answer**: Poha read as upma must not stay that way. One tap fixes it, and the calories follow.
- **8 · Saves**: Lunch must not be gone by dinner.

You don't have to write every odd case. AI is good at that: fleshing it out, expanding it, structuring it. Write what only you know from your user, and let your agent list the rest. As you test, add a rule each time something goes wrong.

Solutioning is the easiest part. Give your flow to AI and it will come up with the solution. This thinking, it can't do.

> **Remember this**
>
> A flow is finished when it starts at the moment it hurts, ends at the job done, and says what must not happen along the way.

## Stop when the job is covered

How many flows? Go back to the job and ask: are these enough for the job to get done? Sometimes that's two, sometimes five. Write the most important one in full first, then the next, the same way.

**▸ Try this once — Your AI, with and without your flows**

Ask ChatGPT or Claude to write user flows for your idea from one line. It reads well at first, and makes less sense the more you read. Then give it your three most important flows and ask again. The difference is the part only you could write.

**▸ Common mistakes — Three ways a flow goes wrong**

- **Product first**: Starting at “opens the app”. Write what they do today first, and start the core flow at the moment it hurts.
- **Ending at “save”**: Saving is your step. The job is done when he knows his total.
- **Three flows at half depth**: One flow that works end to end beats three that each stop halfway.

**▸ Watch: Telling a story, not listing features — Jeff Patton with Miro, 5:50 to 10:10**

Jeff Patton with Miro. Play [5:50 to 10:10 (opens in a new tab)](https://www.youtube.com/watch?v=0W9g-D3oTm8&t=350s): steps as verbs, and why a feature list reveals a plan but not a story.

**Watch for** around 9:01, where he says a map of the steps that starts with login means the team is lost in the details.

> **[Advanced]**
>
> ### Advanced What goes wrong, numbered by step
>
> Write the happy path (the version where everything goes right) as numbered steps. Then write each thing that can go differently as a branch off one step, numbered by that step, saying where it rejoins:
>
> - **4a · Not food**: He photographs his laptop. PhotoCal says it can't see a meal and offers to try again. Back to step 4.
> - **5a · No answer in 15 seconds**: It says it couldn't read the plate and keeps the photo, so he can retry. Back to step 5.
> - **6a · Two dishes on one plate**: It names both, each with its number, and adds them. On to step 7.
> - **3b · Lunch was an hour ago**: Not an error, just another way through: he picks a photo from his gallery. Rejoins at step 5.
>
> Each branch costs build time, so each one goes into chapter 5's buckets like any feature: 4a is a must-have for PhotoCal; 3b can wait. It also gives your agent something exact. “Handle errors” gets you a generic message everywhere. “5a: after 15 seconds, say so, keep the photo, offer a retry” gets you what you meant.

> **[Advanced]**
>
> ### Advanced Lay your flows out as a map
>
> Once you have two or three flows, a list stops working. Lay them out on one page instead. Across the top go the big things a person does, left to right, in order. Under each go the smaller steps and the variations, most important first. Practitioners call this a **story map**.
>
> - **Capture the plate**: Top: a camera photo. Lower: upload from the gallery, scan a barcode.
> - **Get the answer**: Top: dish and calories. Lower: protein, carbs and fat.
> - **Fix it**: Top: change the dish. Lower: change the portion.
> - **Keep a record**: Top: save it on this phone. Lower: sync across devices, which needs a login.
> - **See the day**: Top: today's total. Lower: a weekly trend.
>
> Then draw a line across the whole map. Everything above it is v1. Cut across the map, not down it: a thin slice through every column works end to end on Saturday night; a perfect first column with nothing under “keep a record” is a demo, not a product.

## Write your core flow

Write today's journey, then the core flow, then what must not happen. Then ask your agent to find the holes, not to write it for you.

**Say this to your agent**

```
Read IDEA_SCOPE.md and PRODUCT.md. Here is what my user does today and my core flow: [paste both].
Don't rewrite them. Tell me:
1. Does the core flow start at the moment it hurts and end at the job done?
2. Which steps are features instead of something the person does?
3. Where could a weird input or a wrong answer hurt my user, and have I said what must not happen there? List the edge cases I haven't thought of.
4. What does my user care about in today's journey that my core flow has dropped?
Ask me one question at a time.
```

**PRODUCT.md · 3. The core flow**

```
## 3. The core flow
Today (what they do now, before your product):
1. [the moment it hurts]
2. [ ]
...
[where it ends today]

With my product:
1. [the moment it hurts]
2. [they ...]
3. [the product ...]
...
[last]. [the job done, in their terms]

Things it takes to get the job done today: [count] · With my product: [count]

What must not happen:
Step [n]: [ ]
Step [n]: [ ]

Other flows (stop when the job is covered): [ ]
```

> **Doubts?**
>
> Ask [**Shaktimaan** (opens in a new tab)](https://growthx.club/community/shaktimaan) or post in [#build-sprint (opens in a new tab)](https://growthx.club/community/build-sprint). Ask before you lose the hour.
