import { useState } from 'react'
import ActionBar from '../components/ActionBar'
import RungBar from '../components/RungBar'
import Confetti from '../components/Confetti'
import TeachBack from '../components/TeachBack'
import { track } from '../lib/track'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { subscribe, canInstall, install, isIOS, isStandalone } from '../lib/push'
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
  onRate?: (rating: 'too_easy' | 'just_right' | 'lost_me') => Promise<void>
  whatsNext?: React.ReactNode
  adapts?: boolean   // typed topics rewrite the next chapter from the rating; ready topics only record it
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
  if (!s.total) return fast ? `${mins}. We budgeted 20. Show-off.` : `You took your time with it. That's how it sticks.`   // a reading-only chapter (chapter 1 since 6 Oct)
  if (fast && perfect) return [`${mins}, ${score}. We budgeted 20. Show-off.`, `${score}, in ${mins}. Your brain called; it wants a raise.`, `Chapter ${n}, done before your chai went cold. ${score}, too.`][n % 3]
  if (perfect) return `${score}. Someone's been paying attention.`
  if (fast) return `${mins}, and you fixed every miss on the way. That's exactly how it sticks.`
  return `You took your time, and it stuck. That's the whole point.`
}

export default function Done({ topic, n, passed, outcomeLine, nextTitle, nextHook, sources, signedIn, tomorrowAt, onKeep, onPickTime, onContinue, onPricing, stats, nextReady, onNext, handbookId, deviceToken, onRate, adapts, whatsNext }: Props) {
  const [rated, setRated] = useState<string | null>(null)
  const line = cheer(n, stats)
  const [stay, setStay] = useState(false)
  const last = n >= 7
  return (
    <>
      <Confetti fire />
      <RungBar passed={passed} filling={n} />
      <p className="sub" style={{ marginTop: 10 }}>{topic}</p>
      <h1>Chapter {n} of 7: done.</h1>
      {line && <p className="cheer">{line}</p>}
      {onRate && (
        <div className="rate" role="group" aria-label={`How was chapter ${n}?`}>
          <p className="rate-q">{rated ? (!adapts ? 'Thanks, noted.' : rated === 'just_right' ? 'Noted. Same pace next time.' : rated === 'lost_me' ? "Noted. The next chapter will slow down." : 'Noted. The next chapter will step up.') : `How was chapter ${n}? (optional)`}</p>
          {!rated && (
            <div className="rate-row">
              {([['too_easy', 'Too easy'], ['just_right', 'Just right'], ['lost_me', 'Lost me']] as const).map(([k, label]) => (
                <button key={k} type="button" className="chip" onClick={() => { setRated(k); track('feedback', { n, v: k }); onRate(k).catch(() => {}) }}>{label}</button>
              ))}
            </div>
          )}
        </div>
      )}
      {outcomeLine && <p className="done-line">{outcomeLine}</p>}
      {handbookId && deviceToken && <TeachBack handbookId={handbookId} n={n} deviceToken={deviceToken} />}
      {!last && nextTitle && <p className="lede" style={{ marginTop: 'var(--l)' }}>Next: Chapter {n + 1}, {nextTitle}.{nextHook ? <> <em>{nextHook}</em></> : null}</p>}
      {last && <p className="lede" style={{ marginTop: 'var(--l)' }}>That's the whole handbook. Days 14 and 28 come later.</p>}
      {last && whatsNext}
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

      {!last && <Reminder n={n} tomorrowAt={tomorrowAt} onPickTime={onPickTime} handbookId={handbookId} deviceToken={deviceToken} />}

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

// "Remind me" (6 Oct): picks the time and, where the phone allows, sends a real notification then (web push).
// iPhones only allow it once the app is on the home screen, so the block says so there.
function Reminder({ n, tomorrowAt, onPickTime, handbookId, deviceToken }: { n: number; tomorrowAt?: string; onPickTime: (at: string) => Promise<void>; handbookId?: Id<'handbooks'>; deviceToken?: string }) {
  const publicKey = useQuery(api.push.publicKey, {})
  const save = useMutation(api.push.saveReminder)
  const [saving, setSaving] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [installable, setInstallable] = useState(canInstall())
  const pick = async (t: string) => {
    setSaving(t); setNote(null)
    try {
      await onPickTime(t)
      if (!publicKey || !deviceToken) { setNote(`Saved: ${pretty(t)}. Reminders aren't available just now.`); return }
      const r = await subscribe(publicKey)
      if (r.ok) { await save({ deviceToken, at: t, tzOffsetMin: new Date().getTimezoneOffset(), handbookId, subscription: r.subscription }); track('feedback', { n, v: 'reminder' }); setNote(`Done. This phone will remind you at ${pretty(t)}.`) }
      else setNote(r.why === 'ios-install' ? `Saved: ${pretty(t)}. For a reminder on iPhone, tap Share, then Add to Home Screen, and open I Get It from there.`
        : r.why === 'denied' ? `Saved: ${pretty(t)}. Notifications are off for this site, so no reminder.` : `Saved: ${pretty(t)}. This browser can't send reminders.`)
    } catch { setNote("Couldn't save that. Try again.") }
    finally { setSaving(null) }
  }
  return (
    <section className="remind">
      <h2 style={{ marginTop: 'var(--xl)' }}>{tomorrowAt ? `See you at ${pretty(tomorrowAt)}.` : `When should chapter ${n + 1} remind you?`}</h2>
      <div className="times">
        {TIMES.map((t) => (
          <button key={t} type="button" className="chip" aria-pressed={tomorrowAt === t} disabled={!!saving} onClick={() => pick(t)}>{pretty(t)}</button>
        ))}
      </div>
      {note && <p className="note">{note}</p>}
      {installable && !isStandalone() && (
        <button type="button" className="quiet" onClick={async () => { await install(); setInstallable(false) }}>Add I Get It to your home screen</button>
      )}
      {!installable && isIOS() && !isStandalone() && !note && <p className="note">Tip: on iPhone, Share, then Add to Home Screen, puts I Get It next to your apps.</p>}
    </section>
  )
}
