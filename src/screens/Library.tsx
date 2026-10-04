import ActionBar from '../components/ActionBar'
import SignupNudge from '../components/SignupNudge'

type Row = { _id: string; topic: string; status: string; passed: number; current: number; lastAt: number; outcome: string | null }
type Props = { rows: Row[]; signedIn: boolean; activeId?: string; onOpen: (id: string) => void; onNew: () => void; onSignIn: () => void; onPlans: () => void }

function ago(t: number) {
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 60) return m <= 1 ? 'just now' : `${m} min ago`
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24); return d === 1 ? 'yesterday' : `${d} days ago`
}

// Every handbook in one place. Each keeps its own place; starting a new one never resets another.
export default function Library({ rows, signedIn, activeId, onOpen, onNew, onSignIn, onPlans }: Props) {
  return (
    <>
      <h1>Your handbooks</h1>
      <p className="lede">Run as many as you like. Each one remembers exactly where you stopped.</p>
      <ul className="shelf">
        {rows.map((r) => (
          <li key={r._id}>
            <button type="button" className={`shelf-card${r._id === activeId ? ' active' : ''}`} onClick={() => onOpen(r._id)}>
              <span className="shelf-top"><span className="shelf-topic">{r.topic}</span><span className="shelf-when">{ago(r.lastAt)}</span></span>
              <span className="shelf-bar" aria-label={`${r.passed} of 7 chapters done`}>{Array.from({ length: 7 }, (_, k) => <span key={k} className={k < r.passed ? 'on' : ''} />)}</span>
              <span className="shelf-next">{r.status !== 'ready' ? 'Being written…' : r.passed >= 7 ? 'All 7 done' : `Next: chapter ${r.current}`}</span>
            </button>
          </li>
        ))}
      </ul>
      {!signedIn && rows.length > 0 && <SignupNudge onSignIn={onSignIn} context="library" />}
      <p style={{ marginTop: 'var(--l)' }}><button type="button" className="quiet" onClick={onPlans}>How pricing works after week 1</button></p>
      <ActionBar>
        <button className="btn" onClick={onNew}>Start another topic</button>
      </ActionBar>
    </>
  )
}
