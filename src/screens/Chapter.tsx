import { useEffect, useMemo, useRef, useState } from 'react'
import Sheet from '../components/Sheet'
import { track } from '../lib/track'
import Rich, { inline } from '../components/Rich'
import AskCard from '../components/AskCard'
import DoIt, { type DoItCard } from '../components/DoIt'
import MoveFrame, { type MoveCard } from '../components/MoveFrame'
import StepsFrame, { type StepsCard } from '../components/StepsFrame'
import TryItFrame, { type TryItCard } from '../components/TryItFrame'
import type { Id } from '../../convex/_generated/dataModel'

export type Card =
  | { type: 'picture' | 'example' | 'mistake' | 'try' | 'teach'; title?: string; body: string }
  | { type: 'watch'; who: string; what: string; url: string; from?: string; minutes?: number; watchFor: string }
  | { type: 'exercise'; kind: 'guess' | 'apply' | 'recall'; prompt: string; options: { id: string; text: string }[] }
  | MoveCard
  | DoItCard
  | StepsCard
  | TryItCard

export type AnswerResult =
  | { correct: true; text: string; why: string | null; chapterPassed?: true }
  | { correct: false; whyNot: string; reteach: string; reveal: { id: string; text: string } | null }

type Item = { chapter: number; cardIndex: number; card: Card; recall?: boolean }
type Tone = 'marigold' | 'green' | 'coral' | 'indigo' | 'ink' | 'cream'
type Frame = { item: Item; text?: string; part: number; parts: number; tone: Tone; cover?: boolean }

type Props = {
  total?: number
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
  // Body skills (8 Oct): logging a set on a "do it" card; the first set passes the chapter.
  onLog?: (item: Item, count: number, feel: 'easy' | 'right' | 'hard') => Promise<{ chapterPassed: boolean }>
  loggedSets?: number[]   // card indexes with a set logged already
  // The previous chapter's "In one breath" card, shown first as "Last time" (7 Oct, Prateek): a recap that opens the
  // chapter instead of a summary that ends it.
  lastTime?: Card | null
  // Readers on the easier level (missed something last chapter): the re-teach for what they missed, after "Last time".
  recapReteach?: string[]
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
function paragraphs(text: string | undefined): string[] {
  const out: string[] = []
  if (typeof text !== 'string') return ['']
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
export default function Chapter({ total = 7, topic, n, title, cards, recall, passed: _passed, passedExercises, startAt, startPart = 0, onPosition, onAnswer, onFinish, onLog, loggedSets = [], lastTime, recapReteach = [], pictures, credits = {}, caution, onExit, handbookId, deviceToken }: Props) {
  const items: Item[] = useMemo(
    () => [
      ...(lastTime && !['exercise', 'watch', 'move', 'doit', 'steps', 'tryit'].includes(lastTime.type) ? [{ chapter: n - 1, cardIndex: -1, recall: true, card: { ...lastTime, title: 'Last time', body: dropNextLine((lastTime as any).body ?? '') } as Card }] : []),
      ...(recapReteach.length ? [{ chapter: n - 1, cardIndex: -2, recall: true, card: { type: 'teach', title: 'Before we go on', body: recapReteach.join('\n\n') } as Card }] : []),
      ...recall.map((r) => ({ ...r, recall: true })),
      ...cards.map((card, i) => ({ chapter: n, cardIndex: i, card })).filter((x) => !isBreath(x.card)),
    ],
    [cards, recall, n, lastTime, recapReteach],
  )

  // For the Done screen's line: minutes since this chapter was opened, and quizzes right on the first try.
  const openedAt = useRef(Date.now())
  const firstTries = useRef<Map<string, boolean>>(new Map())

  const frames: Frame[] = useMemo(() => {
    const out: Frame[] = []
    let t = 0
    for (const item of items) {
      const c = item.card
      if (c.type === 'exercise') { out.push({ item, part: 0, parts: 1, tone: 'ink' }); continue }
      if (c.type === 'watch') { out.push({ item, part: 0, parts: 1, tone: 'indigo' }); continue }
      if (c.type === 'move') { out.push({ item, part: 0, parts: 1, tone: 'cream' }); continue }
      if (c.type === 'doit') { out.push({ item, part: 0, parts: 1, tone: 'green' }); continue }
      if (c.type === 'steps') { out.push({ item, part: 0, parts: 1, tone: 'indigo' }); continue }
      if (c.type === 'tryit') { out.push({ item, part: 0, parts: 1, tone: 'cream' }); continue }
      // A card the screen can't show (8 Oct: a "poll" card from an old rewrite blanked the whole chapter) is skipped, never fatal.
      if (typeof (c as any).body !== 'string') continue
      const ps = paragraphs(c.body)
      ps.forEach((text, part) => {
        const tone: Tone = c.type === 'picture' ? (part === 0 ? 'ink' : 'indigo') : c.type === 'example' ? 'cream' : c.type === 'mistake' ? 'coral' : c.type === 'try' ? 'green' : TEACH_TONES[t++ % TEACH_TONES.length]
        out.push({ item, text, part, parts: ps.length, tone, cover: c.type === 'picture' && part === 0 && !item.recall })
      })
    }
    return out
  }, [items])

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

  const exercisePassed = item.card.type === 'exercise' && (item.recall ? result?.correct === true : passedHere.has(key))
  const [logged, setLogged] = useState<Set<number>>(() => new Set(loggedSets))
  const [later, setLater] = useState<Set<number>>(() => new Set())
  const doitOpen = item.card.type === 'doit' && !logged.has(item.cardIndex) && !later.has(item.cardIndex)
  const canAdvance = (item.card.type !== 'exercise' || exercisePassed) && !doitOpen
  const reset = () => { setAttempt(1); setPicked(null); setMissed([]); setResult(null); setError(null) }

  useEffect(() => { track('ch_open', { n }, `ch_open:${handbookId}:${n}`) }, [n, handbookId])
  useEffect(() => { if (!item.recall) track('card', { n, i: item.cardIndex }, `card:${handbookId}:${n}:${item.cardIndex}`) }, [n, handbookId, item.cardIndex, item.recall])
  useEffect(() => { if (!item.recall) onPosition(item.cardIndex, frame.part) }, [item.cardIndex, item.recall, frame.part]) // eslint-disable-line react-hooks/exhaustive-deps
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
    try { await onFinish({ minutes: Math.max(1, Math.round((Date.now() - openedAt.current) / 60000)), right: tries.filter(Boolean).length, total: tries.length }) } catch (e: any) {
      // A quiz still open (7 Oct: one was skipped by the recall bug): go straight to it instead of a dead end.
      const open = e?.data?.code === 'open-check' || e?.data?.code === 'open-set' ? frames.findIndex((f) => !f.item.recall && f.item.cardIndex === e.data.card) : -1
      if (open >= 0) { setI(open); reset(); setLater((s) => { const x = new Set(s); x.delete(e.data.card); return x }); setError(e?.data?.code === 'open-set' ? 'Log one set and the chapter counts.' : 'One quiz is still open. Answer it, then finish.') }
      else setError(String(e?.message ?? e).includes('Finish') ? 'One quiz is still open. Answer it, then finish.' : "Couldn't save that. Check your connection and tap again.")
    }
    finally { setFinishing(false) }
  }

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
  const pic = !item.recall && frame.part === 0 && !['exercise', 'watch', 'move', 'doit', 'steps', 'tryit'].includes(c.type) ? pictures[item.cardIndex] : undefined
  const revealId = result && !result.correct && result.reveal ? result.reveal.id : null
  const label = item.recall ? `Remember this? · from chapter ${item.chapter}` : `Chapter ${n} of ${total}`

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
          ) : c.type === 'move' ? (
            <MoveFrame card={c} />
          ) : c.type === 'steps' ? (
            <StepsFrame card={c} />
          ) : c.type === 'tryit' ? (
            <TryItFrame card={c} done={logged.has(item.cardIndex)} onDone={async () => { if (!onLog) return; const r = await onLog(item, 1, 'right'); setLogged((s) => new Set(s).add(item.cardIndex)); if (r.chapterPassed) track('set_passed', { n }) }} />
          ) : c.type === 'doit' ? (
            <DoIt card={c} logged={logged.has(item.cardIndex)} onLater={() => { setLater((s) => new Set(s).add(item.cardIndex)); setI(i + 1); reset() }}
              onLog={async (count, feel) => { if (!onLog) return; const r = await onLog(item, count, feel); setLogged((s) => new Set(s).add(item.cardIndex)); if (r.chapterPassed) track('set_passed', { n }) }} />
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
          {!item.recall && c.type !== 'try' && <button type="button" onClick={() => setAskOpen(true)}>Ask or object</button>}
          {/* A real button (UX review #17, 8 Oct): the move and do-it frames are full of things to tap, so "next" needs a target of its own; keyboard and screen readers get one too. */}
          {canAdvance
            ? <button type="button" className="story-next" onClick={next} aria-label={isLast ? 'Finish' : 'Next'}>{isLast ? 'Last one' : 'Tap →'}</button>
            : <span className="story-tapnote">{item.card.type === 'doit' ? 'Log it' : 'Pick one'}</span>}
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
          <button className="btn btn-ghost" onClick={() => setAskOpen(false)}>Back to the chapter</button>
        </Sheet>
      )}
    </div>
  )
}

// The closing "In one breath" card moves to the start of the next chapter as "Last time" (7 Oct).
function isBreath(c: Card) {
  return !['exercise', 'watch', 'move', 'doit', 'steps', 'tryit'].includes(c.type) && /^in one breath$/i.test(((c as any).title ?? '').trim())
}
// Its last line teased this chapter ("Next: ..."); as a recap it isn't needed.
function dropNextLine(body: string) {
  return body.replace(/\n*\s*Next:[^\n]*$/i, '').trim()
}
