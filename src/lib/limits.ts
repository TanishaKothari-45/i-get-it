// What to tell a reader when a free or member limit stops them (membership.ts). The server sends a short code
// (ConvexError data); everything a person reads lives here. Copy is (agent) until Prateek rewrites it.
export function limitCode(e: any): string | null {
  return typeof e?.data === 'string' ? e.data : null
}
export const isMemberLimit = (e: any) => ['free-used', 'member-month', 'member-active'].includes(limitCode(e) ?? '')

export function limitMessage(e: any): string | null {
  switch (limitCode(e)) {
    case 'free-used': return "Your free handbook is the one you've already started. Members start up to 6 new topics a month. Ready and shared handbooks are still open to you, a chapter a day from each."
    case 'member-month': return "That's 6 new topics this month. Ready and shared handbooks are still open, and a new topic frees up as your oldest one turns a month old."
    case 'member-active': return "You have 3 handbooks of your own on the go. Finish one and you can start the next; ready and shared handbooks are open any time."
    case 'daily-free': return "That's today's new chapter of this one. It opens tomorrow; members read up to 7 new chapters a day."
    case 'daily-free-ready': return "You've opened chapters from 3 ready handbooks today. More open tomorrow; members read ready handbooks without limit."
    case 'daily-member': return "That's 7 new chapters today, well over two hours. The next one opens tomorrow."
    case 'simpler-free': return "That's 10 simpler rewrites today. Members get as many as they like."
    case 'busy': return 'Busy right now. Try again in a few minutes.'
    default: return null
  }
}
