import { useEffect, useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import ActionBar from '../components/ActionBar'

type Props = { onDone: () => Promise<void>; onBack: () => void; reason?: string | null }

// Sign in or sign up with a 6-digit code by email (7 Oct, Prateek: less friction than a password; no spam, ever).
// The same code works for a new account and an existing one. Email + password stays as a fallback for accounts made
// before 7 Oct. Copy is (agent) until Prateek rewrites it.
export default function SignIn({ onDone, onBack, reason }: Props) {
  const { signIn } = useAuthActions()
  const [mode, setMode] = useState<'code' | 'password'>('code')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [flow, setFlow] = useState<'signUp' | 'signIn'>('signIn')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = /^\S+@\S+\.\S+$/.test(email.trim())
  // Until the Gmail app password is set (mailLimits.codesReady), codes can't go out: start on the password form.
  const codesReady = useQuery(api.mailLimits.codesReady, {})
  useEffect(() => { if (codesReady === false) { setMode('password'); setFlow('signUp') } }, [codesReady])

  const sendCode = async () => {
    setBusy(true); setError(null)
    try { await signIn('email-otp', { email: email.trim() }); setStep('code'); setCode('') }
    catch (e: any) {
      const m = String(e?.message ?? e)
      setError(m.includes('too many') ? "That's a few codes in a row. Wait a few minutes, then try again." : "Couldn't send the code just now. Try again in a minute, or use a password.")
    } finally { setBusy(false) }
  }
  const checkCode = async () => {
    setBusy(true); setError(null)
    try { await signIn('email-otp', { email: email.trim(), code: code.trim() }); await onDone() }
    catch { setError("That code didn't work. Check the latest email, or send a new code.") }
    finally { setBusy(false) }
  }
  const withPassword = async () => {
    setBusy(true); setError(null)
    try { await signIn('password', { email: email.trim(), password, flow }); await onDone() }
    catch (e: any) {
      const m = String(e?.message ?? e)
      setError(m.includes('Invalid') || m.includes('invalid') ? (flow === 'signIn' ? "That email and password don't match." : 'Use at least 8 characters for the password.') : "Sign-in didn't go through. Your reading is saved on this phone.")
    } finally { setBusy(false) }
  }

  if (mode === 'password') {
    return (
      <>
        {reason && <p className="why-here">{reason}</p>}
        <h1>{codesReady === false ? 'Keep reading, free.' : 'Sign in with a password.'}</h1>
        {codesReady === false && <p className="free-banner"><strong>Free.</strong> Just an email and a password. No card, no spam, ever.</p>}
        <p className="lede">{codesReady === false ? 'An email and a password, and every chapter of every ready handbook opens. Your place is kept on any phone or laptop.' : 'For accounts made with a password. New here? A code by email is quicker.'}</p>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">{flow === 'signUp' ? 'Choose a password (8+ characters)' : 'Password'}</label>
          <input id="password" className="input" type="password" autoComplete={flow === 'signUp' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && email && password) withPassword() }} />
        </div>
        <p className="note">
          <button type="button" className="quiet" style={{ padding: 0 }} onClick={() => setFlow(flow === 'signUp' ? 'signIn' : 'signUp')}>{flow === 'signUp' ? 'I already have a password' : 'Make a new password account'}</button>
          {codesReady !== false && ' · '}
          {codesReady !== false && <button type="button" className="quiet" style={{ padding: 0 }} onClick={() => { setMode('code'); setError(null) }}>Use a code by email</button>}
        </p>
        {error && <p className="error">{error}</p>}
        <ActionBar busy={busy}>
          <button className="btn" onClick={withPassword} disabled={busy || !email || password.length < (flow === 'signUp' ? 8 : 1)}>{busy ? 'Signing you in…' : flow === 'signUp' ? 'Create my sign-in' : 'Sign in'}</button>
          <button type="button" className="quiet" onClick={onBack}>Not now</button>
        </ActionBar>
      </>
    )
  }

  return (
    <>
      {reason && <p className="why-here">{reason}</p>}
      <h1>Keep reading, free.</h1>
      <p className="free-banner"><strong>Free.</strong> Just your email. No card, no spam, ever.</p>
      <p className="lede">Your email, then a 6-digit code. Every chapter of every ready handbook opens, and your place is kept on any phone or laptop.</p>
      {step === 'email' ? (
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="email" inputMode="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && valid && !busy) sendCode() }} />
        </div>
      ) : (
        <div className="field">
          <label htmlFor="code">The 6-digit code we sent to {email.trim()}</label>
          <input id="code" className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6 && !busy) checkCode() }} />
          <p className="note">
            <button type="button" className="quiet" style={{ padding: 0 }} disabled={busy} onClick={sendCode}>Send a new code</button>
            {' · '}
            <button type="button" className="quiet" style={{ padding: 0 }} onClick={() => { setStep('email'); setError(null) }}>Use a different email</button>
          </p>
        </div>
      )}
      <p className="note">No spam, ever. The only emails you'll get are these codes, and reminders if you turn them on.</p>
      {error && <p className="error">{error}</p>}
      <ActionBar busy={busy}>
        {step === 'email'
          ? <button className="btn" onClick={sendCode} disabled={busy || !valid}>{busy ? 'Sending…' : 'Email me a code'}</button>
          : <button className="btn" onClick={checkCode} disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Continue'}</button>}
        <button type="button" className="quiet" onClick={onBack}>Not now</button>
      </ActionBar>
      <p className="note" style={{ textAlign: 'center' }}><button type="button" className="quiet" style={{ padding: 0 }} onClick={() => { setMode('password'); setError(null) }}>Use a password instead</button></p>
    </>
  )
}
