import { useState } from 'react'
import ActionBar from '../components/ActionBar'
import RungBar from '../components/RungBar'
import Confetti from '../components/Confetti'
import Nudge from '../components/Nudge'
import WhatsNext from '../components/WhatsNext'
import type { ComponentProps } from 'react'
import TeachBack from '../components/TeachBack'
import type { Id } from '../../convex/_generated/dataModel'

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
  stats?: { minutes: number; right: number; total: number } | null
  nextReady?: boolean
  onNext?: () => void
  handbookId?: Id<'handbooks'>
  deviceToken?: string
  // The chapter's optional bonus: "deeper" if every exercise was right first time, "another" if any
  // was missed. Never the main action.
  bonus?: { kind: 'deeper' | 'another'; done: boolean; onGo: () => void }
  whatsNext?: ComponentProps<typeof WhatsNext>   // after the last chapter: go further, related, something new
}

// (agent) placeholders until Prateek rewrites them, as DESIGN.md asks.
const BONUS_COPY = {
  deeper: {
    lead: 'Bonus, if you want it',
    offer: 'Every check right, first time. Want to go one layer deeper on this idea?', go: 'Go deeper',
    done: "You've done this chapter's bonus.", again: 'Read the bonus again',
  },
  another: {
    lead: 'If you want it',
    offer: 'That one took a few tries. Want to see it explained another way?', go: 'Explain it another way',
    done: "You've seen it the other way too.", again: 'Read it again',
  },
}

const TIMES = ['07:00', '08:00', '13:00', '19:00', '21:00', '22:30']

function pretty(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hh = ((h + 11) % 12) + 1
  return m ? `${hh}:${String(m).padStart(2, '0')}${ampm}` : `${hh}${ampm}`
}

// The rung lights. Sign-in is asked only here, after the night is done.
// A little love when the chapter's done (agent copy until Prateek rewrites it). Compares only with our own
// 20-minute budget and their own score, never with an average we don't have yet.
function cheer(n: number, s?: { minutes: number; right: number; total: number } | null): string | null {
  if (!s) return null
  const perfect = s.total > 0 && s.right === s.total
  const fast = s.minutes < 20
  const score = s.total ? `${s.right} of ${s.total} first try` : ''
  const mins = `${s.minutes} minute${s.minutes === 1 ? '' : 's'}`
  if (fast && perfect) return [`${mins}, ${score}. We budgeted 20. Show-off.`, `${score}, in ${mins}. Your brain called; it wants a raise.`, `Chapter ${n}, done before your chai went cold. ${score}, too.`][n % 3]
  if (perfect) return `${score}. Someone's been paying attention.`
  if (fast) return `${mins}, and you fixed every miss on the way. That's exactly how it sticks.`
  return `You took your time, and it stuck. That's the whole point.`
}

export default function Done({ topic, n, passed, outcomeLine, nextTitle, nextHook, sources, signedIn, tomorrowAt, onKeep, onPickTime, onContinue, onPricing, stats, nextReady, onNext, handbookId, deviceToken, bonus, whatsNext }: Props) {
  const line = cheer(n, stats)
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
      {line && <p className="cheer">{line}</p>}
      {outcomeLine && <p className="done-line">{outcomeLine}</p>}
      {handbookId && deviceToken && <TeachBack handbookId={handbookId} n={n} deviceToken={deviceToken} />}
      {!last && nextTitle && <p className="lede" style={{ marginTop: 'var(--l)' }}>Next: Chapter {n + 1}, {nextTitle}.{nextHook ? <> <em>{nextHook}</em></> : null}</p>}
      {last && <p className="lede" style={{ marginTop: 'var(--l)' }}>That's the whole handbook. Days 14 and 28 come later.</p>}

      {!last && deviceToken && <Nudge deviceToken={deviceToken} next={n + 1} at={tomorrowAt} />}

      {bonus && copy && (
        <div className="nudge">
          <p className="nudge-lead">{copy.lead}</p>
          <p className="serif">{bonus.done ? copy.done : copy.offer}</p>
          <button type="button" className="btn btn-ghost nudge-btn" onClick={bonus.onGo}>{bonus.done ? copy.again : copy.go}</button>
        </div>
      )}
      {last && sources && sources.length > 0 && <p className="sources"><span className="label">Read next</span> {sources.map((x, i) => <span key={i}>{i > 0 && ' · '}<strong>{x.who}</strong>, <em>{x.what}</em>{x.why ? ` (${x.why})` : ''}</span>)}</p>}

      {last && whatsNext && <WhatsNext {...whatsNext} />}

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
          {tomorrowAt && <p className="note">Chapter {n + 1} is ready when you are. With nudges on, that's when we tap you on the shoulder.</p>}
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
            <button type="button" className="quiet" onClick={() => { setStay(true); if (!last) onNext?.() }}>{last ? 'Not now. It stays on this phone.' : `Not now, start chapter ${n + 1}`}</button>
          </>
        ) : (
          last || !onNext ? <button className="btn btn-ghost" onClick={onContinue}>Back to the handbook</button> : (
            <>
              <button className="btn" onClick={onNext}>{nextReady ? `Start chapter ${n + 1} now` : `Start chapter ${n + 1} (writing it, about a minute)`}</button>
              <button type="button" className="quiet" onClick={onContinue}>Back to the handbook</button>
            </>
          )
        )}
      </ActionBar>
    </>
  )
}
