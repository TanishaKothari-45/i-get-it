import ActionBar from '../components/ActionBar'
import RungBar from '../components/RungBar'

type Chapter = { n: number; title: string; covers: string; outcome: string }
type Props = {
  topic: string
  plan: { outcome7: string; horizon14?: string; horizon28?: string; picture?: { name: string; line: string }; chapters: Chapter[]; sources?: { who: string; what: string; why?: string }[] }
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
}

// The handbook cover: the plan before the first lesson, so starting isn't skipping levels.
export default function Plan({ topic, plan, passed, current, chapterReady, chapterFailed, onStart, onRetry, onChangeLine, voiceNote, onTune, onCompare, comparing }: Props) {
  const first = passed.length === 0
  return (
    <>
      <RungBar passed={passed} />
      <p className="sub" style={{ marginTop: 10 }}>Your handbook</p>
      <h1 style={{ marginTop: 6 }}>{topic}</h1>
      <p className="outcome">{plan.outcome7}</p>
      {plan.picture && <p className="picture">The one picture for the whole thing: {plan.picture.name.toLowerCase()}. {plan.picture.line}</p>}
      {plan.sources && plan.sources.length > 0 && (
        <p className="sources"><span className="label">Draws on</span> {plan.sources.map((x, i) => <span key={i}>{i > 0 && ' · '}<strong>{x.who}</strong>, <em>{x.what}</em></span>)}</p>
      )}
      {voiceNote && <p className="note" style={{ marginBottom: 'var(--m)' }}>{voiceNote}</p>}

      <ol className="chapters">
        {plan.chapters.map((c) => {
          const state = passed.includes(c.n) ? 'done' : c.n === current ? 'now' : ''
          return (
            <li key={c.n} className={state}>
              <span className="n">{passed.includes(c.n) ? '✓' : c.n}</span>
              <span className="t">{c.title}{c.n === current && !passed.includes(c.n) && <span className="tag">{first ? 'Tonight' : 'Next'}</span>}</span>
              <span className="c">{c.covers}</span>
            </li>
          )
        })}
      </ol>

      <div className="horizon">
        {plan.horizon14 && <p>Day 14, later: {plan.horizon14}</p>}
        {plan.horizon28 && <p>Day 28, later: {plan.horizon28}</p>}
      </div>

      <p style={{ marginTop: 'var(--l)' }} className="topbar-links">
        <button type="button" className="quiet" onClick={onTune}>Make it yours: who teaches you, and how</button>
      </p>
      {onCompare && (
        <p style={{ marginTop: 6 }}>
          <button type="button" className="quiet" onClick={onCompare}>{comparing ? `Three writers are on chapter ${current}…` : `Compare three writers on chapter ${current}`}</button>
        </p>
      )}
      <p style={{ marginTop: 6 }}>
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
