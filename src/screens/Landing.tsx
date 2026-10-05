import { useEffect, useRef, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import Rich, { inline } from '../components/Rich'

// Below the first screen, for first-time visitors only: what a chapter actually feels like (a tappable
// demo of a real ready chapter), the seven nights it leads to, and the topics ready tonight.
// Copy here is (agent) until Prateek rewrites it (DESIGN.md, Landing).

type Frame =
  | { kind: 'picture' | 'teach' | 'example' | 'mistake' | 'try'; title?: string; text: string; picture: string | null }
  | { kind: 'exercise'; prompt: string; options: { id: string; text: string }[]; answer: string; whyNot: Record<string, string> }

const TONE: Record<string, string> = { picture: 'ink', teach: 'marigold', example: 'cream', mistake: 'coral', try: 'green', exercise: 'ink' }
const KICKER: Record<string, string> = { example: 'Story time', mistake: 'The mistake everyone makes', exercise: 'Quick guess' }

export default function Landing({ onPick }: { onPick: (topic: string) => void }) {
  const c = useQuery(api.landing.content, {})
  if (!c) return null
  return (
    <div className="landing">
      {c.demo && (
        <section className="land-demo" aria-labelledby="land-demo-h">
          <h2 id="land-demo-h">This is what tonight looks like.</h2>
          <p className="land-sub">The real chapter 1 of {c.demo.topic}. Tap the right side to go on, the left to go back.</p>
          <Demo topic={c.demo.topic} title={c.demo.title ?? ''} frames={c.demo.frames as Frame[]} total={c.demo.total} onTry={() => onPick('')} />
        </section>
      )}

      {c.path && (
        <section className="land-path" aria-labelledby="land-path-h">
          <h2 id="land-path-h">Seven nights, twenty minutes each.</h2>
          <p className="land-sub">{c.path.outcome}</p>
          <ol className="land-stops">
            {c.path.chapters.map((ch: { n: number; title: string; hook: string }) => (
              <li key={ch.n} className={ch.n === 7 ? 'summit' : ''}>
                <span className="land-night">Night {ch.n}</span>
                <span className="land-stop-title">{ch.title}</span>
                <span className="land-hook">{ch.hook}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {c.shelf.length > 0 && (
        <section className="land-shelf" aria-labelledby="land-shelf-h">
          <h2 id="land-shelf-h">Ready tonight, or type your own.</h2>
          <p className="land-sub">These open instantly. Anything else is written for you in about a minute.</p>
          <ul>
            {c.shelf.map((s: { topic: string; outcome: string; cover: string | null }) => (
              <li key={s.topic}>
                <button type="button" onClick={() => onPick(s.topic)}>
                  <span className="land-cover">{s.cover ? <img src={s.cover} alt="" loading="lazy" /> : null}</span>
                  <span className="land-topic">{s.topic}</span>
                  <span className="land-outcome">{s.outcome}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="land-price">
        <p>Week 1 is free, and nobody asks for a card. After that it's ₹499 a month, and it gets cheaper every month you stay, down to ₹250.</p>
      </section>

      <footer className="land-foot">
        <p>Built in public for the GrowthX Build Sprint, October 2026. <a href="/stats">See the live numbers</a> or <a href="https://github.com/prateekk26/igetit" target="_blank" rel="noopener noreferrer">read the code</a>.</p>
      </footer>
    </div>
  )
}

function Demo({ topic, title, frames, total, onTry }: { topic: string; title: string; frames: Frame[]; total: number; onTry: () => void }) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const end = i >= frames.length
  const f = frames[i]
  const ref = useRef<HTMLDivElement>(null)

  // The one orchestrated moment: when the demo scrolls into view, it plays itself until the quiz,
  // or until it's tapped. Off for people who ask for less motion.
  const [visible, setVisible] = useState(false)
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

  const go = (d: number) => { setTouched(true); setPicked(null); setI((x) => Math.max(0, Math.min(frames.length, x + d))) }
  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    const r = e.currentTarget.getBoundingClientRect()
    go(e.clientX - r.left < r.width * 0.3 ? -1 : 1)
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
