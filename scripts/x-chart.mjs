// The daily X chart: visitors per day by channel, chapter 1 finishes, yesterday vs the day before, and each
// channel since launch. 1200x675 (X shows it uncropped), in the app's colours and type.
// node scripts/x-chart.mjs <numbers.json from admin:numbers {"days":14}> <out.png> [day number]
// Optional: docs/launch/social-metrics.json adds Instagram and X post numbers for yesterday when they exist:
//   { "2026-10-07": { "ig": { "views": 0, "reach": 0, "shares": 0, "saves": 0 }, "x": { "impressions": 0, "engagements": 0, "link_clicks": 0 } } }
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const [inFile, outFile, dayNo] = process.argv.slice(2)
const N = JSON.parse(readFileSync(inFile, 'utf8'))

const C = { paper: '#faf7f0', ink: '#1b1a17', ink2: '#5f5b53', tint: '#e3ded2', mari: '#f2a93b', coral: '#e8604c', indigo: '#3442b8', green: '#1f7a4d' }
const CH = [
  { key: 'growthx', name: 'GrowthX community', col: C.indigo, match: (s) => s === 'growthx' },
  { key: 'ig', name: 'Instagram', col: C.coral, match: (s) => /^(ig|ig_story|instagram\.com|l\.instagram\.com)$/.test(s) },
  { key: 'x', name: 'X', col: C.ink, match: (s) => /^(x|t\.co|twitter\.com|x\.com)$/.test(s) },
  { key: 'dm', name: 'DMs', col: C.green, match: (s) => s === 'dm' },
  { key: 'other', name: 'Direct and other', col: C.mari, match: () => true },
]
const SKIP = (s) => /^(localhost|admintest)/.test(s)
// Shaktimaan's 3 test runs on 6 Oct (one passed chapter 1) aren't real readers; same correction as x-nightly.sh
const ADJ = [{ day: '2026-10-06', source: 'direct', visitors: 1, started: 3, opened: 1, passed: 1 }]

const IST = (ms) => new Date(ms + 5.5 * 3600e3).toISOString().slice(0, 10)
const today = IST(Date.now())
const rows = N.daySources.filter((r) => !SKIP(r.source)).map((r) => ({ ...r }))
for (const a of ADJ) { const r = rows.find((x) => x.day === a.day && x.source === a.source); if (r) for (const k of ['visitors', 'started', 'opened', 'passed']) r[k] = Math.max(0, r[k] - a[k]) }
const chOf = (s) => CH.find((c) => c.match(s)).key

// complete days only, from the first day anyone came
const allDays = [...new Set(N.days.map((d) => d.day))].filter((d) => d < today)
const first = allDays.find((d) => rows.some((r) => r.day === d && r.visitors > 0)) ?? allDays[allDays.length - 1]
const days = allDays.filter((d) => d >= first)
const per = days.map((d) => {
  const by = Object.fromEntries(CH.map((c) => [c.key, 0])); let passed = 0, started = 0, opened = 0
  for (const r of rows.filter((x) => x.day === d)) { by[chOf(r.source)] += r.visitors; passed += r.passed; started += r.started; opened += r.opened }
  return { day: d, by, total: Object.values(by).reduce((a, b) => a + b, 0), passed, started, opened }
})
const since = Object.fromEntries(CH.map((c) => [c.key, { v: 0, p: 0, s: 0 }]))
for (const r of rows.filter((x) => x.day < today)) { const k = chOf(r.source); since[k].v += r.visitors; since[k].p += r.passed; since[k].s += r.started }

const y = per[per.length - 1], yb = per[per.length - 2]
const label = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
const delta = (a, b) => (b == null ? '' : a === b ? 'same as the day before' : `${a > b ? '▲ up' : '▼ down'} from ${b} on ${label(per[per.length - 2].day)}`)

// ---------- the bars ----------
const X0 = 70, Y0 = 510, BW = Math.min(84, 560 / per.length - 22), GAP = (600 - per.length * BW) / Math.max(1, per.length)
const max = Math.max(1, ...per.map((d) => d.total))
const sc = (v) => (v / max) * 290
let bars = ''
per.forEach((d, i) => {
  const x = X0 + GAP / 2 + i * (BW + GAP); let yy = Y0
  for (const c of CH) { const h = sc(d.by[c.key]); if (h > 0) { bars += `<rect x="${x}" y="${yy - h}" width="${BW}" height="${h}" fill="${c.col}"/>`; yy -= h } }
  const isY = i === per.length - 1
  bars += `<text x="${x + BW / 2}" y="${yy - 12}" class="n${isY ? ' hi' : ''}">${d.total}</text>`
  bars += `<text x="${x + BW / 2}" y="${Y0 + 30}" class="d${isY ? ' hi' : ''}">${label(d.day)}</text>`
  bars += `<text x="${x + BW / 2}" y="${Y0 + 58}" class="p">${d.passed ? `✓ ${d.passed}` : '–'}</text>`
})
let lx = X0
const legend = CH.filter((c) => since[c.key].v > 0 || ['growthx', 'ig', 'x'].includes(c.key)).map((c) => { const name = c.name.replace('Direct and other', 'Direct, other'), g = `<g transform="translate(${lx},${Y0 + 92})"><rect width="14" height="14" rx="3" fill="${c.col}" y="-12"/><text x="20" class="lg">${name}</text></g>`; lx += 20 + name.length * 8.2 + 30; return g }).join('')

// ---------- the right column ----------
const RX = 720
const pct = (p, v) => (v ? `${Math.round((100 * p) / v)}%` : '–')
const chRows = CH.filter((c) => since[c.key].v > 0 || ['ig', 'x'].includes(c.key)).sort((a, b) => since[b.key].v - since[a.key].v)
const vmax = Math.max(1, ...chRows.map((c) => since[c.key].v))
let table = ''
chRows.forEach((c, i) => {
  const s = since[c.key], yy = 418 + i * 38
  table += `<rect x="${RX}" y="${yy - 13}" width="10" height="10" rx="2" fill="${c.col}"/><text x="${RX + 18}" y="${yy - 3}" class="t">${c.name}</text>`
  table += `<rect x="${RX + 196}" y="${yy - 14}" width="${(150 * s.v) / vmax}" height="12" rx="3" fill="${c.col}" opacity=".85"/>`
  table += `<text x="${RX + 410}" y="${yy - 3}" class="t r">${s.v}</text><text x="${RX + 468}" y="${yy - 3}" class="t r b">${s.p}</text>`
})

const sm = existsSync('docs/launch/social-metrics.json') ? JSON.parse(readFileSync('docs/launch/social-metrics.json', 'utf8'))[y.day] : null
const fmt = (n) => Number(n).toLocaleString('en-IN')
const social = sm ? [sm.ig && `Instagram: ${fmt(sm.ig.views ?? 0)} views · ${fmt(sm.ig.shares ?? 0)} shares · ${fmt(sm.ig.saves ?? 0)} saves`, sm.x && `X: ${fmt(sm.x.impressions ?? 0)} impressions · ${fmt(sm.x.link_clicks ?? 0)} link clicks`].filter(Boolean).join('   |   ') : ''

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=block">
<style>html,body{margin:0;background:${C.paper}}svg{display:block}text{font-family:'Bricolage Grotesque',sans-serif;fill:${C.ink}}
.h{font-size:40px;font-weight:800;letter-spacing:-.03em}.s{font-size:19px;fill:${C.ink2}}.n{font-size:22px;font-weight:700;text-anchor:middle}
.d{font-size:17px;fill:${C.ink2};text-anchor:middle}.p{font-size:16px;font-weight:700;fill:${C.green};text-anchor:middle}.hi{fill:${C.ink};font-weight:800}
.lg{font-size:15px;fill:${C.ink2}}.k{font-size:15px;font-weight:700;letter-spacing:.06em;fill:${C.ink2}}.big{font-size:64px;font-weight:800;letter-spacing:-.04em}
.dl{font-size:17px;font-weight:600}.t{font-size:17px}.r{text-anchor:end}.b{font-weight:800;fill:${C.green}}.f{font-size:14px;fill:${C.ink2}}</style></head><body>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
<rect width="1200" height="675" fill="${C.paper}"/>
<text x="${X0}" y="74" class="h">Day ${dayNo ?? ''} of building I Get It in public</text>
<text x="${X0}" y="106" class="s">Who came each day, from where, and who finished chapter 1 (✓).</text>
<line x1="${X0}" x2="${X0 + 600}" y1="${Y0}" y2="${Y0}" stroke="${C.tint}" stroke-width="2"/>
${bars}${legend}
<text x="${RX}" y="170" class="k">YESTERDAY, ${label(y.day).toUpperCase()}</text>
<text x="${RX}" y="236" class="big">${y.total}</text><text x="${RX + 12 + String(y.total).length * 38}" y="236" class="t">visitors</text>
<text x="${RX}" y="266" class="dl" fill="${yb && y.total < yb.total ? C.coral : C.green}">${delta(y.total, yb?.total)}</text>
<text x="${RX + 250}" y="236" class="big" fill="${C.green}">${y.passed}</text><text x="${RX + 262 + String(y.passed).length * 38}" y="236" class="t">finished ch 1</text>
<text x="${RX + 250}" y="266" class="dl">${y.opened ? `of ${y.opened} who opened it` : ''}</text>
<text x="${RX}" y="350" class="k">EACH CHANNEL SINCE LAUNCH</text>
<text x="${RX + 410}" y="380" class="f r">visitors</text><text x="${RX + 468}" y="380" class="f r">✓ ch 1</text>
${table}
${social ? `<text x="${RX}" y="${418 + chRows.length * 38 + 14}" class="f">${social}</text>` : ''}
<text x="${X0}" y="652" class="f">Numbers from the app's own visit log, my devices left out. sensible-mongoose-624.convex.site</text>
</svg></body></html>`

const dir = mkdtempSync(join(tmpdir(), 'xchart-')), page = join(dir, 'chart.html')
writeFileSync(page, html)
// Chrome writes the screenshot and sometimes stays open afterwards, so it gets 25 s and is then stopped
try { execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--hide-scrollbars', '--force-color-profile=srgb', `--user-data-dir=${join(dir, 'profile')}`, '--window-size=1200,675', '--virtual-time-budget=6000', `--screenshot=${outFile}`, 'file://' + page], { stdio: 'ignore', timeout: 25000, killSignal: 'SIGKILL' }) } catch {}
if (!existsSync(outFile)) { console.error('chart not written'); process.exit(1) }
console.log(JSON.stringify({ out: outFile, yesterday: y, dayBefore: yb ?? null, since }))
