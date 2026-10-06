import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

// "What's next" (6 Oct): three topics to try after this one. One tap starts them; they open instantly.
type Item = { kind: 'ready' | 'shared'; id?: Id<'library'>; topic: string; outcome: string; cover: string | null }
export default function WhatsNext({ topic, deviceToken, onReady, onShared }: { topic: string; deviceToken: string; onReady: (t: string) => void; onShared: (id: Id<'library'>) => void }) {
  const items = useQuery(api.library.related, { topic, deviceToken }) as Item[] | undefined
  if (!items?.length) return null
  return (
    <section className="whatsnext">
      <h2>What's next</h2>
      <p className="note">Opens instantly. Same twenty minutes a night.</p>
      <ul>
        {items.map((it) => (
          <li key={it.topic}>
            <button type="button" onClick={() => (it.kind === 'shared' && it.id ? onShared(it.id) : onReady(it.topic))}>
              <span className="whatsnext-pic">{it.cover && <img src={it.cover} alt="" loading="lazy" />}</span>
              <span><strong>{it.topic}</strong><span className="whatsnext-out">{it.outcome}</span></span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
