import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

// "Jump to next" (7 Oct, Prateek: further reading was too heavy). Topics a reader of this would want next, underlined
// and tappable: ready and shared handbooks first (they open instantly), then the plan's own suggestions (typed topics).
type Props = { topic: string; deviceToken: string; extra?: string[]; onReady: (t: string) => void; onShared: (id: Id<'library'>) => void; onTyped: (t: string) => void }

export default function NextTopics({ topic, deviceToken, extra = [], onReady, onShared, onTyped }: Props) {
  const related = useQuery(api.library.related, { topic, deviceToken }) ?? []
  const seen = new Set(related.map((r) => r.topic.toLowerCase()))
  const typed = extra.filter((t) => t && !seen.has(t.toLowerCase())).slice(0, Math.max(0, 4 - related.length))
  if (!related.length && !typed.length) return null
  const links = [
    ...related.map((r) => ({ key: r.topic, label: r.topic, go: () => (r.kind === 'shared' && r.id ? onShared(r.id) : onReady(r.topic)) })),
    // A typed suggestion writes a new handbook and uses the reader's typed allowance, so it says so (review #40, 8 Oct).
    ...typed.map((t) => ({ key: t, label: `${t} (writes a new one)`, go: () => onTyped(t) })),
  ]
  return (
    <p className="sources next-topics"><span className="label">Jump to next</span>{' '}
      {links.map((l, i) => <span key={l.key}>{i > 0 && ' · '}<button type="button" className="topic-link" onClick={l.go}>{l.label}</button></span>)}
    </p>
  )
}
