import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Nudges go out at each learner's chosen time in their own timezone; this checks every 15 minutes.
crons.interval("send due nudges", { minutes: 15 }, internal.pushSend.sendDue, {});

export default crons;
