import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { deviceToken } from '../lib/device'
import ActionBar from '../components/ActionBar'
import Sheet from '../components/Sheet'
import { checkout, type Paid } from '../lib/razorpay'

type PlanKind = 'month' | 'year'
type Tier = { tier: number; month: number; year: number; size: number | null; left: number | null; open: boolean }
type Pay = { live: boolean; mode: 'test' | 'live' | null; customers: number; openTier: number; tier: number; kept: boolean; price: { month: number; year: number }; payments: number; plan: PlanKind | null; paidUntil: number | null }
type Plans = { tiers: Tier[]; freeDays: number; days: { month: number; year: number }; locked: { price: number; at: number } | null; signedIn: boolean; pay: Pay }
type Order = { keyId: string; orderId: string; amount: number; month: number; plan: PlanKind; email?: string }
type Props = { plans: Plans | undefined; onLock: () => Promise<{ price: number; already: boolean }>; onOrder: (plan: PlanKind) => Promise<Order>; onConfirm: (p: Paid) => Promise<{ ok: boolean }>; onBack: () => void; onSignIn: () => void; fromDone?: boolean }

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
const WHO = ['First 50', 'Next 100', 'Next 200', 'After that']

// Free vs member, side by side (membership.ts LIMITS are the numbers that are enforced; keep these in step).
const COMPARE: { what: string; free: string; member: string }[] = [
  { what: 'Topics you type', free: '1 handbook', member: '3 on the go at a time (up to 6 new a month)' },
  { what: 'Your own handbooks', free: '1 new chapter a day', member: 'Up to 7 new chapters a day, across everything' },
  { what: 'Ready and shared handbooks', free: '1 new chapter a day from each of up to 3', member: 'As many as you like' },
  { what: 'Web-checked answers', free: '3 a week', member: '30 a month' },
  { what: 'Say it simpler', free: '10 a day', member: 'As many as you like' },
  { what: 'Print or save as PDF', free: '–', member: 'Any of your handbooks' },
  { what: 'Coming next', free: '–', member: 'Your learning dashboard with streaks, Indian languages, days 8 to 28: members first' },
]

// Early-bird pricing (7 Oct): the first 50 paying readers pay least, and keep that price while they keep paying.
// Every payment is one-time (a month or a year) and nothing renews by itself. Numbers come from convex/pricing.ts;
// the spots left are the real count. Copy is (agent) until Prateek rewrites it.
export default function Pricing({ plans, onLock, onOrder, onConfirm, onBack, onSignIn, fromDone }: Props) {
  const ms = useQuery(api.membership.status, { deviceToken: deviceToken() })
  const [busy, setBusy] = useState(false)
  const [plan, setPlan] = useState<PlanKind>('month')
  const [sheet, setSheet] = useState(false)
  const [paidSheet, setPaidSheet] = useState<{ amount: number; plan: PlanKind } | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  if (!plans) return <div className="splash">Loading…</div>
  const p = plans.pay
  const live = p.live
  const price = p.price[plan]
  const saving = p.price.month * 12 - p.price.year
  const done = plans.locked
  const pay = async () => {
    setBusy(true)
    try { await onLock(); setSheet(true) } finally { setBusy(false) }
  }
  // Razorpay: order on our server at this person's tier price, money on Razorpay's sheet, and the days count only
  // once the server has checked Razorpay's signature.
  const payNow = async () => {
    setPayError(null); setBusy(true)
    try {
      const o = await onOrder(plan)
      const reply = await checkout(o, (why) => setPayError(`${why} Nothing was charged. Try again, or another way to pay.`))
      if (!reply) return
      const r = await onConfirm(reply)
      if (r.ok) { setPayError(null); setPaidSheet({ amount: o.amount, plan: o.plan }) }
      else setPayError("Razorpay took the payment but we couldn't confirm it yet. It usually shows up here in a minute; if not, write to us and we'll sort it out.")
    } catch (e: any) {
      const m = String(e?.message ?? e)
      setPayError(m.includes('busy') ? 'Too many tries just now. Wait a few minutes and try again.'
        : m.includes('Already paid') ? "You're already paid up."
        : "Couldn't open the payment just now. Nothing was charged; try again in a minute.")
    } finally { setBusy(false) }
  }
  const until = (t: number) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <>
      {ms?.member && ms.until ? (
        <>
          <p className="sub" style={{ marginTop: 10 }}><span className="member-mark" style={{ marginLeft: 0 }}>Member</span></p>
          <h1>You're a member. Thank you.</h1>
          <p className="lede">Covered until {until(ms.until)}. Here's everything that's switched on for you.</p>
          <ul className="unlocks">
            {COMPARE.filter((r) => r.member !== r.free).map((r) => <li key={r.what}><span className="unlock-on" aria-hidden="true">✓</span><strong>{r.what}:</strong> {r.member}</li>)}
          </ul>
          <p className="note">Your own handbooks on the go: {ms.typed.used} of {ms.typed.limit}. Going back to chapters you've opened is always free.</p>
        </>
      ) : (
        <>
          <p className="sub" style={{ marginTop: 10 }}>{fromDone ? 'You finished week 1' : 'Pricing'}</p>
          <h1>Come early, pay less, for as long as you stay.</h1>
          <p className="lede">Free: one handbook of your own, a chapter a night, plus a taste of the ready ones every day. No card asked. Members read more, and the first 50 pay the least.</p>
          <table className="compare">
            <thead><tr><th></th><th>Free</th><th>Member</th></tr></thead>
            <tbody>{COMPARE.map((r) => <tr key={r.what}><th scope="row">{r.what}</th><td>{r.free}</td><td>{r.member}</td></tr>)}</tbody>
          </table>
          <p className="note">A "new chapter" is one you open for the first time. Going back to chapters you've opened is always free.</p>
        </>
      )}

      <ol className="tiers">
        {plans.tiers.map((t) => (
          <li key={t.tier} className={t.open ? 'open' : t.left === 0 ? 'full' : ''}>
            <span className="tier-who">{WHO[t.tier - 1]}</span>
            <span className="tier-price"><b>{inr(t.month)}</b> a month <span>or {inr(t.year)} a year</span></span>
            <span className="tier-left">{t.left === 0 ? 'Full' : t.open ? (t.left === null ? 'Open now' : `${t.left} of ${t.size} left`) : t.left === null ? '' : `${t.size} spots`}</span>
          </li>
        ))}
      </ol>
      <p className="note" style={{ textAlign: 'center' }}>Spots left are counted live from real payments.</p>

      <p className="once"><strong>One-time payment. No auto-renew.</strong> You pay for a month or a year, once. Nothing is charged again unless you tap Pay again.</p>

      <ul className="rules">
        <li><strong>Free stays free.</strong> Your own handbook, a chapter a day, and everything you've already opened stay yours whether you pay or not.</li>
        <li><strong>A year saves {inr(saving)}.</strong> {inr(p.price.year)} once, instead of {inr(p.price.month)} twelve times.</li>
        <li><strong>Your price stays yours.</strong> Pay again within 7 days of your time running out and you keep it, even after it goes up for newcomers.</li>
        <li><strong>Nothing to cancel.</strong> If you don't pay again, you aren't charged. Your handbooks and progress stay yours.</li>
      </ul>

      {live ? (
        <>
          {p.mode === 'test' && <p className="note" style={{ textAlign: 'center' }}>Test mode: no real money moves.</p>}
          {p.paidUntil ? <p className="locked">Paid. You're covered until {until(p.paidUntil)}.</p>
            : p.kept ? <p className="locked">Your early price is kept: {inr(p.price.month)} a month or {inr(p.price.year)} a year.</p> : null}
          {!p.paidUntil && (
            <div className="chips" role="group" aria-label="Pay for">
              <button type="button" className="chip" aria-pressed={plan === 'month'} onClick={() => setPlan('month')}>A month · {inr(p.price.month)}</button>
              <button type="button" className="chip" aria-pressed={plan === 'year'} onClick={() => setPlan('year')}>A year · {inr(p.price.year)}</button>
            </div>
          )}
          {payError && <p className="error">{payError}</p>}
          <ActionBar busy={busy}>
            {p.paidUntil ? <button className="btn btn-ghost" onClick={onBack}>Back</button>
              : !plans.signedIn ? <><button className="btn" onClick={onSignIn}>Sign in to pay {inr(price)}</button><button type="button" className="quiet" onClick={onBack}>I'll decide later</button></>
              : <><button className="btn" disabled={busy} onClick={payNow}>Pay {inr(price)} for one {plan}</button><button type="button" className="quiet" onClick={onBack}>I'll decide later</button></>}
          </ActionBar>
          {!plans.signedIn && <p className="note" style={{ textAlign: 'center' }}>Sign in first, so what you pay for stays with you on any phone.</p>}
        </>
      ) : (
        <>
          {done && <p className="locked">You tapped Pay at {inr(done.price)} a month. Payments aren't live yet, so nothing was charged.</p>}
          <ActionBar busy={busy}>
            {done ? <button className="btn btn-ghost" onClick={onBack}>Back</button> : (
              <>
                <button className="btn" disabled={busy} onClick={pay}>Pay {inr(p.price.month)} a month</button>
                <button type="button" className="quiet" onClick={onBack}>I'll decide later</button>
              </>
            )}
          </ActionBar>
        </>
      )}

      {paidSheet !== null && (
        <Sheet onClose={() => setPaidSheet(null)}>
          <h2>Paid. Thank you.</h2>
          <p>{inr(paidSheet.amount)} for one {paidSheet.plan}{p.mode === 'test' ? ' (test mode, no real money moved)' : ''}. Razorpay emails the receipt. It was a one-time payment: nothing renews by itself.</p>
          <ActionBar><button className="btn" onClick={() => setPaidSheet(null)}>Back to reading</button></ActionBar>
        </Sheet>
      )}

      {sheet && (
        <Sheet onClose={() => setSheet(false)}>
          <h2>Payments aren't live yet.</h2>
          <p>You weren't charged, and no card was asked for. Thanks for tapping Pay: your price of {inr(p.price.month)} a month is saved, and we'll ask before anything is charged.</p>
          <ActionBar>
            <button className="btn" onClick={() => setSheet(false)}>Got it</button>
          </ActionBar>
        </Sheet>
      )}
    </>
  )
}
