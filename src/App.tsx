import { useEffect, useState } from 'react'
import Start from './screens/Start'
import Vision from './screens/Vision'
import type { Motivation } from './content/vision'

type Screen = 'start' | 'vision' | 'first-task'

type Session = { topic: string; motivation: Motivation }

const KEY = 'igetit.session'

function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

function saveSession(s: Session | null) {
  try {
    if (s) sessionStorage.setItem(KEY, JSON.stringify(s))
    else sessionStorage.removeItem(KEY)
  } catch {
    // storage can be unavailable in private windows; the flow still works for this visit
  }
}

// Dev-only: ?preview=vision&why=work opens a screen directly for screenshots. Not in prod builds.
function devPreview(): { screen: Screen; session: Session } | null {
  if (!import.meta.env.DEV) return null
  const q = new URLSearchParams(window.location.search)
  const screen = q.get('preview') as Screen | null
  if (!screen || screen === 'start') return null
  const why = (q.get('why') ?? 'joy') as Motivation
  return { screen, session: { topic: q.get('skill') ?? 'Build my first AI agent, no code', motivation: why } }
}

export default function App() {
  const preview = devPreview()
  const [session, setSession] = useState<Session | null>(() => preview?.session ?? loadSession())
  const [screen, setScreen] = useState<Screen>(() => preview?.screen ?? (loadSession() ? 'vision' : 'start'))

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [screen])

  return (
    <div className="shell">
      <header className="shell-top">
        <p className="wordmark">
          I Get It
          <small>7 days. 20 minutes a day.</small>
        </p>
      </header>

      <main className="shell-main">
        {screen === 'start' && (
          <Start
            onDone={(topic, motivation) => {
              const s = { topic, motivation }
              setSession(s)
              saveSession(s)
              setScreen('vision')
            }}
          />
        )}

        {screen === 'vision' && session && (
          <Vision
            topic={session.topic}
            motivation={session.motivation}
            onStart={() => setScreen('first-task')}
            onBack={() => {
              saveSession(null)
              setSession(null)
              setScreen('start')
            }}
          />
        )}

        {screen === 'first-task' && (
          <>
            <h1>Your first task lands here.</h1>
            <p className="lede">
              Five minutes, one real thing, graded. This is the next build (milestone 3).
            </p>
            <div className="stub">
              <p>Not built yet. The 30-minute test in docs/first-win-test.md decides its shape.</p>
            </div>
            <p style={{ marginTop: 20 }}>
              <button type="button" className="btn btn-quiet" onClick={() => setScreen('vision')}>
                Back to the vision
              </button>
            </p>
          </>
        )}
      </main>

      <footer className="shell-foot">
        <p>Built in public for GrowthX Build Sprint, October 2026.</p>
      </footer>
    </div>
  )
}
