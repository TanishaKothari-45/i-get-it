import ActionBar from '../components/ActionBar'
import RungBar from '../components/RungBar'
import { Link } from '../lib/router'

type Chapter = { n: number; title: string; covers: string; outcome: string; from?: number[] }
type Props = {
  topic: string
  plan: { outcome7: string; horizon14?: string; horizon28?: string; picture?: { name: string; line: string }; chapters: Chapter[] }
  passed: number[]
  current: number
  chapterReady: boolean
  chapterFailed: boolean
  onStart: () => void
  onRetry: () => void
  onChangeLine: () => void
  voiceNote?: string
  // The address of a chapter they can open (passed, or the current one once written); null if not yet.
  chapterLink?: (n: number) => string | null
  // The chapter's optional bonus ("go deeper" or "another way"), when they've unlocked one.
  bonusFor?: (n: number) => { href: string; label: string } | null
  // Started from links or photos: what each source is called ("Reel 1", "Photo 2"), by source number - 1.
  sourceLabels?: string[]
}

// The handbook cover: the plan before the first lesson, so starting isn't skipping levels.
export default function Plan({ topic, plan, passed, current, chapterReady, chapterFailed, onStart, onRetry, onChangeLine, voiceNote, chapterLink, bonusFor, sourceLabels }: Props) {
  const first = passed.length === 0
  return (
    <>
      <RungBar passed={passed} />
      <p className="sub" style={{ marginTop: 10 }}>Your handbook</p>
      <h1 style={{ marginTop: 6 }}>{topic}</h1>
      <p className="outcome">{plan.outcome7}</p>
      {plan.picture && <p className="picture">The one picture for the whole thing: {plan.picture.name.toLowerCase()}. {plan.picture.line}</p>}
      {voiceNote && <p className="note" style={{ marginBottom: 'var(--m)' }}>{voiceNote}</p>}
      {sourceLabels && sourceLabels.length > 0 && <p className="note">Built from what you shared: {sourceLabels.join(' · ')}.</p>}

      <ol className="chapters">
        {plan.chapters.map((c) => {
          const state = passed.includes(c.n) ? 'done' : c.n === current ? 'now' : ''
          const href = chapterLink?.(c.n) ?? null
          const bonus = bonusFor?.(c.n) ?? null
          return (
            <li key={c.n} className={state}>
              <span className="n">{passed.includes(c.n) ? '✓' : c.n}</span>
              <span className="t">{href ? <Link to={href}>{c.title}</Link> : c.title}{c.n === current && !passed.includes(c.n) && <span className="tag">{first ? 'Tonight' : 'Next'}</span>}</span>
              <span className="c">{c.covers}</span>
              {(() => { const from = (c.from ?? []).map((k) => sourceLabels?.[k - 1]).filter(Boolean); return from.length ? <span className="c from">From {from.join(' · ')}</span> : null })()}
              {bonus && <span className="c"><Link to={bonus.href} className="bonus-link">{bonus.label}</Link></span>}
            </li>
          )
        })}
      </ol>

      <div className="horizon">
        {plan.horizon14 && <p>Day 14, later: {plan.horizon14}</p>}
        {plan.horizon28 && <p>Day 28, later: {plan.horizon28}</p>}
      </div>

      <p style={{ marginTop: 'var(--l)' }}>
        <button type="button" className="quiet" onClick={onChangeLine}>Not what you meant? Change the line</button>
      </p>

      <ActionBar busy={!chapterReady && !chapterFailed} note={!chapterReady && !chapterFailed ? `Writing chapter ${current}…` : undefined}>
        {chapterFailed ? (
          <>
            <p className="error" style={{ marginTop: 0 }}>Chapter {current} didn't come through. The plan is saved; try again.</p>
            <button className="btn" onClick={onRetry}>Try again</button>
          </>
        ) : (
          <button className="btn" onClick={onStart} disabled={!chapterReady}>{first ? 'Start chapter 1' : `Continue chapter ${current}`}</button>
        )}
      </ActionBar>
    </>
  )
}
