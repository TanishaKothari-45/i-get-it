import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

// /admin "Review" (D32, Prateek 9 Oct: nothing typed goes public until he approves it). Pending rows newest first with
// enough to judge in a glance: the typed line, level, goal, mode, chapter 1's title and first two cards, the judge's score
// and weakest check, how many readers started and passed chapter 1. Approve publishes; Reject takes a one-line reason.
// Below it, the automatic rejections with their reason and an Approve to override.
const when = (t: number) => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function AdminReview() {
  const rows = useQuery(api.library.reviewQueue, {})
  const decide = useMutation(api.library.decide)
  const [reason, setReason] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  if (!rows) return null
  const pending = rows.filter((r) => r.review === 'pending'), rejected = rows.filter((r) => r.review === 'rejected')
  const act = async (id: Id<'library'>, approve: boolean) => { setError(null); try { await decide({ id, approve, why: reason[id] }) } catch (e: any) { setError(String(e?.message ?? e).replace(/^.*Error: /, '').slice(0, 200)) } }
  const Row = ({ r, auto }: { r: (typeof rows)[number]; auto?: boolean }) => (
    <li className="adm-review-row">
      <p><strong>{r.topic}</strong> <small>· {r.level === 'new' ? 'new to this' : 'knows some'}{r.goal ? ` · for: ${r.goal}` : ''}{r.mode ? ` · ${r.mode}` : ''} · {when(r.createdAt)}</small></p>
      {auto && <p className="note">Rejected: {r.reviewWhy}{r.reviewedBy ? ` (by ${r.reviewedBy})` : ' (automatic)'}</p>}
      <p><em>Chapter 1: {r.title ?? '(no title)'}</em></p>
      {r.text.map((t, i) => <p key={i} className="serif" style={{ margin: '4px 0' }}>{t}</p>)}
      <p className="note">Judge: {r.judge ? (r.judge.error ? `failed (${r.judge.error})` : `${r.judge.score} of 12${r.judge.weakest ? `, weakest: ${r.judge.weakest}` : ''}`) : 'not run'} · {r.starts} started, {r.passes} passed chapter 1{r.why ? ` · privacy check: ${r.why}` : ''}</p>
      <div className="adm-review-actions">
        <button type="button" className="btn" onClick={() => act(r.id, true)}>Approve · put it on the Shelf</button>
        {!auto && (
          <>
            <input className="input" placeholder="Why not (optional)" value={reason[r.id] ?? ''} onChange={(e) => setReason((x) => ({ ...x, [r.id]: e.target.value }))} />
            <button type="button" className="btn btn-ghost" onClick={() => act(r.id, false)}>Reject</button>
          </>
        )}
      </div>
    </li>
  )
  return (
    <section className="adm-card adm-wide">
      <h2>Review: typed handbooks waiting to go public</h2>
      <p className="note">A typed topic reaches here once its own reader passed chapter 1 and it cleared the automatic filter (privacy check, judge 9 of 12 or more, a real topic, not one of our phones). Nothing is shared until you tap Approve.</p>
      {error && <p className="error">{error}</p>}
      {pending.length === 0 ? <p className="note">Nothing waiting.</p> : <ul className="adm-review">{pending.map((r) => <Row key={r.id} r={r} />)}</ul>}
      {rejected.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary>Rejected, automatically or by you ({rejected.length})</summary>
          <ul className="adm-review">{rejected.map((r) => <Row key={r.id} r={r} auto />)}</ul>
        </details>
      )}
    </section>
  )
}
