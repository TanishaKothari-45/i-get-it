import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
// Reminders: whoever's chosen time fell in the last 10 minutes gets "your next chapter is ready" (convex/push.ts).
crons.interval("send due reminders", { minutes: 10 }, internal.pushSend.sendDue, {});
export default crons;
