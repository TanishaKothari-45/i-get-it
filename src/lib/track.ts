import type { ConvexReactClient } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { deviceToken } from './device'

// Fire-and-forget page events for the owner-only /admin funnel. `once` keys stop repeats within a page load.
let client: ConvexReactClient | null = null
const sent = new Set<string>()
export function initTrack(c: ConvexReactClient) { client = c }
export function track(name: string, props?: Record<string, string | number>, once?: string) {
  if (!client) return
  if (once) { if (sent.has(once)) return; sent.add(once) }
  client.mutation(api.events.track, { visitor: deviceToken(), name, props }).catch(() => {})
}
