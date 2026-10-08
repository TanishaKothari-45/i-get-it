import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { inline } from './Rich'
import { limitMessage } from '../lib/limits'

type Props = { handbookId: Id<'handbooks'>; chapter: number; cardIndex: number; deviceToken: string }

// The two-way street: ask or object about this card. Answered from the card only, in the handbook's voice.
export default function AskCard({ handbookId, chapter, cardIndex, deviceToken }: Props) {
  const [open, setOpen] = useState(true)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rows = useQuery(api.handbooks.questionsFor, open ? { handbookId, chapter, cardIndex, deviceToken } : 'skip') ?? []
  const ask = useMutation(api.handbooks.ask)

  const send = async () => {
    const q = text.trim(); if (q.length < 3) return
    setBusy(true); setError(null)
    try { await ask({ handbookId, chapter, cardIndex, question: q, deviceToken }); setText('') }
    catch (e: any) { setError(limitMessage(e) ?? (String(e?.message ?? e).includes('busy') ? 'A few too many questions in a row. Give it a minute.' : "Couldn't send that. Try again.")) }
    finally { setBusy(false) }
  }

  return (
    <div className="ask">
      {!open ? (
        <button type="button" className="quiet" onClick={() => setOpen(true)}>Ask or object about this</button>
      ) : (
        <>
          {rows.map((r) => (
            <div key={String(r._id)} className="ask-qa">
              <p className="ask-q">{r.question}</p>
              {r.status === 'thinking' && <p className="note">Thinking, and checking the web if the card doesn't cover it…</p>}
              {r.status === 'failed' && <p className="error">Couldn't answer that one right now.</p>}
              {r.answer && <p className="serif ask-a">{inline(r.answer)}</p>}
              {r.sources && r.sources.length > 0 && (
                <p className="ask-src">Sources: {r.sources.map((x, i) => <span key={x.url}>{i > 0 && ' · '}<a href={x.url} target="_blank" rel="noopener noreferrer nofollow">{x.title.length > 48 ? x.title.slice(0, 46) + '…' : x.title}</a></span>)}</p>
              )}
            </div>
          ))}
          <div className="ask-row">
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="What do you mean by…? / I don't buy that because…"
              onKeyDown={(e) => { if (e.key === 'Enter') send() }} disabled={busy} aria-label="Your question or objection" />
            <button type="button" className="btn btn-ghost ask-send" onClick={send} disabled={busy || text.trim().length < 3}>{busy ? '…' : 'Ask'}</button>
          </div>
          {error && <p className="error">{error}</p>}
          <p className="note">Questions about this topic only. If the card doesn't cover it, the answer checks the web and shows its sources.</p>
        </>
      )}
    </div>
  )
}
