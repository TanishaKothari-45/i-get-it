import { agentVision, looksLikeAgents, sprintTopic, sprintTopicInline, type Motivation } from '../content/vision'

type Props = {
  topic: string
  motivation: Motivation
  onStart: () => void
  onBack: () => void
}

export default function Vision({ topic, motivation, onStart, onBack }: Props) {
  const rungs = agentVision[motivation]
  const offPath = !looksLikeAgents(topic)

  return (
    <>
      <p className="vision-skill">{offPath ? sprintTopic : topic}</p>
      <h1>Here's where this ends.</h1>
      <p className="lede">Not what you'll watch. What you'll be able to do, and who notices.</p>

      {offPath && (
        <p className="vision-note">
          This week only one path is running: {sprintTopicInline}. "{topic}" is saved for
          when more paths open. Here's the agents path.
        </p>
      )}

      <ol className="rungs">
        {rungs.map((r) => (
          <li className="rung" key={r.day}>
            <div className="rung-day" aria-hidden="true">
              <b>{r.day}</b>
              <small>days</small>
            </div>
            <p className="rung-text">
              <span className="sr-only">Day {r.day}: </span>
              {r.text}
            </p>
          </li>
        ))}
      </ol>

      <div className="vision-cta">
        <button type="button" className="btn" onClick={onStart}>
          Start the 5-minute first win
        </button>
        <p className="vision-foot">20 minutes a day, that's it. Day 1 is five.</p>
        <button type="button" className="why-skip" onClick={onBack}>
          Change the skill or the reason
        </button>
      </div>
    </>
  )
}
