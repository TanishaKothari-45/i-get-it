import { useEffect, useMemo, useState } from 'react'
import { limitMessage } from '../lib/limits'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

// The Shelf (8 Oct, Prateek: "a section called The Shelf, always accessible, neatly organised visually as handbooks"):
// every ready and shared handbook as a cloth-bound book standing on a shelf, one shelf per kind. Each book appears
// once, on the first shelf it belongs to. Replaces the Explore list; same data (library.explore). Copy (agent).
type Item = { kind: 'ready' | 'shared'; id?: Id<'library'>; key: string; topic: string; goal?: string | null; outcome: string; mode: string | null; cover: string | null; hot: boolean; loved: boolean; pick?: boolean; week: number; finishedWeek?: number; trending?: boolean; addedAt?: number; starts?: number | null; passes?: number | null }
type Props = { onReady: (topic: string) => Promise<void>; onShared: (id: Id<'library'>) => Promise<void>; onBack: () => void }

const WEEK = 7 * 24 * 60 * 60 * 1000
const SHELVES: { key: string; label: string; note: string; pick: (i: Item) => boolean }[] = [
  { key: 'trending', label: 'Trending this week', note: 'What people are starting right now.', pick: (i) => !!(i.trending || i.hot) },
  { key: 'finished', label: 'Most finished', note: 'Readers who started these kept going.', pick: (i) => !!i.loved || (i.passes ?? 0) >= 3 },
  { key: 'skill', label: 'Things to do', note: 'Skills: you practise, you log it.', pick: (i) => i.mode === 'skill' },
  { key: 'story', label: 'Stories', note: 'Films, books, history: catch up in order.', pick: (i) => i.mode === 'story' },
  { key: 'subject', label: 'How things work', note: 'Ideas you can explain to a friend by day 7.', pick: (i) => i.mode === 'subject' },
  { key: 'decision', label: 'Money, health, legal', note: 'The rule, the trap, the checklist. Study aid, not advice.', pick: (i) => i.mode === 'decision' },
  { key: 'shared', label: 'Shared by readers', note: 'Typed by someone, kept for everyone, without names.', pick: (i) => i.kind === 'shared' },
  { key: 'new', label: 'New on the shelf', note: 'Added this week.', pick: (i) => (i.addedAt ?? 0) > Date.now() - WEEK },
  { key: 'rest', label: 'The rest of the shelf', note: '', pick: () => true },
]
// A deterministic lean per book, so the shelf looks lived-in but never moves.
const lean = (k: string) => { let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0; return ((h % 7) - 3) * 0.6 }
const CLOTH = ['indigo', 'green', 'marigold', 'coral', 'ink']
const cloth = (k: string) => { let h = 0; for (const c of k) h = (h * 17 + c.charCodeAt(0)) >>> 0; return CLOTH[h % CLOTH.length] }

export default function Shelf({ onReady, onShared, onBack }: Props) {
  const items = useQuery(api.library.explore, {}) as Item[] | undefined
  // On a phone each shelf is one row that scrolls sideways; on a wide screen a shelf holds 4 books, and a long shelf
  // becomes several shelves, each with its own plank.
  const [perRow, setPerRow] = useState(() => (typeof window !== 'undefined' && window.innerWidth >= 640 ? 4 : 0))
  useEffect(() => { const f = () => setPerRow(window.innerWidth >= 640 ? 4 : 0); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [])
  const rowsOf = (books: Item[]) => (perRow ? Array.from({ length: Math.ceil(books.length / perRow) }, (_, r) => books.slice(r * perRow, (r + 1) * perRow)) : [books])
  const shelves = useMemo(() => {
    if (!items) return []
    const left = new Set(items.map((i) => i.key))
    return SHELVES.map((s) => {
      const books = items.filter((i) => left.has(i.key) && s.pick(i))
      for (const b of books) left.delete(b.key)
      return { ...s, books }
    }).filter((s) => s.books.length > 0)
  }, [items])
  const [note, setNote] = useState<string | null>(null)
  // The tapped book lifts off the shelf and turns to face the reader while its handbook opens (8 Oct night, Prateek):
  // a CSS transform only, so it costs nothing on a slow connection; it holds "lifted" until the chapter arrives, and
  // settles back if the open fails.
  const [lifting, setLifting] = useState<string | null>(null)
  const open = (it: Item) => {
    setNote(null); setLifting(it.key)
    return (it.kind === 'shared' && it.id ? onShared(it.id) : onReady(it.topic)).catch((e) => { setLifting(null); setNote(limitMessage(e) ?? "Couldn't open that one. Check your connection and tap again.") })
  }
  const surprise = () => { const pool = items ?? []; if (pool.length) open(pool[Math.floor(Math.random() * pool.length)]) }

  return (
    <div className={`shelf-page${lifting ? ' lifting' : ''}`}>
      <button type="button" className="quiet" onClick={onBack}>← Back</button>
      <h1>The Shelf.</h1>
      <p className="lede">Every handbook here opens at once, no sign-in. Pick one up.</p>
      {note && <p className="error" role="alert">{note}</p>}
      <div className="shelf-tools">
        <button type="button" className="chip" onClick={surprise}>Surprise me</button>
        {shelves.map((s) => <a key={s.key} className="chip" href={`#shelf-${s.key}`}>{s.label}</a>)}
      </div>
      {!items ? <p className="note">Dusting the shelves…</p> : shelves.map((s) => (
        <section key={s.key} id={`shelf-${s.key}`} className="shelf-sec" aria-label={s.label}>
          <div className="shelf-head"><h2>{s.label}</h2>{s.note && <p className="note">{s.note}</p>}</div>
          {rowsOf(s.books).map((row, r) => (
            <div key={r} className="shelf-row">
              <ul className="shelf-books">
                {row.map((it) => (
                  <li key={it.key} className={lifting === it.key ? 'lifting' : lifting ? 'resting' : undefined} style={{ ['--lean' as any]: `${lean(it.key)}deg` }}>
                    <button type="button" className={`book cloth-${cloth(it.key)}`} onClick={() => { if (!lifting) open(it) }} aria-label={`${it.topic}. ${it.outcome}`} aria-busy={lifting === it.key || undefined}>
                      <span className="book-spine" aria-hidden="true" />
                      <span className="book-cover">
                        {it.cover ? <img src={it.cover} alt="" loading="lazy" /> : <span className="book-cover-blank">{it.topic.slice(0, 1)}</span>}
                      </span>
                      <span className="book-plate"><span className="book-title">{it.topic}</span>{it.goal && <span className="book-goal">for: {it.goal}</span>}</span>
                      {(it.hot || it.loved || it.pick) && <span className="book-ribbon">{it.hot ? 'Hot' : it.loved ? 'Finished' : 'Our pick'}</span>}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="shelf-plank" aria-hidden="true" />
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
