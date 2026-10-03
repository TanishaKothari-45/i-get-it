<!-- Source: https://growthx.club/learn/build-sprint#/product-switch · captured 2026-10-04 from the GrowthX Build Sprint handbook (login-gated). Verbatim text, converted to markdown. Advanced-level blocks included. -->

# Why people switch, and why they don't

A better product doesn't win on its own. This chapter shows you the four forces that decide whether someone switches to you, and gets you the one or two that matter for your product.

> **By the end of this chapter you'll have**
>
> **The forces that matter.** The forces that decide whether your user switches (only the ones that matter, often one or two), what your product does about each, and the one worry your onboarding must remove.
>
> Example **Anxiety:** it won't know Indian food, and he'll quit this one too. **Habit:** eyeballing is free and instant. **So PhotoCal** reads his own lunch first, fixes a wrong guess in one tap, and takes seconds. **The worry to remove first:** it won't know Indian food.

## Better is not enough

Rohan already has a calorie app on his phone. It knows thousands of dishes, and it works. He has quit it twice.

Today, when lunch arrives, he eyeballs it. Eyeballing is wrong most of the time, and he knows it. It still wins, every day.

People don't switch to the better product. Someone already has the job (eyeballing, a spreadsheet, a WhatsApp group), and people are slow to fire anyone, even someone doing it badly.

## Four forces decide every switch

Picture a tug of war. Two forces pull the person towards something new. Two hold them where they are.

- **Push**: Something in their life going wrong right now. It comes from outside them: time wasted and frustration, a life stage, what everyone is talking about (right now, AI), an aspiration or a loss.
- **Pull**: What they have always wanted, and what life looks like once they have it. Push is outside them; pull is inside them.
- **Anxiety**: The risk of giving you a chance. It comes from what they tried before, or from a decision that's hard to undo, like an MBA, a car or a marriage. It's why insurance sells so well alongside decisions like these.
- **Habit**: The way they already do it. When that's the norm, you're fighting uphill: better to fit in first and move them slowly.

**Towards the switch**
- **Push**: The scale isn't moving · He has guessed his lunch for months, and the number won't come down.
- **Pull**: Lose weight, keep his food · He never wanted to give up rajma chawal.

**Against it**
- **Anxiety**: It won't know Indian food · And he has quit one of these twice already. This could be the third time.
- **Habit**: Eyeballing is free and instant · No app to open, nothing to remember.

*Figure: Rohan moves only when push and pull together beat anxiety and habit. More features add nothing to the side that holds him back.*

Most builders only work on pull: what life looks like once people use you. It's the easy part to pitch. But people usually switch because of the other three: what's happening in their life, what makes them anxious, and what about their habit irritates them.

## Write only the forces that matter

All four need not be there on your page. Sometimes it's one, sometimes two or three. It depends on your product and your market.

Pick the ones that matter and build only for those. Write all four by default and you'll build features for forces nobody feels.

For Rohan, anxiety matters a lot, because he has already quit a calorie app twice. For a user who has never tried an app for their problem, that worry may not exist, and you'd leave it out. Habit matters too: eyeballing costs him nothing.

## The push is deeper than the complaint

“The scale isn't moving” is the surface. People first try to fix things themselves. They look for help when they realise they're part of the problem.

Rohan has tried: eyeballing, a calorie app (twice), asking ChatGPT. His push isn't “I want to lose weight”. It's still something going wrong in his life, but now he sees the cause: “my own guessing is why the scale isn't moving”. Don't assume the push. Find it in the last time it happened, with chapter 1's questions.

## The forces go into the flow

The forces aren't a pitch. They decide how each feature behaves. If anxiety matters, a step in the flow answers it. If a push matters, say so when you deal with it: an Airbnb host worried about bad reviews hears “we caught this before it became a bad review”.

For PhotoCal: he photographs his own lunch first, not a sample (anxiety). A wrong dish takes one tap to fix (anxiety). The whole thing takes seconds from his home screen, close to eyeballing (habit).

Then pick the one worry that would stop him before he sees any value. For Rohan it's “it won't know Indian food”. Chapter 4 builds the first minute around it.

> **Remember this**
>
> You can win a switch without a new feature: make the worry smaller and the old way easier to leave.

**▸ Common mistakes — Four ways the switch goes wrong**

- **All pitch**: “Fast, accurate, beautiful, AI-powered” describes your product, not what they have always wanted. If your anxiety line praises your product, it isn't an anxiety line.
- **Your worry, not theirs**: “The model might be slow” is your worry. Theirs is “it will get my lunch wrong and I'll eat more than I think”.
- **A complaint as a push**: “Everyone hates logging” isn't a push until someone did something about it.
- **All four, by default**: Four lines because the template has four. Keep only the ones that matter.

**▸ Watch: The four forces, drawn live — Bob Moesta on Lenny's Podcast, 10:39 to 14:00**

Bob Moesta on Lenny's Podcast. Play [10:39 to 14:00 (opens in a new tab)](https://www.youtube.com/watch?v=xQV7HVyAJjc&t=639s): the four forces and why a better product alone doesn't move anyone.

**Watch for** around 13:48, the condo he made easier to buy by raising the price and including the move: an anxiety removed, not a feature added.

> **[Advanced]**
>
> ### Advanced Make the worry smaller instead of adding pull
>
> For a first product, these moves usually shrink anxiety and habit. Each has a price.
>
> - **Show it working on their own case**: Rohan's plate, not a demo plate. Price: the first minute has to work for real, so the AI call matters more than a pretty landing page.
> - **Let them undo**: Fixing a wrong dish in one tap turns “what if it's wrong?” into “then I fix it”. Price: one more thing to build, and it's a must-have.
> - **Say what happens to their data**: One plain line where they hand something over. Price: you decide it first, then keep the promise.
> - **Live where they already are**: WhatsApp, the phone camera, the inbox they already open. Price: that platform's limits become yours.
> - **Let the old way run alongside**: They don't have to stop eyeballing to try you. Price: you win only on the days they choose you.
>
> A quick check: count how many of your must-haves are pull, and how many shrink anxiety or habit. If every one is pull, you're building for someone who has already decided to switch, and that person is rare.

> **[Advanced]**
>
> ### Advanced The story of the last switch
>
> To find the forces for real, talk to two people who recently tried a new way to do your job: started a diet, downloaded a calorie app, asked ChatGPT about their lunch. Whether it stuck doesn't matter.
>
> Walk them through it in order, one or two questions each:
>
> - **First thought**: When did you first think, I need to do something about this? What had just happened?
> - **Looking**: What did you try, and what did you rule out?
> - **Deciding**: What made that day the day? What almost stopped you?
> - **Using it**: What happened the first time? Do you still use it? What would make you stop?
>
> Go past the first answer. “A friend recommended it” is the story. Keep asking and the push comes out: a wedding in March, a doctor's number, a photo they didn't like. Twenty minutes each is enough to rewrite your forces.
>
> From next week, do the same with people who stop using you. “I forgot” is habit. “It got my dosa wrong twice” is anxiety, proven right. “I stopped caring about the diet” is the push going away, and no feature fixes that.

## Write your switch

Start from your job sentence and the last time it happened. Write the forces in your user's words, keep only the ones that matter, then say what your product does about each. Write them for the person you chose in chapter 1.

**PRODUCT.md · 2. The switch**

```
## 2. The switch
What they'd fire: [what they use or do today, including nothing]

The forces that matter (keep one to four, delete the rest):
Push, outside them (what's going wrong in their life right now): [ ]
Pull, inside them (what they've always wanted): [ ]
Anxiety (the risk of trying you: what they tried before, or a decision that's hard to undo): [ ]
Habit (the way they already do it): [ ]

What the product does about each: [force] -> [what it does] (you place these in your flow and onboarding next)
The one worry onboarding must remove: [one line, in their words]
```

> **Doubts?**
>
> Ask [**Shaktimaan** (opens in a new tab)](https://growthx.club/community/shaktimaan) or post in [#build-sprint (opens in a new tab)](https://growthx.club/community/build-sprint). Ask before you lose the hour.
