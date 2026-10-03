// Vision copy for the sprint's one topic (build your first AI agent, no code).
// Source: docs/pitch-and-scope.md, "The vision in the first 30 seconds". Hardcoded for
// milestone 2; swapped for a Claude call once the first task needs the key anyway.

export type Motivation = 'work' | 'own' | 'joy' | 'life'

export const motivations: { id: Motivation; label: string; hint: string }[] = [
  { id: 'work', label: 'Get ahead at work', hint: 'promotion, visibility, being the one who knows' },
  { id: 'own', label: 'Build something of my own', hint: "a side project, a product, money that isn't a salary" },
  { id: 'joy', label: 'For the joy of it', hint: 'curiosity, a hobby, impressing friends' },
  { id: 'life', label: 'Run my life better', hint: 'time, money, health, home, family' },
]

export const sprintTopic = 'Build your first AI agent, no code'
export const sprintTopicInline = 'build your first AI agent, no code'

export type Vision = { day: 7 | 14 | 28; text: string }[]

export const agentVision: Record<Motivation, Vision> = {
  work: [
    {
      day: 7,
      text: 'An agent reads your Gmail every morning and drafts replies to the three that matter, built in n8n with zero code. Most people in your office still think that needs an engineer.',
    },
    {
      day: 14,
      text: "Your Monday report pulls from Slack, Sheets and the CRM and writes itself before you log in. Your manager asks how. Your name comes up in a meeting you're not in.",
    },
    {
      day: 28,
      text: "You chain agents that research, write and check each other, with an approval step, and you can explain why that beats one big prompt. You're the person people message when they want something automated.",
    },
  ],
  own: [
    {
      day: 7,
      text: "A bot that watches five subreddits and messages you every post where someone's asking for the thing you want to sell. Running tonight, no code.",
    },
    {
      day: 14,
      text: 'Your landing page replies to every enquiry in your voice within a minute, books the call, and logs it. People think you have a team.',
    },
    {
      day: 28,
      text: "Your side project runs on three agents and takes you an hour a week. You've shipped something people pay for, and you did it between dinner and bed.",
    },
  ],
  joy: [
    {
      day: 7,
      text: "A bot that texts you one thing you'll love every morning: a concert on sale, a recipe from your saved reels, a book your friend just rated five stars. You built it. No code.",
    },
    {
      day: 14,
      text: 'Your friends ask you to make them one. You do it in ten minutes while they watch.',
    },
    {
      day: 28,
      text: "You've got a small fleet of agents that handle your hobbies, and you're the person at dinner explaining what an agent actually is, with examples you built.",
    },
  ],
  life: [
    {
      day: 7,
      text: 'An agent reads every school email and WhatsApp notice and puts the dates, fees and things to buy on the family calendar. You stop being the person who forgets.',
    },
    {
      day: 14,
      text: 'Your bills, renewals and subscriptions get checked weekly and you get one message: what’s due, what went up, what to cancel. Your partner notices.',
    },
    {
      day: 28,
      text: "Groceries, appointments, the car, the house: agents chase them and you approve. You've got evenings back, and it cost you 20 minutes a day for a month.",
    },
  ],
}

export function looksLikeAgents(topic: string): boolean {
  const t = topic.toLowerCase()
  return t.includes('agent') || t.includes('automation') || t.includes('n8n') || t.includes('bot')
}
