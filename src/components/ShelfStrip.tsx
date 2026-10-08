import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

// The way to the Shelf, drawn so a stranger taps it (9 Oct, Prateek: "the button for the shelf doesn't look clickable at
// all... we want people to recognize that"; dc's D21). Two pieces: the header button on every screen, and a printed
// strip with the live count under the typed box, under the wall card on Done, and on the plan. The typed box stays the
// first action; the Shelf is the clear second. Never an icon alone. Copy (agent).

// A small book, drawn: closed cover, spine line, two page edges. One stroke weight, the ink of the context.
export function BookGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg className="book-glyph" width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M4 3.5h9.5a2 2 0 0 1 2 2V17H6a2 2 0 0 1-2-2V3.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6 3.5v11.5h9.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8.5 7h4M8.5 9.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

// The header control: a real printed button in the second ink, book plus the word, at least 44 px.
export function ShelfButton({ onOpen, className = '' }: { onOpen: () => void; className?: string }) {
  return (
    <button type="button" className={`shelf-btn ${className}`.trim()} onClick={onOpen} aria-label="The Shelf: every ready handbook">
      <BookGlyph /> <span>Shelf</span>
    </button>
  )
}

// The strip: what is on the Shelf, in numbers from the live query, and one tap to get there.
export default function ShelfStrip({ onOpen, where }: { onOpen: () => void; where: 'landing' | 'done' | 'plan' }) {
  const items = useQuery(api.library.explore, {}) as { kind: string }[] | undefined
  const n = items?.length ?? null
  const lead = where === 'done' ? 'Or pick up another one tonight.' : where === 'plan' ? 'Not the only one here.' : 'Or pick one up now.'
  return (
    <button type="button" className={`shelf-strip shelf-strip-${where}`} onClick={onOpen}>
      <BookGlyph size={22} />
      <span className="shelf-strip-text">
        <strong>{n === null ? 'Handbooks on the Shelf' : `${n} handbook${n === 1 ? '' : 's'} on the Shelf`}, ready to open.</strong>
        <span>{lead}</span>
      </span>
      <span className="shelf-strip-go" aria-hidden="true">→</span>
    </button>
  )
}
