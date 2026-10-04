import { useEffect, useState } from 'react'
import { Link, paths } from '../lib/router'
import Sheet from './Sheet'

type Props = { path: string; signedIn: boolean; onSignOut: () => Promise<void> }

type Item = { to: string; label: string }
const ITEMS: Item[] = [
  { to: paths.library, label: 'My handbooks' },
  { to: paths.new, label: 'New topic' },
]

// The way around: a row of links on a laptop, a menu button that opens a bottom sheet on a phone.
export default function Nav({ path, signedIn, onSignOut }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [path])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const current = (to: string) => (path === to ? 'page' : undefined)
  const signOut = async () => { setOpen(false); await onSignOut() }

  return (
    <>
      <nav className="nav-links" aria-label="Main">
        {ITEMS.map((it) => <Link key={it.to} to={it.to} aria-current={current(it.to)}>{it.label}</Link>)}
        {signedIn
          ? <button type="button" onClick={signOut}>Sign out</button>
          : <Link to={paths.signin} aria-current={current(paths.signin)}>Sign in</Link>}
      </nav>

      <button type="button" className="menu-button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <span /><span /><span />
      </button>

      {open && (
        <Sheet onClose={() => setOpen(false)} label="Menu">
          <ul className="menu-list">
            {ITEMS.map((it) => (
              <li key={it.to}>
                <Link to={it.to} aria-current={current(it.to)}>{it.label}{current(it.to) && <small>You're here</small>}</Link>
              </li>
            ))}
            <li>
              {signedIn
                ? <button type="button" onClick={signOut}>Sign out</button>
                : <Link to={paths.signin} aria-current={current(paths.signin)}>Sign in<small>Keep your handbooks on every device</small></Link>}
            </li>
          </ul>
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Close</button>
        </Sheet>
      )}
    </>
  )
}
