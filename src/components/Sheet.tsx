import { useEffect, useRef, type ReactNode } from 'react'

type Props = { children: ReactNode; onClose?: () => void; label?: string }

// The feedback sheet: rises from the bottom, the card behind dims. Escape closes it, so does the × and the scrim;
// focus moves into it when it opens (8 Oct, review #49).
export default function Sheet({ children, onClose, label }: Props) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Focus moves in, stays in (Tab wraps), and goes back to whatever opened the sheet when it closes (9 Oct, accessibility review).
    const opener = document.activeElement as HTMLElement | null
    box.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); return }
      if (e.key !== 'Tab' || !box.current) return
      const f = [...box.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null)
      if (!f.length) return
      const first = f[0], last = f[f.length - 1], active = document.activeElement as HTMLElement | null
      if (e.shiftKey && (active === first || !box.current.contains(active))) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (active === last || !box.current.contains(active))) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => { window.removeEventListener('keydown', onKey, true); if (opener && document.contains(opener)) opener.focus({ preventScroll: true }) }
  }, [onClose])
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} ref={box} tabIndex={-1}>
        <div>
          <div className="handle" />
          {onClose && <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">×</button>}
          {children}
        </div>
      </div>
    </>
  )
}
