import { useEffect, useRef, useState, type ReactNode } from 'react'
import ActionBar from '../components/ActionBar'
import { track } from '../lib/track'
import Rich from '../components/Rich'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { isMemberLimit, limitMessage } from '../lib/limits'

type Level = 'new' | 'some'
type Voice = 'friend' | 'straight' | 'stories'
type Props = {
  initialTopic?: string
  status: 'idle' | 'intent' | 'writing' | 'question' | 'failed' | 'declined'
  question?: string
  intents?: { question: string; goals: { label: string; mode: string }[] } | null
  onChooseIntent?: (goal?: string, mode?: string) => Promise<void>
  error?: string
  onCreate: (topic: string, level: Level, voice: Voice) => Promise<void>
  onAnswer?: (answer: string) => Promise<void>
  onRetry?: () => Promise<void>
  examples: string[]
  // The landing sections, shown under the first screen to first-time visitors. pick('') just brings the box back.
  below?: (pick: (topic: string) => void) => ReactNode
  // While a plan is written: add the handbook the waiting story comes from, without leaving this one.
  onAddOther?: (topic: string) => Promise<void>
  pushback?: string
  suggestions?: string[]
  onPricing?: () => void
  // 8 Oct (UX review #4): on "Start another topic", ready topics open at once and Explore is one tap away.
  onPickReady?: (topic: string) => Promise<void>
  onExplore?: () => void
}

// The first screen, and the empty state of the whole product (DESIGN.md section 4, Start).
export default function Start({ initialTopic = '', status, question, intents, onChooseIntent, onCreate, onAnswer, onRetry, examples, below, onAddOther, pushback, suggestions = [], onPricing, onPickReady, onExplore }: Props) {
  const declined = status === 'declined'
  const [topic, setTopic] = useState(status === 'declined' ? '' : initialTopic)
  // A declined line never stays in the box: the reader starts fresh.
  useEffect(() => { if (status === 'declined') setTopic('') }, [status])
  useEffect(() => { if (status === 'writing') track('wait_view', undefined, 'wait_view:' + initialTopic) }, [status, initialTopic])
  const [level, setLevel] = useState<Level>('new')
  const [voice, setVoice] = useState<Voice>('friend')
  const [answer, setAnswer] = useState('')
  const [slow, setSlow] = useState(false)
  const [verySlow, setVerySlow] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [memberLimit, setMemberLimit] = useState(false)
  const writing = status === 'writing'
  const levelRef = useRef<HTMLDivElement>(null)
  const [storySeed, setStorySeed] = useState(() => Math.floor(Math.random() * 1000))
  const story = useQuery(api.landing.waitStory, writing ? { seed: storySeed } : 'skip')
  const [added, setAdded] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const backToBox = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 350) }
  const pick = (t: string) => { if (t) setTopic(t); setLocalError(null); backToBox() }

  useEffect(() => {
    if (!writing) { setSlow(false); setVerySlow(false); return }
    // 8 Oct night, measured on the Gemini pipeline: research about 33 s, then the plan about 50 s; the plan shows at about 85 s.
    const t = setTimeout(() => setSlow(true), 30000), t2 = setTimeout(() => setVerySlow(true), 100000)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [writing])

  const submit = async () => {
    setLocalError(null)
    if (topic.trim().length < 2) { setLocalError('A few words is enough. What is it?'); backToBox(); return }
    setMemberLimit(false)
    try { await onCreate(topic.trim(), level, voice) } catch (e: any) { setLocalError(friendly(e)); setMemberLimit(isMemberLimit(e)) }
  }

  // While the plan is written: the topic and what's happening, not the form again (Shaktimaan, 6 Oct).
  if (writing) {
    return (
      <div className="plan-wait" role="status" aria-live="polite">
        <p className="plan-wait-kicker">Writing your handbook</p>
        <h1 className="plan-wait-topic">{topic.trim() || initialTopic}</h1>
        <ol className="plan-wait-steps">
          <li className="on">Looking it up on the web, with the goal you picked in mind</li>
          <li className={slow ? 'on' : ''}>Planning the chapters: a quick run-through, or up to seven nights</li>
          <li className={verySlow ? 'on' : ''}>Taking longer than usual. Still on it.</li>
        </ol>
        <p className="note">{verySlow ? "Still writing. You can leave; it will be waiting in Your handbooks." : "About a minute and a half. Chapter 1 is written while you read the plan."}</p>
        <div className="busybar" aria-hidden="true" />
        {story && (
          <section className="wait-story" aria-label="A story while you wait">
            <p className="wait-story-kicker">While you wait, a story from another handbook</p>
            {story.picture && <WaitPicture src={story.picture} />}
            {story.title && <p className="wait-story-title">{story.title}</p>}
            <Rich text={story.text} className="serif wait-story-text" />
            <p className="note">From <strong>{story.topic}</strong>, {story.chapter}.</p>
            <div className="wait-story-actions">
              {added === story.topic ? <span className="wait-story-added">Added. It's in Your handbooks.</span>
                : onAddOther && <button type="button" className="btn btn-ghost" onClick={async () => { try { await onAddOther(story.topic); setAdded(story.topic) } catch { /* the plan still comes; adding can wait */ } }}>Add {story.topic} to my handbooks</button>}
              {story.count > 1 && <button type="button" className="quiet" onClick={() => setStorySeed((x) => x + 7)}>Another story</button>}
            </div>
          </section>
        )}
      </div>
    )
  }

  // "What's it for?" (6 Oct): a goal in one tap shapes the whole handbook. Skipping is fine.
  if (status === 'intent') {
    const choose = (goal?: string, mode?: string) => { track('submit', { via: goal ? 'goal' : 'skip' }); onChooseIntent?.(goal, mode).catch((e) => setLocalError(friendly(e))) }
    return (
      <div className="intent">
        <p className="plan-wait-kicker">{topic.trim() || initialTopic}</p>
        <h1>{intents?.question ?? "What's it for?"}</h1>
        <p className="lede">Pick one and the handbook is built around it.</p>
        <div className="intent-goals">
          {intents ? intents.goals.map((g) => (
            <button key={g.label} type="button" className="intent-goal" onClick={() => choose(g.label, g.mode)}>{g.label}</button>
          )) : <p className="note intent-thinking" role="status">Thinking of three reasons people learn this… a few seconds. Or say it in your words below.</p>}
        </div>
        <form className="intent-own" onSubmit={(e) => { e.preventDefault(); if (answer.trim()) choose(answer.trim()) }}>
          <input className="input" placeholder="Or say it in your words" value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={120} enterKeyHint="go" />
        </form>
        {localError && <p className="error">{localError}</p>}
        <button type="button" className="quiet" onClick={() => choose()}>Skip, just teach me</button>
      </div>
    )
  }

  if (status === 'question' && question) {
    return (
      <>
        <h1>One question first.</h1>
        <p className="lede">{question}</p>
        <div className="field">
          <label htmlFor="answer">Your answer</label>
          <input id="answer" className="input" autoFocus value={answer} onChange={(e) => setAnswer(e.target.value)} enterKeyHint="go"
            onKeyDown={(e) => { if (e.key === 'Enter' && answer.trim()) onAnswer?.(answer.trim()) }} />
        </div>
        {localError && <p className="error">{localError}</p>}
        <ActionBar>
          <button className="btn" disabled={!answer.trim()} onClick={() => onAnswer?.(answer.trim()).catch((e) => setLocalError(friendly(e)))}>That's it</button>
        </ActionBar>
      </>
    )
  }

  return (
    <>
      {/* Prateek's words, DESIGN.md section 5 */}
      {declined && (
        <section className="declined" role="status">
          <p className="declined-kicker">Not this one</p>
          <p className="declined-line">{pushback ?? "That's not something I Get It will teach."}</p>
          {suggestions.length > 0 && (
            <>
              <p className="note">Something you might enjoy instead:</p>
              <div className="declined-suggestions">
                {suggestions.map((s) => <button key={s} type="button" className="chip" onClick={() => onCreate(s, level, voice).catch((e) => setLocalError(friendly(e)))}>{s}</button>)}
              </div>
            </>
          )}
          <p className="note">Or type something else below.</p>
        </section>
      )}
      <p className="for-line">For everything you saved and never got back to.</p>
      <h1>Seven nights from “I keep meaning to” to “I get it”.</h1>
      <p className="lede">Twenty minutes a day: a small step. 7 days: a small jump.</p>

      <div className="field">
        <label htmlFor="topic">What do you keep meaning to learn?</label>
        <input id="topic" ref={inputRef} className="input" type="text" autoComplete="off" enterKeyHint="done" maxLength={200} placeholder={examples.length ? `${examples.slice(0, 2).join(', ')}…` : 'Swimming'} value={topic}
          onChange={(e) => setTopic(e.target.value)} disabled={writing}
          // Enter only closes the keyboard and shows the level and voice; the button starts the writing.
          onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); levelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) } }} />
        {topic.length >= 150 && <p className="note" aria-live="polite">{200 - topic.length} characters left. A few words is enough.</p>}
        {examples.length > 1 && !below && (
          <p className="note">{onPickReady ? 'Ready now, opens instantly: ' : "Tonight's ready handbooks: "}{examples.slice(0, 6).map((x, i) => (
            <span key={x}>{i > 0 && ' · '}<button type="button" className="quiet" style={{ padding: 0 }} onClick={() => { if (onPickReady) onPickReady(x).catch((e) => setLocalError(friendly(e))); else setTopic(x) }} disabled={writing}>{x}</button></span>
          ))}{onExplore && <> · <button type="button" className="quiet" style={{ padding: 0 }} onClick={onExplore}>Explore everything →</button></>}</p>
        )}
      </div>

      <p className="sub" style={{ marginTop: 'var(--l)', marginBottom: 6 }}>How much do you know already?</p>
      <div className="chips" role="group" aria-label="Level" ref={levelRef}>
        <button type="button" className="chip" aria-pressed={level === 'new'} onClick={() => setLevel('new')} disabled={writing}>New to this</button>
        <button type="button" className="chip" aria-pressed={level === 'some'} onClick={() => setLevel('some')} disabled={writing}>Know some</button>
      </div>

      <p className="sub" style={{ marginTop: 'var(--l)', marginBottom: 6 }}>How should it talk to you?</p>
      <div className="chips" role="group" aria-label="Voice">
        <button type="button" className="chip" aria-pressed={voice === 'friend'} onClick={() => setVoice('friend')} disabled={writing}>Like a friend</button>
        <button type="button" className="chip" aria-pressed={voice === 'straight'} onClick={() => setVoice('straight')} disabled={writing}>Straight</button>
        <button type="button" className="chip" aria-pressed={voice === 'stories'} onClick={() => setVoice('stories')} disabled={writing}>Stories</button>
      </div>

      {(localError || (status === 'failed' && !declined && topic.trim() === initialTopic.trim())) && (
        <p className="error">{localError ?? "Couldn't write it just now. Your line is still here; try once more in a minute, or pick one of tonight's ready handbooks."}</p>
      )}
      {memberLimit && onPricing && <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={onPricing}>See what members get</button>}

      {below && !writing && below(pick)}

      <ActionBar busy={writing} note={writing && slow ? 'About a minute and a half: a look on the web first, then the plan, then chapter 1.' : undefined}>
        {status === 'failed' && onRetry && topic.trim() === initialTopic.trim() ? (
          <button className="btn" onClick={() => onRetry().catch((e) => setLocalError(friendly(e)))}>Try again</button>
        ) : (
          <button className="btn" onClick={submit} disabled={writing}>{writing ? 'Finding your way…' : 'Show me the way'}</button>
        )}
      </ActionBar>
    </>
  )
}

// The story's picture shows only once it has loaded (9 Oct: a grey striped box sat there for the whole wait on a slow line).
function WaitPicture({ src }: { src: string }) {
  const [ready, setReady] = useState(false)
  return <div className="story-pic" style={ready ? undefined : { display: 'none' }}><img src={src} alt="" onLoad={() => setReady(true)} /></div>
}

function friendly(e: any): string {
  const limit = limitMessage(e)
  if (limit) return limit
  const m = String(e?.message ?? e)
  if (m.includes('busy')) return "Busy right now. Try again in a few minutes."
  if (m.includes('few words')) return 'A few words is enough. What is it?'
  return "Couldn't write it just now. Your line is still here; try once more in a minute."
}
