import { useEffect, useState } from 'react'
import ActionBar from '../components/ActionBar'
import LanguagePicker from '../components/LanguagePicker'
import SourcesInput, { SourcesProgress, absorb, type Gathered } from '../components/SourcesInput'
import { MAX_LINKS, classifyLink } from '../../convex/links'
import { ENGLISH, languageInfo } from '../../convex/languages'

type Level = 'new' | 'some'
type Voice = 'friend' | 'straight' | 'stories'
type Props = {
  initialTopic?: string
  status: 'idle' | 'writing' | 'question' | 'failed'
  question?: string
  error?: string
  onCreate: (topic: string, level: Level, voice: Voice, language: string, sources?: NewSources) => Promise<void>
  onAnswer?: (answer: string) => Promise<void>
  onRetry?: () => Promise<void>
  examples: string[]
  initialLinks?: string          // links shared into the app from another one ("Share to I Get It")
  sources?: { kind: 'youtube' | 'instagram' | 'image'; url?: string; status: 'waiting' | 'reading' | 'read' | 'failed'; title?: string; error?: string }[]
  creator?: string | null        // the handbook was started from this creator's reels
  choices?: string[] | null      // the question's answers to tap (a creator's themes)
}

export type NewSources = { links: string[]; photos: File[]; creator?: string }

// The first screen, and the empty state of the whole product (DESIGN.md section 4, Start).
export default function Start({ initialTopic = '', status, question, onCreate, onAnswer, onRetry, examples, initialLinks = '', sources = [], creator: startedFrom = null, choices = null }: Props) {
  const [topic, setTopic] = useState(initialTopic)
  const [level, setLevel] = useState<Level>('new')
  const [voice, setVoice] = useState<Voice>('friend')
  const [language, setLanguage] = useState<string>(rememberedLanguage)
  const [answer, setAnswer] = useState('')
  const [slow, setSlow] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [links, setLinks] = useState<string[]>(() => absorb(initialLinks, [], null, true).links)
  const [photos, setPhotos] = useState<File[]>([])
  const [creator, setCreator] = useState<string | null>(null)
  const take = (g: Gathered) => { setTopic(g.text); setLinks(g.links); setCreator(g.creator) }
  const writing = status === 'writing'
  const gathering = writing && !!startedFrom && sources.length === 0
  const reading = gathering || (writing && sources.some((s) => s.status === 'waiting' || s.status === 'reading'))

  useEffect(() => {
    if (!writing) { setSlow(false); return }
    const t = setTimeout(() => setSlow(true), 8000)
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
    if (!hasSources && line.length < 2) { setLocalError('A few words is enough. What is it?'); return }
    try { await onCreate(line, level, voice, language, hasSources ? { links: g.links, photos } : undefined) } catch (e: any) { setLocalError(friendly(e)) }
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
      <h1>You keep saving it.<br />Tonight, get it.</h1>
      <p className="lede">Type the one thing you keep meaning to learn. You get a seven-chapter handbook written for it, and you pass chapter 1 tonight. No sign-up.</p>

      <SourcesInput text={topic} links={links} creator={creator} onChange={take} photos={photos} onPhotos={setPhotos} disabled={writing} onSubmit={submit}
        placeholder={links.length || photos.length || creator ? 'Add a few words, if you like' : examples[0] ?? 'Swimming'}
        showWays={!writing}>
        {examples.length > 1 && !(links.length || photos.length || creator) && (
          <p className="note">Tonight's ready handbooks: {examples.slice(0, 6).map((x, i) => (
            <span key={x}>{i > 0 && ' · '}<button type="button" className="quiet" style={{ padding: 0 }} onClick={() => setTopic(x)} disabled={writing}>{x}</button></span>
          ))}</p>
        )}
      </SourcesInput>

      {gathering ? <p className="note">Finding @{startedFrom}'s latest reels and sorting them into themes…</p>
        : writing && sources.length > 0 ? <SourcesProgress sources={sources.filter((s) => s.error !== 'about something else')} />
        : null}

      <div className="chips" role="group" aria-label="Level">
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

      {(localError || (status === 'failed' && topic.trim() === initialTopic.trim())) && (
        <p className="error">{localError ?? "Couldn't write it just now. Your line is still here; try once more in a minute, or pick one of tonight's ready handbooks."}</p>
      )}

      <ActionBar busy={writing} note={reading ? 'Reading what you shared first, then writing your plan. About a minute.' : writing && slow ? 'About 30 seconds. Seven chapters take a moment to plan.' : undefined}>
        {status === 'failed' && onRetry && topic.trim() === initialTopic.trim() ? (
          <button className="btn" onClick={() => onRetry().catch((e) => setLocalError(friendly(e)))}>Try again</button>
        ) : (
          <button className="btn" onClick={submit} disabled={writing}>{writing ? 'Writing your handbook…' : 'Write my handbook'}</button>
        )}
      </ActionBar>
    </>
  )
}

// The language picked last time on this phone, so a Hindi reader doesn't pick Hindi every time.
const LANGUAGE_KEY = 'igetit.language'
function rememberedLanguage(): string {
  try { const saved = localStorage.getItem(LANGUAGE_KEY); return saved && languageInfo(saved) ? saved : ENGLISH } catch { return ENGLISH }
}
function rememberLanguage(name: string) {
  try { localStorage.setItem(LANGUAGE_KEY, name) } catch { /* private windows can refuse storage */ }
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
