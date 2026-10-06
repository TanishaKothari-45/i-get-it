import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
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

          <ProviderSwitch />
          <LibraryCard />

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

          <div className="adm-grid">
            <section className="adm-card">
              <h2>Why people stop</h2>
              <p className="note">Each visitor's most likely reason, from what they did last.</p>
              <ul className="adm-list">{d.reasons.map((r) => <li key={r.reason}><span>{r.reason}</span><b>{r.n}</b></li>)}</ul>
            </section>
            <section className="adm-card">
              <h2>Devices</h2>
              <ul className="adm-list">{d.devices.map((x) => <li key={x.device}><span>{x.device === 'unknown' ? 'Unknown (before tracking)' : x.device}</span><b>{x.n}</b></li>)}</ul>
            </section>
          </div>

          <section className="adm-card adm-wide">
            <h2>Each person's path</h2>
            <p className="note">Latest 50 visitors. Tap one to see everything they did, in order.</p>
            <div className="adm-journeys">
              {d.recent.map((r) => (
                <details key={r.visitor + r.first} className="adm-j">
                  <summary>
                    <span className="adm-j-when">{time(r.first)}</span>
                    <span className="adm-j-tag">{r.source}</span>
                    <span className="adm-j-tag">{r.device ?? '?'}</span>
                    <span className="adm-j-tag">{secs(r.spentS)}</span>
                    <span className="adm-j-topic">{r.topic ?? ''}</span>
                    <span className="adm-j-reason">{r.reason}</span>
                  </summary>
                  <ol className="adm-j-steps">
                    {r.timeline.length === 0 ? <li><span>—</span>No page activity recorded.</li> : r.timeline.map((x, k) => <li key={k}><span>{x.t < 0 ? '' : `+${secs(x.t)}`}</span>{x.what}</li>)}
                  </ol>
                </details>
              ))}
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
  const [flow, setFlow] = useState<'signIn' | 'signUp'>('signIn')
  if (signedIn) return (
    <section className="adm-card"><h2>Owner only</h2><p className="note">This account isn't on the owner list.</p>
      <button type="button" className="quiet" onClick={() => signOut()}>Sign out and use another account</button></section>
  )
  return (
    <section className="adm-card" style={{ maxWidth: 420 }}>
      <h2>Owner only</h2>
      <p className="note">{flow === 'signIn' ? 'Sign in with the owner email.' : 'Create the account for the owner email. Use at least 8 characters for the password.'}</p>
      <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(null); try { await signIn('password', { email: email.trim(), password, flow }) } catch { setError(flow === 'signIn' ? "That email and password don't match." : "Couldn't create it. The password needs at least 8 characters, or this email already has an account.") } finally { setBusy(false) } }}>
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" style={{ marginTop: 12 }} />
        <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" style={{ marginTop: 10 }} />
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={busy} style={{ marginTop: 14 }}>{busy ? 'One moment…' : flow === 'signIn' ? 'Sign in' : 'Create the owner account'}</button>
      </form>
      <button type="button" className="quiet" onClick={() => { setFlow(flow === 'signIn' ? 'signUp' : 'signIn'); setError(null) }}>{flow === 'signIn' ? 'No account yet? Create the owner account' : 'Already have one? Sign in'}</button>
    </section>
  )
}

// The AI provider switch (6 Oct, Manthan's offer). Claude is the default and always one tap away.
function ProviderSwitch() {
  const st = useQuery(api.settings.providerStatus, {})
  const setProvider = useMutation(api.settings.setProvider)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!st) return null
  const flip = async (p: 'claude' | 'inference') => { setBusy(true); setError(null); try { await setProvider({ provider: p }) } catch (e: any) { setError(String(e?.message ?? e).includes('INFERENCE_API_KEY') ? 'Set INFERENCE_API_KEY on this server first.' : "Couldn't switch. Try again.") } finally { setBusy(false) } }
  return (
    <section className="adm-card adm-wide">
      <h2>AI provider</h2>
      <p className="note">Plans, chapters, fact checks, Say it simpler, teach-backs and picture scenes use this. Ask or object stays on Claude (its web search is Claude's).{st.since ? ` Switched ${time(st.since)}.` : ''}</p>
      <div className="adm-tabs" role="group" aria-label="AI provider" style={{ marginTop: 10 }}>
        <button type="button" aria-pressed={st.provider === 'claude'} disabled={busy} onClick={() => flip('claude')}>Claude (Anthropic)</button>
        <button type="button" aria-pressed={st.provider === 'inference'} disabled={busy || !st.inferenceKeySet} onClick={() => flip('inference')}>DeepSeek v4 Pro (The Inference Company)</button>
      </div>
      {!st.inferenceKeySet && <p className="note">The Inference Company key isn't set on this server yet.</p>}
      {st.provider === 'inference' && <p className="note">Readers' topics and chapters now go to The Inference Company. Switch back to Claude any time; chapters already written stay as they are.</p>}
      {error && <p className="error">{error}</p>}
    </section>
  )
}

// The shared library (6 Oct): what other readers can start from Explore. Unpublish anything with one tap.
function LibraryCard() {
  const rows = useQuery(api.library.adminList, {})
  const set = useMutation(api.library.setPublished)
  if (!rows) return null
  return (
    <section className="adm-card adm-wide">
      <h2>Shared library</h2>
      <p className="note">Typed topics whose plan and chapter 1 passed the privacy check. Chapters 2 to 7 stay personal. {rows.filter((r) => r.published).length} shared of {rows.length}.</p>
      {rows.length === 0 ? <p className="note">Nothing yet. The next typed topic that passes the check appears here.</p> : (
        <div className="adm-scroll">
          <table className="adm-table">
            <thead><tr><th>Topic</th><th>Goal</th><th>Mode</th><th>Starts</th><th>Passed ch 1</th><th>Check</th><th></th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td>{r.topic}</td><td>{r.goal ?? ''}</td><td>{r.mode ?? ''}</td><td>{r.starts}</td><td>{r.passes}</td><td><small>{r.why ?? ''}</small></td>
                <td>
                  <button type="button" className="quiet" onClick={() => set({ id: r.id, published: !r.published })}>{r.published ? 'Shared · hide' : 'Hidden · share'}</button>{' '}
                  {r.published && <button type="button" className="quiet" onClick={() => set({ id: r.id, pick: !r.pick })}>{r.pick ? 'Pick ✓' : 'Make pick'}</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  )
}
