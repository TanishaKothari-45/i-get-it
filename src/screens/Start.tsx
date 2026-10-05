import { useEffect, useState } from 'react'
import ActionBar from '../components/ActionBar'
import LanguagePicker from '../components/LanguagePicker'
import SourcesInput, { SourcesProgress } from '../components/SourcesInput'
import { MAX_LINKS, classifyLink, linksIn } from '../../convex/links'
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
}

export type NewSources = { links: string[]; photos: File[] }

// The first screen, and the empty state of the whole product (DESIGN.md section 4, Start).
export default function Start({ initialTopic = '', status, question, onCreate, onAnswer, onRetry, examples, initialLinks = '', sources = [] }: Props) {
  const [topic, setTopic] = useState(initialTopic)
  const [level, setLevel] = useState<Level>('new')
  const [voice, setVoice] = useState<Voice>('friend')
  const [language, setLanguage] = useState<string>(rememberedLanguage)
  const [answer, setAnswer] = useState('')
  const [slow, setSlow] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [linksText, setLinksText] = useState(initialLinks)
  const [photos, setPhotos] = useState<File[]>([])
  const writing = status === 'writing'
  const reading = writing && sources.some((s) => s.status === 'waiting' || s.status === 'reading')

  useEffect(() => {
    if (!writing) { setSlow(false); return }
    const t = setTimeout(() => setSlow(true), 8000)
    return () => clearTimeout(t)
  }, [writing])

  const submit = async () => {
    setLocalError(null)
    const links = linksIn(linksText)
    const hasSources = links.length > 0 || photos.length > 0
    if (links.some((l) => !classifyLink(l))) { setLocalError('Only YouTube and Instagram links for now. Take out the others.'); return }
    if (links.length > MAX_LINKS) { setLocalError(`Up to ${MAX_LINKS} links for one handbook.`); return }
    if (!hasSources && topic.trim().length < 2) { setLocalError('A few words is enough. What is it?'); return }
    try { await onCreate(topic.trim(), level, voice, language, hasSources ? { links, photos } : undefined) } catch (e: any) { setLocalError(friendly(e)) }
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
      <h1>You keep saving it.<br />Tonight, get it.</h1>
      <p className="lede">Type the one thing you keep meaning to learn. You get a seven-chapter handbook written for it, and you pass chapter 1 tonight. No sign-up.</p>

      <div className="field">
        <label htmlFor="topic">What do you keep meaning to learn?</label>
        <input id="topic" className="input" type="text" autoComplete="off" enterKeyHint="go" placeholder={linksText || photos.length ? 'Optional with links or photos' : examples[0] ?? 'Swimming'} value={topic}
          onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} disabled={writing} />
        {examples.length > 1 && (
          <p className="note">Tonight's ready handbooks: {examples.slice(0, 6).map((x, i) => (
            <span key={x}>{i > 0 && ' · '}<button type="button" className="quiet" style={{ padding: 0 }} onClick={() => setTopic(x)} disabled={writing}>{x}</button></span>
          ))}</p>
        )}
      </div>

      {writing && sources.length > 0
        ? <SourcesProgress sources={sources} />
        : <SourcesInput text={linksText} onText={setLinksText} photos={photos} onPhotos={setPhotos} disabled={writing} />}

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
  if (m.includes('YouTube and Instagram')) return 'Only YouTube and Instagram links for now. Take out the others.'
  if (m.includes('At most')) return m.replace(/^.*?(At most \d+ \w+).*$/, '$1 for one handbook.')
  return "Couldn't write it just now. Your line is still here; try once more in a minute."
}
