import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

// "Jump to next" (7 Oct, Prateek: further reading was too heavy). Topics a reader of this would want next, underlined
// and tappable: ready and shared handbooks first (they open instantly), then the plan's own suggestions (typed topics).
type Props = { topic: string; deviceToken: string; extra?: string[]; onReady: (t: string) => void; onShared: (id: Id<'library'>) => void; onTyped: (t: string) => void }

export default function NextTopics({ topic, deviceToken, extra = [], onReady, onShared, onTyped }: Props) {
  const related = useQuery(api.library.related, { topic, deviceToken }) ?? []
  const seen = new Set(related.map((r) => r.topic.toLowerCase()))
  // 9 Oct (returning-reader review): a typed suggestion looked like navigation but wrote a new handbook and spent the
  // reader's one free typed topic; only ready and shared handbooks are listed here now. Typed ideas stay on the Done screen.
  void extra; void onTyped; void seen
  if (!related.length) return null
  const links = related.map((r) => ({ key: r.topic, label: r.topic, go: () => (r.kind === 'shared' && r.id ? onShared(r.id) : onReady(r.topic)) }))
  return (
    <p className="sources next-topics"><span className="label">Other handbooks you might like</span>{' '}
      {links.map((l, i) => <span key={l.key}>{i > 0 && ' · '}<button type="button" className="topic-link" onClick={l.go}>{l.label}</button></span>)}
    </p>
  )
}
