import { useState } from 'react'
import ActionBar from '../components/ActionBar'
import RungBar from '../components/RungBar'
import Confetti from '../components/Confetti'

type Props = {
  topic: string
  n: number
  passed: number[]
  outcomeLine: string
  nextTitle?: string
  nextHook?: string
  sources?: { who: string; what: string; why?: string }[]
  signedIn: boolean
  tomorrowAt?: string
  onKeep: () => void
  onPickTime: (at: string) => Promise<void>
  onContinue: () => void
  onPricing: () => void
}

const TIMES = ['07:00', '08:00', '13:00', '19:00', '21:00', '22:30']

function pretty(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hh = ((h + 11) % 12) + 1
  return m ? `${hh}:${String(m).padStart(2, '0')}${ampm}` : `${hh}${ampm}`
}

// The rung lights. Sign-in is asked only here, after the night is done.
export default function Done({ topic, n, passed, outcomeLine, nextTitle, nextHook, sources, signedIn, tomorrowAt, onKeep, onPickTime, onContinue, onPricing }: Props) {
  const [saving, setSaving] = useState<string | null>(null)
  const [stay, setStay] = useState(false)
  const last = n >= 7
  return (
    <>
      <Confetti fire />
      <RungBar passed={passed} filling={n} />
      <p className="sub" style={{ marginTop: 10 }}>{topic}</p>
      <h1>Chapter {n} of 7: done.</h1>
      {outcomeLine && <p className="done-line">{outcomeLine}</p>}
      {!last && nextTitle && <p className="lede" style={{ marginTop: 'var(--l)' }}>Tomorrow: Chapter {n + 1}, {nextTitle}.{nextHook ? <> <em>{nextHook}</em></> : null}</p>}
      {last && <p className="lede" style={{ marginTop: 'var(--l)' }}>That's the whole handbook. Days 14 and 28 come later.</p>}
      {last && sources && sources.length > 0 && <p className="sources"><span className="label">Read next</span> {sources.map((x, i) => <span key={i}>{i > 0 && ' · '}<strong>{x.who}</strong>, <em>{x.what}</em>{x.why ? ` (${x.why})` : ''}</span>)}</p>}

      {last && (
        <div className="nudge" style={{ marginTop: 'var(--l)' }}>
          <p className="nudge-lead">That was week 1, free.</p>
          <p className="serif">Here's exactly how it works from here, before anyone asks you for anything.</p>
          <button type="button" className="btn btn-ghost nudge-btn" onClick={onPricing}>See how pricing works</button>
        </div>
      )}
      {!signedIn && !last && (
        <div className="nudge compact" style={{ marginTop: 'var(--l)' }}>
          <p className="nudge-lead">Signing in keeps this handbook on every device, lets you run several topics at once, and carries your settings with you. Free.</p>
        </div>
      )}

      {signedIn && (
        <>
          <h2 style={{ marginTop: 'var(--xl)' }}>{tomorrowAt ? `See you at ${pretty(tomorrowAt)}.` : "When do tomorrow's 20 minutes happen?"}</h2>
          {tomorrowAt && <p className="note">Chapter {n + 1} is ready when you are. (No reminder is sent yet; this is your own promise.)</p>}
          <div className="times">
            {TIMES.map((t) => (
              <button key={t} type="button" className="chip" aria-pressed={tomorrowAt === t} disabled={!!saving}
                onClick={async () => { setSaving(t); try { await onPickTime(t) } finally { setSaving(null) } }}>{pretty(t)}</button>
            ))}
          </div>
        </>
      )}

      <ActionBar>
        {!signedIn && !stay ? (
          <>
            <button className="btn" onClick={onKeep}>Keep this handbook</button>
            <button type="button" className="quiet" onClick={() => setStay(true)}>Not now. It stays on this phone.</button>
          </>
        ) : (
          <button className="btn btn-ghost" onClick={onContinue}>{last ? 'Back to the handbook' : 'Back to the handbook'}</button>
        )}
      </ActionBar>
    </>
  )
}
