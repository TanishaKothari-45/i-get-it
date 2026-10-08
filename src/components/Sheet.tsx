import { useEffect, useRef, type ReactNode } from 'react'

type Props = { children: ReactNode; onClose?: () => void }

// The feedback sheet: rises from the bottom, the card behind dims. Escape closes it, so does the × and the scrim;
// focus moves into it when it opens (8 Oct, review #49).
export default function Sheet({ children, onClose }: Props) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    box.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose?.() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" ref={box} tabIndex={-1}>
        <div>
          <div className="handle" />
          {onClose && <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">×</button>}
          {children}
        </div>
      </div>
    </>
  )
}
