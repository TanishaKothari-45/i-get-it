import { useState } from 'react'
import ActionBar from '../components/ActionBar'
import Sheet from '../components/Sheet'

type Plans = { ladder: { month: number; price: number }[]; start: number; floor: number; freeDays: number; maxPauseMonths: number; yearOne: number; locked: { price: number; at: number; freeMonths: number } | null; signedIn: boolean; freeSpots: number; freeMonthsOffer: number; spotsLeft: number }
type Props = { plans: Plans | undefined; onLock: () => Promise<{ price: number; already: boolean; freeMonths: number }>; onBack: () => void; onSignIn: () => void; fromDone?: boolean }

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

// Pricing said plainly, before anyone is asked for anything. Payments are not live: "Pay" records the tap,
// asks for no card, and says so in a sheet; the first 25 who sign in get 3 months free when payments go live.
// Sheet and status copy is (agent) until Prateek rewrites it.
export default function Pricing({ plans, onLock, onBack, onSignIn, fromDone }: Props) {
  const [busy, setBusy] = useState(false)
  const [sheet, setSheet] = useState(false)
  if (!plans) return <div className="splash">Loading…</div>
  const max = plans.start
  const done = plans.locked
  const free = done?.freeMonths ?? 0
  const pay = async () => {
    setBusy(true)
    try { await onLock(); setSheet(true) } finally { setBusy(false) }
  }
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

      {done && (
        free ? <p className="locked">Your first {free} months are free once payments go live. Nothing is charged until then, and we'll ask before anything is.</p>
        : <p className="locked">You tapped Pay at {inr(done.price)} a month. Payments aren't live yet, so nothing was charged.{plans.spotsLeft > 0 ? ` ${plans.signedIn ? 'Claim' : 'Sign in to claim'} ${plans.freeMonthsOffer} free months: ${plans.spotsLeft} of ${plans.freeSpots} spots left.` : ''}</p>
      )}

      <ActionBar busy={busy}>
        {done ? (
          !free && plans.spotsLeft > 0
            ? <><button className="btn" disabled={busy} onClick={plans.signedIn ? pay : onSignIn}>{plans.signedIn ? 'Claim' : 'Sign in to claim'} {plans.freeMonthsOffer} free months</button><button type="button" className="quiet" onClick={onBack}>Back</button></>
            : <button className="btn btn-ghost" onClick={onBack}>Back</button>
        ) : (
          <>
            <button className="btn" disabled={busy} onClick={pay}>Pay {inr(plans.start)} a month</button>
            <button type="button" className="quiet" onClick={onBack}>I'll decide later</button>
          </>
        )}
      </ActionBar>

      {sheet && (
        <Sheet onClose={() => setSheet(false)}>
          <h2>Payments aren't live yet.</h2>
          {free ? (
            <p>You weren't charged, and no card was asked for. Thanks for tapping Pay: you're one of the first {plans.freeSpots}, so your first {free} months are free once payments go live. We'll email you before anything changes.</p>
          ) : plans.spotsLeft > 0 ? (
            <p>You weren't charged, and no card was asked for. Thanks for tapping Pay: the first {plans.freeSpots} people get {plans.freeMonthsOffer} months free once payments go live. {plans.spotsLeft} spots left. Sign in so we can hold yours and email you.</p>
          ) : (
            <p>You weren't charged, and no card was asked for. Thanks for tapping Pay: the {plans.freeSpots} free spots have gone, but your price of {inr(plans.start)} is saved, and we'll email you before anything changes.</p>
          )}
          <ActionBar>
            {!free && !plans.signedIn && plans.spotsLeft > 0
              ? <><button className="btn" onClick={() => { setSheet(false); onSignIn() }}>Sign in to claim it</button><button type="button" className="quiet" onClick={() => setSheet(false)}>Not now</button></>
              : <button className="btn" onClick={() => setSheet(false)}>Got it</button>}
          </ActionBar>
        </Sheet>
      )}
    </>
  )
}
