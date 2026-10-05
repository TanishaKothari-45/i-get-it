import { useEffect, useMemo, useState } from 'react'
import Sheet from './Sheet'
import { ENGLISH, LANGUAGES, languageInfo } from '../../convex/languages'

type Group = 'indian' | 'international'
type Props = { value: string; onChange: (name: string) => void; disabled?: boolean }

// How many languages sit in the first row before "More". The rest live in the drawer.
const ROW_SIZE = 3
const GROUPS: { id: Group; label: string }[] = [
  { id: 'indian', label: 'Indian' },
  { id: 'international', label: 'International' },
]

// The phone's own language, if it's one we translate into.
function phoneLanguage(): string | null {
  const codes = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language]
  for (const code of codes) {
    const base = code.toLowerCase().split('-')[0]
    const match = LANGUAGES.find((l) => l.code === base)
    if (match) return match.name
  }
  return null
}

const groupOf = (name: string): Group => (languageInfo(name)?.indian ? 'indian' : 'international')
// The drawer opens where the picked language is; from English (already in the row) it opens on Indian,
// since someone tapping "More" from English is looking for another language, most often an Indian one.
const drawerStart = (name: string): Group => (name === ENGLISH ? 'indian' : groupOf(name))

// "Read it in": English, the picked one and the phone's own up front; every language we support in a
// drawer, split into Indian and International. Only languages on the list in convex/languages.ts show.
export default function LanguagePicker({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [group, setGroup] = useState<Group>(drawerStart(value))
  const row = useMemo(() => {
    const picks = [ENGLISH, value, phoneLanguage(), 'Hindi'].filter((n): n is string => !!n && !!languageInfo(n))
    return [...new Set(picks)].slice(0, ROW_SIZE).map((n) => languageInfo(n)!)
  }, [value])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const pick = (name: string) => { onChange(name); setOpen(false) }
  const openDrawer = () => { setGroup(drawerStart(value)); setOpen(true) }

  return (
    <>
      <div className="chips" role="group" aria-label="Language">
        {row.map((l) => (
          <button key={l.name} type="button" className="chip" lang={l.code} aria-pressed={value === l.name} disabled={disabled} onClick={() => onChange(l.name)}>{l.label}</button>
        ))}
        <button type="button" className="chip chip-more" aria-haspopup="dialog" disabled={disabled} onClick={openDrawer}>More</button>
      </div>

      {open && (
        <Sheet onClose={() => setOpen(false)} label="Read it in" className="sheet-tall">
          <h2 className="sheet-title">Read it in</h2>
          <div className="chips" role="group" aria-label="Kind of language">
            {GROUPS.map((g) => (
              <button key={g.id} type="button" className="chip" aria-pressed={group === g.id} onClick={() => setGroup(g.id)}>{g.label}</button>
            ))}
          </div>
          <div className="chips chips-wrap lang-grid" role="group" aria-label={`${GROUPS.find((g) => g.id === group)!.label} languages`}>
            {LANGUAGES.filter((l) => groupOf(l.name) === group).map((l) => (
              <button key={l.name} type="button" className="chip lang-chip" aria-pressed={value === l.name} onClick={() => pick(l.name)}>
                <span lang={l.code}>{l.label}</span>
                {l.label !== l.name && <small>{l.name}</small>}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  )
}
