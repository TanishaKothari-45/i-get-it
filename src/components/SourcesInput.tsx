import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { CREATOR_REELS, MAX_LINKS, MAX_PHOTOS, classifyLink, linksIn, parseCreator } from '../../convex/links'

export type Gathered = { text: string; links: string[]; creator: string | null }

const sameLink = (a: string, b: string) => (classifyLink(a)?.url ?? a) === (classifyLink(b)?.url ?? b)

// One box takes everything: typed words stay as the topic; a pasted reel or Short link, an Instagram profile link or a
// finished "@handle" is lifted out of the text and shown under the box. `final` (on submit, or a paste) also takes a
// link or handle still at the end of the text; while typing, only once a space follows it, so half a word isn't taken.
export function absorb(raw: string, links: string[], creator: string | null, final: boolean): Gathered {
  let text = raw
  const nextLinks = [...links]
  let nextCreator = creator
  const urls = final ? linksIn(raw) : raw.match(/https?:\/\/[^\s<>"']+(?=\s)/g) ?? []
  for (const url of urls) {
    text = text.replace(url, ' ')
    const profile = !classifyLink(url) && /instagram\.com/i.test(url) ? parseCreator(url) : null
    if (profile) nextCreator = profile
    else if (!nextLinks.some((l) => sameLink(l, url))) nextLinks.push(url)
  }
  const handle = text.match(final ? /(^|\s)@([A-Za-z0-9._]{1,30})(?=\s|$)/ : /(^|\s)@([A-Za-z0-9._]{1,30})(?=\s)/)
  if (handle && parseCreator(handle[2])) {
    nextCreator = parseCreator(handle[2])
    text = text.replace(handle[0], handle[1])
  }
  return { text: text === raw ? raw : text.replace(/\s{2,}/g, ' ').trimStart(), links: nextLinks, creator: nextCreator }
}

type Props = {
  text: string
  links: string[]
  creator: string | null
  onChange: (g: Gathered) => void
  photos: File[]
  onPhotos: (photos: File[]) => void
  placeholder: string
  disabled?: boolean
  onSubmit: () => void
  showWays: boolean               // the "Or learn from what you saved" shortcuts (hidden while reading)
  children?: ReactNode            // under the box: tonight's ready handbooks
  inputRef?: RefObject<HTMLInputElement | null>   // the screen's own handle on the box (to focus it from elsewhere)
  enterKeyHint?: 'go' | 'done'
}

function linkLabel(url: string) {
  const c = classifyLink(url)
  if (!c) return 'Not a reel or Short'
  if (c.kind === 'instagram') return 'Instagram reel'
  return c.url.includes('/shorts/') ? 'YouTube Short' : 'YouTube video'
}
const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.|m\.)?/, '').replace(/\?.*$/, '')

// The first screen's box (DESIGN.md section 4, Start): a topic, reels and Shorts, photos and a creator, all in one place.
export default function SourcesInput({ text, links, creator, onChange, photos, onPhotos, placeholder, disabled, onSubmit, showWays, children, inputRef, enterKeyHint = 'go' }: Props) {
  const ownInput = useRef<HTMLInputElement>(null)
  const input = inputRef ?? ownInput
  const picker = useRef<HTMLInputElement>(null)
  const [hint, setHint] = useState<string | null>(null)
  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  const update = (raw: string, final: boolean) => onChange(absorb(raw, links, creator, final))
  const addPhotos = (list: FileList | null) => {
    if (!list) return
    onPhotos([...photos, ...[...list].filter((f) => f.type.startsWith('image/'))].slice(0, MAX_PHOTOS))
  }

  // Straight from the clipboard where the browser allows it; otherwise the cursor waits in the box.
  const pasteLink = async () => {
    try {
      const clip = await navigator.clipboard.readText()
      if (linksIn(clip).length) { update(`${text} ${clip}`, true); setHint(null); return }
    } catch { /* not allowed here: paste by hand */ }
    setHint('Paste the reel or Short link here')
    input.current?.focus()
  }
  const askCreator = () => {
    setHint('@ their Instagram handle')
    if (!/(^|\s)@\S*$/.test(text)) onChange({ text: text ? `${text.trimEnd()} @` : '@', links, creator })
    input.current?.focus()
  }

  const hasSources = links.length > 0 || photos.length > 0 || !!creator
  return (
    <>
      <div className="field">
        <label htmlFor="topic">What do you keep meaning to learn?</label>
        <input id="topic" ref={input} className="input" type="text" autoComplete="off" autoCapitalize="sentences" enterKeyHint={enterKeyHint}
          placeholder={hint ?? placeholder} value={text} disabled={disabled}
          onChange={(e) => update(e.target.value, false)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text')
            if (!/https?:\/\/|@/.test(pasted)) return
            e.preventDefault()
            const el = e.currentTarget
            const at = el.selectionStart ?? text.length
            update(`${text.slice(0, at)} ${pasted} ${text.slice(el.selectionEnd ?? at)}`, true)
            setHint(null)
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit() }} />

        {(links.length > 0 || creator) && (
          <ul className="source-list got-list">
            {creator && (
              <li>
                <span><span className="source-kind">@{creator}'s latest reels</span><span className="source-url">Their latest {CREATOR_REELS}, sorted into themes; you pick one.</span></span>
                {!disabled && <button type="button" className="remove" aria-label={`Remove @${creator}`} onClick={() => onChange({ text, links, creator: null })}>×</button>}
              </li>
            )}
            {links.map((l) => (
              <li key={l} className={classifyLink(l) ? '' : 'bad'}>
                <span><span className="source-kind">{linkLabel(l)}</span><span className="source-url">{shortUrl(l)}</span></span>
                {!disabled && <button type="button" className="remove" aria-label={`Remove ${shortUrl(l)}`} onClick={() => onChange({ text, links: links.filter((x) => x !== l), creator })}>×</button>}
              </li>
            ))}
          </ul>
        )}
        {links.length > MAX_LINKS && <p className="error">Up to {MAX_LINKS} links for one handbook.</p>}

        {photos.length > 0 && (
          <div className="photo-row">
            {previews.map((src, i) => (
              <div key={src} className="photo-thumb">
                <img src={src} alt={`Photo ${i + 1}`} />
                {!disabled && <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => onPhotos(photos.filter((_, j) => j !== i))}>×</button>}
              </div>
            ))}
          </div>
        )}
        {hasSources && <p className="note">Handbooks from what you saved stay private to you, and link back to every reel they use.</p>}
        {children}
      </div>

      {/* No `capture`: the phone then offers its own choice of camera or gallery, and a laptop opens its file picker. */}
      <input ref={picker} type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} />
      {showWays && (
        <div className="saved-ways-block">
          <p className="sub" style={{ marginBottom: 6 }}>Or learn from what you saved</p>
          <div className="chips saved-ways">
            <button type="button" className="chip" disabled={disabled || links.length >= MAX_LINKS} onClick={pasteLink}>
              <PlayIcon /><span>Paste a reel or Short</span>
            </button>
            <button type="button" className="chip" disabled={disabled || photos.length >= MAX_PHOTOS} onClick={() => picker.current?.click()}>
              <CameraIcon /><span>Photo of a page or notes</span>
            </button>
            <button type="button" className="chip" disabled={disabled || !!creator} onClick={askCreator}>
              <AtIcon /><span>A creator you follow</span>
            </button>
          </div>
          <p className="note">Photos: a book page, your notes, a slide, a chart or a screenshot. Up to {MAX_PHOTOS}.</p>
        </div>
      )}
    </>
  )
}

const iconProps = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
const PlayIcon = () => <svg {...iconProps}><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M10 9l5 3-5 3z" fill="currentColor" /></svg>
const CameraIcon = () => <svg {...iconProps}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
const AtIcon = () => <svg {...iconProps}><circle cx="12" cy="12" r="4" /><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1" /></svg>

type Progress = { kind: 'youtube' | 'instagram' | 'image'; url?: string; status: 'waiting' | 'reading' | 'read' | 'failed'; title?: string; error?: string }
const PROGRESS_LABEL = { youtube: 'YouTube', instagram: 'Instagram reel', image: 'Photo' } as const

// While a handbook from sources is being started: each source and how far it has got.
export function SourcesProgress({ sources }: { sources: Progress[] }) {
  return (
    <ul className="source-list" aria-live="polite">
      {sources.map((s, i) => (
        <li key={i} className={s.status === 'failed' ? 'bad' : s.status === 'read' ? 'done' : ''}>
          <span className="source-kind">{PROGRESS_LABEL[s.kind]} {i + 1}</span>
          <span className="source-url">
            {s.status === 'read' ? `Read: ${s.title || 'got it'}`
              : s.status === 'failed' ? `Couldn't use it${s.error === 'about something else' ? ': about something else' : s.error === 'nothing to learn in it' ? ': nothing to learn in it' : ''}`
              : 'Reading…'}
          </span>
        </li>
      ))}
    </ul>
  )
}
