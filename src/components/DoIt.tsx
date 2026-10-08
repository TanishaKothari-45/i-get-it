import { useEffect, useRef, useState } from 'react'

// "Do it" card (8 Oct, Prateek: a push-up is proved by a push-up, not a quiz): a rep counter, a timer or a checklist,
// then one tap on how it felt. Logging a set is what passes a body-skill chapter. Copy (agent).
export type DoItCard = { type: 'doit'; title?: string; instruction: string; kind: 'reps' | 'timer' | 'checklist'; target?: number; items?: string[] }
type Feel = 'easy' | 'right' | 'hard'
type Props = { card: DoItCard; logged?: boolean; onLog: (count: number, feel: Feel) => Promise<void>; onLater: () => void }

export default function DoIt({ card, logged, onLog, onLater }: Props) {
  const target = Math.max(1, Math.min(200, Math.round(card.target ?? (card.kind === 'timer' ? 20 : 5))))
  const [count, setCount] = useState(0)
  const [running, setRunning] = useState(false)
  const [ticked, setTicked] = useState<boolean[]>(() => (card.items ?? []).map(() => false))
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(!!logged)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  // Timer: counts seconds up to the target, then stops.
  useEffect(() => {
    if (!running) return
    timer.current = window.setInterval(() => setCount((c) => { if (c + 1 >= target) { setRunning(false); return target } return c + 1 }), 1000)
    return () => { if (timer.current) window.clearInterval(timer.current) }
  }, [running, target])

  const reached = card.kind === 'reps' ? count >= target : card.kind === 'timer' ? count >= target : ticked.length > 0 && ticked.every(Boolean)
  const value = card.kind === 'checklist' ? ticked.filter(Boolean).length : count
  const log = async (feel: Feel) => {
    setSaving(true); setError(null)
    try { await onLog(value, feel); setDone(true) } catch { setError("Couldn't save that. Check your connection and tap again.") } finally { setSaving(false) }
  }

  if (done) {
    return (
      <div className="doit no-tap">
        <p className="story-kicker">Logged</p>
        <p className="story-big">Nice. That one counts.</p>
        <p className="story-text size-md" style={{ marginTop: 12 }}>Tap → to keep going.</p>
      </div>
    )
  }
  return (
    <div className="doit no-tap">
      <p className="story-kicker">{card.title ?? 'Do it now'}</p>
      <p className="story-q">{card.instruction}</p>

      {card.kind === 'reps' && (
        <div className="doit-counter">
          <button type="button" className="doit-tap" onClick={() => setCount((c) => Math.min(target * 3, c + 1))} aria-label="Count one rep">
            <span className="doit-n">{count}</span><span className="doit-of">of {target}</span>
          </button>
          <p className="doit-hint">Tap once per rep.</p>
        </div>
      )}
      {card.kind === 'timer' && (
        <div className="doit-counter">
          <button type="button" className="doit-tap" onClick={() => { if (count >= target) { setCount(0); setRunning(true) } else setRunning((r) => !r) }} aria-label={running ? 'Pause' : 'Start'}>
            <span className="doit-n">{count}</span><span className="doit-of">of {target} s</span>
          </button>
          <p className="doit-hint">{running ? 'Hold it. Tap to pause.' : count >= target ? 'Done. Tap to go again.' : 'Tap to start the clock.'}</p>
        </div>
      )}
      {card.kind === 'checklist' && (
        <ul className="doit-list">
          {(card.items ?? []).map((t, k) => (
            <li key={k}><label><input type="checkbox" checked={ticked[k]} onChange={() => setTicked((x) => x.map((v, j) => (j === k ? !v : v)))} /><span>{t}</span></label></li>
          ))}
        </ul>
      )}

      {reached ? (
        <div className="doit-feel">
          <p className="doit-hint">How did it feel?</p>
          <div className="doit-feel-row">
            <button type="button" className="story-opt" disabled={saving} onClick={() => log('easy')}>Easy</button>
            <button type="button" className="story-opt" disabled={saving} onClick={() => log('right')}>Just right</button>
            <button type="button" className="story-opt" disabled={saving} onClick={() => log('hard')}>Hard</button>
          </div>
        </div>
      ) : (
        <button type="button" className="quiet doit-later" onClick={onLater}>Not now, I'll do it later</button>
      )}
      {error && <p className="story-error">{error}</p>}
    </div>
  )
}
