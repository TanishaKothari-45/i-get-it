<!-- Source: https://growthx.club/learn/build-sprint#/tech-ship · captured 2026-10-04 from the GrowthX Build Sprint handbook (login-gated). Verbatim text, converted to markdown. Advanced-level blocks included. -->

# Ship it: from your laptop to a link

A product that only works on your laptop has no users. This chapter takes yours from your laptop to a link anyone can open on a phone, keeps your keys out of the public repo on the way, and tells you what to do when a deploy fails.

> **By the end of this chapter you'll have**
>
> **Your live link and public repo.** A live link a stranger can open on their phone, and a public GitHub repo with no keys in it.
>
> Example PhotoCal at its `.convex.site` link, opened on a phone on mobile data, logged out. The code public on GitHub, with `.env.local` ignored. The vision model's key only in Convex, set once for dev and once for prod.

Right now your product lives on one computer, and it's the one computer your users will never touch.

Getting it off that computer is where the time goes. Andrej Karpathy built a small app with AI and had the “[demo working on my laptop in a few hours and then it took me a week (opens in a new tab)](https://www.youtube.com/watch?v=LCEmiRjPEtQ&t=1974s) because I was trying to make it real”. Login, payments, the domain and deployment were the slow part, not the code.

In this sprint most of that week is done for you: the stack is fixed and your agent knows it. What's left is one sentence to set it up, one sentence every time after, and one thing that must never make the trip.

## Four places, one chain

Your code lives in four places this week. You build in one, keep it in the second, put it online from the third, and the fourth is the only one that counts.

- **Your laptop**: The test kitchen. Changes show up in your browser almost at once, and nobody else can see them.
- **GitHub**: The recipe book. Every version you pushed is kept, and because the repo is public, anyone can read it.
- **Convex**: The restaurant itself: the kitchen, the pantry, and the address on the door, a link ending in .convex.site.
- **The public**: The guests. A stranger opening your link on a phone, on mobile data, with nobody there to explain.
- **Your AI key**: Stopped · It never goes into the recipe book. You type it into Convex, and it stays in the kitchen.

*Figure: Code moves down this chain every time you change something. One thing never makes the trip, and most of this chapter is about it.*

The step people miss is between GitHub and Convex. Pushing saves a version in the recipe book; it doesn't open anything. Deploying is what puts the new version in front of guests, and in this sprint's setup a push never deploys by itself.

Always, always, always have everything on GitHub. It's the record of every moment your product worked, and your public repo is what you submit.

A deploy does three things in one go: it builds the interface, updates the kitchen, and uploads the new dining room. If the upload fails partway, [the last working version stays up (opens in a new tab)](https://www.convex.dev/components/static-hosting), so guests never see a half-built page.

> **[Advanced]**
>
> ### Advanced Dev and prod: a kitchen for testing, a kitchen for guests
>
> Convex gives every project two kinds of backend. Your **development deployment** is the one your laptop talks to while you build, and [every team member gets their own (opens in a new tab)](https://docs.convex.dev/production). The **production deployment** is the one your live link talks to, and there's one, shared.
>
> They're separate kitchens with separate pantries. Meals you saved while testing on your laptop are not in production, and nothing a guest saves lands in your dev data. That's why your first deploy can look empty: it's a new pantry.
>
> Environment variables are [set per deployment (opens in a new tab)](https://docs.convex.dev/production/environment-variables) too, so the same name can hold a different value in each. Use that for keys. A separate dev key, from a separate project with [its own spend limit (opens in a new tab)](https://developers.openai.com/api/docs/guides/spend-limits), means a test loop gone wrong on your laptop can't spend your live product's budget.
>
> Two rules keep a live product from breaking when you change it. Convex [won't accept a schema (the written-down data model) that doesn't match the data already in production (opens in a new tab)](https://docs.convex.dev/production#making-safe-changes), so new fields go in as optional first. And because some guests still have the old page open when you deploy, change functions so old pages keep working: add new inputs as optional rather than renaming the ones you have.
>
> When the agent says “it works”, ask which kitchen it tested in. Working in dev and broken in prod almost always means something set in one and not the other, usually a key.

## One sentence sets it up, one keeps it going

You don't need to learn git or hosting. Your agent knows the chain. Run this once, when your local version is worth showing.

**Say this to your agent**

```
Ship this. Put the code on GitHub, then set up Convex static hosting (convex.dev/components/static-hosting) and deploy it. Ask me the repo name and whether it should be public.
```

It creates the repo and pushes, adds hosting and a deploy command, runs the first deploy and prints your live link. It stops twice to ask, because the name and public-or-private are your calls. For the sprint, the answer is public.

After that, every change goes the same way. The commands are `git add . && git commit -m 'what changed' && git push && npm run deploy`, but you can just say it.

**Say this to your agent**

```
I like where we are. Commit, push and deploy, then give me the live link.
```

## The key never goes in the recipe book

Your AI provider gives you an **API key**: a long secret string that proves a request is yours and bills your account for it. Anthropic [compares it to a credit card number (opens in a new tab)](https://support.claude.com/en/articles/9767949-api-key-best-practices-keeping-your-keys-safe-and-secure): whoever has it can spend on your behalf.

In the restaurant, it's the supplier's account card. It belongs in the kitchen, where staff use it out of sight. Leave it on a dining table and any guest can order on your account.

Two tables are in plain view. Your repo is public, so anything in it can be read. And remember the trip in How a product works (see 01-four-parts.md): the interface runs on every guest's phone, so anything in the interface can be read too.

- **1**: Where it lives · In Convex, twice · Deployment Settings, then Environment Variables: once for dev (your laptop) and once for prod (your live link). An **environment variable** is a named setting kept on Convex's servers, outside your code: the code asks for it by name and never contains the value. [Convex (opens in a new tab)](https://docs.convex.dev/production/environment-variables) made these for exactly this. Type the key in yourself; never paste it into your agent's chat.
- **2**: Who uses it · Only a Convex action · The phone sends the photo, [the action (opens in a new tab)](https://docs.convex.dev/functions/actions) reads the key and calls the AI, and only the answer comes back.
- **3**: Where it never goes · Code, VITE_, .env.local · Your interface is built by a tool called Vite, and any setting whose name starts with VITE_ is copied into the page itself, so it's [sent to every visitor (opens in a new tab)](https://vite.dev/guide/env-and-mode). .env.local is a settings file on your laptop only and must never reach GitHub; a file called .gitignore lists what never goes there.

*Figure: Three rules that keep the account card in the kitchen.*

You'll see one name that looks like it breaks the third rule: `VITE_CONVEX_URL`. That one is fine. It's your kitchen's address, which every guest's phone needs anyway. An address isn't a key.

If a key does slip in, [GitHub scans public repos (opens in a new tab)](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning), old commits included, and tells OpenAI and Anthropic, who switch the key off. Your app stops, possibly mid-demo. GitHub also [blocks pushes that contain a key (opens in a new tab)](https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection); when it warns you, take the key out, and don't push past the warning.

Being switched off is the kind outcome. In [one test of AWS keys posted on GitHub (opens in a new tab)](https://www.comparitech.com/blog/information-security/github-honeypot/), the first misuse came within a minute.

**If it leaks:** delete the key in the provider's dashboard, make a new one, add it to Convex for dev and prod, and check your usage. Deleting the file doesn't help, because GitHub keeps every old version.

**Say this to your agent**

```
My repo is public. Put the AI call in a Convex action that reads the key from process.env, never in frontend code, a VITE_ variable or a committed file. Check .gitignore covers .env.local, and tell me the variable name to add in Convex for dev and prod. Don't ask me for the key.
```

> **Remember this**
>
> The repo is public and the interface runs on every guest's phone, so the only safe place for a key is the kitchen: a Convex environment variable, read by an action.

> **[Advanced]**
>
> ### Advanced Anything the browser can change, a user can change
>
> A key is the obvious secret. The rule behind it is wider: anything the browser can change, a user can change.
>
> The interface runs on the guest's phone, so the guest controls it. A limit that lives only on the screen, like “three free photos a day” or a hidden Premium button, can be skipped by anyone who talks to your kitchen directly, because your kitchen's public functions [can be called by any client (opens in a new tab)](https://docs.convex.dev/functions/overview) that has your address. The developer Chris Raroque puts it plainly: people “[can bypass any limits you put on the front end because they're going directly to the back end (opens in a new tab)](https://www.youtube.com/watch?v=tK4NQtzfZbM&t=466s)”.
>
> So every check that matters happens in the kitchen, inside a Convex function. Is this person allowed to do this? Have they used up their limit? Is this meal theirs? The screen can show the limit. Only the kitchen can enforce it.
>
> His own story is a calorie tracker, much like PhotoCal. Users could only read and write their own data, but he “[made the mistake of storing the subscription status and the rate limits on the same table (opens in a new tab)](https://www.youtube.com/watch?v=tK4NQtzfZbM&t=215s)”, so users could give themselves premium and lift their own limits on his AI. When he then checked other builders' apps, “[over half of them had the exact same problem (opens in a new tab)](https://www.youtube.com/watch?v=tK4NQtzfZbM&t=270s)”.
>
> Two habits catch most of this. Keep anything that controls money or limits where users can't write to it, and make every query and mutation check whose data it touches. Then ask your agent pointed questions, not “is this secure?”. His examples: “[can users bypass their subscription status (opens in a new tab)](https://www.youtube.com/watch?v=tK4NQtzfZbM&t=314s)”, can they change their limits, can one user read another user's data?
>
> **Say this to your agent**
>
> ```
> Act like someone trying to abuse this app. Read every query, mutation and action in convex/ and answer:
> 1. Can a user make more AI calls than the limit?
> 2. Can a user change any value that controls their access or limits?
> 3. Can a user read or change someone else's data?
> For each yes, show me the function and how it could be abused. Don't fix anything yet.
> ```
>
> For PhotoCal v1 the risk is small, because there are no plans or credits. The one that matters is the AI: the cap on calls in Connecting the AI (see 04-connecting-the-ai.md) has to live in the kitchen, or it isn't a cap.

## When a deploy fails, let the agent read the logs

Deploys fail. Reading the error yourself is an hour you don't have; your agent can read the output and fix what it finds.

**Say this to your agent**

```
My deploy just failed. Read the output of npm run deploy, find the actual error, and fix it. When you're confident the fix works, deploy again and push.
```

Four failures come up again and again, each with its one-line request:

- **Push rejected**: “My push was rejected. Pull the latest and push my work.”
- **Missing env var**: “The deploy says an env var is missing. Tell me its name.” Then add it to Convex production yourself. The usual cause: you set the key for dev and not for prod.
- **Live site erroring**: “My live site is showing an error. Check the Convex production logs and fix whatever broke.”
- **Old version still showing**: “I deployed but the live site still shows the old version. Check the deploy finished, and deploy again if needed.”

**▸ Watch: My app got hacked — Chris Raroque, 0:48 to 12:30**

Chris Raroque. Play [0:48 to 12:30 (opens in a new tab)](https://www.youtube.com/watch?v=tK4NQtzfZbM&t=48s): the mistakes that cost real builders money, from keys in the browser to missing spending caps (skip 6:40 to 7:30, a sponsor).

**Watch for** around 11:27: environment variables are only safe on a backend.

> **[Advanced]**
>
> ### Advanced Going back, and reading the logs
>
> Two tools turn a bad evening into ten minutes.
>
> **Going back.** A deploy that fails leaves the last version up. A deploy that succeeds with a bug in it replaces the good version. Then the fastest fix is often not a fix at all: put the code back to the last commit that worked, deploy that, and find the bug calmly afterwards. This is what the Save step in Working with your agent (see 02-your-agent.md) is for: every commit is a version you can return to. One catch: if the newer version saved new kinds of data, Convex may refuse the old version's schema. Ask your agent to keep the database shape as it is and put back everything else.
>
> **Say this to your agent**
>
> ```
> The live site broke after the last deploy. Find the last commit where [the core flow] worked, tell me in plain words what changed since, then put that version back and deploy it. Keep the newer work on a separate branch; don't delete it.
> ```
>
> **Reading the logs.** Convex keeps [a live log of every function that runs (opens in a new tab)](https://docs.convex.dev/dashboard/deployments/logs): when it ran, whether it succeeded, how long it took, and any error. The Logs page in the dashboard shows it, and the command [`npx convex logs --prod` (opens in a new tab)](https://docs.convex.dev/cli/reference/logs) streams production's log into your terminal, which means your agent can read it too.
>
> When a call fails, the error in your browser's console (the developer view your agent can read) carries a request ID. Pasted into the log's search, it finds every line from that one request, so the agent can see exactly what happened instead of guessing.
>
> Logs are also how you know before your user does. For the first hour after you share the link, keep the log open and filtered to failures. Every red line is a person who just hit a wall.

- **Skills you already installed in Setup**: **`convex-dev-static-hosting`**Setting up hosting and deploying. Keeps your app on Convex, not another host. **`playwright`**Drives your live link in a real browser to prove a flow works, right after you deploy.

## Open your own link like a stranger

The moment you have a link, open it on your phone: logged out, on mobile data, the way a stranger will. Not on your laptop, not in the tab you've had open all week. Most first bugs show up in this one minute: text that spills off the screen, a button under the keyboard, a page that needs a refresh to work.

No matter what anyone does, code breaks. Your job: the user should not tell you, you should know it first, and then solve it as fast as possible. That doesn't mean you ship something random without knowing.

**▸ Where shipping usually goes wrong — Six near-misses**

- **Sending a localhost link**: Localhost means “this computer”. On a friend's phone it means their phone, where nothing is running. Send the .convex.site link.
- **Pushed, not deployed**: GitHub has the new version; guests still see the old one. Deploy.
- **A key set for dev only**: It works on your laptop and fails live with a missing variable. Add it to prod too.
- **My data is gone**: Your live link has its own database, and it starts empty. What you saved while testing on your laptop stays on your laptop's side.
- **A .env file committed**: Even if you delete it now, it's in the history. Treat the key as leaked: delete it and make a new one.
- **Testing on your own wifi, logged in**: Your laptop has every saved login and a fast connection. A stranger's phone has neither.

**▸ Building a phone app instead of a web page? — The Play Store, the short way**

Don't chase Play Store approval; it'll take you a week. Submit a bare-bones app with the five or six non-negotiables in their guidelines, like letting users delete their account. They will reject it, you fix what they tell you, and it gets approved in about ten days. After that, ship changes as over-the-air updates (changes that reach installed apps without a new store review).

For Build Sprint, circulate an APK (the install file for an Android app) instead: a landing page where your close circle can download and install it.

**AGENTS.md · 3. Shipping**

```
## 3. Shipping
Live link: [your .convex.site link]
Repo: [github.com/you/your-repo], public
Deploy: npm run deploy. A push never deploys by itself. After I say a milestone works: commit, push, then deploy.
Keys: [VARIABLE_NAME] lives in Convex environment variables, set for dev and for prod. Never in code, a VITE_ variable or a committed file. Never ask me to paste it into chat.
.gitignore covers .env.local.
Real people's data (chats, names, phone numbers) never goes in the repo, not even as a test file. Tests use made-up examples.
Every limit and every "is this allowed" check happens in a Convex function, never only on screen.
Before I share the link: I open it on my phone, logged out, on mobile data, and do the core flow once.
```

> **Doubts?**
>
> Ask [**Shaktimaan** (opens in a new tab)](https://growthx.club/community/shaktimaan) or post in [#build-sprint (opens in a new tab)](https://growthx.club/community/build-sprint). Ask before you lose the hour.
