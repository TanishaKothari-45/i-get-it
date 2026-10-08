// A screenshot of the live public dashboard (/stats) for the daily X post, so the image is the page anyone can open.
// node scripts/stats-shot.mjs <out.png> [width]
// Waits until the numbers have loaded, then captures the board down to the footnote.
import { spawn } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const [out, width = '1200'] = process.argv.slice(2)
const URL = 'https://www.igetit.now/stats'
const PORT = 9471
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'stats-shot-'))}`, '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank'], { stdio: 'ignore' })
const done = (code) => { try { chrome.kill('SIGKILL') } catch {} process.exit(code) }
setTimeout(() => { console.error('timed out'); done(1) }, 60000)

let targets = []
for (let i = 0; i < 60 && !targets.length; i++) { try { targets = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).filter((t) => t.type === 'page') } catch {} await sleep(250) }
const ws = new WebSocket(targets[0].webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0; const waiting = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id) } })
const send = (method, params = {}) => new Promise((r) => { const i = ++id; waiting.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value

await send('Emulation.setDeviceMetricsOverride', { width: Number(width), height: 1000, deviceScaleFactor: 2, mobile: false })
await send('Page.navigate', { url: URL })
for (let i = 0; i < 80; i++) { await sleep(250); if (await ev(`!!document.querySelector('.stat-n') && document.fonts.status === 'loaded'`)) break }
await sleep(600)
// down to the end of the footnote, plus a margin
const h = await ev(`Math.ceil(document.querySelector('.sd-foot').getBoundingClientRect().bottom + window.scrollY + 14)`)
const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: Number(width), height: h, scale: 1 } })
writeFileSync(out, Buffer.from(r.result.data, 'base64'))
console.log(out, Number(width) + 'x' + h)
done(0)
