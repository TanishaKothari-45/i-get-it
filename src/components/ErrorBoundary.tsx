import { Component, type ReactNode } from 'react'

// Without this, one error anywhere (a query the server refused, a card the screen can't draw) unmounts the whole app
// and leaves a blank page, which in the installed app has no address bar to reload from. This shows a way back instead.
type Props = { children: ReactNode }

// The open handbook is remembered on the phone; if that's what broke the page, reloading would break it again.
// Forgetting it only means the app opens their most recent handbook instead.
const ACTIVE_KEY = 'igetit.active'
function reload() {
  try { localStorage.removeItem(ACTIVE_KEY) } catch { /* private windows can refuse storage */ }
  window.location.reload()
}
type State = { failed: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="crash" role="alert">
        <p className="crash-title">Something went wrong on this page.</p>
        <p className="crash-line">Your handbooks are safe. Reloading usually fixes it.</p>
        <button className="btn" onClick={reload}>Reload</button>
      </div>
    )
  }
}
