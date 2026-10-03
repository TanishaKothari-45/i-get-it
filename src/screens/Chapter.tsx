import { useEffect, useMemo, useState } from 'react'
import ActionBar from '../components/ActionBar'
import RungBar from '../components/RungBar'
import Sheet from '../components/Sheet'

export type Card =
  | { type: 'picture' | 'example' | 'mistake' | 'try' | 'teach'; title?: string; body: string }
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
}

// The card stack: teaching cards and exercises, one at a time.
export default function Chapter({ topic, n, title, cards, recall, passed, passedExercises, startAt, onPosition, onAnswer, onFinish }: Props) {
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

  const item = items[i]
  const isLast = i === items.length - 1
  const key = `${item.chapter}:${item.cardIndex}`
  const exercisePassed = item.card.type === 'exercise' && (item.recall ? result?.correct === true : passedHere.has(key))

  useEffect(() => { window.scrollTo({ top: 0 }) }, [i])
  useEffect(() => { if (!item.recall) onPosition(item.cardIndex) }, [i]) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => { setAttempt(1); setPicked(null); setMissed([]); setResult(null) }
  const next = () => { if (!isLast) { setI(i + 1); reset() } }

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

  const chapterCardNo = item.recall ? null : item.cardIndex + 1
  const revealId = result && !result.correct && result.reveal ? result.reveal.id : null

  return (
    <>
      <RungBar passed={passed} />
      <p className="sub" style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span>
          {i > 0 && <button type="button" className="quiet" style={{ padding: 0, marginRight: 10 }} onClick={() => { setI(i - 1); reset() }} aria-label="Previous card">← Back</button>}
          {item.recall ? `Recall · from chapter ${item.chapter}` : `Chapter ${n} of 7 · card ${chapterCardNo} of ${cards.length}`}
        </span>
        <span>{topic}</span>
      </p>

      <div className={`card ${item.card.type}-card`} key={`${key}-${item.recall ? 'r' : 'c'}`}>
        {item.card.type !== 'exercise' ? (
          <>
            {item.card.type === 'picture' && i === firstChapterItem && <h1 style={{ marginBottom: 6 }}>{title}</h1>}
            {item.card.type === 'picture' && <p className="kicker">The one picture</p>}
            {item.card.type === 'example' && <p className="kicker">A worked example</p>}
            {item.card.type === 'mistake' && <p className="kicker">The mistake people make</p>}
            {item.card.type === 'try' && <p className="kicker">If you want to try it tonight (optional)</p>}
            {item.card.title && item.card.type !== 'picture' && <h2>{item.card.title}</h2>}
            <div className={`serif ${item.card.type === 'mistake' ? 'mistake' : ''} ${item.card.type === 'try' ? 'try' : ''}`}>
              {item.card.body.split(/\n\n+/).map((p, k) => <p key={k}>{p}</p>)}
            </div>
          </>
        ) : (
          <>
            <p className="kicker">{item.recall ? 'Still with you?' : item.card.kind === 'guess' ? 'Guess before you read on' : item.card.kind === 'apply' ? 'Apply it' : 'The one thing'}</p>
            <p className="question">{item.card.prompt}</p>
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

      {error && <p className="error">{error}</p>}

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
              <p className="verdict">{result.whyNot}</p>
              {result.reteach && <p className="serif">{result.reteach}</p>}
              {result.reveal && <p className="serif" style={{ marginTop: 'var(--m)' }}>It's <strong>{result.reveal.id.toUpperCase()}</strong>: {result.reveal.text}</p>}
              <button className="btn" onClick={closeSheet}>{result.reveal ? 'Got it' : 'Try again'}</button>
            </>
          )}
        </Sheet>
      )}
    </>
  )
}
