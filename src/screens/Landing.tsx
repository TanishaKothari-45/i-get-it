import { useEffect, useRef, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import Rich, { inline } from '../components/Rich'
import { track } from '../lib/track'
import { PolicyLinks } from './Policy'

// The landing page, for first-time visitors (DESIGN.md, Landing). A printed risograph poster that sells
// before it asks: the promise, the itch, how tonight works, a real chapter to tap, the seven nights,
// the ready topics, the price, and the box again. Headline and the line under it are Prateek's words;
// everything else is (agent) until he rewrites it.

type Level = 'new' | 'some'
type Voice = 'friend' | 'straight' | 'stories'
type Props = { onCreate: (topic: string, level: Level, voice: Voice) => Promise<void>; onExplore?: () => void }

type Frame =
  | { kind: 'picture' | 'teach' | 'example' | 'mistake' | 'try'; title?: string; text: string; picture: string | null }
  | { kind: 'exercise'; prompt: string; options: { id: string; text: string }[]; answer: string; whyNot: Record<string, string> }

type Shelf = { topic: string; outcome: string; cover: string | null; week: number; starts: number; passRate: number | null; trending: boolean; addedAt: number; mode: string | null; improved?: boolean }
type Pill = 'trending' | 'started' | 'finished' | 'new'
const PILLS: { key: Pill; label: string }[] = [{ key: 'trending', label: '🔥 Trending this week' }, { key: 'started', label: 'Most started' }, { key: 'finished', label: 'Most finished' }, { key: 'new', label: 'New' }]

// "Or start one tonight" as a carousel (6 Oct): pills sort it by real numbers, Surprise me shuffles it. One tap starts.
function Carousel({ items, busy, onPick, onExplore }: { items: Shelf[]; busy: boolean; onPick: (topic: string) => void; onExplore?: () => void }) {
  const hasTrending = items.some((i) => i.trending)
  const hasFinished = items.some((i) => i.passRate !== null)
  const pills = PILLS.filter((p) => (p.key !== 'trending' || hasTrending) && (p.key !== 'finished' || hasFinished))
  const [pill, setPill] = useState<Pill>(hasTrending ? 'trending' : 'started')
  const [seed, setSeed] = useState(0)
  const sorted = (() => {
    const xs = items.slice()
    if (seed) { for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]] } return xs }
    if (pill === 'trending') return xs.sort((a, b) => Number(b.trending) - Number(a.trending) || b.week - a.week)
    if (pill === 'started') return xs.sort((a, b) => b.week - a.week || b.starts - a.starts)
    if (pill === 'finished') return xs.sort((a, b) => (b.passRate ?? -1) - (a.passRate ?? -1))
    return xs.sort((a, b) => b.addedAt - a.addedAt)
  })()
  const tag = (it: Shelf) => it.trending ? '🔥 Trending' : it.improved ? '✨ Just improved' : pill === 'started' && it.week ? `${it.week} started this week` : pill === 'finished' && it.passRate !== null ? `${Math.round(it.passRate * 100)}% finish chapter 1` : pill === 'new' && Date.now() - it.addedAt < 7 * 864e5 ? 'New' : ''
  return (
    <div className="lp-quick">
      <p>Or start one tonight. It opens instantly:</p>
      <div className="lp-pills" role="group" aria-label="Sort">
        {pills.map((p) => <button key={p.key} type="button" aria-pressed={!seed && pill === p.key} onClick={() => { setSeed(0); setPill(p.key) }}>{p.label}</button>)}
        <button type="button" aria-pressed={!!seed} onClick={() => setSeed((x) => x + 1)}>🎲 Surprise me</button>
      </div>
      <ul className="lp-carousel">
        {sorted.slice(0, 12).map((it) => (
          <li key={it.topic}>
            <button type="button" onClick={() => onPick(it.topic)} disabled={busy}>
              <span className="lp-carousel-pic">{it.cover && <img src={it.cover} alt="" loading="lazy" />}{tag(it) && <em>{tag(it)}</em>}</span>
              <strong>{it.topic}</strong>
            </button>
          </li>
        ))}
      </ul>
      {onExplore && <button type="button" className="lp-explore" onClick={() => { track('submit', { via: 'explore_open' }); onExplore() }}>Explore everything →</button>}
    </div>
  )
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

export default function Landing({ onCreate, onExplore }: Props) {
  const c = useQuery(api.landing.content, {})
  const plans = useQuery(api.pricing.plans, {})
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState<Level>('new')
  const [voice, setVoice] = useState<Voice>('friend')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const heroInput = useRef<HTMLInputElement>(null)

  // For the owner's /admin funnel: the page was seen, and how far down each visitor got.
  useEffect(() => {
    track('land', undefined, 'land')
    // A section counts as reached once its top passes two thirds down the screen (sections that load later included).
    const check = () => document.querySelectorAll('.lp > section').forEach((el) => {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.66) return
      const name = [...el.classList].find((c) => c.startsWith('lp-'))?.slice(3) ?? 'section'
      track('section', { section: name }, 'section:' + name)
    })
    let t = 0
    const onScroll = () => { if (!t) t = window.setTimeout(() => { t = 0; check() }, 250) }
    check()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); window.clearTimeout(t) }
  }, [])

  const toBox = () => {
    window.scrollTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    setTimeout(() => heroInput.current?.focus({ preventScroll: true }), 400)
  }
  // A ready topic starts straight away: no typing, and it opens instantly (it's already written).
  const pick = async (t: string, via: 'row' | 'shelf') => {
    track('submit', { via, topic: t })
    setTopic(t); setError(null); setBusy(true)
    try { await onCreate(t, 'new', voice) }
    catch { setError("Couldn't start it just now. Try once more in a minute."); setBusy(false); toBox() }
  }
  const go = async () => {
    setError(null)
    if (topic.trim().length < 2) { setError('A few words is enough. What is it?'); toBox(); return }
    track('submit', { via: 'box', len: topic.trim().length })
    setBusy(true)
    try { await onCreate(topic.trim(), level, voice) }
    catch (e: any) { setError(String(e?.message ?? e).includes('busy') ? 'Busy right now. Try again in a few minutes.' : "Couldn't start it just now. Your line is still here; try once more in a minute."); setBusy(false) }
  }

  const form = (where: 'hero' | 'final') => (
    <form className={`lp-form lp-form-${where}`} onSubmit={(e) => { e.preventDefault(); go() }}>
      <label htmlFor={`lp-topic-${where}`} className="lp-visually-hidden">What do you keep meaning to learn?</label>
      <div className="lp-field">
        <input id={`lp-topic-${where}`} ref={where === 'hero' ? heroInput : undefined} value={topic} onChange={(e) => { setTopic(e.target.value); track('box_type', undefined, 'box_type') }} onFocus={() => track('box_focus', undefined, 'box_focus')}
          placeholder="Public speaking, the stock market, n8n…" autoComplete="off" enterKeyHint="go" disabled={busy} maxLength={200} />
        <button type="submit" disabled={busy}>{busy ? 'Finding your way…' : 'Show me the way'}</button>
      </div>
      {where === 'hero' && (
        <details className="lp-options">
          <summary>{level === 'new' ? 'New to this' : 'Know some'}, {voice === 'friend' ? 'talks like a friend' : voice === 'straight' ? 'straight to the point' : 'in stories'}. Change</summary>
          <div className="lp-seg" role="group" aria-label="Level">
            <button type="button" aria-pressed={level === 'new'} onClick={() => setLevel('new')}>New to this</button>
            <button type="button" aria-pressed={level === 'some'} onClick={() => setLevel('some')}>Know some</button>
          </div>
          <div className="lp-seg" role="group" aria-label="Voice">
            <button type="button" aria-pressed={voice === 'friend'} onClick={() => setVoice('friend')}>Like a friend</button>
            <button type="button" aria-pressed={voice === 'straight'} onClick={() => setVoice('straight')}>Straight</button>
            <button type="button" aria-pressed={voice === 'stories'} onClick={() => setVoice('stories')}>Stories</button>
          </div>
        </details>
      )}
      {error && <p className="lp-error" role="alert">{error}</p>}
      <p className="lp-fine">Week 1 is free. No card, and no sign-up to start. Topics you start can appear in Explore, never with your name.</p>
      {where === 'hero' && c && c.shelf.length > 0 && <Carousel items={c.shelf as Shelf[]} busy={busy} onPick={(t) => pick(t, 'row')} onExplore={onExplore} />}
    </form>
  )

  return (
    <div className="lp">
      <header className="lp-top">
        <a className="lp-mark" href="/">I Get It</a>
        <button type="button" className="lp-top-cta" onClick={toBox}>Start tonight</button>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-copy">
          {/* Prateek's words, DESIGN.md section 5 */}
          <p className="lp-for">For everything you saved and never got back to.</p>
          <h1 className="lp-poster"><span>Seven nights</span> <span className="lp-poster-small">from “I keep meaning to”</span> <span>to “I get it”.</span></h1>
          <p className="lp-lede">Twenty minutes a day: a small step. 7 days: a small jump.</p>
          {form('hero')}
        </div>
        <figure className="lp-hero-art"><img src="/images/landing/hero.jpg" alt="Someone climbing out of the fog toward one bright summit" /></figure>
      </section>

      <section className="lp-saved">
        <figure className="lp-saved-art"><img src="/images/landing/saved.jpg" alt="Asleep on the sofa, saved videos spilling out of the phone" loading="lazy" /></figure>
        <div>
          <p className="lp-big">You saved the reel. And the thread. And the three-hour video for the weekend.</p>
          <p className="lp-big lp-big-accent">You still can't explain it.</p>
          <p className="lp-body">Saving feels like learning. It isn't. I Get It takes the thing you keep saving and turns it into seven short chapters, written for you, that you actually finish. One a night. Twenty minutes.</p>
        </div>
      </section>

      <section className="lp-steps">
        <h2>Tonight, in twenty minutes.</h2>
        <ol>
          <li><img src="/images/landing/step1.jpg" alt="" loading="lazy" /><span className="lp-n">1</span><h3>Type it.</h3><p>Whatever you keep meaning to learn, in your own words. You get a seven-chapter plan for it in about 40 seconds.</p></li>
          <li><img src="/images/landing/step2.jpg" alt="" loading="lazy" /><span className="lp-n">2</span><h3>Tap through chapter 1.</h3><p>Full-screen frames, one idea each, with pictures. Stuck? Ask it, or have it said simpler.</p></li>
          <li><img src="/images/landing/step3.jpg" alt="" loading="lazy" /><span className="lp-n">3</span><h3>Light the first rung.</h3><p>Read to the end of chapter 1 and the first rung lights up. No quizzes tonight: chapter 2 opens with two quick questions on what stuck.</p></li>
        </ol>
      </section>

      {c?.demo && (
        <section className="lp-demo">
          <div className="lp-demo-copy">
            <h2>Don't take our word for it.</h2>
            <p className="lp-body">This is the real chapter 1 of {c.demo.topic}. Tap the right side to go on, the left to go back.</p>
          </div>
          <Demo topic={c.demo.topic} title={c.demo.title ?? ''} frames={c.demo.frames as Frame[]} total={c.demo.total} onTry={toBox} />
        </section>
      )}

      {c?.path && (
        <section className="lp-path">
          <h2>Seven nights to the summit.</h2>
          <p className="lp-body">{c.path.outcome}</p>
          <ol>
            {c.path.chapters.map((ch: { n: number; title: string; hook: string }) => (
              <li key={ch.n} className={ch.n === 7 ? 'summit' : ''}>
                <span className="lp-night">Night {ch.n}</span>
                <strong>{ch.title}</strong>
                <span>{ch.hook}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {c && c.shelf.length > 0 && (
        <section className="lp-shelf">
          <h2>Ready tonight.</h2>
          <p className="lp-body">These open instantly. Anything else: your plan in about 40 seconds, and chapter 1 is written while you read it.</p>
          <ul>
            {c.shelf.map((s: { topic: string; outcome: string; cover: string | null }) => (
              <li key={s.topic}>
                <button type="button" onClick={() => pick(s.topic, 'shelf')}>
                  <span className="lp-cover">{s.cover && <img src={s.cover} alt="" loading="lazy" />}</span>
                  <strong>{s.topic}</strong>
                  <span>{s.outcome}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {plans && (() => {
        // Early-bird tiers (7 Oct): real spots left, from convex/pricing.ts. Copy (agent).
        const open = plans.tiers.find((t: any) => t.open) ?? plans.tiers[plans.tiers.length - 1]
        const who = ['First 50', 'Next 100', 'Next 200', 'After that']
        return (
          <section className="lp-offer">
            <div>
              <h2>Come early, pay less.</h2>
              <p className="lp-body">Week 1 is free. After that, the earlier you join, the less you pay, and your price stays yours while you keep paying. Right now it's {inr(open.month)} a month or {inr(open.year)} a year{open.left !== null ? `, with ${open.left} of ${open.size} spots left` : ''}.</p>
              <p className="lp-once">One-time payment · No auto-renew</p>
            </div>
            <ol className="lp-tiers">
              {plans.tiers.map((t: any) => (
                <li key={t.tier} className={t.open ? 'open' : t.left === 0 ? 'full' : ''}>
                  <span>{who[t.tier - 1]}</span>
                  <b>{inr(t.month)}<small> a month</small></b>
                  <span>or {inr(t.year)} a year</span>
                  <em>{t.left === 0 ? 'Full' : t.open ? (t.left === null ? 'Open now' : `${t.left} left`) : ''}</em>
                </li>
              ))}
            </ol>
          </section>
        )
      })()}

      <section className="lp-final">
        <img className="lp-final-art" src="/images/landing/summit.jpg" alt="" loading="lazy" />
        <h2>What have you been meaning to learn?</h2>
        {form('final')}
      </section>

      <footer className="lp-foot">
        <p>I Get It is built in public for the GrowthX Build Sprint, October 2026. <a href="/stats">See the live numbers</a>. <a href="https://github.com/prateekk26/igetit" target="_blank" rel="noopener noreferrer">Read the code</a>.</p>
        <p><PolicyLinks /></p>
      </footer>
    </div>
  )
}

const TONE: Record<string, string> = { picture: 'ink', teach: 'marigold', example: 'cream', mistake: 'coral', try: 'green', exercise: 'ink' }
const KICKER: Record<string, string> = { example: 'Story time', mistake: 'The mistake everyone makes', exercise: 'Quick guess' }

function Demo({ topic, title, frames, total, onTry }: { topic: string; title: string; frames: Frame[]; total: number; onTry: () => void }) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const end = i >= frames.length
  const f = frames[i]

  // The demo plays itself once it's on screen, until the quiz or the first tap.
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.6 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (calm || touched || !visible || end || f?.kind === 'exercise') return
    const t = setTimeout(() => setI((x) => x + 1), 4200)
    return () => clearTimeout(t)
  }, [i, touched, visible, end, f])

  const step = (d: number) => { setTouched(true); setPicked(null); setI((x) => Math.max(0, Math.min(frames.length, x + d))) }
  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    track('demo_tap', undefined, 'demo_tap')
    const r = e.currentTarget.getBoundingClientRect()
    step(e.clientX - r.left < r.width * 0.3 ? -1 : 1)
  }
  const tone = end ? 'green' : TONE[f.kind] ?? 'ink'

  return (
    <div className="demo-phone" ref={ref}>
      <div className={`story-frame tone-${tone}`} onClick={onTap} role="group" aria-label={`Demo: ${topic}, chapter 1`}>
        <div className="story-bars" aria-hidden="true">
          {frames.map((_, k) => <span key={k} className={k < i ? 'on' : k === i ? 'now' : ''} />)}
        </div>
        <div className="story-head"><span className="story-label">Chapter 1 of 7</span><span className="story-topic">{topic}</span></div>
        <div className="story-body" key={i}>
          {end ? (
            <>
              <p className="story-big">That was 6 of its {total} cards.</p>
              <p className="story-text size-md" style={{ marginTop: 12 }}>Yours gets written for whatever you type, in this style, with its own pictures.</p>
              <button type="button" className="story-finish" onClick={onTry}>Show me the way</button>
            </>
          ) : f.kind === 'exercise' ? (
            <>
              <p className="story-kicker">{KICKER.exercise}</p>
              <p className="story-q">{inline(f.prompt)}</p>
              <div className="story-options">
                {f.options.map((o, k) => (
                  <button key={o.id} type="button" className={`story-opt${picked === o.id ? (o.id === f.answer ? ' pass' : ' missed') : ''}`}
                    onClick={() => { setTouched(true); setPicked(o.id) }} disabled={picked === f.answer}>
                    <span className="k">{k + 1}</span><span>{o.text}</span>
                  </button>
                ))}
              </div>
              {picked && <p className="story-hint">{picked === f.answer ? "That's it. Tap to keep going." : inline(f.whyNot[picked] ?? 'Not quite. Try another.')}</p>}
            </>
          ) : (
            <>
              {i === 0 && <h3 className="story-title">{title}</h3>}
              {f.picture && <div className="story-pic"><img src={f.picture} alt="" /></div>}
              {i > 0 && KICKER[f.kind] && <p className="story-kicker">{KICKER[f.kind]}</p>}
              <Rich text={f.text} className="story-text size-md" />
            </>
          )}
        </div>
        {!end && <div className="story-tools"><span className="story-tapnote">{f.kind === 'exercise' && picked !== f.answer ? 'Pick one' : 'Tap'}</span></div>}
      </div>
    </div>
  )
}
