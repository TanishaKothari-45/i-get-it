import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
// Reminders: whoever's chosen time fell in the last 10 minutes gets "your next chapter is ready" (convex/push.ts).
crons.interval("send due reminders", { minutes: 10 }, internal.pushSend.sendDue, {});
// Monday 6:30am IST: this week's trending handbooks (convex/trending.ts).
crons.weekly("trending handbooks", { dayOfWeek: "monday", hourUTC: 1, minuteUTC: 0 }, internal.trending.refresh, {});
export default crons;
