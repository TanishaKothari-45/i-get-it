import type { ConvexReactClient } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { deviceToken } from './device'

// Fire-and-forget page events for the owner-only /admin funnel. `once` keys stop repeats within a page load.
let client: ConvexReactClient | null = null
const sent = new Set<string>()
export function initTrack(c: ConvexReactClient) { client = c }
// Phone, tablet or desktop, from the screen and the browser (6 Oct: per-person journeys on /admin).
export function deviceKind(): string {
  const w = window.innerWidth, touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  if (/Mobi|Android|iPhone/i.test(navigator.userAgent) || w < 700) return 'mobile'
  if (touch && w < 1100) return 'tablet'
  return 'desktop'
}

// One event per page load, then a heartbeat every 30 s while the tab is in view (time spent), at most 60 of them.
export function startSession(path: string) {
  track('open', { device: deviceKind(), w: window.innerWidth, path: path.slice(0, 40) }, 'open')
  let beats = 0
  const t = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return
    if (++beats > 60) { window.clearInterval(t); return }
    track('beat')
  }, 30000)
}

export function track(name: string, props?: Record<string, string | number>, once?: string) {
  if (!client) return
  if (once) { if (sent.has(once)) return; sent.add(once) }
  client.mutation(api.events.track, { visitor: deviceToken(), name, props }).catch(() => {})
}
