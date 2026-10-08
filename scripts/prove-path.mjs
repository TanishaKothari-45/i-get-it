// Proves the one path that matters, on the LIVE site, as a fresh phone: a link arrival → a ready topic → chapter 1
// read to the end → the Done screen → the sign-up wall → the sign-in screen. Plus the post link (?t=…&ch=2).
// No Playwright install (hundreds of MB): headless Chrome over its debugging protocol, like scripts/stats-shot.mjs.
// Run after every deploy:  node scripts/prove-path.mjs [base url]      (default https://www.igetit.now)
// Exit 0 = every step held. Exit 1 = a step failed; the line says which, with a screenshot in /tmp/prove-path/.
// Visits carry ?utm_source=internal so they never count in /stats. It never signs up, pays or types into Ask.
import { spawn } from 'node:child_process'
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const BASE = (process.argv[2] ?? 'https://www.igetit.now').replace(/\/$/, '')
const OUT = '/tmp/prove-path'; mkdirSync(OUT, { recursive: true })
const PORT = 9300 + Math.floor(Math.random() * 500)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'prove-'))}`, '--hide-scrollbars', '--window-size=390,844', 'about:blank'], { stdio: 'ignore' })
let failed = false
const done = (code) => { try { chrome.kill('SIGKILL') } catch {} process.exit(code) }
setTimeout(() => { console.log('FAIL timed out after 4 minutes'); done(1) }, 240000)

let targets = []
for (let i = 0; i < 80 && !targets.length; i++) { try { targets = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).filter((t) => t.type === 'page') } catch {} await sleep(250) }
const ws = new WebSocket(targets[0].webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0; const waiting = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id) } })
const send = (method, params = {}) => new Promise((r) => { const i = ++id; waiting.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); return r.result?.result?.value }
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' })
await send('Page.enable')
await send('Storage.clearDataForOrigin', { origin: BASE, storageTypes: 'all' }).catch(() => {})

const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }); const p = join(OUT, name + '.jpg'); writeFileSync(p, Buffer.from(r.result.data, 'base64')); return p }
// A step: wait up to `ms` for the condition (a JS expression) to be truthy; say what happened either way.
const step = async (what, cond, ms = 15000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { if (await ev(cond)) { console.log(`ok   ${what} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); return true } await sleep(300) }
  failed = true
  console.log(`FAIL ${what}: not seen within ${ms / 1000} s. Screenshot: ${await shot('fail-' + what.replace(/[^a-z0-9]+/gi, '-').toLowerCase())}`)
  return false
}
// Find a button or link by the words a person sees, and tap it.
const tap = (text) => ev(`(() => { const el = [...document.querySelectorAll('button, a')].find((e) => e.textContent.trim().startsWith(${JSON.stringify(text)})); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true })()`)
const goto = async (url) => { await send('Page.navigate', { url }); await sleep(1200) }

// ── Scenario 1: a stranger from a link, fresh phone ──────────────────────────────────────────────────────────
console.log(`\nScenario 1: fresh phone at ${BASE}`)
await goto(`${BASE}/?utm_source=internal`)
await step('landing shows the topic box and the ready topics', `!!document.querySelector('.lp-field input') && document.querySelectorAll('.lp-carousel button').length > 0`, 20000)
const topic = await ev(`document.querySelector('.lp-carousel button strong')?.textContent ?? ''`)
console.log(`     first ready topic: ${topic}`)
await ev(`document.querySelector('.lp-carousel button').click()`)
if (await step('chapter 1 opens as full-screen frames', `!!document.querySelector('.story') && /Chapter 1 of/.test(document.querySelector('.story-label')?.textContent ?? '')`, 20000)) {
  await step('the first frame has words', `(document.querySelector('.story-text, .story-q')?.textContent ?? '').length > 20`, 10000)
  await step('a picture is on the first frame', `!!document.querySelector('.story-pic img')`, 15000)
  // read to the end: tap "Tap →" until the finish button shows (at most 40 frames)
  let frames = 0
  for (; frames < 40; frames++) { if (await ev(`!!document.querySelector('.story-finish')`)) break; if (!(await tap('Tap'))) break; await sleep(450) }
  console.log(`     frames tapped through: ${frames}`)
  await step('the last frame offers "Finish chapter 1"', `!!document.querySelector('.story-finish')`, 5000)
  await tap('Finish chapter')
  if (await step('the Done screen says chapter 1 is done', `/Chapter 1 of \\d+: done/.test(document.querySelector('h1')?.textContent ?? '')`, 15000)) {
    await step('the rung bar shows one lit segment', `document.querySelectorAll('.rung span.on, .rung span.filling').length === 1`, 5000)
    await step('the sign-up wall is the main action ("Make a free account")', `[...document.querySelectorAll('button')].some((b) => b.textContent.trim().startsWith('Make a free account'))`, 5000)
    await step('and it is the only one (no doubled button)', `[...document.querySelectorAll('button')].filter((b) => b.textContent.trim().startsWith('Make a free account')).length === 1`, 2000)
    await step('the wall card names chapter 2 under the outcome line', `[...document.querySelectorAll('h2')].some((h) => /Chapter 2 is free with an account/.test(h.textContent))`, 2000)
    console.log(`     Done screenshot: ${await shot('done')}`)
    await tap('Make a free account')
    await step('the sign-in screen opens with an email field', `!!document.querySelector('#email') && (document.querySelector('h1')?.textContent ?? '').length > 0`, 10000)
    await step('sign-in has a way back ("Not now, back to the handbook")', `[...document.querySelectorAll('button')].some((b) => b.textContent.trim().startsWith('Not now'))`, 3000)
  }
}

// ── Scenario 2: a post link to chapter 2 of a ready topic, fresh phone ───────────────────────────────────────
// Decided 8 Oct night (Prateek, via session 55): the wall is by chapter number, so a ?ch=2 arrival on a fresh phone
// meets the sign-in screen with the reason card, and can step back. (A ch=1 link, and the link in bio, open content.)
console.log(`\nScenario 2: post link ?t=public-speaking&ch=2`)
await send('Storage.clearDataForOrigin', { origin: BASE, storageTypes: 'all' }).catch(() => {})
await goto(`${BASE}/?t=public-speaking&ch=2&utm_source=internal`)
await step('the link opens the topic, not the landing page', `!document.querySelector('.lp') && (!!document.querySelector('.story') || !!document.querySelector('.roadmap-hero') || !!document.querySelector('#email'))`, 25000)
await step('a fresh phone meets the sign-in wall with its reason card (decided rule)', `!!document.querySelector('#email') && !!document.querySelector('.why-here')`, 15000)
await step('the wall has a way back ("Not now")', `[...document.querySelectorAll('button')].some((b) => b.textContent.trim().startsWith('Not now'))`, 3000)
await tap('Not now')
await step('"Not now" lands in chapter 1 (a fresh handbook opens there), or on the handbook with chapter 1 openable', `/Chapter 1 of/.test(document.querySelector('.story-label')?.textContent ?? '') || (!!document.querySelector('.roadmap-hero') && [...document.querySelectorAll('button')].some((b) => /Start chapter 1|Pick up where you left off/.test(b.textContent)))`, 10000)
console.log(`     screenshot: ${await shot('post-link')}`)

console.log(failed ? '\nRESULT: FAIL (see the lines above)' : '\nRESULT: PASS, the path holds end to end')
done(failed ? 1 : 0)
