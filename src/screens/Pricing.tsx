import { useState } from 'react'
import ActionBar from '../components/ActionBar'

type Plans = { ladder: { month: number; price: number }[]; start: number; floor: number; freeDays: number; maxPauseMonths: number; yearOne: number; locked: { price: number; at: number } | null; signedIn: boolean }
type Props = { plans: Plans | undefined; onLock: () => Promise<{ price: number; already: boolean }>; onBack: () => void; onSignIn: () => void; fromDone?: boolean }

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

// Pricing said plainly, before anyone is asked for anything. No payment is taken this week.
export default function Pricing({ plans, onLock, onBack, onSignIn, fromDone }: Props) {
  const [busy, setBusy] = useState(false)
  const [locked, setLocked] = useState<number | null>(null)
  if (!plans) return <div className="splash">Loading…</div>
  const max = plans.start
  const done = locked ?? plans.locked?.price ?? null
  return (
    <>
      <p className="sub" style={{ marginTop: 10 }}>{fromDone ? 'You finished week 1' : 'Pricing'}</p>
      <h1>The longer you stay, the less you pay.</h1>
      <p className="lede">Week 1 is free, with no card asked. After that it's {inr(plans.start)} a month, and the price drops every month you stay, until it's half: {inr(plans.floor)} a month from month 13, for good.</p>

      <div className="ladder" role="img" aria-label={`Monthly price falls from ${inr(plans.start)} to ${inr(plans.floor)} over 12 months`}>
        {plans.ladder.map((r) => (
          <div key={r.month} className="rung-col">
            <span className="rung-price">{r.month === 1 || r.month === 7 || r.month === 13 ? inr(r.price) : ''}</span>
            <span className="rung-track"><span className="rung-bar" style={{ height: `${Math.round((r.price / max) * 100)}%` }} /></span>
            <span className="rung-month">{r.month === 13 ? '13+' : r.month}</span>
          </div>
        ))}
      </div>
      <p className="note" style={{ textAlign: 'center' }}>Month you're in</p>

      <ul className="rules">
        <li><strong>No surprise on day 8.</strong> You see this now, before you're asked for anything.</li>
        <li><strong>Every month you stay, it gets cheaper.</strong> Year one comes to about {inr(plans.yearOne)}, year two {inr(plans.floor * 12)}.</li>
        <li><strong>Busy month? Pause</strong> for up to {plans.maxPauseMonths} months and keep your price.</li>
        <li><strong>Cancel any time.</strong> Your handbooks and progress stay yours. If you come back later, the price starts again from {inr(plans.start)}.</li>
      </ul>

      {done ? (
        <p className="locked">You're on the list at {inr(done)} a month. Nothing is charged this week; we'll ask before anything is.</p>
      ) : (
        <p className="note">Payments aren't switched on yet. Tapping below just saves your spot at today's price.</p>
      )}
      {!plans.signedIn && !done && <p className="note"><button type="button" className="quiet" style={{ padding: 0 }} onClick={onSignIn}>Sign in</button> so your spot follows you to any device.</p>}

      <ActionBar busy={busy}>
        {done ? (
          <button className="btn btn-ghost" onClick={onBack}>Back</button>
        ) : (
          <>
            <button className="btn" disabled={busy} onClick={async () => { setBusy(true); try { const r = await onLock(); setLocked(r.price) } finally { setBusy(false) } }}>Keep me going at {inr(plans.start)} a month</button>
            <button type="button" className="quiet" onClick={onBack}>I'll decide later</button>
          </>
        )}
      </ActionBar>
    </>
  )
}
