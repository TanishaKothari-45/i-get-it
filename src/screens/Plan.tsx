import { useEffect } from 'react'
import ActionBar from '../components/ActionBar'
import { track } from '../lib/track'

type Chapter = { n: number; title: string; covers: string; outcome: string; hook?: string }
type Props = {
  topic: string
  plan: { outcome7: string; horizon14?: string; horizon28?: string; picture?: { name: string; line: string }; chapters: Chapter[]; sources?: { who: string; what: string; why?: string }[]; pushback?: string | null }
  passed: number[]
  current: number
  chapterReady: boolean
  chapterFailed: boolean
  onStart: () => void
  onRetry: () => void
  onChangeLine: () => void
  voiceNote?: string
  onTune: () => void
  onCompare?: () => void
  comparing?: boolean
  coverSvg?: string
  coverPicture?: string
  coverPending?: boolean
  caution?: string | null
  onLibrary?: () => void
  libraryCount?: number
  nextUp?: { kind: 'resume'; n: number; card: number; left: number } | { kind: 'next'; n: number } | null
  whatsNext?: React.ReactNode
}

// The handbook as a journey: a cover, then seven stops on a winding path, each with its hook as the teaser.
export default function Plan({ topic, plan, passed, current, chapterReady, chapterFailed, onStart, onRetry, onChangeLine, voiceNote, onTune, onCompare, comparing, coverPicture, caution, onLibrary, libraryCount, nextUp, whatsNext }: Props) {
  useEffect(() => { track('plan_view', undefined, 'plan_view:' + topic) }, [topic])
  const first = passed.length === 0 && current === 1   // a reader who came in at chapter 2 from a post is on 2
  const upTitle = nextUp ? plan.chapters[nextUp.n - 1]?.title : null
  const upHook = nextUp ? plan.chapters[nextUp.n - 1]?.hook : null
  return (
    <>
      {nextUp && chapterReady && (
        <section className="nextup" aria-label="Up next">
          <p className="nextup-kicker">{nextUp.kind === 'resume' ? `You stopped at card ${nextUp.card} of chapter ${nextUp.n}` : 'Up next'}</p>
          <p className="nextup-title">{nextUp.kind === 'resume' ? `${nextUp.left} card${nextUp.left === 1 ? '' : 's'} left, about ${Math.max(2, nextUp.left * 2)} minutes.` : `Chapter ${nextUp.n}: ${upTitle ?? ''}`}</p>
          {nextUp.kind === 'next' && upHook && <p className="nextup-hook">{upHook}</p>}
          <button type="button" className="btn" onClick={onStart}>{nextUp.kind === 'resume' ? 'Pick up where you left off' : `Start chapter ${nextUp.n}`}</button>
        </section>
      )}
      {passed.length >= 7 && whatsNext}
      <section className="roadmap-hero">
        <div className="roadmap-hero-top">
          <span className="roadmap-chip">Your handbook · {passed.length} of 7</span>
        </div>
        <h1>{topic}</h1>
        {plan.pushback && <p className="roadmap-pushback">{plan.pushback}</p>}
        <p className="roadmap-outcome">{plan.outcome7}</p>
        {caution && <p className="roadmap-caution">Study aid, verify before you act.</p>}
        {coverPicture ? <div className="roadmap-pic"><img src={coverPicture} alt="" /></div>
          : null /* no picture yet: no box; it fades in when chapter 1's picture lands */}
        {plan.picture && <p className="roadmap-picture"><strong>The picture for the whole journey:</strong> {plan.picture.line}</p>}
      </section>

      {plan.sources && plan.sources.length > 0 && (
        <p className="sources"><span className="label">Further reading</span> {plan.sources.map((x, i) => <span key={i}>{i > 0 && ' · '}<strong>{x.who}</strong>, <em>{x.what}</em></span>)}</p>
      )}
      {voiceNote && <p className="note" style={{ marginBottom: 'var(--m)' }}>{voiceNote}</p>}

      <h2 className="path-title">The path</h2>
      <ol className="path">
        {plan.chapters.map((c, idx) => {
          const done = passed.includes(c.n)
          const now = c.n === current && !done
          return (
            <li key={c.n} className={`stop ${done ? 'done' : now ? 'now' : 'ahead'} ${idx % 2 ? 'right' : 'left'}`}>
              <span className="node" aria-hidden="true">{done ? '✓' : c.n}</span>
              <div className="stop-card">
                <span className="stop-n">Chapter {c.n}{now && <span className="tag">{first ? 'Tonight' : 'Next'}</span>}{done && <span className="tag done">Done</span>}</span>
                <span className="stop-t">{c.title}</span>
                <span className="stop-hook">{c.hook || c.covers}</span>
              </div>
            </li>
          )
        })}
        <li className="stop summit">
          <span className="node" aria-hidden="true">★</span>
          <div className="stop-card">
            <span className="stop-n">Day 7</span>
            <span className="stop-t">You can do it</span>
            {plan.horizon14 && <span className="stop-hook">Later peaks: {plan.horizon14}</span>}
          </div>
        </li>
      </ol>

      <div className="roadmap-links">
        <button type="button" className="quiet" onClick={onTune}>Make it yours: who teaches you, and how</button>
        {onCompare && <button type="button" className="quiet" onClick={onCompare}>{comparing ? `Three writers are on chapter ${current}…` : `Compare three writers on chapter ${current}`}</button>}
        {onLibrary && <button type="button" className="quiet" onClick={onLibrary}>{libraryCount && libraryCount > 1 ? `Your handbooks (${libraryCount})` : 'Start another topic, keep this one'}</button>}
        <button type="button" className="quiet" onClick={onChangeLine}>Not what you meant? Change the line</button>
      </div>

      <ActionBar busy={!chapterReady && !chapterFailed} note={!chapterReady && !chapterFailed ? `Writing chapter ${current} and checking its facts… about a minute.` : undefined}>
        {chapterFailed ? (
          <>
            <p className="error" style={{ marginTop: 0 }}>Chapter {current} didn't come through. The plan is saved; try again.</p>
            <button className="btn" onClick={onRetry}>Try again</button>
          </>
        ) : (
          <button className="btn" onClick={onStart} disabled={!chapterReady}>{first ? 'Start chapter 1 ▸' : `Play chapter ${current} ▸`}</button>
        )}
      </ActionBar>
    </>
  )
}
