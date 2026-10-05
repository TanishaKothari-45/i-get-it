import { useEffect, useMemo, useState } from 'react'
import ActionBar from '../components/ActionBar'
import RungBar from '../components/RungBar'
import Sheet from '../components/Sheet'
import Rich, { inline } from '../components/Rich'
import { Link } from '../lib/router'

export type Card =
  | { type: 'picture' | 'example' | 'mistake' | 'try' | 'teach'; title?: string; body: string; simpler?: string; simplerFailedAt?: number; summary?: boolean }
  | { type: 'exercise'; kind: 'guess' | 'apply' | 'recall'; prompt: string; options: { id: string; text: string }[] }

export type AnswerResult =
  | { correct: true; text: string; why: string | null }
  | { correct: false; whyNot: string; reteach: string; reveal: { id: string; text: string } | null }

type Item = { chapter: number; cardIndex: number; card: Card; recall?: boolean; recap?: boolean }

// The previous chapter's summary card, shown first so the reader picks up where they left off.
export type Recap = { chapter: number; title: string; card: Card }

type Props = {
  topic: string
  n: number
  title: string
  cards: Card[]
  recall: Item[]              // exercises from earlier chapters, shown first on night 2+
  recap?: Recap | null        // the previous chapter in one breath, shown before everything else
  passed: number[]
  passedExercises: string[]
  startAt: number
  onPosition: (cardIndex: number) => void
  onAnswer: (item: Item, optionId: string, attempt: number) => Promise<AnswerResult>
  onFinish: () => Promise<void>
  onSimpler: (item: Item) => Promise<{ ready: boolean }>
  handbookPath?: string       // the plan, linked from the topic name at the top
  label?: string              // replaces "Chapter n of 7" in the header (a bonus lesson)
  finishLabel?: string        // replaces "Finish chapter n" on the last card
  allowSimpler?: boolean      // "Say it simpler" under teaching cards (default on)
}

// The card stack: teaching cards and exercises, one at a time.
export default function Chapter({ topic, n, title, cards, recall, recap, passed, passedExercises, startAt, onPosition, onAnswer, onFinish, onSimpler, handbookPath, label, finishLabel, allowSimpler = true }: Props) {
  const items: Item[] = useMemo(
    () => [
      ...(recap ? [{ chapter: recap.chapter, cardIndex: -1, card: recap.card, recap: true }] : []),
      ...recall.map((r) => ({ ...r, recall: true })),
      ...cards.map((card, i) => ({ chapter: n, cardIndex: i, card })),
    ],
    [cards, recall, recap, n],
  )
  const firstChapterItem = (recap ? 1 : 0) + recall.length
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
  useEffect(() => { if (!item.recall && !item.recap) onPosition(item.cardIndex) }, [i]) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => { setAttempt(1); setPicked(null); setMissed([]); setResult(null); setShowOriginal(false); setRewriteError(null) }
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

  const teaching = item.card.type !== 'exercise' ? item.card : null
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
  const chapterCardNo = item.recall || item.recap ? null : item.cardIndex + 1
  const headerLine = item.recap ? `Recap · from chapter ${item.chapter}`
    : item.recall ? `Recall · from chapter ${item.chapter}`
    : `${label ?? `Chapter ${n} of 7`} · card ${chapterCardNo} of ${cards.length}`
  const revealId = result && !result.correct && result.reveal ? result.reveal.id : null

  return (
    <>
      <RungBar passed={passed} />
      <p className="sub" style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span>
          {i > 0 && <button type="button" className="quiet" style={{ padding: 0, marginRight: 10 }} onClick={() => { setI(i - 1); reset() }} aria-label="Previous card">← Back</button>}
          {headerLine}
        </span>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '48%' }}>
          {handbookPath ? <Link to={handbookPath} className="quiet" style={{ padding: 0 }} aria-label={`Back to the ${topic} plan`}>{topic}</Link> : topic}
        </span>
      </p>

      <div className={`card ${item.card.type}-card`} key={`${key}-${item.recall ? 'r' : item.recap ? 'p' : 'c'}`}>
        {item.card.type !== 'exercise' ? (
          <>
            {item.recap && recap && <p className="kicker">Last time · Chapter {recap.chapter}: {recap.title}</p>}
            {item.card.type === 'picture' && i === firstChapterItem && <h1 style={{ marginBottom: 6 }}>{title}</h1>}
            {item.card.type === 'picture' && <p className="kicker">The one picture</p>}
            {item.card.type === 'example' && <p className="kicker">A worked example</p>}
            {item.card.type === 'mistake' && <p className="kicker">The mistake people make</p>}
            {item.card.type === 'try' && <p className="kicker">If you want to try it tonight (optional)</p>}
            {item.card.title && item.card.type !== 'picture' && <h2>{item.card.title}</h2>}
            <Rich text={showingSimpler && item.card.simpler ? item.card.simpler : item.card.body} className={`serif ${item.card.type === 'mistake' ? 'mistake' : ''} ${item.card.type === 'try' ? 'try' : ''}`} />
            {item.card.type !== 'try' && !item.recap && allowSimpler && (
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

      {error && <p className="error">{error}</p>}

      <ActionBar>
        {item.card.type === 'exercise' && !exercisePassed ? (
          <button className="btn" disabled>Pick one</button>
        ) : isLast ? (
          <button className="btn" onClick={finish} disabled={finishing}>{finishing ? 'Saving…' : (finishLabel ?? `Finish chapter ${n}`)}</button>
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
