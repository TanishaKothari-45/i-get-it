import ActionBar from '../components/ActionBar'
import SignupNudge from '../components/SignupNudge'

type Row = { total?: number; _id: string; topic: string; status: string; passed: number; current: number; card?: number; started?: boolean; lastAt: number; outcome: string | null }
type Props = { rows: Row[]; signedIn: boolean; activeId?: string; onOpen: (id: string) => void; onNew: () => void; onSignIn: () => void; onPlans: () => void; onExplore: () => void }

function ago(t: number) {
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 60) return m <= 1 ? 'just now' : `${m} min ago`
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24); return d === 1 ? 'yesterday' : `${d} days ago`
}

// Every handbook in one place. Each keeps its own place; starting a new one never resets another.
export default function Library({ rows, signedIn, activeId, onOpen, onNew, onSignIn, onPlans, onExplore }: Props) {
  // Newest first, and the one to continue is the one opened last (8 Oct night: a returning reader's one job is to carry
  // on; the main button says so, by name and chapter, instead of "The Shelf").
  const sorted = [...rows].sort((a, b) => Number(!!b.started) - Number(!!a.started) || b.lastAt - a.lastAt)
  const latest = sorted.find((r) => r.started && r.status === 'ready' && r.passed < (r.total ?? 7)) ?? sorted.find((r) => r.status === 'ready') ?? sorted[0]
  const where = (r: Row) => r.status !== 'ready' ? 'Being written…' : r.passed >= (r.total ?? 7) ? `All ${r.total ?? 7} chapters done` : (r.card ?? 0) > 0 ? `Chapter ${r.current}, card ${(r.card ?? 0) + 1}: pick up here` : r.started ? `Next: chapter ${r.current}` : 'Not opened yet'
  return (
    <>
      <h1>Your handbooks.</h1>
      <p className="lede">Each one remembers exactly where you stopped.</p>
      <ul className="shelf">
        {sorted.map((r) => (
          <li key={r._id}>
            {/* A book on its side (8 Oct, print shop): cloth spine, paper label, printed rungs. The open one is pressed. */}
            <button type="button" className={`shelf-card${r._id === activeId ? ' active' : ''}`} onClick={() => onOpen(r._id)}>
              <span className="shelf-spine" aria-hidden="true" />
              <span className="shelf-body">
                <span className="shelf-top"><span className="shelf-topic">{r.topic}</span><span className="shelf-when">{ago(r.lastAt)}</span></span>
                <span className="shelf-bar" aria-label={`${r.passed} of ${r.total ?? 7} chapters done`}>{Array.from({ length: r.total ?? 7 }, (_, k) => <span key={k} className={k < r.passed ? 'on' : ''} />)}</span>
                <span className="shelf-next">{where(r)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {/* The nudge is the short form here (8 Oct, print shop): the handbooks are the page, the account is a footnote. */}
      {!signedIn && rows.length > 0 && <SignupNudge onSignIn={onSignIn} context="library" compact />}
      <p style={{ marginTop: 'var(--l)' }}><button type="button" className="quiet" onClick={onPlans}>What's free, and what members get</button></p>
      {/* 8 Oct (UX review #4): the way to other topics was only in the handbook menu, so readers looped here.
          8 Oct night: the main button continues the last handbook; The Shelf and a new topic are the quiet pair. */}
      <ActionBar>
        {latest ? <button className="btn" onClick={() => onOpen(latest._id)}>{latest.status !== 'ready' ? `Open ${latest.topic}` : latest.passed >= (latest.total ?? 7) ? `Open ${latest.topic}` : `Continue ${latest.topic}: chapter ${latest.current}`}</button>
          : <button className="btn" onClick={onExplore}>The Shelf</button>}
        <span className="library-quiet">
          {latest && <button type="button" className="quiet" onClick={onExplore}>The Shelf: every ready handbook</button>}
          <button type="button" className="quiet" onClick={onNew}>Start another topic</button>
        </span>
      </ActionBar>
    </>
  )
}
