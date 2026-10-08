// What to tell a reader when a free or member limit stops them (membership.ts). The server sends a short code
// (ConvexError data); everything a person reads lives here. Copy is (agent) until Prateek rewrites it.
export function limitCode(e: any): string | null {
  return typeof e?.data === 'string' ? e.data : null
}
export const isMemberLimit = (e: any) => ['free-used', 'member-month', 'member-active', 'paused-today'].includes(limitCode(e) ?? '')

export function limitMessage(e: any): string | null {
  switch (limitCode(e)) {
    case 'free-used': return "Your free handbook is the one you've already started. Members keep 3 of their own on the go. Every ready and shared handbook is open to you, free."
    case 'member-month': return "That's 6 new topics this month. Ready and shared handbooks are still open, and a new topic frees up as your oldest one turns a month old."
    case 'member-active': return "You have 3 handbooks of your own on the go. Finish one and you can start the next; ready and shared handbooks are open any time."
    case 'daily-free': return "That's 3 new chapters today. More open tomorrow; members read up to 7 a day."
    case 'signup-more': return "Chapters 1 and 2 are free for everyone. The rest opens with a free account: every chapter of this handbook, and of every ready one. One email with a code, no card, no spam."
    case 'daily-member': return "That's 7 new chapters today, well over two hours. The next one opens tomorrow."
    case 'paused-today': return "New typed handbooks are paused for free readers until tomorrow, India time: today's budget is spent. Every ready and shared handbook is still open, and members aren't paused."
    case 'busy': return 'Busy right now. Try again in a few minutes.'
    default: return null
  }
}
