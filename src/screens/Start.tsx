import { useEffect, useState } from 'react'
import ActionBar from '../components/ActionBar'

type Level = 'new' | 'some'
type Props = {
  initialTopic?: string
  status: 'idle' | 'writing' | 'question' | 'failed'
  question?: string
  error?: string
  onCreate: (topic: string, level: Level) => Promise<void>
  onAnswer?: (answer: string) => Promise<void>
  onRetry?: () => Promise<void>
  examples: string[]
}

// The first screen, and the empty state of the whole product (DESIGN.md section 4, Start).
export default function Start({ initialTopic = '', status, question, error, onCreate, onAnswer, onRetry, examples }: Props) {
  const [topic, setTopic] = useState(initialTopic)
  const [level, setLevel] = useState<Level>('new')
  const [answer, setAnswer] = useState('')
  const [slow, setSlow] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const writing = status === 'writing'

  useEffect(() => {
    if (!writing) { setSlow(false); return }
    const t = setTimeout(() => setSlow(true), 8000)
    return () => clearTimeout(t)
  }, [writing])

  const submit = async () => {
    setLocalError(null)
    if (topic.trim().length < 2) { setLocalError('A few words is enough. What is it?'); return }
    try { await onCreate(topic.trim(), level) } catch (e: any) { setLocalError(friendly(e)) }
  }

  if (status === 'question' && question) {
    return (
      <>
        <h1>One question first.</h1>
        <p className="lede">{question}</p>
        <div className="field">
          <label htmlFor="answer">Your answer</label>
          <input id="answer" className="input" autoFocus value={answer} onChange={(e) => setAnswer(e.target.value)} enterKeyHint="go"
            onKeyDown={(e) => { if (e.key === 'Enter' && answer.trim()) onAnswer?.(answer.trim()) }} />
        </div>
        {localError && <p className="error">{localError}</p>}
        <ActionBar>
          <button className="btn" disabled={!answer.trim()} onClick={() => onAnswer?.(answer.trim()).catch((e) => setLocalError(friendly(e)))}>That's it</button>
        </ActionBar>
      </>
    )
  }

  return (
    <>
      <h1>You keep saving it.<br />Tonight, get it.</h1>
      <p className="lede">Type the one thing you keep meaning to learn. You get a seven-chapter handbook written for it, and you pass chapter 1 tonight. No sign-up.</p>

      <div className="field">
        <label htmlFor="topic">What do you keep meaning to learn?</label>
        <input id="topic" className="input" type="text" autoComplete="off" enterKeyHint="go" placeholder={examples[0] ?? 'Swimming'} value={topic}
          onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} disabled={writing} />
        {examples.length > 1 && (
          <p className="note">Tonight's ready handbooks: {examples.slice(0, 6).map((x, i) => (
            <span key={x}>{i > 0 && ' · '}<button type="button" className="quiet" style={{ padding: 0 }} onClick={() => setTopic(x)} disabled={writing}>{x}</button></span>
          ))}</p>
        )}
      </div>

      <div className="chips" role="group" aria-label="Level">
        <button type="button" className="chip" aria-pressed={level === 'new'} onClick={() => setLevel('new')} disabled={writing}>New to this</button>
        <button type="button" className="chip" aria-pressed={level === 'some'} onClick={() => setLevel('some')} disabled={writing}>Know some</button>
      </div>

      {(localError || status === 'failed') && (
        <p className="error">{localError ?? "Couldn't write it just now. Your line is still here; try once more in a minute."}{error ? '' : ''}</p>
      )}

      <ActionBar busy={writing} note={writing && slow ? 'About 30 seconds. Seven chapters take a moment to plan.' : undefined}>
        {status === 'failed' && onRetry ? (
          <button className="btn" onClick={() => onRetry().catch((e) => setLocalError(friendly(e)))}>Try again</button>
        ) : (
          <button className="btn" onClick={submit} disabled={writing}>{writing ? 'Writing your handbook…' : 'Write my handbook'}</button>
        )}
      </ActionBar>
    </>
  )
}

function friendly(e: any): string {
  const m = String(e?.message ?? e)
  if (m.includes('busy')) return "Busy right now. Try again in a few minutes."
  if (m.includes('few words')) return 'A few words is enough. What is it?'
  return "Couldn't write it just now. Your line is still here; try once more in a minute."
}
