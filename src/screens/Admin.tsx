import { useState } from 'react'
import { useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../convex/_generated/api'

// The owner's dashboard at /admin: where visitors drop off, from landing to sign-up. The server checks the owner
// (STATS_OWNER_EMAILS); anyone else gets the sign-in box and nothing else.
const WINDOWS = [{ d: 1, label: 'Today' }, { d: 7, label: '7 days' }, { d: 30, label: '30 days' }, { d: 0, label: 'All time' }]
const SECTION_NAMES: Record<string, string> = { hero: 'Top (box)', saved: '"You saved the reel"', steps: 'How tonight works', demo: 'Demo chapter', path: 'Seven nights', shelf: 'Ready tonight shelf', offer: 'Price', final: 'Box again (bottom)' }
const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0)
const time = (t: number) => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const secs = (s: number | null) => (s === null ? '—' : s < 90 ? `${s}s` : `${Math.round(s / 60)} min`)

export default function Admin() {
  const [days, setDays] = useState(1)
  const d = useQuery(api.admin.dashboard, { days })

  return (
    <div className="adm">
      <header className="adm-top">
        <a href="/" className="wordmark" style={{ color: 'inherit', textDecoration: 'none' }}>I Get It · Admin</a>
        <div className="adm-tabs" role="group" aria-label="Time window">
          {WINDOWS.map((w) => <button key={w.d} type="button" aria-pressed={days === w.d} onClick={() => setDays(w.d)}>{w.label}</button>)}
        </div>
      </header>

      {d === undefined ? <p className="note">Loading…</p> : d.denied ? <OwnerSignIn signedIn={d.signedIn} /> : (
        <>
          <p className="note">Updated live. Your own phones and accounts are left out. {d.trackingSince ? `Landing steps (marked •) are counted from ${time(d.trackingSince)}, when page tracking began.` : 'Landing steps (marked •) start counting from the next visit.'}</p>

          <section className="adm-card adm-wide">
            <h2>Funnel</h2>
            <div className="adm-funnel">
              {d.funnel.map((f, i) => {
                const base = d.funnel[0].n
                const prev = i > 0 ? d.funnel[i - 1] : null
                const of = f.tracked ? (f as any).of as number : base
                const drop = prev && !f.tracked && !prev.tracked ? prev.n - f.n : null
                return (
                  <div key={f.step} className="adm-frow">
                    <span className="adm-flabel">{f.step}{f.tracked ? ' •' : ''}</span>
                    <span className="adm-fbar"><i style={{ width: `${pct(f.n, of)}%` }} /></span>
                    <span className="adm-fn"><b>{f.n}</b> <small>{pct(f.n, of)}%{f.tracked ? ` of ${of}` : ''}</small></span>
                    <span className="adm-fdrop">{drop ? `−${drop}` : ''}</span>
                  </div>
                )
              })}
            </div>
          </section>

          <div className="adm-grid">
            <section className="adm-card">
              <h2>How far down the landing page</h2>
              {d.sections.map((s) => (
                <div key={s.section} className="adm-frow small">
                  <span className="adm-flabel">{SECTION_NAMES[s.section] ?? s.section}</span>
                  <span className="adm-fbar"><i style={{ width: `${pct(s.n, s.of)}%` }} /></span>
                  <span className="adm-fn"><b>{s.n}</b> <small>{pct(s.n, s.of)}%</small></span>
                </div>
              ))}
            </section>

            <section className="adm-card">
              <h2>How handbooks get started</h2>
              {d.via.length === 0 ? <p className="note">None yet in this window.</p> : (
                <ul className="adm-list">{d.via.map((v) => <li key={v.via}><span>{v.via === 'box' ? 'Typed in the box' : v.via === 'row' ? 'Tapped the row under the box' : v.via === 'shelf' ? 'Tapped the shelf lower down' : v.via}</span><b>{v.n}</b></li>)}</ul>
              )}
              {d.tapped.length > 0 && <><h3>Ready topics tapped</h3><ul className="adm-list">{d.tapped.map((t) => <li key={t.topic}><span>{t.topic}</span><b>{t.n}</b></li>)}</ul></>}
            </section>

            <section className="adm-card">
              <h2>Waits</h2>
              <ul className="adm-list">
                <li><span>Typed topic → plan on screen (median)</span><b>{secs(d.waits.planLive)}</b></li>
                <li><span>Ready topic → plan on screen (median)</span><b>{secs(d.waits.planReady)}</b></li>
                <li><span>Plan on screen → chapter 1 opened (median)</span><b>{secs(d.waits.toCh1)}</b></li>
                <li><span>Typed a topic, never opened chapter 1</span><b>{d.waits.leftWhileWriting}</b></li>
              </ul>
            </section>

            <section className="adm-card">
              <h2>Where chapter 1 loses people</h2>
              <p className="note">The card each person is on, among those who opened chapter 1 and haven't passed it.</p>
              {d.stuck.length === 0 ? <p className="note">Nobody stuck in this window.</p> : (
                <ul className="adm-list">{d.stuck.sort((a, b) => a.card - b.card).map((s, i) => <li key={i}><span>Card {s.card}{s.of ? ` of ${s.of}` : ''}</span><span className="adm-mini"><i style={{ width: `${pct(s.card, s.of || 12)}%` }} /></span></li>)}</ul>
              )}
            </section>
          </div>

          <section className="adm-card adm-wide">
            <h2>By source</h2>
            <table className="adm-table">
              <thead><tr><th>Source</th><th>Visitors</th><th>Started</th><th>Opened ch 1</th><th>Passed ch 1</th><th>Signed up</th></tr></thead>
              <tbody>{d.sources.map((s) => <tr key={s.source}><td>{s.source}</td><td>{s.visitors}</td><td>{s.started} <small>{pct(s.started, s.visitors)}%</small></td><td>{s.opened}</td><td>{s.passed} <small>{pct(s.passed, s.visitors)}%</small></td><td>{s.signedUp}</td></tr>)}</tbody>
            </table>
          </section>

          <section className="adm-card adm-wide">
            <h2>Topics</h2>
            <table className="adm-table">
              <thead><tr><th>Topic</th><th></th><th>Started</th><th>Opened ch 1</th><th>Passed ch 1</th></tr></thead>
              <tbody>{d.topics.map((t) => <tr key={t.topic}><td>{t.topic}</td><td><small>{t.ready ? 'ready' : 'typed'}</small></td><td>{t.started}</td><td>{t.opened}</td><td>{t.passed}</td></tr>)}</tbody>
            </table>
          </section>

          <section className="adm-card adm-wide">
            <h2>Latest visitors</h2>
            <div className="adm-scroll">
              <table className="adm-table">
                <thead><tr><th>When</th><th>Source</th><th>Landing</th><th>Box</th><th>Started</th><th>Topic</th><th>Plan</th><th>Chapter 1</th><th>Passed</th><th>Signed up</th></tr></thead>
                <tbody>{d.recent.map((r) => (
                  <tr key={r.visitor + r.first}>
                    <td>{time(r.first)}</td><td>{r.source}</td>
                    <td>{r.landed ? (r.deepest ? SECTION_NAMES[r.deepest] ?? r.deepest : 'top only') : '—'}</td>
                    <td>{r.typed ? 'typed' : r.focused ? 'tapped' : r.landed ? 'no' : '—'}</td>
                    <td>{r.started ? (r.via === 'box' ? 'typed' : r.via ?? 'yes') : 'no'}</td>
                    <td>{r.topic ?? ''}</td>
                    <td>{r.plan ? 'yes' : r.started ? 'waiting' : ''}</td>
                    <td>{r.passed ? 'done' : r.openedCh1 ? (r.ch1Card ? `card ${r.ch1Card}${r.ch1Of ? `/${r.ch1Of}` : ''}` : 'opened') : r.started ? 'no' : ''}</td>
                    <td>{r.passed || ''}</td><td>{r.signedUp ? 'yes' : ''}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>

          <section className="adm-card adm-wide">
            <h2>By day</h2>
            <table className="adm-table">
              <thead><tr><th>Day</th><th>New visitors</th><th>Handbooks started</th><th>Passed ch 1</th></tr></thead>
              <tbody>{d.days.slice().reverse().map((x) => <tr key={x.day}><td>{x.day}</td><td>{x.visitors}</td><td>{x.started}</td><td>{x.passed}</td></tr>)}</tbody>
            </table>
          </section>
        </>
      )}
    </div>
  )
}

function OwnerSignIn({ signedIn }: { signedIn: boolean }) {
  const { signIn, signOut } = useAuthActions()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (signedIn) return (
    <section className="adm-card"><h2>Owner only</h2><p className="note">This account isn't on the owner list.</p>
      <button type="button" className="quiet" onClick={() => signOut()}>Sign out and use another account</button></section>
  )
  return (
    <section className="adm-card" style={{ maxWidth: 420 }}>
      <h2>Owner only</h2>
      <p className="note">Sign in with the owner email.</p>
      <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(null); try { await signIn('password', { email: email.trim(), password, flow: 'signIn' }) } catch { setError("That email and password don't match.") } finally { setBusy(false) } }}>
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" style={{ marginTop: 12 }} />
        <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" style={{ marginTop: 10 }} />
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={busy} style={{ marginTop: 14 }}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </section>
  )
}
