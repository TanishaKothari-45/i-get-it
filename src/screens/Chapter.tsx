import { useEffect, useMemo, useState } from 'react'
import ActionBar from '../components/ActionBar'
import RungBar from '../components/RungBar'
import Sheet from '../components/Sheet'
import Rich, { inline } from '../components/Rich'
import Illustration from '../components/Illustration'
import AskCard from '../components/AskCard'
import type { Id } from '../../convex/_generated/dataModel'

export type Card =
  | { type: 'picture' | 'example' | 'mistake' | 'try' | 'teach'; title?: string; body: string; simpler?: string; simplerFailedAt?: number }
  | { type: 'watch'; who: string; what: string; url: string; from?: string; minutes?: number; watchFor: string }
  | { type: 'exercise'; kind: 'guess' | 'apply' | 'recall'; prompt: string; options: { id: string; text: string }[] }

export type AnswerResult =
  | { correct: true; text: string; why: string | null }
  | { correct: false; whyNot: string; reteach: string; reveal: { id: string; text: string } | null }

type Item = { chapter: number; cardIndex: number; card: Card; recall?: boolean }

type Props = {
  topic: string
  n: number
  title: string
  cards: Card[]
  recall: Item[]              // exercises from earlier chapters, shown first on night 2+
  passed: number[]
  passedExercises: string[]
  startAt: number
  onPosition: (cardIndex: number) => void
  onAnswer: (item: Item, optionId: string, attempt: number) => Promise<AnswerResult>
  onFinish: () => Promise<void>
  onSimpler: (item: Item) => Promise<{ ready: boolean }>
  svg?: string
  onExit: () => void
  handbookId: Id<'handbooks'>
  deviceToken: string
}

// The card stack: teaching cards and exercises, one at a time.
// Only http(s) links from the known hosts reach the page; anything else is dropped.
function safeUrl(u: string): string {
  try { const x = new URL(u); if ((x.protocol === 'https:' || x.protocol === 'http:') && /(^|\.)(ted\.com|youtube\.com|youtu\.be|ocw\.mit\.edu|archive\.org|hbr\.org|duarte\.com|mattabrahams\.com|juliantreasure\.com)$/.test(x.hostname)) return x.toString() } catch {}
  return '#'
}

export default function Chapter({ topic, n, title, cards, recall, passed, passedExercises, startAt, onPosition, onAnswer, onFinish, onSimpler, svg, onExit, handbookId, deviceToken }: Props) {
  const items: Item[] = useMemo(
    () => [...recall.map((r) => ({ ...r, recall: true })), ...cards.map((card, i) => ({ chapter: n, cardIndex: i, card }))],
    [cards, recall, n],
  )
  const firstChapterItem = recall.length
  // Resuming mid-chapter skips the recall cards; a fresh night starts with them.
  const [i, setI] = useState(() => (startAt > 0 ? Math.min(firstChapterItem + startAt, items.length - 1) : 0))
  const [attempt, setAttempt] = useState(1)
  const [picked, setPicked] = useState<string | null>(null)
  const [missed, setMissed] = useState<string[]>([])
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [passedHere, setPassedHere] = useState<Set<string>>(() => new Set(passedExercises))
  const [passedChoice, setPassedChoice] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // "Say it simpler": a per-handbook preference the phone remembers, plus the one card being rewritten right now.
  const [simple, setSimple] = useState<boolean>(() => { try { return localStorage.getItem('igetit.simple') === '1' } catch { return false } })
  const [showOriginal, setShowOriginal] = useState(false)
  const [rewriting, setRewriting] = useState<string | null>(null)
  const [rewriteError, setRewriteError] = useState<string | null>(null)

  const item = items[i]
  const isLast = i === items.length - 1
  const key = `${item.chapter}:${item.cardIndex}`
  const exercisePassed = item.card.type === 'exercise' && (item.recall ? result?.correct === true : passedHere.has(key))

  useEffect(() => { window.scrollTo({ top: 0 }) }, [i])
  useEffect(() => { if (!item.recall) onPosition(item.cardIndex) }, [i]) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => { setAttempt(1); setPicked(null); setMissed([]); setResult(null); setShowOriginal(false); setRewriteError(null) }
  const next = () => { if (!isLast) { setI(i + 1); reset() } }
  const back = () => { if (i > 0) { setI(i - 1); reset() } else onExit() }

  // Keyboard on a laptop: → or Enter for Next, ← for Back, 1/2/3 to pick an option, Esc closes the sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (result) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); if (result.correct) { setResult(null); if (!isLast) next() } else closeSheet() } return }
      if (e.key === 'ArrowLeft') { e.preventDefault(); back(); return }
      if (item.card.type === 'exercise' && !exercisePassed && ['1', '2', '3'].includes(e.key)) { const o = item.card.options[Number(e.key) - 1]; if (o && !missed.includes(o.id)) choose(o.id); return }
      if ((e.key === 'ArrowRight' || e.key === 'Enter') && (item.card.type !== 'exercise' || exercisePassed)) { e.preventDefault(); if (isLast) finish(); else next() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const choose = async (optionId: string) => {
    if (item.card.type !== 'exercise' || sending || exercisePassed) return
    setSending(true); setPicked(optionId); setError(null)
    try {
      const r = await onAnswer(item, optionId, attempt)
      setResult(r)
      if (r.correct) { if (!item.recall) { setPassedHere((s) => new Set(s).add(key)); setPassedChoice((m) => ({ ...m, [key]: optionId })) } }
      else setMissed((m) => [...m, optionId])
    } catch { setError("Couldn't save that answer. It still counts here; try the next one when you're back online.") }
    finally { setSending(false) }
  }

  const closeSheet = () => {
    if (!result) return
    if (result.correct) { setResult(null); return }
    setAttempt((a) => a + 1); setPicked(null); setResult(null)
  }

  const finish = async () => {
    setFinishing(true); setError(null)
    try { await onFinish() } catch (e: any) { setError(String(e?.message ?? e).includes('Finish') ? 'One exercise is still open. Scroll back and answer it.' : 'Could not save the chapter. Try again.') }
    finally { setFinishing(false) }
  }

  const teaching = item.card.type !== 'exercise' && item.card.type !== 'watch' ? item.card : null
  const showingSimpler = !!teaching && !!teaching.simpler && simple && !showOriginal
  useEffect(() => { if (rewriting === key && teaching?.simpler) { setRewriting(null); setSimple(true); setShowOriginal(false); try { localStorage.setItem('igetit.simple', '1') } catch {} } }, [teaching?.simpler, rewriting, key])
  useEffect(() => { if (rewriting === key && teaching?.simplerFailedAt) { setRewriting(null); setRewriteError("Can't rewrite this one right now. Try again in a minute.") } }, [teaching?.simplerFailedAt, rewriting, key])
  const saySimpler = async () => {
    if (!teaching) return
    setRewriteError(null)
    if (teaching.simpler) { setSimple(true); setShowOriginal(false); try { localStorage.setItem('igetit.simple', '1') } catch {}; return }
    setRewriting(key)
    try {
      const r = await onSimpler(item)
      if (r.ready) { setSimple(true); setShowOriginal(false) }
      setTimeout(() => setRewriting((cur) => { if (cur === key) { setRewriteError("Can't rewrite this one right now. Try again in a minute."); return null } return cur }), 30000)
    } catch (e: any) { setRewriting(null); setRewriteError(String(e?.message ?? e).includes('busy') ? 'A few too many rewrites in a row. Try again in a bit.' : "Can't rewrite this one right now. Try again in a minute.") }
  }
  const chapterCardNo = item.recall ? null : item.cardIndex + 1
  const revealId = result && !result.correct && result.reveal ? result.reveal.id : null

  return (
    <>
      <RungBar passed={passed} />
      <p className="sub" style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span>
          <button type="button" className="quiet" style={{ padding: 0, marginRight: 10 }} onClick={back} aria-label={i > 0 ? 'Previous card' : 'Back to the handbook'}>{i > 0 ? '← Back' : '← Handbook'}</button>
          {item.recall ? `Recall · from chapter ${item.chapter}` : `Chapter ${n} of 7 · card ${chapterCardNo} of ${cards.length}`}
        </span>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '48%' }}>{topic}</span>
      </p>

      <div className={`card ${item.card.type}-card`} key={`${key}-${item.recall ? 'r' : 'c'}`}>
        {item.card.type === 'watch' ? (
          <>
            <p className="kicker">Watch, {item.card.minutes ? `${item.card.minutes} min` : 'a few minutes'}</p>
            <a className="watch" href={safeUrl(item.card.url)} target="_blank" rel="noopener noreferrer">
              <span className="watch-who">{item.card.who}</span>
              <span className="watch-what">{item.card.what}{item.card.from ? ` · from ${item.card.from}` : ''}</span>
              <span className="watch-go">Open in a new tab →</span>
            </a>
            <p className="serif" style={{ marginTop: 'var(--m)' }}><strong>Watch for:</strong> {item.card.watchFor}</p>
          </>
        ) : item.card.type !== 'exercise' ? (
          <>
            {item.card.type === 'picture' && i === firstChapterItem && <h1 style={{ marginBottom: 6 }}>{title}</h1>}
            {item.card.type === 'picture' && <Illustration svg={svg} />}
            {item.card.type === 'picture' && <p className="kicker">The one picture</p>}
            {item.card.type === 'example' && <p className="kicker">A worked example</p>}
            {item.card.type === 'mistake' && <p className="kicker">The mistake people make</p>}
            {item.card.type === 'try' && <p className="kicker">If you want to try it tonight (optional)</p>}
            {item.card.title && item.card.type !== 'picture' && <h2>{item.card.title}</h2>}
            <Rich text={showingSimpler && item.card.simpler ? item.card.simpler : item.card.body} className={`serif ${item.card.type === 'mistake' ? 'mistake' : ''} ${item.card.type === 'try' ? 'try' : ''}`} />
            {item.card.type !== 'try' && (
              <p className="simpler-row">
                {showingSimpler ? (
                  <>Said simpler. <button type="button" className="quiet" onClick={() => { setShowOriginal(true); setSimple(false); try { localStorage.setItem('igetit.simple', '0') } catch {} }}>Show the original</button></>
                ) : rewriting === key ? (
                  <>Rewriting in plainer words…</>
                ) : (
                  <>Lost? <button type="button" className="quiet" onClick={saySimpler}>Say it simpler</button></>
                )}
                {rewriteError && <span className="error" style={{ display: 'block', marginTop: 4 }}>{rewriteError}</span>}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="kicker">{item.recall ? 'Still with you?' : item.card.kind === 'guess' ? 'Guess before you read on' : item.card.kind === 'apply' ? 'Apply it' : 'The one thing'}</p>
            <p className="question">{inline(item.card.prompt)}</p>
            <div className="options">
              {item.card.options.map((o) => {
                const cls = ['opt']
                if (exercisePassed && (picked === o.id || (picked === null && passedChoice[key] === o.id))) cls.push('pass')
                else if (missed.includes(o.id)) cls.push('missed')
                if (revealId === o.id) cls.push('reveal')
                return (
                  <button key={o.id} type="button" className={cls.join(' ')} onClick={() => choose(o.id)} disabled={sending || !!exercisePassed || missed.includes(o.id)}>
                    <span className="k">{o.id.toUpperCase()}</span><span>{o.text}</span>
                  </button>
                )
              })}
            </div>
            {!exercisePassed && attempt > 2 && <p className="note">Tap the one outlined in green to carry on.</p>}
          </>
        )}
      </div>

      {!item.recall && item.card.type !== 'try' && <AskCard handbookId={handbookId} chapter={item.chapter} cardIndex={item.cardIndex} deviceToken={deviceToken} />}

      {error && <p className="error">{error}</p>}
      <p className="kbd-hint">Keys: → or Enter next · ← back · 1 2 3 to answer</p>

      <ActionBar>
        {item.card.type === 'exercise' && !exercisePassed ? (
          <button className="btn" disabled>Pick one</button>
        ) : isLast ? (
          <button className="btn" onClick={finish} disabled={finishing}>{finishing ? 'Saving…' : `Finish chapter ${n}`}</button>
        ) : (
          <button className="btn" onClick={next}>Next</button>
        )}
      </ActionBar>

      {result && (
        <Sheet onClose={closeSheet}>
          {result.correct ? (
            <>
              <p className="verdict pass">That's it.</p>
              <p className="serif">{result.text}{result.why ? ` — ${result.why}` : ''}</p>
              <button className="btn" onClick={() => { setResult(null); if (!isLast) next() }}>{isLast ? 'Done' : 'Next'}</button>
            </>
          ) : (
            <>
              <p className="verdict">{inline(result.whyNot)}</p>
              {result.reteach && <p className="serif">{inline(result.reteach)}</p>}
              {result.reveal && <p className="serif" style={{ marginTop: 'var(--m)' }}>It's <strong>{result.reveal.id.toUpperCase()}</strong>: {result.reveal.text}</p>}
              <button className="btn" onClick={closeSheet}>{result.reveal ? 'Got it' : 'Try again'}</button>
            </>
          )}
        </Sheet>
      )}
    </>
  )
}
