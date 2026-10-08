import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { limitMessage } from '../lib/limits'

// Teach it back (optional): explain the chapter's idea in your own words, get a short reply.
// Never required; the rung never waits on it. Copy is (agent) until Prateek rewrites it.
export default function TeachBack({ handbookId, n, deviceToken }: { handbookId: Id<'handbooks'>; n: number; deviceToken: string }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const reply = useQuery(api.handbooks.teachBackFor, open ? { handbookId, chapter: n, deviceToken } : 'skip')
  const send = useMutation(api.handbooks.teachBack)
  const thinking = reply?.status === 'thinking'

  if (!open) return (
    <button type="button" className="teach-open" onClick={() => setOpen(true)}>
      <strong>Teach it back</strong> (optional): explain today's idea in your own words. It's the fastest way to make it stick.
    </button>
  )
  return (
    <section className="teach" aria-label="Teach it back">
      <label htmlFor="teach-text" className="teach-label">Explain today's idea in 2 sentences, as if to a friend.</label>
      <textarea id="teach-text" className="input teach-input" rows={4} maxLength={600} value={text} onChange={(e) => setText(e.target.value)} disabled={thinking} placeholder="In my own words…" />
      <div className="teach-actions">
        <button type="button" className="btn btn-ghost" disabled={thinking || text.trim().length < 10}
          onClick={async () => { setError(null); try { await send({ handbookId, chapter: n, text, deviceToken }) } catch (e: any) { setError(limitMessage(e) ?? (String(e?.message ?? e).includes('busy') ? 'A few too many in a row. Try again in a bit.' : "Couldn't check that just now. Try again in a minute.")) } }}>
          {thinking ? 'Reading it…' : reply?.status === 'ready' ? 'Try again' : 'Check my explanation'}
        </button>
        <button type="button" className="quiet" onClick={() => setOpen(false)}>Skip</button>
      </div>
      {error && <p className="error">{error}</p>}
      {reply?.status === 'failed' && <p className="error">Couldn't check that just now. Try again in a minute.</p>}
      {reply?.status === 'ready' && (
        <div className={`teach-reply v-${(reply.verdict ?? '').replace(/\s+/g, '-')}`}>
          <p className="teach-verdict">{reply.verdict === 'nailed' ? 'You nailed it!' : reply.verdict === 'close' ? 'Almost there!' : 'Good start!'}</p>
          {reply.got && <p>{reply.got}</p>}
          {reply.missed && <p><strong>Missing:</strong> {reply.missed}</p>}
          {reply.tip && <p className="note">{reply.tip}</p>}
        </div>
      )}
    </section>
  )
}
