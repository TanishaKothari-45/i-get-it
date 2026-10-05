import { useEffect, useRef, useState } from 'react'
import ActionBar from '../components/ActionBar'
import LanguagePicker from '../components/LanguagePicker'
import { ENGLISH, languageInfo } from '../../convex/languages'

type Level = 'new' | 'some'
type Voice = 'friend' | 'straight' | 'stories'
type Props = {
  initialTopic?: string
  status: 'idle' | 'writing' | 'question' | 'failed'
  question?: string
  error?: string
  onCreate: (topic: string, level: Level, voice: Voice, language: string) => Promise<void>
  onAnswer?: (answer: string) => Promise<void>
  onRetry?: () => Promise<void>
  examples: string[]
}

// The first screen, and the empty state of the whole product (DESIGN.md section 4, Start).
export default function Start({ initialTopic = '', status, question, onCreate, onAnswer, onRetry, examples }: Props) {
  const [topic, setTopic] = useState(initialTopic)
  const [level, setLevel] = useState<Level>('new')
  const [voice, setVoice] = useState<Voice>('friend')
  const [language, setLanguage] = useState<string>(rememberedLanguage)
  const [answer, setAnswer] = useState('')
  const [slow, setSlow] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const writing = status === 'writing'
  const levelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!writing) { setSlow(false); return }
    const t = setTimeout(() => setSlow(true), 8000)
    return () => clearTimeout(t)
  }, [writing])

  const submit = async () => {
    setLocalError(null)
    if (topic.trim().length < 2) { setLocalError('A few words is enough. What is it?'); return }
    try { await onCreate(topic.trim(), level, voice, language) } catch (e: any) { setLocalError(friendly(e)) }
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
        <input id="topic" className="input" type="text" autoComplete="off" enterKeyHint="done" placeholder={examples[0] ?? 'Swimming'} value={topic}
          onChange={(e) => setTopic(e.target.value)} disabled={writing}
          // Enter only closes the keyboard and shows the level and voice; the button starts the writing.
          onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); levelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) } }} />
        {examples.length > 1 && (
          <p className="note">Tonight's ready handbooks: {examples.slice(0, 6).map((x, i) => (
            <span key={x}>{i > 0 && ' · '}<button type="button" className="quiet" style={{ padding: 0 }} onClick={() => setTopic(x)} disabled={writing}>{x}</button></span>
          ))}</p>
        )}
      </div>

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

      {(localError || (status === 'failed' && topic.trim() === initialTopic.trim())) && (
        <p className="error">{localError ?? "Couldn't write it just now. Your line is still here; try once more in a minute, or pick one of tonight's ready handbooks."}</p>
      )}

      <ActionBar busy={writing} note={writing && slow ? 'About 30 seconds. Seven chapters take a moment to plan.' : undefined}>
        {status === 'failed' && onRetry && topic.trim() === initialTopic.trim() ? (
          <button className="btn" onClick={() => onRetry().catch((e) => setLocalError(friendly(e)))}>Try again</button>
        ) : (
          <button className="btn" onClick={submit} disabled={writing}>{writing ? 'Writing your handbook…' : 'Write my handbook'}</button>
        )}
      </ActionBar>
    </>
  )
}

function friendly(e: any): string {
  const m = String(e?.message ?? e)
  if (m.includes('busy')) return "Busy right now. Try again in a few minutes."
  if (m.includes('few words')) return 'A few words is enough. What is it?'
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
