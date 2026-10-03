import type { ReactNode } from 'react'

type Props = { children: ReactNode; onClose?: () => void }

// The feedback sheet: rises from the bottom, the card behind dims.
export default function Sheet({ children, onClose }: Props) {
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div>
          <div className="handle" />
          {children}
        </div>
      </div>
    </>
  )
}
