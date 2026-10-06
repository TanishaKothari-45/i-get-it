import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

// Explore (6 Oct): ready topics and the ones other readers started, shared without names. Badges are real:
// 🔥 most started this week (2 or more), ✨ most finished (3+ starts, half or more passed chapter 1), Pick = the owner's.
type Item = { kind: 'ready' | 'shared'; id?: Id<'library'>; key: string; topic: string; goal?: string | null; outcome: string; mode: string | null; cover: string | null; hot: boolean; loved: boolean; pick?: boolean; week: number }
type Props = { onReady: (topic: string) => Promise<void>; onShared: (id: Id<'library'>) => Promise<void>; onBack: () => void }

const MODE: Record<string, string> = { skill: 'Do it', story: 'Story', subject: 'Understand it', decision: 'Money, health, legal' }

export default function Explore({ onReady, onShared, onBack }: Props) {
  const items = useQuery(api.library.explore, {}) as Item[] | undefined
  return (
    <div className="explore">
      <button type="button" className="quiet" onClick={onBack}>← Back</button>
      <h1>What others are learning</h1>
      <p className="lede">Every handbook here opens instantly. Shared without names.</p>
      {!items ? <p className="note">Loading…</p> : (
        <ul className="explore-grid">
          {items.map((it) => (
            <li key={it.key}>
              <button type="button" className="explore-card" onClick={() => (it.kind === 'shared' && it.id ? onShared(it.id) : onReady(it.topic)).catch(() => {})}>
                <span className="explore-cover">{it.cover ? <img src={it.cover} alt="" loading="lazy" /> : <span className="explore-cover-blank">{it.topic.slice(0, 1)}</span>}
                  <span className="explore-badges">
                    {it.hot && <span className="explore-badge hot">🔥 Most started this week</span>}
                    {it.loved && <span className="explore-badge loved">✨ Most finished</span>}
                    {it.pick && <span className="explore-badge">Pick</span>}
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
