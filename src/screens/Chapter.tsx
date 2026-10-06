import { useEffect, useMemo, useRef, useState } from 'react'
import Sheet from '../components/Sheet'
import { track } from '../lib/track'
import Rich, { inline } from '../components/Rich'
import AskCard from '../components/AskCard'
import type { Id } from '../../convex/_generated/dataModel'
import { limitCode, limitMessage } from '../lib/limits'

export type Card =
  | { type: 'picture' | 'example' | 'mistake' | 'try' | 'teach'; title?: string; body: string; simpler?: string; simplerFailedAt?: number }
  | { type: 'watch'; who: string; what: string; url: string; from?: string; minutes?: number; watchFor: string }
  | { type: 'exercise'; kind: 'guess' | 'apply' | 'recall'; prompt: string; options: { id: string; text: string }[] }

export type AnswerResult =
  | { correct: true; text: string; why: string | null; chapterPassed?: true }
  | { correct: false; whyNot: string; reteach: string; reveal: { id: string; text: string } | null }

type Item = { chapter: number; cardIndex: number; card: Card; recall?: boolean }
type Tone = 'marigold' | 'green' | 'coral' | 'indigo' | 'ink' | 'cream'
type Frame = { item: Item; text?: string; part: number; parts: number; tone: Tone; cover?: boolean }

type Props = {
  topic: string
  n: number
  title: string
  cards: Card[]
  recall: Item[]
  passed: number[]
  passedExercises: string[]
  startAt: number
  startPart?: number
  onPosition: (cardIndex: number, part: number) => void
  onAnswer: (item: Item, optionId: string, attempt: number) => Promise<AnswerResult>
  onFinish: (stats: { minutes: number; right: number; total: number }) => Promise<void>
  onSimpler: (item: Item) => Promise<{ ready: boolean }>
  svg?: string
  pictures: Record<number, string>   // card index -> picture URL (a drawing, or a real photo), arriving after the chapter
  credits?: Record<number, { credit: string; source?: string }>   // real photos carry their licence credit
  caution?: string | null            // money / health / legal topics: the fixed study-aid line
  picturesPending?: boolean          // pictures are still being drawn: a quiet plate, never the rough drawing
  onExit: () => void
  handbookId: Id<'handbooks'>
  deviceToken: string
}

// Only http(s) links from the known hosts reach the page; anything else is dropped.
function safeUrl(u: string): string {
  try { const x = new URL(u); if ((x.protocol === 'https:' || x.protocol === 'http:') && /(^|\.)(ted\.com|youtube\.com|youtu\.be|ocw\.mit\.edu|archive\.org|hbr\.org|duarte\.com|mattabrahams\.com|juliantreasure\.com)$/.test(x.hostname)) return x.toString() } catch {}
  return '#'
}

// One idea per frame: split a card into paragraphs, folding a very short one into the next.
function paragraphs(text: string): string[] {
  const out: string[] = []
  for (const p of text.split(/\n\n+/).map((s) => s.trim()).filter(Boolean)) {
    if (out.length && out[out.length - 1].split(/\s+/).length < 14) out[out.length - 1] += '\n\n' + p
    else out.push(p)
  }
  return out.length ? out : [text]
}

const TEACH_TONES: Tone[] = ['marigold', 'green', 'indigo', 'cream']
const KICKER: Record<string, string> = { example: 'Story time', mistake: 'The mistake everyone makes', try: "Tonight's dare (optional)", guess: 'Quick guess', apply: 'Your call', recall: 'Lock it in' }

function sizeOf(text: string) {
  const w = text.split(/\s+/).length
  return w <= 26 ? 'xl' : w <= 60 ? 'lg' : 'md'
}

// The chapter as Stories: full-screen frames, one idea each, tap or swipe through.
export default function Chapter({ topic, n, title, cards, recall, passed: _passed, passedExercises, startAt, startPart = 0, onPosition, onAnswer, onFinish, onSimpler, pictures, credits = {}, caution, onExit, handbookId, deviceToken }: Props) {
  const items: Item[] = useMemo(
    () => [...recall.map((r) => ({ ...r, recall: true })), ...cards.map((card, i) => ({ chapter: n, cardIndex: i, card }))],
    [cards, recall, n],
  )

  // For the Done screen's line: minutes since this chapter was opened, and quizzes right on the first try.
  const openedAt = useRef(Date.now())
  const firstTries = useRef<Map<string, boolean>>(new Map())
  const [simplePref, setSimplePref] = useState<boolean>(() => { try { return localStorage.getItem('igetit.simple') === '1' } catch { return false } })
  const [simplified, setSimplified] = useState<Set<number>>(() => new Set())
  const [original, setOriginal] = useState<Set<number>>(() => new Set())

  const frames: Frame[] = useMemo(() => {
    const out: Frame[] = []
    let t = 0
    for (const item of items) {
      const c = item.card
      if (c.type === 'exercise') { out.push({ item, part: 0, parts: 1, tone: 'ink' }); continue }
      if (c.type === 'watch') { out.push({ item, part: 0, parts: 1, tone: 'indigo' }); continue }
      const useSimple = !!c.simpler && !original.has(item.cardIndex) && (simplePref || simplified.has(item.cardIndex))
      const ps = paragraphs(useSimple ? c.simpler! : c.body)
      ps.forEach((text, part) => {
        const tone: Tone = c.type === 'picture' ? (part === 0 ? 'ink' : 'indigo') : c.type === 'example' ? 'cream' : c.type === 'mistake' ? 'coral' : c.type === 'try' ? 'green' : TEACH_TONES[t++ % TEACH_TONES.length]
        out.push({ item, text, part, parts: ps.length, tone, cover: c.type === 'picture' && part === 0 && !item.recall })
      })
    }
    return out
  }, [items, simplePref, simplified, original])

  const firstChapterFrame = frames.findIndex((f) => !f.item.recall)
  const [i, setI] = useState(() => {
    if (startAt <= 0) return 0
    const exact = frames.findIndex((f) => !f.item.recall && f.item.cardIndex === startAt && f.part === startPart)
    if (exact >= 0) return exact
    const at = frames.findIndex((f) => !f.item.recall && f.item.cardIndex === startAt)
    return at >= 0 ? at : Math.max(0, firstChapterFrame)
  })
  const frame = frames[Math.min(i, frames.length - 1)]
  const item = frame.item
  const key = `${item.chapter}:${item.cardIndex}`
  const isLast = i >= frames.length - 1

  // exercise state, per frame
  const [attempt, setAttempt] = useState(1)
  const [picked, setPicked] = useState<string | null>(null)
  const [missed, setMissed] = useState<string[]>([])
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [passedHere, setPassedHere] = useState<Set<string>>(() => new Set(passedExercises))
  const [passedChoice, setPassedChoice] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [askOpen, setAskOpen] = useState(false)
  const [rewriting, setRewriting] = useState<number | null>(null)
  const [jumpTo, setJumpTo] = useState<number | null>(null)

  const exercisePassed = item.card.type === 'exercise' && (item.recall ? result?.correct === true : passedHere.has(key))
  const canAdvance = item.card.type !== 'exercise' || exercisePassed
  const reset = () => { setAttempt(1); setPicked(null); setMissed([]); setResult(null); setError(null) }

  useEffect(() => { track('ch_open', { n }, `ch_open:${handbookId}:${n}`) }, [n, handbookId])
  useEffect(() => { if (!item.recall) track('card', { n, i: item.cardIndex }, `card:${handbookId}:${n}:${item.cardIndex}`) }, [n, handbookId, item.cardIndex, item.recall])
  useEffect(() => { if (!item.recall) onPosition(item.cardIndex, frame.part) }, [item.cardIndex, item.recall, frame.part]) // eslint-disable-line react-hooks/exhaustive-deps
  // after a card's frames change (simpler/original), land on that card's first frame
  useEffect(() => {
    if (jumpTo === null) return
    const at = frames.findIndex((f) => !f.item.recall && f.item.cardIndex === jumpTo)
    if (at >= 0) setI(at)
    setJumpTo(null)
  }, [frames, jumpTo])
  // a live rewrite arriving
  const teaching = item.card.type !== 'exercise' && item.card.type !== 'watch' ? item.card : null
  useEffect(() => {
    if (rewriting === null) return
    const c = cards[rewriting]
    if (c && c.type !== 'exercise' && c.type !== 'watch' && c.simpler) { setSimplified((s) => new Set(s).add(rewriting)); setJumpTo(rewriting); setRewriting(null) }
    if (c && c.type !== 'exercise' && c.type !== 'watch' && c.simplerFailedAt) { setRewriting(null); setError("Can't rewrite this one right now. Try again in a minute.") }
  }, [cards, rewriting])

  const next = () => { if (!canAdvance) return; if (isLast) { finish(); return } setI(i + 1); reset() }
  const back = () => { if (i > 0) { setI(i - 1); reset() } else onExit() }

  const choose = async (optionId: string) => {
    if (item.card.type !== 'exercise' || sending || exercisePassed) return
    setSending(true); setPicked(optionId); setError(null)
    try {
      const r = await onAnswer(item, optionId, attempt)
      if (!item.recall && !firstTries.current.has(key)) firstTries.current.set(key, attempt === 1 && r.correct)
      setResult(r)
      if (r.correct) { if (!item.recall) { setPassedHere((s) => new Set(s).add(key)); setPassedChoice((m) => ({ ...m, [key]: optionId })) } }
      else setMissed((m) => [...m, optionId])
    } catch { setError("Couldn't save that answer. Check your connection and tap again.") }
    finally { setSending(false) }
  }
  const closeSheet = () => { if (!result) return; if (result.correct) { setResult(null); next(); return } setAttempt((a) => a + 1); setPicked(null); setResult(null) }

  const finish = async () => {
    setFinishing(true); setError(null)
    const tries = [...firstTries.current.values()]
    try { await onFinish({ minutes: Math.max(1, Math.round((Date.now() - openedAt.current) / 60000)), right: tries.filter(Boolean).length, total: tries.length }) } catch (e: any) { setError(String(e?.message ?? e).includes('Finish') ? 'One check is still open. Go back and answer it.' : 'Could not save the chapter. Try again.') }
    finally { setFinishing(false) }
  }

  const saySimpler = async () => {
    if (!teaching) return
    const idx = item.cardIndex
    if (teaching.simpler) {
      setOriginal((s) => { const x = new Set(s); x.delete(idx); return x })
      setSimplified((s) => new Set(s).add(idx)); setSimplePref(true); try { localStorage.setItem('igetit.simple', '1') } catch {}
      setJumpTo(idx); return
    }
    setRewriting(idx); setError(null)
    try { const r = await onSimpler(item); if (r.ready) { setSimplified((s) => new Set(s).add(idx)); setJumpTo(idx); setRewriting(null) } }
    catch (e: any) { setRewriting(null); setError(limitCode(e) === 'simpler-free' ? limitMessage(e)! : String(e?.message ?? e).includes('busy') || limitCode(e) === 'busy' ? 'A few too many rewrites in a row. Try again in a bit.' : "Can't rewrite this one right now.") }
  }
  const showOriginal = () => { const idx = item.cardIndex; setOriginal((s) => new Set(s).add(idx)); setSimplePref(false); try { localStorage.setItem('igetit.simple', '0') } catch {}; setJumpTo(idx) }
  const showingSimpler = !!teaching?.simpler && !original.has(item.cardIndex) && (simplePref || simplified.has(item.cardIndex))

  // keyboard: → / Enter / Space next, ← back, 1 2 3 answer, Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (askOpen) { if (e.key === 'Escape') setAskOpen(false); return }
      if (result) { if (['Escape', 'Enter', 'ArrowRight', ' '].includes(e.key)) { e.preventDefault(); closeSheet() } return }
      if (e.key === 'ArrowLeft') { e.preventDefault(); back(); return }
      if (e.key === 'Escape') { onExit(); return }
      if (item.card.type === 'exercise' && !exercisePassed && ['1', '2', '3'].includes(e.key)) { const o = item.card.options[Number(e.key) - 1]; if (o && !missed.includes(o.id)) choose(o.id); return }
      if (['ArrowRight', 'Enter', ' '].includes(e.key)) { e.preventDefault(); next() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // tap zones and swipe
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a, input, .no-tap')) return
    const r = e.currentTarget.getBoundingClientRect()
    if (e.clientX - r.left < r.width * 0.3) back(); else next()
  }
  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current; touch.current = null; if (!s) return
    const dx = e.changedTouches[0].clientX - s.x, dy = e.changedTouches[0].clientY - s.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { if (dx < 0) next(); else back(); return }
    // Reels-style (DESIGN.md section 2): swipe up for the next frame, down to go back. A long frame scrolls first.
    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx)) {
      const body = (e.target as HTMLElement).closest('.story-body') as HTMLElement | null
      const atEnd = !body || body.scrollTop + body.clientHeight >= body.scrollHeight - 4
      const atTop = !body || body.scrollTop <= 4
      if (dy < 0 && atEnd) next(); else if (dy > 0 && atTop) back()
    }
  }

  const c = item.card
  // A card's picture sits on its first frame only, so the words keep the screen on the frames after it.
  const pic = !item.recall && frame.part === 0 && c.type !== 'exercise' && c.type !== 'watch' ? pictures[item.cardIndex] : undefined
  const revealId = result && !result.correct && result.reveal ? result.reveal.id : null
  const label = item.recall ? `Remember this? · from chapter ${item.chapter}` : `Chapter ${n} of 7`

  return (
    <div className="story" role="dialog" aria-label={`${title}, chapter ${n}`}>
      <div className={`story-frame tone-${frame.tone}`} onClick={onTap} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="story-bars" aria-hidden="true">
          {frames.map((_, k) => <span key={k} className={k < i ? 'on' : k === i ? 'now' : ''} />)}
        </div>
        <div className="story-head">
          <span className="story-label">{label}</span>
          <span className="story-topic">{topic}</span>
          <button type="button" className="story-close" onClick={onExit} aria-label="Back to the handbook">×</button>
        </div>

        <div className="story-body" key={i}>
          {caution && i === 0 && <p className="story-caution">Study aid, verify before you act.</p>}
          {c.type === 'exercise' ? (
            <>
              <p className="story-kicker">{item.recall ? 'Remember this?' : KICKER[c.kind]}</p>
              <p className="story-q">{inline(c.prompt)}</p>
              <div className="story-options no-tap">
                {c.options.map((o, k) => {
                  const cls = ['story-opt']
                  if (exercisePassed && (picked === o.id || (picked === null && passedChoice[key] === o.id))) cls.push('pass')
                  else if (missed.includes(o.id)) cls.push('missed')
                  if (revealId === o.id) cls.push('reveal')
                  return (
                    <button key={o.id} type="button" className={cls.join(' ')} onClick={() => choose(o.id)} disabled={sending || exercisePassed || missed.includes(o.id)}>
                      <span className="k">{k + 1}</span><span>{o.text}</span>
                    </button>
                  )
                })}
              </div>
              {exercisePassed && <p className="story-hint">Tap to keep going</p>}
            </>
          ) : c.type === 'watch' ? (
            <>
              <p className="story-kicker">Watch · {c.minutes ? `${c.minutes} min` : 'a few minutes'}</p>
              <p className="story-big">{c.who}</p>
              <p className="story-sub">{c.what}{c.from ? ` · from ${c.from}` : ''}</p>
              <a className="story-watch no-tap" href={safeUrl(c.url)} target="_blank" rel="noopener noreferrer">Open the talk →</a>
              <p className="story-text size-md" style={{ marginTop: 20 }}><strong>Watch for:</strong> {c.watchFor}</p>
            </>
          ) : (
            <>
              {frame.cover && <h1 className="story-title">{title}</h1>}
              {pic ? <div className={`story-pic${credits[item.cardIndex] ? ' real' : ''}`}><img src={pic} alt="" />{credits[item.cardIndex] && <a className="story-credit no-tap" href={credits[item.cardIndex].source || undefined} target="_blank" rel="noopener noreferrer">Photo: {credits[item.cardIndex].credit}</a>}</div>
                : null /* no picture yet, or none: no box at all; the picture fades in when it lands */}
              {!frame.cover && frame.part === 0 && (KICKER[c.type] || c.title) && <p className="story-kicker">{KICKER[c.type] ?? c.title}</p>}
              <Rich text={frame.text ?? ''} className={`story-text size-${frame.cover || pic ? (pic && !frame.cover && sizeOf(frame.text ?? '') === 'xl' ? 'lg' : 'md') : sizeOf(frame.text ?? '')}`} />
              {isLast && (
                <button type="button" className="story-finish no-tap" onClick={finish} disabled={finishing}>{finishing ? 'Saving…' : `Finish chapter ${n}`}</button>
              )}
            </>
          )}
          {error && <p className="story-error no-tap">{error}</p>}
        </div>

        <div className="story-tools no-tap">
          {teaching && c.type !== 'try' && (showingSimpler
            ? <button type="button" onClick={showOriginal}>Show the original</button>
            : rewriting === item.cardIndex ? <span>Rewriting…</span>
            : <button type="button" onClick={saySimpler}>Say it simpler</button>)}
          {!item.recall && c.type !== 'try' && <button type="button" onClick={() => setAskOpen(true)}>Ask or object</button>}
          <span className="story-tapnote">{canAdvance ? (isLast ? 'Last one' : 'Tap →') : 'Pick one'}</span>
        </div>
      </div>

      {result && (
        <Sheet onClose={closeSheet}>
          {result.correct ? (
            <>
              {(item.card as any).kind === 'poll' ? (
                <>
                  <p className="verdict pass">{result.chapterPassed ? `Here's what happened. Chapter ${n} done.` : "Here's what happened."}</p>
                  {result.why && <p className="serif">{inline(result.why)}</p>}
                </>
              ) : (
                <>
                  <p className="verdict pass">{result.chapterPassed ? `That's it. Chapter ${n} passed.` : "That's it."}</p>
                  <p className="serif">{result.text}{result.why ? ` — ${result.why}` : ''}</p>
                </>
              )}
              {result.chapterPassed && !isLast ? (
                <>
                  <p className="serif" style={{ marginTop: 'var(--s)' }}>Your rung is lit. What's left is a bonus.</p>
                  <button className="btn" onClick={() => { setResult(null); finish() }} disabled={finishing}>See your rung</button>
                  <button type="button" className="quiet" onClick={closeSheet}>Read the bonus first</button>
                </>
              ) : <button className="btn" onClick={closeSheet}>{isLast ? 'Finish' : 'Keep going'}</button>}
            </>
          ) : (
            <>
              <p className="verdict">{inline(result.whyNot)}</p>
              {result.reteach && <p className="serif">{inline(result.reteach)}</p>}
              {result.reveal && <p className="serif" style={{ marginTop: 'var(--m)' }}>It's <strong>{result.reveal.text}</strong></p>}
              <button className="btn" onClick={closeSheet}>{result.reveal ? 'Got it' : 'Try again'}</button>
            </>
          )}
        </Sheet>
      )}
      {askOpen && (
        <Sheet onClose={() => setAskOpen(false)}>
          <p className="verdict" style={{ fontSize: 'var(--ui)' }}>Ask or object</p>
          <AskCard handbookId={handbookId} chapter={item.chapter} cardIndex={item.cardIndex} deviceToken={deviceToken} />
          <button className="btn btn-ghost" onClick={() => setAskOpen(false)}>Back to the story</button>
        </Sheet>
      )}
    </div>
  )
}
