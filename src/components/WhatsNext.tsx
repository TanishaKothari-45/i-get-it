import { useState } from 'react'

type Props = {
  topic: string
  nextLine?: string            // the plan's own "day 14" pointer, if it has one
  related: string[]            // topics the plan suggested
  fresh: string[]              // ready handbooks on other things (they open straight away)
  onGoFurther: () => Promise<void>
  onStart: (topic: string) => Promise<void>
}

// After the last chapter: the next level of this topic, related topics, or something new.
// So finishing a handbook is the start of the next one, not a dead end.
export default function WhatsNext({ topic, nextLine, related, fresh, onGoFurther, onStart }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [line, setLine] = useState('')
  const [error, setError] = useState<string | null>(null)
  // The plan's day-14 line often starts "Later: …"; here it reads as where the next level heads.
  const heading = nextLine?.replace(/^\s*later\s*[:,-]\s*/i, '').trim()

  const run =async (key: string, go: () => Promise<void>) => {
    if (busy) return
    setBusy(key); setError(null)
    try { await go() }
    catch (e) { setError(String((e as Error)?.message ?? e).includes('busy') ? 'Busy right now. Try again in a few minutes.' : "Couldn't start it just now. Try once more in a minute.") }
    finally { setBusy(null) }
  }

  const pick = (t: string) => (
    <li key={t}>
      <button type="button" onClick={() => run(t, () => onStart(t))} disabled={!!busy}>
        {t}{busy === t && <small>Starting…</small>}
      </button>
    </li>
  )

  return (
    <section className="whats-next">
      <h2>What's next?</h2>

      <div className="next-card">
        <p className="label">Go further</p>
        <p className="serif"><strong>{topic}: the next level.</strong> It picks up where this one ends.{heading ? ` Where it heads: ${heading}` : ''}</p>
        <button type="button" className="btn btn-ghost" onClick={() => run('further', onGoFurther)} disabled={!!busy}>
          {busy === 'further' ? 'Starting the next level…' : 'Start the next level'}
        </button>
      </div>

      {related.length > 0 && (
        <>
          <p className="label">You might also like</p>
          <ul className="next-list">{related.map(pick)}</ul>
        </>
      )}

      <p className="label">Or something new</p>
      {fresh.length > 0 && <ul className="next-list">{fresh.map(pick)}</ul>}
      <div className="field" style={{ marginTop: 'var(--m)' }}>
        <label htmlFor="next-topic">Or type anything you keep meaning to learn</label>
        <input id="next-topic" className="input" type="text" autoComplete="off" enterKeyHint="go" value={line} disabled={!!busy}
          onChange={(e) => setLine(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && line.trim().length > 1) run('typed', () => onStart(line.trim())) }} />
      </div>
      <button type="button" className="btn btn-ghost" style={{ marginTop: 'var(--s)' }} disabled={!!busy || line.trim().length < 2}
        onClick={() => run('typed', () => onStart(line.trim()))}>
        {busy === 'typed' ? 'Writing your handbook…' : 'Write my handbook'}
      </button>

      {error && <p className="error">{error}</p>}
    </section>
  )
}
