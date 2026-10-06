import { useEffect, useRef, useState, type ReactNode } from 'react'
import ActionBar from '../components/ActionBar'
import LanguagePicker from '../components/LanguagePicker'
import { ENGLISH, languageInfo } from '../../convex/languages'
import Rich from '../components/Rich'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import SourcesInput, { SourcesProgress, absorb, type Gathered } from '../components/SourcesInput'
import { MAX_LINKS, classifyLink } from '../../convex/links'

type Level = 'new' | 'some'
type Voice = 'friend' | 'straight' | 'stories'
type Props = {
  initialTopic?: string
  status: 'idle' | 'writing' | 'question' | 'failed' | 'declined'
  question?: string
  error?: string
  onCreate: (topic: string, level: Level, voice: Voice, language: string, sources?: NewSources) => Promise<void>
  onAnswer?: (answer: string) => Promise<void>
  onRetry?: () => Promise<void>
  examples: string[]
  // The landing sections, shown under the first screen to first-time visitors. pick('') just brings the box back.
  below?: (pick: (topic: string) => void) => ReactNode
  // While a plan is written: add the handbook the waiting story comes from, without leaving this one.
  onAddOther?: (topic: string) => Promise<void>
  pushback?: string
  suggestions?: string[]
  initialLinks?: string          // links shared into the app from another one ("Share to I Get It")
  sources?: { kind: 'youtube' | 'instagram' | 'image'; url?: string; status: 'waiting' | 'reading' | 'read' | 'failed'; title?: string; error?: string }[]
  creator?: string | null        // the handbook was started from this creator's reels
  choices?: string[] | null      // the question's answers to tap (a creator's themes)
}

export type NewSources = { links: string[]; photos: File[]; creator?: string }

// The first screen, and the empty state of the whole product (DESIGN.md section 4, Start).
export default function Start({ initialTopic = '', status, question, onCreate, onAnswer, onRetry, examples, below, onAddOther, pushback, suggestions = [], initialLinks = '', sources = [], creator: startedFrom = null, choices = null }: Props) {
  const declined = status === 'declined'
  const [topic, setTopic] = useState(status === 'declined' ? '' : initialTopic)
  // A declined line never stays in the box: the reader starts fresh.
  useEffect(() => { if (status === 'declined') setTopic('') }, [status])
  const [level, setLevel] = useState<Level>('new')
  const [voice, setVoice] = useState<Voice>('friend')
  const [language, setLanguage] = useState<string>(rememberedLanguage)
  const [answer, setAnswer] = useState('')
  const [slow, setSlow] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const writing = status === 'writing'
  // From what they saved: reel and Short links, photos, or a creator, gathered from the one box.
  const [links, setLinks] = useState<string[]>(() => absorb(initialLinks, [], null, true).links)
  const [photos, setPhotos] = useState<File[]>([])
  const [creator, setCreator] = useState<string | null>(null)
  const take = (g: Gathered) => { setTopic(g.text); setLinks(g.links); setCreator(g.creator) }
  const fromSaved = sources.length > 0 || !!startedFrom
  const gathering = writing && !!startedFrom && sources.length === 0
  // A failed write: its message and "Try again" while the line is unchanged, and always for one from saved things
  // (it has no typed line to compare; trying again reads only what isn't read yet, then writes).
  const failedHere = status === 'failed' && !declined && (fromSaved || topic.trim() === initialTopic.trim())
  const levelRef = useRef<HTMLDivElement>(null)
  const [storySeed, setStorySeed] = useState(() => Math.floor(Math.random() * 1000))
  const story = useQuery(api.landing.waitStory, writing ? { seed: storySeed } : 'skip')
  const [added, setAdded] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const backToBox = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 350) }
  const pick = (t: string) => { if (t) setTopic(t); setLocalError(null); backToBox() }

  useEffect(() => {
    if (!writing) { setSlow(false); return }
    const t = setTimeout(() => setSlow(true), 6000)
    return () => clearTimeout(t)
  }, [writing])

  const submit = async () => {
    setLocalError(null)
    const g = absorb(topic, links, creator, true)   // a link or @handle still at the end of the box
    take(g)
    const line = g.text.replace(/(^|\s)@\s*$/, '').trim()
    if (g.creator) {
      if (g.links.length || photos.length) { setLocalError("One at a time: a creator's reels, or your own reels and photos."); return }
      try { await onCreate(line, level, voice, language, { links: [], photos: [], creator: g.creator }) } catch (e: any) { setLocalError(friendly(e)) }
      return
    }
    const hasSources = g.links.length > 0 || photos.length > 0
    if (g.links.some((l) => !classifyLink(l))) { setLocalError('Only Instagram reels and YouTube videos for now. Take out the others.'); return }
    if (g.links.length > MAX_LINKS) { setLocalError(`Up to ${MAX_LINKS} links for one handbook.`); return }
    if (!hasSources && line.length < 2) { setLocalError('A few words is enough. What is it?'); backToBox(); return }
    try { await onCreate(line, level, voice, language, hasSources ? { links: g.links, photos } : undefined) } catch (e: any) { setLocalError(friendly(e)) }
  }

  // While the plan is written: the topic and what's happening, not the form again (Shaktimaan, 6 Oct).
  if (writing) {
    return (
      <div className="plan-wait" role="status" aria-live="polite">
        <p className="plan-wait-kicker">Writing your seven nights</p>
        <h1 className="plan-wait-topic">{topic.trim() || initialTopic || (startedFrom ? `@${startedFrom}'s reels` : 'What you saved')}</h1>
        {gathering && <p className="note">Finding @{startedFrom}'s latest reels and sorting them into themes…</p>}
        {fromSaved && sources.length > 0 && <SourcesProgress sources={sources.filter((x) => x.error !== 'about something else')} />}
        <ol className="plan-wait-steps">
          <li className="on">{fromSaved ? 'Watching and reading what you saved' : 'Reading what you typed'}</li>
          <li className={slow ? 'on' : ''}>Choosing the seven nights and the one picture that carries them</li>
          <li>Writing chapter 1 while you read the plan</li>
        </ol>
        <p className="note">Your plan in about 40 seconds. Chapter 1 is written while you read it.</p>
        <div className="busybar" aria-hidden="true" />
        {story && (
          <section className="wait-story" aria-label="A story while you wait">
            <p className="wait-story-kicker">While you wait, a story from another handbook</p>
            {story.picture && <div className="story-pic"><img src={story.picture} alt="" /></div>}
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

  if (status === 'question' && question) {
    return (
      <>
        <h1>One question first.</h1>
        <p className="lede">{question}</p>
        {choices && choices.length > 0 && (
          <div className="choice-list">
            {choices.map((c) => <button key={c} type="button" className="chip" onClick={() => onAnswer?.(c).catch((e) => setLocalError(friendly(e)))}>{c}</button>)}
          </div>
        )}
        <div className="field">
          <label htmlFor="answer">{choices?.length ? 'Or say what you want' : 'Your answer'}</label>
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
                {suggestions.map((s) => <button key={s} type="button" className="chip" onClick={() => onCreate(s, level, voice, language).catch((e) => setLocalError(friendly(e)))}>{s}</button>)}
              </div>
            </>
          )}
          <p className="note">Or type something else below.</p>
        </section>
      )}
      <p className="for-line">For everything you saved and never got back to.</p>
      <h1>Seven nights from “I keep meaning to” to “I get it”.</h1>
      <p className="lede">Twenty minutes a day: a small step. 7 days: a small jump.</p>

      {/* One box for a topic, reels and Shorts, photos and a creator (DESIGN.md section 4, Start). Enter only closes the
          keyboard and shows the level and voice; the button starts the writing. */}
      <SourcesInput text={topic} links={links} creator={creator} onChange={take} photos={photos} onPhotos={setPhotos} disabled={writing}
        inputRef={inputRef} enterKeyHint="done"
        onSubmit={() => { inputRef.current?.blur(); levelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}
        placeholder={links.length || photos.length || creator ? 'Add a few words, if you like' : examples[0] ?? 'Swimming'}
        showWays={!writing}>
        {examples.length > 1 && !below && !(links.length || photos.length || creator) && (
          <p className="note">Tonight's ready handbooks: {examples.slice(0, 6).map((x, i) => (
            <span key={x}>{i > 0 && ' · '}<button type="button" className="quiet" style={{ padding: 0 }} onClick={() => setTopic(x)} disabled={writing}>{x}</button></span>
          ))}</p>
        )}
      </SourcesInput>

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

      <p className="sub" style={{ marginTop: 'var(--l)', marginBottom: 6 }}>Read it in</p>
      <LanguagePicker value={language} disabled={writing} onChange={(name) => { setLanguage(name); rememberLanguage(name) }} />

      {failedHere && fromSaved && sources.length > 0 && <SourcesProgress sources={sources.filter((x) => x.error !== 'about something else')} />}
      {(localError || failedHere) && (
        <p className="error">{localError ?? "Couldn't write it just now. Your line is still here; try once more in a minute, or pick one of tonight's ready handbooks."}</p>
      )}

      {below && !writing && below(pick)}

      <ActionBar busy={writing} note={writing && slow ? 'About 40 seconds. Seven chapters take a moment to plan.' : undefined}>
        {failedHere && onRetry ? (
          <button className="btn" onClick={() => onRetry().catch((e) => setLocalError(friendly(e)))}>Try again</button>
        ) : (
          <button className="btn" onClick={submit} disabled={writing}>{writing ? 'Finding your way…' : 'Show me the way'}</button>
        )}
      </ActionBar>
    </>
  )
}

function friendly(e: any): string {
  const m = String(e?.message ?? e)
  if (m.includes('busy')) return "Busy right now. Try again in a few minutes."
  if (m.includes('few words')) return 'A few words is enough. What is it?'
  if (m.includes('YouTube and Instagram')) return 'Only Instagram reels and YouTube videos for now. Take out the others.'
  if (m.includes('Instagram handle')) return "That doesn't look like an Instagram handle."
  if (m.includes('At most')) return m.replace(/^.*?(At most \d+ \w+).*$/, '$1 for one handbook.')
  return "Couldn't write it just now. Your line is still here; try once more in a minute."
}

// The language picked last time on this phone, so a Hindi reader doesn't pick Hindi every time.
const LANGUAGE_KEY = 'igetit.language'
function rememberedLanguage(): string {
  try { const saved = localStorage.getItem(LANGUAGE_KEY); return saved && languageInfo(saved) ? saved : ENGLISH } catch { return ENGLISH }
}
function rememberLanguage(name: string) {
  try { localStorage.setItem(LANGUAGE_KEY, name) } catch { /* private windows can refuse storage */ }
}
