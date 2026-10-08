---
date: 2026-10-08
type: roadmap
tags: [igetit, ux, roadmap]
ai-first: true
---

# UX roadmap (8 Oct night, Prateek: "let's revisit the UX, but a roadmap first")

## For future agent
This is the order of UX work after the print-language pass. Read it before any UX critique or fix; each step names its output and its measure. Update the step status lines when a step is done; never reorder past Prateek without asking.

The path that matters: a stranger taps a GrowthX or Instagram link on their phone, reads chapter 1, meets the sign-up wall. Everything below serves that path first. The look (the print language, DESIGN.md) is done; this is about where people hesitate and stop.

Inputs: the 8 Oct UX review (51 findings, 29 fixed, claude.ai/artifact/FR3LKucXJKzX7mUKA8rnVM), /stats and /admin journeys (66 visitors, 30 started, 8 finished chapter 1, 0 signed up as of tonight), Jayanth's DM, the five-second test from 6 Oct.

Constraints: the landing page cut and button labels are parked until Sunday 12 Oct (decisions.md D14). The wall after chapter 1 is session 55's. Nothing new in the lesson kit.

## Step 1. Critique the path (tonight, read-only)
Status: DONE 8 Oct 23:20. 26/40. docs/ux-critique-2026-10-08.md.
impeccable critique on four screens in order: landing (as a link arrival), chapter 1 frames, Done with the wall, sign-in. One ranked list: what makes a stranger stop, with a severity and the evidence. Output: docs/ux-critique-2026-10-08.md. No code.

## Step 2. Fix the stops that don't touch the landing's structure (tonight)
Status: DONE 9 Oct 00:30 for the critique's P0s and P1s (Done order and wall card, sign-in anchor, picture prefetch, contrast, tap targets, reduced motion). Plus the book animation (D17) and the holds that remove the splash.
From the critique's P0s and P1s: inside chapters, Done, sign-in, Your handbooks. Each fix checked at 390 px on dev, then on the live site. Decision point for Prateek: anything that changes copy he wrote, or the wall's logic.

## Step 3. Prove the path (tonight or tomorrow morning)
Status: DONE 8 Oct 22:45. scripts/prove-path.mjs, two scenarios, run after every deploy (no Playwright install; headless Chrome).
playwright: one saved test that opens the live link as a fresh phone, taps a ready topic, reads chapter 1 to the end, reaches Done and sees the wall. Run after every deploy. A second test for the Instagram deep link (?t=...&ch=...).

## Step 4. Onboard (Thursday)
impeccable onboard on whatever step 1 ranks worst: the first 60 seconds. Empty states, the writing wait for a typed topic, what a returning reader sees. Measured by chapter 1 finishes per visitor on /stats.

## Step 5. Words (Thursday, after step 4)
impeccable clarify on the labels and errors readers actually hit, then copywriting on the landing only if step 1 says the words are the stop. Landing copy changes wait for Prateek's rewrite (DESIGN.md: copy is (agent) until he rewrites it).

## Step 6. Harden (Friday)
impeccable harden: slow network, a failed chapter, a long topic, coming back after a week, a phone with reduced motion. Each with its message written in DESIGN.md before the fix.

## Sunday 12 Oct
The landing cut (review #1, #2), button labels (#39), the landing's ink button vs the marigold ones inside, the 🔥 chips. One session, with the step 3 test as the safety net.

## What we measure
chapter 1 finishes per visitor (8 of 66 tonight), sign-ups per Done screen (0 so far), and the Done rating (too easy / just right / lost me). Each step says which of these it expects to move.
