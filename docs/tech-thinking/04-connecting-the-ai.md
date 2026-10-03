<!-- Source: https://growthx.club/learn/build-sprint#/tech-ai · captured 2026-10-04 from the GrowthX Build Sprint handbook (login-gated). Verbatim text, converted to markdown. Advanced-level blocks included. -->

# Connecting the AI

Your product calls an AI model the way a kitchen calls a supplier: for every order, on your account. This chapter wires that call into your backend, shows you what each call costs before you share the link, and puts three caps in place so a busy day can't become an expensive one.

> **By the end of this chapter you'll have**
>
> **Your AI call, capped.** The AI call working from your backend, a hard spend cap at the provider, a cap on calls an hour, and a decision on login.
>
> Example The phone shrinks the photo, then a Convex action sends it to `gpt-6-luna` with low reasoning effort and `max_output_tokens` 500, the key read from Convex. A hard monthly limit set at OpenAI. At most 100 AI calls an hour across the app. No login in v1: meals stay tied to his phone.

The model you're about to connect has never eaten rajma chawal. It has never counted a calorie. It knows which word usually comes next.

When you talk to an agent, it's just predicting what the next word is going to be. It doesn't know anything else. I'm sorry to break your bubble, but it's autocorrect on steroids.

That's enough to name a dish most of the time, and it's why poha came back as upma with total confidence. Treat the model as a very good guesser that you pay by the word, and the rest of this chapter follows.

## The horse and the harness

The model only predicts the next token, next token, next token. How does it know when to stop? We do software engineering. The code around the model is the **harness**: stop after this many tokens, compact after 80%, if the user says this kind of thing, store it in memory, when this is inferred, run a Google search. ChatGPT is not a model, it's a harness; the model is what's inside.

That's the horse from the start of this lens. The model keeps running; the harness is what takes it left or right.

For PhotoCal the harness is tiny: a few lines of instructions, the photo, and a limit on how much the model may write. It lives in your kitchen.

> **[Advanced]**
>
> ### Advanced Inside a harness
>
> Strip any harness down and you find a loop. The model gets a task and a list of **tools**, the things it's allowed to do, like searching the web or sending a message. It picks one, the harness runs it and hands back the result, and the model decides what to do next. Anthropic's engineers [describe agents exactly this way (opens in a new tab)](https://www.anthropic.com/engineering/building-effective-agents): models using tools, based on feedback from their environment, in a loop.
>
> The loop needs an exit. Agents usually stop when the task is done, and a careful harness adds stopping conditions too, such as a maximum number of steps, so a confused agent can't run forever on your account.
>
> That answers a question builders often ask: is a harness the same as prompt chaining? Not quite. **Prompt chaining** is a fixed sequence you write in advance: call one does this, call two takes its output and does that. Anthropic calls that a **workflow**. In an agent, the model chooses the next step itself. A chain is a harness whose steering you fixed in advance, which makes it more predictable and cheaper, and Anthropic recommends starting with the simplest option that works.
>
> All the improvements you see now are harness improvements, not model improvements: give it a task and it spawns sub-agents, more horses, that report back. I would say Claude Code was the first harness that was really like, wow, this is great. Then OpenClaw, then Hermes.
>
> You can read real ones. [Codex is open source (opens in a new tab)](https://github.com/openai/codex), so the harness you build with is on GitHub, and so is [Hermes (opens in a new tab)](https://github.com/NousResearch/hermes-agent).
>
> If you want to know how the model underneath works, there's Andrej Karpathy's video. It's a three-hour video; go and watch it: [Deep Dive into LLMs like ChatGPT (opens in a new tab)](https://www.youtube.com/watch?v=7xTGNNLPyMI) (3 h 31 min). Before you press play, you already have its three key words: token, next-token prediction, context window.
>
> For the harness itself, GrowthX members have [Neel's series on building AI agents (opens in a new tab)](https://growthx.club/learn/resources/building_ai_agents_with_neel__1_3__ffisw). It's technical: it goes from an empty editor to a whole harness.

## Where the call lives: in the kitchen

Remember the trip in How a product works (see 01-four-parts.md): the photo goes from Rohan's phone to the kitchen, the kitchen calls the supplier, and only the answer comes back. The AI call lives in the kitchen, as a Convex action, never in the interface.

That isn't a style choice. OpenAI's own advice is to [never put a key in browsers or mobile apps (opens in a new tab)](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety), and to route every request through your own backend, where the key stays secret.

Create a key in your OpenAI or Claude Console account, type it into Convex yourself for dev and for prod (as in Ship it (see 03-ship-it.md)), then ask your agent to wire the call.

**Say this to your agent**

```
Connect the AI. Before sending, shrink the photo on the phone so its longest side is 1024 pixels. Then write a Convex action that sends it to gpt-6-luna with these instructions: [name the dish and estimate the calories for one serving; if it isn't food, say so]. Return the dish and the calories.
Read the key from process.env.[VARIABLE_NAME], never from frontend code.
If it isn't food, or the call fails, show a plain message and keep the photo on screen. Tell me how to test both on my phone.
```

> **[Advanced]**
>
> ### Advanced Evals: knowing the answers are good before users tell you
>
> Your app's AI gives a slightly different answer each time, and some answers are wrong. The question is how often, on what, and whether your last change made it better or worse. Trying three photos and nodding is what OpenAI's guide calls a [vibe-based eval (opens in a new tab)](https://developers.openai.com/api/docs/guides/evaluation-best-practices), and lists as the thing to avoid.
>
> An **eval** answers it properly, and the beginner's version starts with reading, not scoring. Hamel Husain, who led the team behind a precursor to GitHub Copilot, starts by saying “[we're going to look at about 100 traces (opens in a new tab)](https://www.youtube.com/watch?v=uiza7wp1KrE&t=291s)” and writing a note on what went wrong in each. A **trace** is one saved interaction: what went in and what came out.
>
> - **1**: Save · Every AI call · Store what went in and what came out in a Convex table. For PhotoCal, keep the AI's first answer and Rohan's fix, as in the data model in How a product works (see 01-four-parts.md).
> - **2**: Read · About a hundred of them · Write one short note on anything wrong. Don't diagnose: “[The point is not to do a full root cause analysis. Just observe what's wrong (opens in a new tab)](https://www.youtube.com/watch?v=uiza7wp1KrE&t=338s)”. It took them about an hour.
> - **3**: Group · The notes into a few kinds · Paste them into Claude or ChatGPT, ask it to group them, then count each kind. The biggest group is your next fix.
> - **4**: Check · The common failures, yes or no · Turn each kind into a check that passes or fails, and run the checks every time you change the instructions or the model.
>
> *Figure: Read first, count second, automate last.*
>
> Before you have users, make test photos on purpose, and don't just ask an AI for sample meals. Hamel's advice is to “[come up with some dimensions (opens in a new tab)](https://www.youtube.com/watch?v=uiza7wp1KrE&t=972s)” first, because a plain request comes back samey. For PhotoCal: the dish (common, a look-alike, a mixed thali) × the photo (bright, dark, half-eaten) × the plate (one person, a shared table).
>
> When an answer can't be checked by code, like whether a coaching reply is kind and useful, teams ask a second model to judge it. Keep the judge to yes or no: “[it's very important for an LLM judge that you output a binary score (opens in a new tab)](https://www.youtube.com/watch?v=uiza7wp1KrE&t=1479s)”. Then check its verdicts against your own notes before you trust it, as [OpenAI advises (opens in a new tab)](https://developers.openai.com/api/docs/guides/evaluation-best-practices).
>
> And don't write the rules first. Speaking with Hamel on Lenny's Podcast, Shreya Shankar put it bluntly: “[you can't figure out your rubrics up front (opens in a new tab)](https://www.youtube.com/watch?v=BsWxPI9UM4c&t=3855s)”. People see the failure modes only after reading real answers.
>
> The first skill to learn depends on the business impact you're trying to create. If you're creating AI agents, harness engineering, memory and evals have become very important.
>
> **Say this to your agent**
>
> ```
> Save every AI call in a Convex table: what went in, what came out, the time, and what the user changed it to, if anything. Then give me a simple page or command that shows the last 100, so I can read them.
> ```

## What a call costs: tokens in, tokens out

Every call is billed in tokens, the small pieces from Working with your agent (see 02-your-agent.md): what the model reads (your instructions and the photo) and what it writes (the answer, plus any thinking first).

Here's the part most builders get wrong: **your ChatGPT or Claude plan doesn't pay for any of this.** The plan pays for your coding agent. Your app's calls go through the API, which is [billed separately (opens in a new tab)](https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus), and [the same is true for Claude (opens in a new tab)](https://support.claude.com/en/articles/9876003-i-have-a-paid-claude-subscription-pro-max-team-or-enterprise-plans-why-do-i-have-to-pay-separately-to-use-the-claude-api-and-console).

So the cost of a month, in words: **(tokens in × price in + tokens out × price out) × calls a day × 30**.

Here's PhotoCal on [GPT-6 Luna (opens in a new tab)](https://developers.openai.com/api/docs/models/gpt-6-luna), which OpenAI [suggests for cost-sensitive, high-volume work (opens in a new tab)](https://developers.openai.com/api/docs/models), and which reads photos.

- **The photo, shrunk to 1024 pixels on the phone**: about 1,200 tokens in
- **Your instructions**: about 300 tokens in
- **The answer and its thinking, capped**: at most 500 tokens out
- **Luna's price, per million tokens**: $0.10 in, $0.50 out
- **One photo: 1,500 in and 500 out**: at most $0.0004
- **A thousand photos**: about $0.40
- **A whole month at the cap of 100 calls an hour, every hour, photos shrunk first**: about $29, the worst case

*Figure: The price decides what one photo costs. The cap on calls decides the worst month.*

Figures marked “about” are estimates to build intuition. OpenAI's [vision guide (opens in a new tab)](https://developers.openai.com/api/docs/guides/images-vision) counts a 1024 × 1024 photo as 1,229 tokens on its current models; Luna isn't in that table yet, so check yours in the [image calculator (opens in a new tab)](https://developers.openai.com/api/docs/guides/image-cost-calculator). The 300 tokens of instructions is a guess at a short prompt.

That shrink matters, and the $29 assumes it. Sent straight from the camera, the same photo could be about 14,000 tokens, which would make the worst month about $120 instead. Shrinking it first also makes the upload faster on mobile data.

**That calculation is why the caps come before the price.** Now change one assumption. [Claude Haiku 4.5 (opens in a new tab)](https://platform.claude.com/docs/en/about-claude/models/overview), Anthropic's fastest model, costs ten times Luna per token, so with a similar token count the same worst month is roughly ten times bigger. Remove the cap on calls and there is no worst month at all: anyone with your link, or a script pointed at it, decides your bill.

## Three caps before you share the link

- **1**: At the provider · A hard monthly limit · OpenAI: Organization limits, Spend, Edit spend limit, then turn on Enforce a hard limit. An alert alone stops nothing, and [enforcement isn't instant (opens in a new tab)](https://developers.openai.com/api/docs/guides/spend-limits), so spend can go slightly over. Claude Console: [Settings, Billing, Spend limits (opens in a new tab)](https://platform.claude.com/docs/en/api/rate-limits).
- **2**: In each call · A cap on each reply · [max_output_tokens (opens in a new tab)](https://developers.openai.com/api/reference/resources/responses/methods/create) on OpenAI, [max_tokens (opens in a new tab)](https://platform.claude.com/docs/en/api/messages/create) on Claude. Too low and the answer comes back cut off, so start at 500, not 100.
- **3**: In your kitchen · A cap on calls an hour · [Convex's rate limiter (opens in a new tab)](https://www.convex.dev/components/rate-limiter): 100 AI calls an hour across the app, to start. Without login, anyone with your link can use your AI.

*Figure: Three caps in three places. Each one catches what the others miss.*

When a cap is hit, the call is refused; show plain words, not an error code. The developer Chris Raroque, who once woke up to a $30,000 bill from a leaked key, puts the trade well: “[It is so much better for your app to go down for a little bit than for you to wake up with a $10,000 bill (opens in a new tab)](https://www.youtube.com/watch?v=tK4NQtzfZbM&t=718s)”.

**Reasoning effort** is how long the model thinks before it answers. Thinking is billed as output and counts against the reply cap, and naming a dish needs little of it, so start at low.

**Say this to your agent**

```
Use gpt-6-luna, low reasoning effort, max_output_tokens 500. Add Convex's rate limiter: at most 100 AI calls an hour across the whole app, checked inside the action. If we hit it, or the provider refuses, show "Busy right now. Try again in a few minutes."
```

Those two numbers are starting values to tune, not advice from OpenAI or Convex.

> **Remember this**
>
> Before you share the link: the small model, a cap on each reply, a cap on calls an hour, and a hard monthly limit at the provider.

## Login: only when the product breaks without it

Login feels like part of a real product. For a first version it's mostly a wall: in NN/g's usability tests, [few things annoyed people more than a login wall (opens in a new tab)](https://www.nngroup.com/articles/login-walls/).

And the phone already remembers. PhotoCal v1 saves meals under a label Rohan's phone keeps, so his phone finds them tomorrow. They won't follow him to a laptop, and a private tab [forgets the label (opens in a new tab)](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage). For v1, that's fine.

- **Add login when data must follow them**: Phone today, laptop tomorrow.
- **When it's private**: Health records, money, anything they'd mind a stranger seeing.
- **When they pay**: You need to know who paid.

When you do add it, ask after the first win: “Save your log? Sign in with Google.” [Convex Auth (opens in a new tab)](https://labs.convex.dev/auth) is already in your stack; it does Google sign-in, email codes and passwords, and it's still in beta.

**▸ Watch: Tokens and pricing — Cursor, 0:00 to 3:33**

Cursor. Play [0:00 to 3:33 (opens in a new tab)](https://www.youtube.com/watch?v=Gauk0F6UBFo): what a token is and how it's priced, in three minutes.

**Watch for** around 3:05, caching: the same instructions sent again can cost less.

- **Skills you already installed in Setup**: **`convex-agent`**Adds an agent backend to your Convex app (Convex's own agent component), if your product is a chat that remembers. **`convex-auth`**Adds sign-in to your Convex app, once you've decided you need it.

## If your product is an agent, use a harness, don't build one

Your job in Build Sprint isn't to build a harness. Take an open-source one, use it, get to the user. If you're building an AI agent on WhatsApp, for wellness or meditation, [Hermes (opens in a new tab)](https://github.com/NousResearch/hermes-agent) is very good. Once users want more, build one part of the stack yourself. Like dropshipping: first you resell, then you make your own products in China, then you bring the manufacturing home. One step at a time.

Two tools get mixed up here. Both are harnesses, and they do different jobs.

- **Codex or Claude Code**: Your coding tool. It runs on your laptop, reads and writes your code, and builds the product. It stays your coding tool all week, whatever your product does.
- **Hermes, or any open-source harness**: A part of your product, only if its core is an agent that talks to your users. It runs on its own, on WhatsApp, Telegram and other chat apps, with the model you choose.

Hermes comes with tools that can run commands on the computer it runs on. Before strangers can message it, follow its [security guide (opens in a new tab)](https://hermes-agent.nousresearch.com/docs/user-guide/security): allow only the users you've approved, keep command approval on, and run it in a container.

So you don't switch from Codex to Hermes, and Hermes doesn't run on top of Codex. Codex builds; Hermes, if your product needs it, serves. You've met Hermes already: it's the assistant from Project 3, working for you. Inside a product, the same kind of harness works for your users instead.

And if your product makes one call per tap, like PhotoCal, you don't need one at all. Your Convex action is the whole harness: instructions, one call, a cap.

**▸ Where connecting the AI usually goes wrong — Three near-misses**

- **“My plan covers it”**: It doesn't. The plan pays for your coding agent; the API bills your app separately.
- **Testing with your best photo**: One well-lit plate tells you nothing. Try a dark photo, a thali and a selfie before anyone else does.
- **The AI wanders off-topic**: Give it one narrow job in its instructions, check its answer in code (is it food? is the number sane?), and read its real answers. That's the Advanced part on evals.

> **[Advanced]**
>
> ### Advanced Designing memory
>
> Memory, for a bot that has to remember a user's last six months, has only two constraints now: tokens and latency. Summarise and it's faster, but you lose the nuance. For a build like this, keep it very simple.
>
> A coach that remembers six months of one person's check-ins can't send six months of chat with every message. It would be slow, and you'd pay for every token of it on every reply. So memory is a design problem.
>
> The TL;DR of memory is that the folder structure is the same as good querying practice on a database. What is your problem statement: do you want the latency to be small, or the retrieval to be accurate?
>
> In practice, three layers cover most products. Keep the raw history in the database, every message. Keep a short running summary per user, updated now and then, and send it with every call. And when the user asks about something specific, like “how was my sleep in August?”, fetch only those rows and send them. That last layer is what Anthropic's engineers call a [“just in time” approach (opens in a new tab)](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents): keep lightweight pointers, and load the data into the context only when it's needed. The running summary is close to what they call structured note-taking: notes kept outside the context window and pulled back in later.
>
> Each layer has its price. The summary is fast and cheap but loses nuance. The raw rows keep the nuance but cost tokens and time. The lookup is only as good as the question it asks the database. This three-layer split is a common pattern, not a standard; tune it to your constraint.
>
> **Compaction** is the same idea inside one long conversation: when the context window nears its limit, the harness summarises it and starts again from the summary. Anthropic's engineers describe the art as choosing what to keep, because overly aggressive compaction can lose details whose importance only shows up later.
>
> For a deeper, technical treatment, built for a million-plus users, GrowthX members can watch [the OpenClaw memory video (opens in a new tab)](https://growthx.club/learn/resources/how_openclaw_remembers_everything__a1a0s).

**AGENTS.md · 4. The AI call**

```
## 4. The AI call
Model: [gpt-6-luna, Claude Haiku 4.5, or your choice], thinking [low, or off]
What goes in, and its limit: [a photo shrunk to 1024 pixels on the longest side, on the phone / at most [300] messages]
Where it runs: a Convex action. Never in the interface.
Key: [VARIABLE_NAME] in Convex environment variables, dev and prod.
Reply cap: max_output_tokens [500]
Calls cap: at most [100] AI calls an hour across the app, checked in the kitchen (Convex rate limiter)
Provider limit: a hard monthly limit of [$ amount], set by me
When a cap is hit or the call fails: show "[Busy right now. Try again in a few minutes.]"
Login: [none in v1, or when and why]
The AI must never: [e.g. give medical advice, answer off-topic]
```

## Send it to Shaktimaan

Write AGENTS.md down before you build, and keep it up to date. When your link is live, send AGENTS.md, the live link and the repo link to [**Shaktimaan** (opens in a new tab)](https://growthx.club/community/shaktimaan) with the prompt below. It checks the same things these chapters teach and tells you what to fix.

**Say this to Shaktimaan**

```
Shaktimaan, here's my AGENTS.md, my live link and my public repo for Build Sprint. Check them the way the Tech thinking pages on the dashboard teach: the product in four parts, my agent's working rules, no keys in the repo, and the AI call runs in a Convex action, never in the interface, with a reply cap, a calls cap and a spend limit. I opened the link on my phone, logged out, on mobile data: [what happened]. Tell me the weakest part first and make me fix it. Don't fix it for me.
```

> **Doubts?**
>
> Ask [**Shaktimaan** (opens in a new tab)](https://growthx.club/community/shaktimaan) or post in [#build-sprint (opens in a new tab)](https://growthx.club/community/build-sprint). Ask before you lose the hour.
