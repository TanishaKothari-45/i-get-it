// "Steps" card (8 Oct, block 2): a tool skill done for real, one numbered step at a time, with the exact thing to
// click or type and what the screen shows after it. The reader ticks each step as they do it.
import { useState } from 'react'

export type StepsCard = { type: 'steps'; title?: string; steps: { do: string; see?: string }[] }

export default function StepsFrame({ card }: { card: StepsCard }) {
  const [done, setDone] = useState<boolean[]>(() => card.steps.map(() => false))
  const left = done.filter((d) => !d).length
  return (
    <div className="steps no-tap">
      <p className="story-kicker">{card.title ?? 'Do this now'}</p>
      <ol className="steps-list">
        {card.steps.slice(0, 8).map((s, k) => (
          <li key={k} className={done[k] ? 'done' : ''}>
            <button type="button" onClick={() => setDone((x) => x.map((v, j) => (j === k ? !v : v)))} aria-pressed={done[k]}>
              <span className="steps-n">{k + 1}</span>
              <span className="steps-text"><span className="steps-do">{s.do}</span>{s.see && <span className="steps-see">You see: {s.see}</span>}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="doit-hint">{left === 0 ? 'All done. Tap → to check your result.' : `${left} step${left === 1 ? '' : 's'} left. Tap each as you do it.`}</p>
    </div>
  )
}
