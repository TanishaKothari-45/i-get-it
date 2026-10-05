import type { ReactNode } from 'react'

type Props = { children: ReactNode; onClose?: () => void; label?: string; className?: string }

// The feedback sheet: rises from the bottom, the card behind dims.
export default function Sheet({ children, onClose, label, className }: Props) {
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className={className ? `sheet ${className}` : 'sheet'} role="dialog" aria-modal="true" aria-label={label}>
        <div>
          <div className="handle" />
          {children}
        </div>
      </div>
    </>
  )
}
