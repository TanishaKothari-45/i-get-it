import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { deviceToken } from '../lib/device'

// The public numbers page at /stats (counts only). Copy is (agent) until Prateek rewrites it.
export default function Stats() {
  const token = deviceToken()
  const s = useQuery(api.stats.summary, { deviceToken: token })
  const excludeMe = useMutation(api.stats.excludeMe)
  const max = Math.max(1, ...(s?.days ?? []).map((d) => d.visitors))

  return (
    <div className="shell">
      <header className="top">
        <a className="wordmark" href="/" style={{ color: 'inherit', textDecoration: 'none' }}>I Get It<small>Seven chapters. Twenty minutes a night.</small></a>
      </header>
      <main>
        <h1>The numbers, in public.</h1>
        <p className="lede">Live counts for I Get It, updated as they happen. Counts only: no names, emails or topics. My own phones and accounts are left out.</p>

        {!s ? <p className="note">Loading…</p> : (
          <>
            <div className="stats-grid">
              <Stat n={s.visitorsToday} label="Visitors today" />
              <Stat n={s.visitorsAll} label="Visitors, all time" />
              <Stat n={s.started} label="Started a handbook" />
              <Stat n={s.passedChapter1} label="Passed chapter 1" />
              <Stat n={s.signups} label={`Signed up${s.signupsToday ? ` (${s.signupsToday} today)` : ''}`} />
              {s.pay && <Stat n={s.pay.tapped} label="Tapped Pay (only you see this)" />}
              {s.pay && <Stat n={s.pay.freeSpotsClaimed} label="Free spots claimed, of 25 (only you)" />}
            </div>

            <h2 className="stats-h">Visitors, last 14 days</h2>
            <div className="stats-bars" role="img" aria-label={`Daily visitors: ${s.days.map((d) => `${d.day.slice(5)} ${d.visitors}`).join(', ')}`}>
              {s.days.map((d) => (
                <div key={d.day} className="stats-bar">
                  <span className="stats-bar-n">{d.visitors || ''}</span>
                  <span className="stats-bar-fill" style={{ height: `${(d.visitors / max) * 100}%` }} />
                  <span className="stats-bar-day">{Number(d.day.slice(8))}</span>
                </div>
              ))}
            </div>
            <p className="note">One phone counts once a day. Days are India time.</p>

            {s.sources.length > 0 && (
              <>
                <h2 className="stats-h">Where visitors came from</h2>
                <ul className="stats-sources">
                  {s.sources.map((x) => <li key={x.name}><span>{x.name}</span><span>{x.n}</span></li>)}
                </ul>
              </>
            )}

            <p className="note" style={{ marginTop: 'var(--xl)' }}>
              {s.thisPhoneExcluded ? 'This phone is not counted.' : (
                <button type="button" className="quiet" style={{ padding: '12px 0', minHeight: 44 }} onClick={() => excludeMe({ deviceToken: token })}>
                  This is my phone: don't count it
                </button>
              )}
            </p>
          </>
        )}
      </main>
      <footer className="foot"><p>Built in public for GrowthX Build Sprint, October 2026.</p></footer>
    </div>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return <div className="stat"><span className="stat-n">{n.toLocaleString('en-IN')}</span><span className="stat-label">{label}</span></div>
}
