import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
// Reminders: whoever's chosen time fell in the last 10 minutes gets "your next chapter is ready" (convex/push.ts).
crons.interval("send due reminders", { minutes: 10 }, internal.pushSend.sendDue, {});
// Monday 6:30am IST: this week's trending handbooks (convex/trending.ts).
crons.weekly("trending handbooks", { dayOfWeek: "monday", hourUTC: 1, minuteUTC: 0 }, internal.trending.refresh, {});
// Daily at 4am IST: decide finished A/B tests, then diagnose up to 2 ready topics that are losing readers (convex/doctor.ts).
crons.daily("handbook doctor", { hourUTC: 22, minuteUTC: 30 }, internal.doctor.scan, {});
// Every 2 minutes: new AI calls go to Langfuse as traces, one per handbook (convex/langfuse.ts). Does nothing
// without the Langfuse keys, so a deployment without them is unaffected.
crons.interval("export to Langfuse", { minutes: 2 }, internal.langfuse.exportNew, {});
export default crons;
