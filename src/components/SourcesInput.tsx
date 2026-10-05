import { useEffect, useMemo, useRef, useState } from 'react'
import { CREATOR_REELS, MAX_LINKS, MAX_PHOTOS, classifyLink, linksIn, parseCreator } from '../../convex/links'

type Props = {
  text: string                    // the pasted links, as typed
  onText: (text: string) => void
  photos: File[]
  onPhotos: (photos: File[]) => void
  creator: string                 // an Instagram handle, as typed
  onCreator: (creator: string) => void
  disabled?: boolean
}

const KIND_LABEL = { youtube: 'YouTube', instagram: 'Instagram reel' } as const

// "Or learn from what you saved": paste YouTube / Instagram links, or add photos (camera or gallery).
// Closed until opened, so the typed line stays the main way in.
export default function SourcesInput({ text, onText, photos, onPhotos, creator, onCreator, disabled }: Props) {
  const [open, setOpen] = useState<'links' | 'photo' | 'creator' | null>(text ? 'links' : photos.length ? 'photo' : creator ? 'creator' : null)
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const links = useMemo(() => linksIn(text).map((raw) => ({ raw, ok: classifyLink(raw) })), [text])
  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  const addPhotos = (list: FileList | null) => {
    if (!list) return
    const images = [...list].filter((f) => f.type.startsWith('image/'))
    onPhotos([...photos, ...images].slice(0, MAX_PHOTOS))
  }

  return (
    <div className="sources">
      <p className="sub" style={{ marginBottom: 6 }}>Or learn from what you saved</p>
      <div className="chips" role="group" aria-label="Learn from">
        <button type="button" className="chip" aria-pressed={open === 'links'} disabled={disabled} onClick={() => setOpen(open === 'links' ? null : 'links')}>Paste links</button>
        <button type="button" className="chip" aria-pressed={open === 'photo'} disabled={disabled} onClick={() => setOpen(open === 'photo' ? null : 'photo')}>Add a photo</button>
      </div>
      <div className="chips">
        <button type="button" className="chip" aria-pressed={open === 'creator'} disabled={disabled} onClick={() => setOpen(open === 'creator' ? null : 'creator')}>Learn from a creator</button>
      </div>

      {open === 'creator' && (
        <div className="field" style={{ marginTop: 'var(--m)' }}>
          <label htmlFor="creator">Their Instagram handle</label>
          <input id="creator" className="input" type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="@creator" value={creator} disabled={disabled}
            onChange={(e) => onCreator(e.target.value)} />
          {creator.trim() && !parseCreator(creator) && <p className="error">That doesn't look like an Instagram handle.</p>}
          <p className="note">Their latest {CREATOR_REELS} public reels, sorted into themes; you pick one. Your handbook stays private, teaches their ideas in its own words and links back to every reel it uses.</p>
        </div>
      )}

      {open === 'links' && (
        <div className="field" style={{ marginTop: 'var(--m)' }}>
          <label htmlFor="links">YouTube or Instagram links, up to {MAX_LINKS}</label>
          <textarea id="links" className="input sources-links" rows={3} value={text} disabled={disabled} autoComplete="off"
            placeholder="https://www.instagram.com/reel/…" onChange={(e) => onText(e.target.value)} />
          {links.length > 0 && (
            <ul className="source-list">
              {links.slice(0, MAX_LINKS + 2).map((l, i) => (
                <li key={i} className={l.ok ? '' : 'bad'}>
                  <span className="source-kind">{l.ok ? KIND_LABEL[l.ok.kind] : 'Not a YouTube or Instagram link'}</span>
                  <span className="source-url">{l.raw}</span>
                </li>
              ))}
            </ul>
          )}
          {links.length > MAX_LINKS && <p className="error">Up to {MAX_LINKS} links for one handbook.</p>}
        </div>
      )}

      {open === 'photo' && (
        <div style={{ marginTop: 'var(--m)' }}>
          <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} />
          <input ref={gallery} type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} />
          <div className="chips">
            <button type="button" className="chip" disabled={disabled || photos.length >= MAX_PHOTOS} onClick={() => camera.current?.click()}>Take a photo</button>
            <button type="button" className="chip" disabled={disabled || photos.length >= MAX_PHOTOS} onClick={() => gallery.current?.click()}>Choose from gallery</button>
          </div>
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
          <p className="note">Up to {MAX_PHOTOS}. A chart, a page, a screen, a thing you want to understand. Read once, then deleted.</p>
        </div>
      )}
    </div>
  )
}

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
