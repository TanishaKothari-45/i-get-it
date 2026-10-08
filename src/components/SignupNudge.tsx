// The reason to sign up, said plainly. Shown where it pays off; never blocks anything.
type Props = { onSignIn: () => void; context?: 'second-topic' | 'library' | 'tune' | 'done'; compact?: boolean }

// 8 Oct (UX review #24, #25): sign-in is optional for the first 3 chapters, and a free account does not add a second
// typed topic, so the nudge says what is true. Copy (agent).
const LEAD: Record<string, string> = {
  'second-topic': 'No sign-in needed here. Ready topics are free for everyone. Typed topics: one per person, three for members.',
  library: 'No sign-in needed for your first 3 chapters. Sign in only to keep them on every device.',
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
          <li><strong>All your handbooks in one place.</strong> Each keeps its place; nothing resets.</li>
          <li><strong>Your settings everywhere.</strong> Who teaches you, and how, follows you.</li>
          <li><strong>Nothing lost</strong> if you clear your browser or change phones.</li>
        </ul>
      )}
      <button type="button" className="btn btn-ghost nudge-btn" onClick={onSignIn}>Make a free account (optional)</button>
      {!compact && <p className="note">Just your email. No card, no spam.</p>}
    </div>
  )
}
