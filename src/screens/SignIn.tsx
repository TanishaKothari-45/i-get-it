import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import ActionBar from '../components/ActionBar'

type Props = { onDone: () => Promise<void>; onBack: () => void }

// Email and password through Convex Auth. Asked only after chapter 1 is passed.
export default function SignIn({ onDone, onBack }: Props) {
  const { signIn } = useAuthActions()
  const [flow, setFlow] = useState<'signUp' | 'signIn'>('signUp')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const go = async () => {
    setBusy(true); setError(null)
    try {
      await signIn('password', { email: email.trim(), password, flow })
      await onDone()
    } catch (e: any) {
      const m = String(e?.message ?? e)
      setError(m.includes('Invalid') || m.includes('invalid') ? (flow === 'signIn' ? "That email and password don't match." : 'Use at least 8 characters for the password.') : "Sign-in didn't go through. Your chapter is saved on this phone.")
    } finally { setBusy(false) }
  }

  return (
    <>
      <h1>Keep this handbook on every device.</h1>
      <p className="lede">Your handbooks and your place in each one, on any phone or laptop.</p>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" className="input" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="password">{flow === 'signUp' ? 'Choose a password (8+ characters)' : 'Password'}</label>
        <input id="password" className="input" type="password" autoComplete={flow === 'signUp' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && email && password) go() }} />
      </div>
      <p className="note">
        {flow === 'signUp' ? 'Already have one? ' : 'New here? '}
        <button type="button" className="quiet" style={{ padding: 0 }} onClick={() => setFlow(flow === 'signUp' ? 'signIn' : 'signUp')}>{flow === 'signUp' ? 'Sign in instead' : 'Create one instead'}</button>
      </p>
      {error && <p className="error">{error}</p>}
      <ActionBar busy={busy}>
        <button className="btn" onClick={go} disabled={busy || !email || password.length < (flow === 'signUp' ? 8 : 1)}>{busy ? 'Signing you in…' : flow === 'signUp' ? 'Create my sign-in' : 'Sign in'}</button>
        <button type="button" className="quiet" onClick={onBack}>Not now</button>
      </ActionBar>
    </>
  )
}
