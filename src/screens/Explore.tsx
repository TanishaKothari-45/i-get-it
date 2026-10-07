import { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

// Explore (6 Oct): ready topics and the ones other readers started, shared without names. Badges are real:
// 🔥 most started this week (2 or more), ✨ most finished (3+ starts, half or more passed chapter 1), Pick = the owner's.
type Item = { kind: 'ready' | 'shared'; id?: Id<'library'>; key: string; topic: string; goal?: string | null; outcome: string; mode: string | null; cover: string | null; hot: boolean; loved: boolean; pick?: boolean; week: number; finishedWeek?: number; trending?: boolean; addedAt?: number; starts?: number | null; passes?: number | null }
type Props = { onReady: (topic: string) => Promise<void>; onShared: (id: Id<'library'>) => Promise<void>; onBack: () => void }

const MODE: Record<string, string> = { skill: 'Do it', story: 'Story', subject: 'Understand it', decision: 'Money, health, legal' }

// Chips to browse by (7 Oct, Prateek): what's trending, what people start and finish, what's new, and by kind.
type Pill = 'all' | 'trending' | 'started' | 'finished' | 'new' | 'story' | 'skill' | 'subject'
const PILLS: [Pill, string][] = [['all', 'All'], ['trending', '🔥 Trending this week'], ['started', 'Most started'], ['finished', 'Most finished'], ['new', 'New'], ['story', 'Stories'], ['skill', 'Skills'], ['subject', 'How things work']]
function pickOut(items: Item[], pill: Pill): Item[] {
  const by = (f: (i: Item) => number) => [...items].sort((a, b) => f(b) - f(a))
  switch (pill) {
    case 'trending': return by((i) => i.week).filter((i) => i.trending || i.hot)
    case 'started': return by((i) => i.week).filter((i) => i.week > 0)
    case 'finished': return by((i) => (i.finishedWeek ?? 0) * 100 + (i.passes ?? 0)).filter((i) => (i.finishedWeek ?? 0) > 0 || (i.passes ?? 0) > 0)
    case 'new': return by((i) => i.addedAt ?? 0).slice(0, 12)
    case 'story': case 'skill': case 'subject': return items.filter((i) => i.mode === pill)
    default: return items
  }
}

export default function Explore({ onReady, onShared, onBack }: Props) {
  const items = useQuery(api.library.explore, {}) as Item[] | undefined
  const [pill, setPill] = useState<Pill>('all')
  const shown = useMemo(() => (items ? pickOut(items, pill) : []), [items, pill])
  const open = (it: Item) => (it.kind === 'shared' && it.id ? onShared(it.id) : onReady(it.topic)).catch(() => {})
  const surprise = () => { const pool = shown.length ? shown : items ?? []; if (pool.length) open(pool[Math.floor(Math.random() * pool.length)]) }
  return (
    <div className="explore">
      <button type="button" className="quiet" onClick={onBack}>← Back</button>
      <h1>What others are learning.</h1>
      <p className="lede">Every handbook here opens instantly. Shared without names.</p>
      <div className="explore-pills" role="group" aria-label="Browse by">
        {PILLS.map(([k, label]) => <button key={k} type="button" className="chip" aria-pressed={pill === k} onClick={() => setPill(k)}>{label}</button>)}
        <button type="button" className="chip" onClick={surprise}>🎲 Surprise me</button>
      </div>
      {!items ? <p className="note">Loading…</p> : !shown.length ? <p className="note">Nothing here yet this week. <button type="button" className="quiet" style={{ padding: 0 }} onClick={() => setPill('all')}>See them all</button></p> : (
        <ul className="explore-grid">
          {shown.map((it) => (
            <li key={it.key}>
              <button type="button" className="explore-card" onClick={() => open(it)}>
                <span className="explore-cover">{it.cover ? <img src={it.cover} alt="" loading="lazy" /> : <span className="explore-cover-blank">{it.topic.slice(0, 1)}</span>}
                  <span className="explore-badges">
                    {it.hot && <span className="explore-badge hot">🔥 Most started this week</span>}
                    {it.loved && <span className="explore-badge loved">✨ Most finished</span>}
                    {it.pick && <span className="explore-badge">Our pick</span>}
                  </span>
                </span>
                <strong>{it.topic}</strong>
                {it.goal && <span className="explore-goal">For: {it.goal}</span>}
                <span className="explore-outcome">{it.outcome}</span>
                {it.mode && <span className="explore-mode">{MODE[it.mode] ?? it.mode}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
