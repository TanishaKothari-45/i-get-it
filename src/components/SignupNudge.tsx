// The reason to sign up, said plainly. Shown where it pays off; never blocks anything.
type Props = { onSignIn: () => void; context?: 'second-topic' | 'library' | 'tune' | 'done'; compact?: boolean }

const LEAD: Record<string, string> = {
  'second-topic': 'Starting another topic? Sign in so both stay safe and follow you.',
  library: 'These live only on this phone right now.',
  tune: 'Your settings are saved on this phone.',
  done: 'Keep this handbook, and the next ones.',
}

export default function SignupNudge({ onSignIn, context = 'library', compact }: Props) {
  return (
    <div className={`nudge${compact ? ' compact' : ''}`}>
      <p className="nudge-lead">{LEAD[context]}</p>
      {!compact && (
        <ul className="nudge-list">
          <li><strong>Every device.</strong> Start on your phone, carry on at your laptop.</li>
          <li><strong>Several topics at once.</strong> Each keeps its own place; nothing resets.</li>
          <li><strong>Your settings everywhere.</strong> Who teaches you, and how, follows you.</li>
          <li><strong>Nothing lost</strong> if you clear your browser or change phones.</li>
        </ul>
      )}
      <button type="button" className="btn btn-ghost nudge-btn" onClick={onSignIn}>Sign in to keep it all, free</button>
      {!compact && <p className="note">Email and a password. No card. Week 1 is free whatever you choose.</p>}
    </div>
  )
}
