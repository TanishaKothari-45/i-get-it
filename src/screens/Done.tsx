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
  total?: number
  topic: string
  n: number
  passed: number[]
  outcomeLine: string
  nextTitle?: string
  nextHook?: string
  nextPicture?: string   // the next chapter's first picture, for the Up next card (7 Oct)
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
  // The chapter's optional bonus: "deeper" if every exercise was right first time, "another" if any
  // was missed. Never the main action.
  bonus?: { kind: 'deeper' | 'another'; done: boolean; onGo: () => void }
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

// Reminder moments (7 Oct, Prateek: "more casual and witty"): a moment in the day, the clock underneath. Copy (agent).
const TIMES: { at: string; label: string }[] = [
  { at: '07:30', label: 'With the morning chai' },
  { at: '13:00', label: 'At lunch, one hand free' },
  { at: '19:00', label: 'On the ride home' },
  { at: '21:00', label: 'After dinner, before the scroll' },
  { at: '22:30', label: 'In bed, instead of reels' },
]
const momentOf = (t: string) => TIMES.find((x) => x.at === t)?.label.toLowerCase()

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

export default function Done({ total = 7, topic, n, passed, outcomeLine, nextTitle, nextHook, nextPicture, sources: _sources, signedIn, tomorrowAt, onKeep, onPickTime, onContinue, onPricing, stats, nextReady, onNext, handbookId, deviceToken, onRate, adapts, whatsNext, bonus }: Props) {
  const [rated, setRated] = useState<string | null>(null)
  const line = cheer(n, stats)
  const copy = bonus ? BONUS_COPY[bonus.kind] : null
  const [stay, setStay] = useState(false)
  const last = n >= total
  return (
    <>
      <Confetti fire />
      <RungBar passed={passed} filling={n} />
      <p className="sub" style={{ marginTop: 10 }}>{topic}</p>
      <h1>Chapter {n} of {total}: done.</h1>
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
      {/* Up next (7 Oct, Prateek): the next chapter as a card worth tapping, with its own button. */}
      {!last && nextTitle && (
        <section className="upnext" aria-label={`Up next: chapter ${n + 1}`}>
          {nextPicture && <div className="upnext-pic"><img src={nextPicture} alt="" /></div>}
          <div className="upnext-body">
            <p className="upnext-kicker">Up next · Chapter {n + 1} of {total}</p>
            <h2 className="upnext-title">{nextTitle}</h2>
            {nextHook && <p className="upnext-hook">{nextHook}</p>}
            {onNext && <button type="button" className="btn upnext-btn" onClick={onNext}>{nextReady ? `Start chapter ${n + 1} →` : `Start chapter ${n + 1} → (writing it, about a minute)`}</button>}
          </div>
        </section>
      )}
      {last && <p className="lede" style={{ marginTop: 'var(--l)' }}>{total === 7 ? "That's the whole handbook. Days 14 and 28 come later." : "That's all of it. Quick and done."}</p>}
      {last && whatsNext}

      {bonus && copy && (
        <div className="nudge">
          <p className="nudge-lead">{copy.lead}</p>
          <p className="serif">{bonus.done ? copy.done : copy.offer}</p>
          <button type="button" className="btn btn-ghost nudge-btn" onClick={bonus.onGo}>{bonus.done ? copy.again : copy.go}</button>
        </div>
      )}


      {last && (
        <div className="nudge" style={{ marginTop: 'var(--l)' }}>
          <p className="nudge-lead">That's the summit.</p>
          <p className="serif">Want more? Members keep 3 topics of their own on the go, read up to 7 chapters a day, get 30 web-checked answers a month, and can save any handbook as a PDF.</p>
          <button type="button" className="btn btn-ghost nudge-btn" onClick={onPricing}>See what members get</button>
        </div>
      )}
      {!signedIn && !last && (
        <div className="nudge compact" style={{ marginTop: 'var(--l)' }}>
          <p className="nudge-lead">Signing in keeps your handbooks on every device and carries your settings with you. Free.</p>
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
              <button className="btn btn-ghost" onClick={onNext}>{`Start chapter ${n + 1}`}</button>
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
      <h2 style={{ marginTop: 'var(--xl)' }}>{tomorrowAt ? `Deal. See you ${momentOf(tomorrowAt) ?? `at ${pretty(tomorrowAt)}`}.` : `Chapter ${n + 1} takes twenty minutes. When do you have them?`}</h2>
      {!tomorrowAt && <p className="note" style={{ marginTop: 0 }}>Pick one. One nudge a day at that time, and none on days you've already read.</p>}
      <div className="moments">
        {TIMES.map((t) => (
          <button key={t.at} type="button" className="moment" aria-pressed={tomorrowAt === t.at} disabled={!!saving} onClick={() => pick(t.at)}>
            <span className="moment-label">{t.label}</span><span className="moment-time">{pretty(t.at)}</span>
          </button>
        ))}
      </div>
      {note && <p className="note">{note}</p>}
      {installable && !isStandalone() && (
        <button type="button" className="quiet" onClick={async () => { await install(); setInstallable(false) }}>Add I Get It to your home screen</button>
      )}
      {!installable && isIOS() && !isStandalone() && !note && <p className="note">Tip: on iPhone, tap Share, then Add to Home Screen, to keep I Get It next to your apps.</p>}
    </section>
  )
}
