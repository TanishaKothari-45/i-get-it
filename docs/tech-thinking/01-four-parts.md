<!-- Source: https://growthx.club/learn/build-sprint#/tech-parts · captured 2026-10-04 from the GrowthX Build Sprint handbook (login-gated). Verbatim text, converted to markdown. Advanced-level blocks included. -->

# How a product works: four parts

Every product, from Justdial to PhotoCal, is built from the same four parts, and each one runs somewhere different. This chapter gives you that map, so that when something breaks you can tell your agent exactly where to look.

> **By the end of this chapter you'll have**
>
> **Your product in four lines.** Your product written as four lines (interface, business logic, database, third party), where each one runs, and the words to say which part broke.
>
> Example **Interface:** a web page on Rohan's phone; the camera button opens his camera. **Business logic:** a Convex action sends the photo to the vision model and checks the answer. **Database:** a Convex table of meals. **Third party:** the vision model's API, its key stored in Convex, never in the code.

When Rohan taps “Snap your meal”, his photo leaves his phone, visits two other computers, and comes back as “Rajma chawal, about 480 kcal” about five seconds later.

He sees one app. Underneath, four parts did the work, in three different places. Knowing which part did what is most of what you need to direct an agent, so that's where tech thinking starts.

## Every product has four parts

Build stack 101: every product has some variation of these.

The first is the way people talk to your product, the **interface**. It doesn't always mean a screen: for the longest time Justdial's interface was a phone call. It can be an app, WhatsApp, voice, a phone call or a pigeon, I don't care.

The second decides what happens. When the user does this, what should the product do automatically? That's the **business logic**, the back-end code.

The third remembers. The user said their name is Udayan Walvekar: where are you storing it? In the **database**.

The fourth is anything that isn't your own service. Login via Google is a third-party integration, and so is an AI model you reach through OpenAI's **API** (the door other programs use to send it requests), using a key that proves the request is yours. These are **third parties**.

You'll also hear the same four called frontend, backend, database and integrations. Same parts, the names engineers use; this handbook uses the first set everywhere.

In the restaurant, the dining room and the menu are the interface, the kitchen is the business logic, the order book and the pantry are the database, and the suppliers are third parties. Here is PhotoCal in the same four lines.

- **Interface**: A web page on Rohan's phone. The camera button opens his phone's camera; the result shows the dish, the calories, Change and Save.
- **Business logic**: A Convex **action** (a piece of kitchen code that's allowed to call the outside world) receives the photo, sends it to the vision model with instructions, and checks the answer is a dish and a number.
- **Database**: A Convex table of meals: the dish, the calories, the time. Each meal carries a random label Rohan's phone keeps, which is how his phone finds his meals again without a login. Today's total is added up from it.
- **Third party**: The vision model's API. Its key is stored in Convex, never in the code.

For the business logic and the database we recommend [Convex (opens in a new tab)](https://www.convex.dev), because it merges the two into one stack. It's a real-time database, and the GrowthX community platform is built entirely on it. The reason I recommend it: the database itself is built for AI agents to work on top of.

**▸ Common questions — Two short answers**

- **Supabase or Convex?**: I have used both, and Convex is way better. It merges the business logic and the database into one, and it works ten on ten with AI agents.
- **WhatsApp regulations and API limits**: You don't need to worry about regulations or API limits until you hit that scale. If you go viral during the sprint, great problem to solve: it'll be a feature, not a bug.

## Where each part actually runs

Here's the question nobody asks out loud: once your product is live, where does the code actually run?

Not on your laptop. Your laptop is the test kitchen, where you cook before the doors open, and no guest ever reaches it.

The interface is sent to each guest's phone and runs there, inside their browser. Every time Rohan opens your link, the dining room is built fresh on his phone. That means anything in it, every word and every line of its code, can be read by anyone who opens the link.

The kitchen and the pantry run on Convex's servers. The AI runs on its maker's servers. So one snap travels like this.

- **1**: Interface · his phone · He takes the photo. The page sends it to the kitchen.
- **2**: Business logic · Convex · An action adds the instructions (name the dish, estimate the calories, say if it isn't food) and calls the AI.
- **3**: Third party · the AI's servers · The vision model looks at the plate and answers: rajma chawal, about 480 kcal.
- **4**: Business logic · Convex · The action checks the answer is food and a number, and sends it back.
- **5**: Interface · his phone · “Rajma chawal, about 480 kcal.” He fixes it if it's wrong and taps Save.
- **6**: Database · Convex · Save writes the meal to the table. Today's total on his screen updates by itself.

*Figure: One snap and one save visit three computers and all four parts. Only two of the six stops happen on his phone, which is why “it's broken” could mean any of six places.*

Hold on to that trip. It comes back twice: in Ship it (see 03-ship-it.md), where you'll see why the key can never travel with the interface, and in Connecting the AI (see 04-connecting-the-ai.md), where you'll see what the third stop costs.

> **[Advanced]**
>
> ### Advanced Inside the kitchen: Convex's three kinds of function
>
> The kitchen isn't one big block of code. In Convex it's made of small named functions, and [each one is one of three kinds (opens in a new tab)](https://docs.convex.dev/functions/overview). Knowing which kind your agent wrote tells you what it can and can't do.
>
> - **Query**: Reads from the database. Its results are cached and live: when the data changes, every screen showing it updates by itself.
> - **Mutation**: Writes to the database as one all-or-nothing step, called a **transaction**: either the whole change lands or none of it does.
> - **Action**: Calls the outside world: OpenAI, a payment provider, any API. It can't touch the database directly; it asks a query or a mutation to do that.
>
> PhotoCal uses one of each. An action sends the photo to the model. A mutation saves the meal when Rohan taps Save. A query adds up today's total, and because Convex is [automatically realtime (opens in a new tab)](https://docs.convex.dev/realtime), the total on his screen changes the moment the save lands, with no refresh.
>
> Two consequences are worth knowing. First, [actions can't be retried automatically (opens in a new tab)](https://docs.convex.dev/functions/actions). A query or a mutation that fails can safely run again, but an action may already have done something outside, like sending an email or spending tokens (what AI calls are billed in), so Convex leaves retrying to you. That's why the AI call needs its own plain error message on screen.
>
> Second, an action can run for up to ten minutes. A photo takes seconds, so you won't get near that, but an agent that loops through many tool calls inside one action might.
>
> When your agent says it “added a function”, ask which kind. An AI call written inside a mutation can't work, because mutations can't reach the outside world. Spotting that in its plan saves you a milestone.

## Not every product needs all four

A landing page is only an interface. A quiz is an interface and some logic. PhotoCal needs all four, because it has to remember meals and it has to call an AI.

Some products have no app at all. The legal-counsel CRM in The job (see ../product-thinking/01-the-job.md) narrowed to an assistant on WhatsApp: its interface is WhatsApp, and its third parties are Gmail, where the documents and invoices come in, and e-courts data.

That's why the order of decisions matters. **The high-level view dictates the decisions you take at ground level**, and those decisions always depend on the market, the user and the business you're trying to build. Decide the user and the job first; which interface and which integrations follow from them.

**▸ Watch: What the human still owns — Andrej Karpathy, Sequoia, 19:40 to 22:30**

Andrej Karpathy, Sequoia. Play [19:40 to 22:30 (opens in a new tab)](https://www.youtube.com/watch?v=96jN2OCOfLs&t=1180s): a real bug an agent shipped, and the decisions you can't hand over.

**Watch for** around 20:08, where the agent matched payments to accounts by email address, so credits went missing when the two emails differed. A database decision a person should have made.

> **[Advanced]**
>
> ### Advanced The data model: what PhotoCal remembers
>
> Before your agent writes any database code, it decides the **data model**: which tables exist and what each row holds. Convex stores each row as a [document (opens in a new tab)](https://docs.convex.dev/understanding/overview), a small nested record, inside a table.
>
> For PhotoCal v1, one table is enough. Each meal holds the dish, the calories, when it was eaten, and a label that says which phone saved it.
>
> That last field is how v1 works without login. The first time Rohan opens the link, his browser stores a random label, and every meal is saved with it. A browser [keeps that kind of data between visits (opens in a new tab)](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), so tomorrow his phone finds his meals again. That's what “save on this phone” means here: the meals live in Convex, and the way to find them lives on his phone. Clear the browser, or use a private tab, and the label is gone; login is how you fix that later.
>
> This is one decision you can't leave to the agent. Andrej Karpathy found his agent had matched people's purchases to their accounts by email: it “[assigned it using the email address from Stripe to the Google email address (opens in a new tab)](https://www.youtube.com/watch?v=96jN2OCOfLs&t=1208s)”, so anyone who paid with a different email never saw their credits. The rule only a person thought to give: these “have to be unique user IDs that we're going to tie everything to”. PhotoCal's phone label is that ID.
>
> Add two fields you'll be glad of: what the AI first said, and what Rohan changed it to. When he fixes “upma” to “poha”, keep both. That pair is a free test case, and the Advanced part on evals in Connecting the AI (see 04-connecting-the-ai.md) shows why it's worth more than most features.
>
> And the photo itself? v1 doesn't need to keep it: the model reads it, and the answer is what you save. If you do store photos, Convex file storage holds them, but [anyone with a file's link can open it (opens in a new tab)](https://docs.convex.dev/file-storage/overview), so treat meal photos as private and don't keep them by default.
>
> Once real meals exist, changing the shape gets harder. Convex [won't accept a schema (the written-down data model) that doesn't match the data already saved (opens in a new tab)](https://docs.convex.dev/production#making-safe-changes), so new fields start optional and become required only once every row has them.
>
> **Say this to your agent**
>
> ```
> Before writing any database code, propose the data model: each table, each field with its type, and which fields are optional.
> Include what the AI first answered and what the user changed it to.
> Show it to me and wait for my yes.
> ```

- **Skills you already installed in Setup**: **`convex-expert`**Any code in your convex/ folder: the business logic and the database.

## Say which part broke

This is the reason to learn the four parts. “It's broken” sends your agent looking everywhere, and it will change things that were fine. Naming the part sends it to one place.

- **Try 1The agent guesses. It might rebuild the screen when the problem is the save.**: It's broken.Not yet
- **Try 2Closer, but saving touches the screen, the kitchen and the pantry.**: Saving doesn't work.Not yet
- **PassesThe database: the meal is never written, or never read back.**: I tap Save and the meal appears, but it's gone when I reopen the page.Passes

*Figure: The same bug, described three times. Only the last one tells the agent where to look.*

Most symptoms point at one part:

- **The screen looks wrong**: Interface. Layout, spacing, a button under the keyboard, text spilling off a phone.
- **The answer is wrong**: Business logic, or the third party it calls. The kitchen ran and sent back the wrong thing.
- **It's gone after a refresh**: Database. Nothing was saved, or nothing is being read back.
- **It worked yesterday**: Something changed since. Go back to the last version that worked and compare.

When you report a bug, say what you did, what you expected and what happened, then name the part. One bug per message.

**Say this to your agent**

```
Bug in the [interface / business logic / database / third party].
What I did: [the steps, and on which device]
What I expected: [ ]
What happened: [ ]
Find the cause before changing anything. Fix only this. Then tell me what the cause was and how I check the fix on my phone.
```

**▸ Worked example — PhotoCal's first review, three bugs named by their part**

PhotoCal, first review:

- **Selfie, 200 kcal**: Someone photographed their face and got a calorie count. **Business logic:** nothing checked that the photo was food before showing a number.
- **Gone on refresh**: Closed the browser, reopened, every entry lost. **Database:** nothing was being saved.
- **The fix didn't recalculate**: Changing “upma” to “poha” left the calories where they were. **Business logic:** the edit changed the name but never asked for a new estimate.

Three bugs, three exact sentences, three short fixes. Reported as “it's buggy”, they'd have taken the evening.

This is section one of your AGENTS.md. Write it yourself, from your PRODUCT.md, before the agent writes code.

**AGENTS.md · 1. How the product works**

```
## 1. How the product works
Interface: [where people use it: a web page on a phone, WhatsApp, voice] and the one thing they do there: [the core action]
Business logic: [what happens automatically when they do it, in one or two lines]
Database: [what you remember: each table and what's in it]
Third party: [each outside service, what it does for you, and where its key is stored]
Not in v1: [parts you're deliberately not building yet, e.g. login]

When I report a bug, I'll name the part. Look there first, and tell me if you think I named the wrong one.
```

> **Doubts?**
>
> Ask [**Shaktimaan** (opens in a new tab)](https://growthx.club/community/shaktimaan) or post in [#build-sprint (opens in a new tab)](https://growthx.club/community/build-sprint). Ask before you lose the hour.
