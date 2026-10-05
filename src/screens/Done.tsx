import { useState } from 'react'
import ActionBar from '../components/ActionBar'
import RungBar from '../components/RungBar'
import Confetti from '../components/Confetti'
import Nudge from '../components/Nudge'
import { prettyTime } from '../lib/time'

type Props = {
  topic: string
  n: number
  passed: number[]
  outcomeLine: string
  nextTitle?: string
  nextHook?: string
  signedIn: boolean
  tomorrowAt?: string
  onKeep: () => void
  onPickTime: (at: string) => Promise<void>
  onContinue: () => void
  // The chapter's optional bonus: "deeper" if every exercise was right first time, "another" if any
  // was missed. Never the main action.
  bonus?: { kind: 'deeper' | 'another'; done: boolean; onGo: () => void }
  deviceToken: string         // for "want a nudge?" on this device
}

const BONUS_COPY = {
  deeper: {
    label: 'Bonus, if you want it',
    offer: 'Every exercise right, first time. Want to go one layer deeper on this idea?', go: 'Go deeper',
    done: "You've done this chapter's bonus.", again: 'Read the bonus again',
  },
  another: {
    label: 'If you want it',
    offer: 'That one took a few tries. Want to see it explained another way?', go: 'Explain it another way',
    done: "You've seen it the other way too.", again: 'Read it again',
  },
}

const TIMES = ['07:00', '08:00', '13:00', '19:00', '21:00', '22:30']
const pretty = prettyTime

// The rung lights. Sign-in is asked only here, after the night is done.
export default function Done({ topic, n, passed, outcomeLine, nextTitle, nextHook, signedIn, tomorrowAt, onKeep, onPickTime, onContinue, bonus, deviceToken }: Props) {
  const copy = bonus ? BONUS_COPY[bonus.kind] : null
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

      {!last && <Nudge deviceToken={deviceToken} next={n + 1} at={tomorrowAt} />}

      {bonus && copy && (
        <div className="bonus-offer">
          <p className="label">{copy.label}</p>
          <p className="serif">{bonus.done ? copy.done : copy.offer}</p>
          <button type="button" className="btn btn-ghost" onClick={bonus.onGo}>{bonus.done ? copy.again : copy.go}</button>
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
