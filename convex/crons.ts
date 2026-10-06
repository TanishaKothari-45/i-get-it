import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Nudges go out at each learner's chosen time in their own timezone; this checks every 15 minutes.
crons.interval("send due nudges", { minutes: 15 }, internal.pushSend.sendDue, {});
// The summaries public pages read (summaries.ts): the /stats numbers, and the first screen's ready topics in case
// the cache was changed by a hand-run script that doesn't rebuild it.
crons.interval("rebuild stats", { minutes: 15 }, internal.stats.rebuildStats, {});
crons.interval("rebuild landing", { minutes: 15 }, internal.landing.rebuildLanding, {});

export default crons;
