import type { ReactNode } from 'react'

type Props = { children: ReactNode; busy?: boolean; note?: string }

// The one main action per screen, low, within thumb reach.
export default function ActionBar({ children, busy, note }: Props) {
  return (
    <div className="actionbar">
      <div>
        {children}
        {busy && <div className="busybar" aria-hidden="true" />}
        {note && <p className="note" style={{ marginTop: 2 }}>{note}</p>}
      </div>
    </div>
  )
}
