import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { askAndSubscribe, canInstall, existingSubscription, onInstallChange, promptInstall, pushSupport, rememberNotNow, saidNotNowRecently, timezone } from '../lib/push'
import { prettyTime } from '../lib/time'

type Props = { deviceToken: string; next: number; at?: string }   // next: the chapter that's up; at: "21:00" (9pm if none picked)

type State = 'loading' | 'ask' | 'ios' | 'justOn' | 'on' | 'hidden'

// "Want a nudge at 9pm?" Our own card first, with only Allow and Not now; the browser's permission
// prompt appears only after Allow, so a "no" here never becomes a permanent block.
export default function Nudge({ deviceToken, next, at = '21:00' }: Props) {
  const publicKey = useQuery(api.push.publicKey, {})
  const subscribe = useMutation(api.push.subscribe)
  const [state, setState] = useState<State>('loading')
  const [showSteps, setShowSteps] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [installable, setInstallable] = useState(canInstall)
  const time = prettyTime(at)

  useEffect(() => onInstallChange(() => setInstallable(canInstall())), [])

  useEffect(() => {
    if (publicKey === undefined) return
    if (publicKey === null) { setState('hidden'); return }   // nudges aren't set up on this deployment
    let cancelled = false
    const settle = (s: State) => { if (!cancelled) setState(s) }
    ;(async () => {
      const support = pushSupport()
      if (support === 'unsupported') return settle('hidden')
      if (support === 'ios-needs-install') return settle(saidNotNowRecently() ? 'hidden' : 'ios')
      if (Notification.permission === 'denied') return settle('hidden')
      const sub = Notification.permission === 'granted' ? await existingSubscription() : null
      if (sub) {
        // Already on: make sure Convex has this device (and its current timezone).
        const json = sub.toJSON()
        if (json.endpoint && json.keys) await subscribe({ deviceToken, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, timezone: timezone() }).catch(() => {})
        return settle('on')
      }
      settle(saidNotNowRecently() ? 'hidden' : 'ask')
    })()
    return () => { cancelled = true }
  }, [publicKey, deviceToken, subscribe])

  const allow = async () => {
    if (state === 'ios') { setShowSteps(true); return }
    if (!publicKey) return
    setBusy(true); setError(null)
    try {
      const json = await askAndSubscribe(publicKey)
      if (!json?.endpoint || !json.keys) { setState('hidden'); return }   // they said no in the browser's prompt
      await subscribe({ deviceToken, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, timezone: timezone() })
      setState('justOn')
    } catch {
      setError("Couldn't turn nudges on just now. Try again later.")
    } finally { setBusy(false) }
  }

  const notNow = () => { rememberNotNow(); setState('hidden') }

  const install = installable && (
    <p className="note" style={{ marginTop: 'var(--m)' }}>
      <button type="button" className="quiet" style={{ padding: 0 }} onClick={() => { promptInstall().catch(() => {}) }}>Add I Get It to your home screen</button>
    </p>
  )

  if (state === 'loading' || state === 'hidden') return install || null

  if (state === 'justOn' || state === 'on') {
    return (
      <>
        <p className="note" style={{ marginTop: 'var(--l)' }}>
          {state === 'justOn' ? `Done. See you at ${time} tomorrow for chapter ${next}.` : `We'll tap you on the shoulder at ${time} if you haven't opened it by then.`}
        </p>
        {install}
      </>
    )
  }

  return (
    <div className="nudge">
      <h2 style={{ marginTop: 0 }}>Keep going, or see you tomorrow?</h2>
      <p className="serif">Chapter {next} is ready whenever you are. We'll tap you on the shoulder at {time}.</p>
      {state === 'ios' && showSteps && (
        <p className="note">On iPhone, add I Get It to your Home Screen first: tap Share, then Add to Home Screen, then open it from there and tap Allow again.</p>
      )}
      {error && <p className="error">{error}</p>}
      <div className="nudge-actions">
        <button type="button" className="btn btn-ghost" onClick={allow} disabled={busy}>{busy ? 'Turning it on…' : 'Allow'}</button>
        <button type="button" className="quiet" onClick={notNow}>Not now</button>
      </div>
      {install}
    </div>
  )
}
