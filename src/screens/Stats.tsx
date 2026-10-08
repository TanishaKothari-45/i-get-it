import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { deviceToken } from '../lib/device'
import { PolicyLinks } from './Policy'

// The public numbers page at /stats (counts only). Copy is (agent) until Prateek rewrites it.
// 8 Oct: a dashboard. Each day's new visitors by channel with chapter 1 finishes, each channel since launch, and our
// own Instagram and X numbers. Two columns from 900 px, so a laptop screenshot reads as one board.

const CHANNELS = [
  { key: 'growthx', name: 'GrowthX community', col: '#3442b8', match: (s: string) => s === 'growthx' },
  { key: 'ig', name: 'Instagram', col: '#e8604c', match: (s: string) => /^(ig|ig_story|instagram\.com|l\.instagram\.com)$/.test(s) },
  { key: 'x', name: 'X', col: '#1b1a17', match: (s: string) => /^(x|t\.co|twitter\.com|x\.com)$/.test(s) },
  { key: 'dm', name: 'DMs', col: '#1f7a4d', match: (s: string) => s === 'dm' },
  { key: 'other', name: 'Other sites', col: '#f2a93b', match: () => true },
] as const
type Key = (typeof CHANNELS)[number]['key']
const chOf = (s: string): Key => CHANNELS.find((c) => c.match(s))!.key

const dayLabel = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
const fmt = (n: number) => n.toLocaleString('en-IN')

type Social = { day: string; platform: 'instagram' | 'x'; via: string; posts?: number; views?: number; reach?: number; likes?: number; comments?: number; shares?: number; saves?: number; follows?: number; profileVisits?: number; linkClicks?: number }
const SOCIAL_SHOWN: Record<'instagram' | 'x', [keyof Social, string][]> = {
  instagram: [['views', 'Views'], ['reach', 'Reach'], ['shares', 'Shares'], ['saves', 'Saves'], ['follows', 'Follows'], ['profileVisits', 'Profile visits']],
  x: [['views', 'Impressions'], ['likes', 'Likes'], ['shares', 'Reposts'], ['linkClicks', 'Link clicks'], ['profileVisits', 'Profile visits'], ['follows', 'Follows']],
}

export default function Stats() {
  const token = deviceToken()
  const s = useQuery(api.stats.summary, { deviceToken: token })
  const excludeMe = useMutation(api.stats.excludeMe)

  // the days since the first person came, at most the last 14
  const firstI = s ? s.days.findIndex((d) => d.visitors > 0) : -1
  const days = s ? s.days.slice(firstI < 0 ? s.days.length - 1 : firstI) : []
  const max = Math.max(1, ...days.map((d) => d.visitors))
  const lastI = days.length - 1

  const channels = CHANNELS.map((c) => ({ ...c, visitors: 0, started: 0, passed: 0 }))
  for (const x of s?.channels ?? []) { const c = channels.find((y) => y.key === chOf(x.source))!; c.visitors += x.visitors; c.started += x.started; c.passed += x.passed }
  const shownChannels = channels.filter((c) => c.visitors > 0 || c.key === 'ig' || c.key === 'x' || c.key === 'growthx').sort((a, b) => b.visitors - a.visitors)
  const vmax = Math.max(1, ...shownChannels.map((c) => c.visitors))

  return (
    <div className="shell stats-shell">
      <header className="top">
        <a className="wordmark" href="/" style={{ color: 'inherit', textDecoration: 'none' }}>I Get It<small>Seven chapters. Twenty minutes a night.</small></a>
      </header>
      <main>
        <h1>The numbers, in public.</h1>
        <p className="lede">Live counts for I Get It, updated as they happen. Counts only: no names, emails or topics. Anything that might be us is left out.</p>

        {!s ? <p className="note">Loading…</p> : (
          <>
            <div className="stats-grid">
                  <Stat n={s.visitorsAll} label="Visitors, all time" />
                  <Stat n={s.started} label="Started a handbook" />
                  <Stat n={s.passedChapter1} label="Finished chapter 1" />
                  <Stat n={s.visitorsToday} label="Visitors today" />
                  <Stat n={s.signups} label={`Signed up${s.signupsToday ? ` (${s.signupsToday} today)` : ''}`} />
                  {s.pay && <Stat n={s.pay.tapped} label="Tapped Pay (only you see this)" />}
                </div>

            <div className="stats-cols">
              <section>

                <h2 className="stats-h stats-h-first">New visitors each day, by where they came from</h2>
                <div className="sd-bars" role="img" aria-label={days.map((d) => `${dayLabel(d.day)}: ${d.visitors} new, ${d.passed} finished chapter 1`).join('; ')}>
                  {days.map((d, i) => (
                    <div key={d.day} className={`sd-bar${i === lastI ? ' sd-today' : ''}`}>
                      <span className="sd-n">{d.visitors || ''}</span>
                      <span className="sd-stack" style={{ height: `${(d.visitors / max) * 100}%` }}>
                        {CHANNELS.map((c) => {
                          const n = Object.entries(d.sources ?? {}).filter(([src]) => chOf(src) === c.key).reduce((a, [, v]) => a + v, 0)
                          return n ? <span key={c.key} style={{ flexGrow: n, background: c.col }} /> : null
                        })}
                      </span>
                      <span className="sd-day">{i === lastI ? 'Today' : dayLabel(d.day)}</span>
                      <span className="sd-pass">{d.passed ? `✓ ${d.passed}` : '–'}</span>
                    </div>
                  ))}
                </div>
                <ul className="sd-legend">
                  {shownChannels.map((c) => <li key={c.key}><span style={{ background: c.col }} />{c.name}</li>)}
                  <li className="sd-legend-pass">✓ finished chapter 1</li>
                </ul>
              </section>

              <section>
                <h2 className="stats-h stats-h-first">Each channel since launch</h2>
                <table className="sd-table">
                  <thead><tr><th scope="col">Came from</th><th scope="col">Visitors</th><th scope="col">Started</th><th scope="col">✓ ch 1</th></tr></thead>
                  <tbody>
                    {shownChannels.map((c) => (
                      <tr key={c.key}>
                        <th scope="row"><span className="sd-dot" style={{ background: c.col }} />{c.name}<span className="sd-meter"><span style={{ width: `${(c.visitors / vmax) * 100}%`, background: c.col }} /></span></th>
                        <td>{c.visitors}</td><td>{c.started}</td><td className="sd-good">{c.passed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

              </section>
            </div>

            <h2 className="stats-h">Our Instagram and X</h2>
            <div className="sd-social">
              {(['instagram', 'x'] as const).map((p) => <SocialCard key={p} platform={p} rows={(s.social as Social[]).filter((r) => r.platform === p)} />)}
            </div>

            <p className="note sd-foot">A person counts once, under the place they first came from, on the day they first came. Days are India time. Left out in case they're us: visits with no source, from LinkedIn, from our test setups, or tagged internal, and anyone whose first visit was the home-screen app.</p>
            <p className="note">
              {s.thisPhoneExcluded ? 'This phone is not counted.' : (
                <button type="button" className="quiet" style={{ padding: '12px 0', minHeight: 44 }} onClick={() => excludeMe({ deviceToken: token })}>
                  This is my phone: don't count it
                </button>
              )}
            </p>
          </>
        )}
      </main>
      <footer className="foot"><p><PolicyLinks /></p><p>Built in public for the GrowthX Build Sprint, October 2026.</p></footer>
    </div>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return <div className="stat"><span className="stat-n">{fmt(n)}</span><span className="stat-label">{label}</span></div>
}

function SocialCard({ platform, rows }: { platform: 'instagram' | 'x'; rows: Social[] }) {
  const name = platform === 'instagram' ? 'Instagram' : 'X'
  const last = rows[rows.length - 1]
  const week = rows.slice(-7)
  const wmax = Math.max(1, ...week.map((r) => r.views ?? 0))
  return (
    <div className="sd-card">
      <div className="sd-card-head"><strong>{name}</strong>{last && <span>{dayLabel(last.day)}{last.posts ? `, ${last.posts} post${last.posts > 1 ? 's' : ''}` : ''}</span>}</div>
      {!last ? <p className="note">Numbers start soon, typed in each morning from {name}'s own insights.</p> : (
        <>
          <dl className="sd-metrics">
            {SOCIAL_SHOWN[platform].filter(([k]) => last[k] !== undefined).slice(0, 4).map(([k, label]) => (
              <div key={k}><dt>{label}</dt><dd>{fmt(last[k] as number)}</dd></div>
            ))}
          </dl>
          {week.length > 1 && <p className="sd-spark-label">{platform === 'x' ? 'Impressions' : 'Views'}, last {week.length} days</p>}
          {week.length > 1 && (
            <div className="sd-spark" aria-label={`${platform === 'x' ? 'Impressions' : 'Views'} per day: ${week.map((r) => `${dayLabel(r.day)} ${r.views ?? 0}`).join(', ')}`}>
              {week.map((r) => <span key={r.day} style={{ height: `${((r.views ?? 0) / wmax) * 100}%` }} title={`${dayLabel(r.day)}: ${r.views ?? 0}`} />)}
            </div>
          )}
          <p className="sd-via">{last.via === 'api' ? `From ${name}'s API.` : `Typed in from ${name}'s insights.`}</p>
        </>
      )}
    </div>
  )
}
