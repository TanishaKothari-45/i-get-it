import { useState } from 'react'
import ActionBar from '../components/ActionBar'
import Sheet from '../components/Sheet'
import { checkout, type Paid } from '../lib/razorpay'

type Plans = { ladder: { month: number; price: number }[]; start: number; floor: number; freeDays: number; maxPauseMonths: number; yearOne: number; locked: { price: number; at: number } | null; signedIn: boolean; pay?: { live: boolean; mode: 'test' | 'live' | null; months: number; paidUntil: number | null; next: number } }
type Order = { keyId: string; orderId: string; amount: number; month: number; email?: string }
type Props = { plans: Plans | undefined; onLock: () => Promise<{ price: number; already: boolean }>; onOrder: () => Promise<Order>; onConfirm: (p: Paid) => Promise<{ ok: boolean }>; onBack: () => void; onSignIn: () => void; fromDone?: boolean }

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

// Pricing said plainly, before anyone is asked for anything. Payments are not live: "Pay" records the tap,
// asks for no card, and says so in a sheet. With Razorpay keys set, Pay takes real (or test) money instead.
// Sheet and status copy is (agent) until Prateek rewrites it.
export default function Pricing({ plans, onLock, onOrder, onConfirm, onBack, onSignIn, fromDone }: Props) {
  const [busy, setBusy] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [paidSheet, setPaidSheet] = useState<number | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  if (!plans) return <div className="splash">Loading…</div>
  const max = plans.start
  const done = plans.locked
  const pay = async () => {
    setBusy(true)
    try { await onLock(); setSheet(true) } finally { setBusy(false) }
  }
  // Razorpay (6 Oct): order on our server, money on Razorpay's sheet, and the month counts only once the
  // server has checked Razorpay's signature.
  const p = plans.pay
  const live = !!p?.live
  const payNow = async () => {
    setPayError(null); setBusy(true)
    try {
      const o = await onOrder()
      const reply = await checkout(o, (why) => setPayError(`${why} Nothing was charged. Try again, or another way to pay.`))
      if (!reply) return
      const r = await onConfirm(reply)
      if (r.ok) { setPayError(null); setPaidSheet(o.amount) }
      else setPayError("Razorpay took the payment but we couldn't confirm it yet. It usually shows up here in a minute; if not, write to us and we'll sort it out.")
    } catch (e: any) {
      const m = String(e?.message ?? e)
      setPayError(m.includes('busy') ? 'Too many tries just now. Wait a few minutes and try again.'
        : m.includes('Already paid') ? 'This month is already paid.'
        : "Couldn't open the payment just now. Nothing was charged; try again in a minute.")
    } finally { setBusy(false) }
  }
  const until = (t: number) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
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

      {live && p ? (
        <>
          {p.mode === 'test' && <p className="note" style={{ textAlign: 'center' }}>Test mode: no real money moves.</p>}
          {p.paidUntil ? <p className="locked">Paid. Month {p.months} is covered until {until(p.paidUntil)}.</p>
            : p.months > 0 ? <p className="locked">Month {p.months + 1} is {inr(p.next)}, down from {inr(plans.start)}.</p> : null}
          {payError && <p className="error">{payError}</p>}
          <ActionBar busy={busy}>
            {p.paidUntil ? <button className="btn btn-ghost" onClick={onBack}>Back</button>
              : !plans.signedIn ? <><button className="btn" onClick={onSignIn}>Sign in to pay {inr(p.next)}</button><button type="button" className="quiet" onClick={onBack}>I'll decide later</button></>
              : <><button className="btn" disabled={busy} onClick={payNow}>Pay {inr(p.next)} for month {p.months + 1}</button><button type="button" className="quiet" onClick={onBack}>I'll decide later</button></>}
          </ActionBar>
          {!plans.signedIn && <p className="note" style={{ textAlign: 'center' }}>Sign in first, so your months stay with you on any phone.</p>}
        </>
      ) : (
        <>
          {done && <p className="locked">You tapped Pay at {inr(done.price)} a month. Payments aren't live yet, so nothing was charged.</p>}

          <ActionBar busy={busy}>
            {done ? <button className="btn btn-ghost" onClick={onBack}>Back</button> : (
              <>
                <button className="btn" disabled={busy} onClick={pay}>Pay {inr(plans.start)} a month</button>
                <button type="button" className="quiet" onClick={onBack}>I'll decide later</button>
              </>
            )}
          </ActionBar>
        </>
      )}

      {paidSheet !== null && (
        <Sheet onClose={() => setPaidSheet(null)}>
          <h2>Paid. Thank you.</h2>
          <p>{inr(paidSheet)} for this month{p?.mode === 'test' ? ' (test mode, no real money moved)' : ''}. Razorpay emails the receipt. Next month is cheaper, and you can stop any time.</p>
          <ActionBar><button className="btn" onClick={() => setPaidSheet(null)}>Back to reading</button></ActionBar>
        </Sheet>
      )}

      {sheet && (
        <Sheet onClose={() => setSheet(false)}>
          <h2>Payments aren't live yet.</h2>
          <p>You weren't charged, and no card was asked for. Thanks for tapping Pay: your price of {inr(plans.start)} is saved, and we'll ask before anything is charged.</p>
          <ActionBar>
            <button className="btn" onClick={() => setSheet(false)}>Got it</button>
          </ActionBar>
        </Sheet>
      )}
    </>
  )
}
