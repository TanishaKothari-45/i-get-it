import { useEffect } from 'react'
import ActionBar from '../components/ActionBar'
import { track } from '../lib/track'

type Chapter = { n: number; title: string; covers: string; outcome: string; hook?: string }
type Props = {
  total?: number   // chapters in this handbook: 7, or 1 to 3 for a quick one (7 Oct)
  onOpenChapter?: (n: number) => void
  nextTopics?: React.ReactNode   // "Jump to next" topics in place of further reading (7 Oct)   // a finished chapter opens again on tap (7 Oct, Prateek); never uses the daily allowance
  topic: string
  plan: { outcome7: string; horizon14?: string; horizon28?: string; picture?: { name: string; line: string }; chapters: Chapter[]; sources?: { who: string; what: string; why?: string }[]; pushback?: string | null; framing?: string | null; format?: string }
  passed: number[]
  current: number
  chapterReady: boolean
  chapterFailed: boolean
  chapterError?: string
  // Today's reading allowance is used (membership.ts): what to tell the reader, and the way to membership.
  lockNote?: string | null
  lockHead?: string | null   // what the lock means, from the server's code (8 Oct): a daily limit, or just not open
  onPricing?: () => void
  onSignUp?: () => void   // a visitor past the free chapter: the free account is the next step, not money
  needsAccount?: boolean   // signed out and the current chapter is past the free one (8 Oct night): the button says so before the tap
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
export default function Plan({ total = 7, onOpenChapter, nextTopics, topic, plan, passed, current, chapterReady, chapterFailed, chapterError: _chapterError, lockNote, lockHead, onPricing, onSignUp, needsAccount, onStart, onRetry, onChangeLine, voiceNote, onTune, onCompare, comparing, coverPicture, caution, onLibrary, libraryCount, nextUp, whatsNext }: Props) {
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
          {/* One main button per screen (review #20): the action bar holds it; this one is the quiet twin. */}
          <button type="button" className="btn btn-ghost" onClick={onStart}>{nextUp.kind === 'resume' ? 'Pick up where you left off' : needsAccount ? `Start chapter ${nextUp.n} (free account)` : `Start chapter ${nextUp.n}`}</button>
        </section>
      )}
      {passed.length >= total && whatsNext}
      <section className="roadmap-hero">
        <div className="roadmap-hero-top">
          <span className="roadmap-chip">Your handbook · {passed.length} of {total}</span>
        </div>
        <h1>{topic}</h1>
        {plan.pushback && <p className="roadmap-pushback">{plan.pushback}</p>}
        {/* A quick handbook (a recap, one recipe; 7 Oct) says so up top: no weeks of study for this one. */}
        {!plan.pushback && plan.framing && <p className="roadmap-pushback">{plan.framing}</p>}
        <p className="roadmap-outcome">{plan.outcome7}</p>
        {caution && <p className="roadmap-caution">Study aid, verify before you act.</p>}
        {coverPicture ? <div className="roadmap-pic"><img src={coverPicture} alt="" /></div>
          : null /* no picture yet: no box; it fades in when chapter 1's picture lands */}
        {plan.picture && <p className="roadmap-picture"><strong>The picture for the whole journey:</strong> {plan.picture.line}</p>}
      </section>

      {nextTopics ?? null}
      {voiceNote && <p className="note" style={{ marginBottom: 'var(--m)' }}>{voiceNote}</p>}

      <h2 className="path-title">The path</h2>
      <ol className="path">
        {plan.chapters.map((c, idx) => {
          const done = passed.includes(c.n)
          const now = c.n === current && !done
          return (
            <li key={c.n} className={`stop ${done ? 'done' : now ? 'now' : 'ahead'} ${idx % 2 ? 'right' : 'left'}`}>
              <span className="node" aria-hidden="true">{done ? '✓' : ''}</span>{/* the card says "Chapter N"; a number here too read as "1 1" (7 Oct) */}
              {(() => {
                const inner = (<>
                  <span className="stop-n">Chapter {c.n}{now && <span className="tag">{first ? 'Tonight' : 'Next'}</span>}{done && <span className="tag done">Done</span>}</span>
                  <span className="stop-t">{c.title}</span>
                  <span className="stop-hook">{c.hook || c.covers}</span>
                  {done && onOpenChapter && <span className="stop-again">Read it again ›</span>}
                </>)
                // Finished chapters and the one you're on open on tap; chapters ahead stay a preview.
                if (done && onOpenChapter) return <button type="button" className="stop-card stop-tap" onClick={() => onOpenChapter(c.n)}>{inner}</button>
                if (now && chapterReady) return <button type="button" className="stop-card stop-tap" onClick={onStart}>{inner}</button>
                return <div className="stop-card">{inner}</div>
              })()}
            </li>
          )
        })}
        <li className="stop summit">
          <span className="node" aria-hidden="true">★</span>
          <div className="stop-card">
            <span className="stop-n">The summit</span>
            <span className="stop-t">You can do it</span>
            {total === 7 && plan.horizon14 && <span className="stop-hook">Later peaks: {plan.horizon14}</span>}
          </div>
        </li>
      </ol>

      <div className="roadmap-links">
        <button type="button" className="quiet" onClick={onTune}>Who teaches you, and how</button>
        {/* The three-writer comparison is testers-only (App.tsx: ?compare=1 once on this phone), so readers never see it. */}
        {onCompare && <button type="button" className="quiet" onClick={onCompare}>{comparing ? `Three writers are on chapter ${current}…` : `Testers: compare three writers on chapter ${current}`}</button>}
        {onLibrary && <button type="button" className="quiet" onClick={onLibrary}>{libraryCount && libraryCount > 1 ? `Your handbooks (${libraryCount})` : 'Start another topic, keep this one'}</button>}
        <button type="button" className="quiet" onClick={onChangeLine}>Not what you meant? Change what you typed</button>
      </div>

      <ActionBar busy={!chapterReady && !chapterFailed} note={!chapterReady && !chapterFailed ? `Writing chapter ${current} and checking its facts… usually under a minute.` : undefined}>
        {lockNote ? (
          <>
            <div className="lock-card">
              <p className="lock-card-head">{onSignUp ? `Chapter ${current} is free with an account` : lockHead ? `Chapter ${current} ${lockHead}` : `Chapter ${current} didn't open`}</p>
              <p className="lock-card-text">{lockNote}</p>
              {onSignUp && <p className="free-banner"><strong>Free.</strong> Just your email. No card, no spam, ever.</p>}
              {onSignUp ? <button className="btn" onClick={onSignUp}>Sign up free and keep reading</button>
                : onPricing && <button className="btn btn-ghost" onClick={onPricing}>See what members get</button>}
            </div>
          </>
        ) : chapterFailed ? (
          <>
            <p className="error" style={{ marginTop: 0 }}>Chapter {current} didn't come through. The plan is saved; try again.</p>
            <button className="btn" onClick={onRetry}>Try again</button>
          </>
        ) : (
          <button className="btn" onClick={onStart} disabled={!chapterReady}>{passed.length >= total ? `Read chapter ${current} again ▸` : needsAccount ? `Start chapter ${current} (free account) ▸` : `Start chapter ${current} ▸`}</button>
        )}
      </ActionBar>
    </>
  )
}
