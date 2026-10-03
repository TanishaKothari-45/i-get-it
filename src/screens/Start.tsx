import { useState } from 'react'
import { motivations, sprintTopic, sprintTopicInline, type Motivation } from '../content/vision'

type Props = {
  onDone: (topic: string, motivation: Motivation) => void
}

export default function Start({ onDone }: Props) {
  const [topic, setTopic] = useState('')
  const [picked, setPicked] = useState<Motivation | null>(null)

  const go = (m: Motivation) => {
    setPicked(m)
    onDone(topic.trim() || sprintTopic, m)
  }

  return (
    <>
      <h1>You saved the reel. Now do the thing.</h1>
      <p className="lede">
        One skill, from "I keep meaning to" to "I did it", in 7 days. 20 minutes a day. Five minutes
        from now you'll have done something real with it. No sign-up.
      </p>

      <div className="field">
        <label htmlFor="topic">The skill you keep meaning to learn</label>
        <input
          id="topic"
          type="text"
          autoComplete="off"
          enterKeyHint="next"
          placeholder={sprintTopic}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <p className="field-note">This week one path is open: {sprintTopicInline}.</p>
      </div>

      <div className="why">
        <h2>Why do you want it?</h2>
        <div className="why-grid" role="group" aria-label="Why do you want it">
          {motivations.map((m) => (
            <button
              key={m.id}
              type="button"
              className="why-tile"
              aria-pressed={picked === m.id}
              onClick={() => go(m.id)}
            >
              <strong>{m.label}</strong>
              <span>{m.hint}</span>
            </button>
          ))}
        </div>
        <button type="button" className="why-skip" onClick={() => go('joy')}>
          Skip this, just show me
        </button>
      </div>
    </>
  )
}
