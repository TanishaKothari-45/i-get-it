import { useState } from 'react'
import ActionBar from '../components/ActionBar'

export type Profile = { persona?: string; tone?: string; likes?: string[]; examplesFrom?: string; avoid?: string; preferredModel?: string | null }
type Props = { initial: Profile | null; onSave: (p: Profile) => Promise<{ line: string; staled: number }>; onBack: () => void }

const PERSONAS = ['a sharp friend', 'a patient teacher', 'a dry scientist', 'a storyteller', 'a coach who pushes', 'a witty older cousin']
const LIKES = ['stories', 'metaphors', 'humour', 'numbers', 'straight talk', 'step by step', 'examples from my work', 'history behind it']

// How they want to be taught. Saved once; every chapter written from now on reads it. Unread chapters get rewritten when opened.
export default function Tune({ initial, onSave, onBack }: Props) {
  const [persona, setPersona] = useState(initial?.persona ?? '')
  const [likes, setLikes] = useState<string[]>(initial?.likes ?? [])
  const [examplesFrom, setExamplesFrom] = useState(initial?.examplesFrom ?? '')
  const [tone, setTone] = useState(initial?.tone ?? '')
  const [avoid, setAvoid] = useState(initial?.avoid ?? '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggle = (x: string) => setLikes((l) => (l.includes(x) ? l.filter((y) => y !== x) : [...l, x]))
  const save = async () => {
    setBusy(true); setError(null)
    try {
      const r = await onSave({ persona: persona.trim(), likes, examplesFrom: examplesFrom.trim(), tone: tone.trim(), avoid: avoid.trim() })
      setDone(r.staled > 0 ? `Saved. ${r.staled} unread chapter${r.staled === 1 ? '' : 's'} will be rewritten for you the moment you open ${r.staled === 1 ? 'it' : 'them'}. Nothing you've already read changes.` : 'Saved. Every chapter from here is written for you.')
    } catch { setError("Couldn't save that. Try again in a minute.") } finally { setBusy(false) }
  }

  return (
    <>
      <h1>Make it yours.</h1>
      <p className="lede">Say how you like to be taught. We keep it to one line and send it with every chapter, so it costs almost nothing and applies everywhere.</p>

      <h2>Who should teach you?</h2>
      <div className="chips wrap">
        {PERSONAS.map((p) => <button key={p} type="button" className="chip" aria-pressed={persona === p} onClick={() => setPersona(persona === p ? '' : p)}>{p}</button>)}
      </div>
      <div className="field"><label htmlFor="persona">Or in your own words</label><input id="persona" className="input" value={persona} onChange={(e) => setPersona(e.target.value)} placeholder="a chef who explains everything with food" /></div>

      <h2>What works for you?</h2>
      <div className="chips wrap">
        {LIKES.map((x) => <button key={x} type="button" className="chip" aria-pressed={likes.includes(x)} onClick={() => toggle(x)}>{x}</button>)}
      </div>

      <div className="field"><label htmlFor="examples">Pull examples from</label><input id="examples" className="input" value={examplesFrom} onChange={(e) => setExamplesFrom(e.target.value)} placeholder="my job as a PM, cricket, cooking" /></div>
      <div className="field"><label htmlFor="tone">Anything else, in your words</label><input id="tone" className="input" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="make me laugh once a chapter, never talk down to me" /></div>
      <div className="field"><label htmlFor="avoid">Avoid</label><input id="avoid" className="input" value={avoid} onChange={(e) => setAvoid(e.target.value)} placeholder="sports examples, long paragraphs" /></div>

      {initial?.preferredModel && <p className="note" style={{ marginTop: 'var(--l)' }}>Your chapters are written by the writer you picked in the comparison. Run it again on any chapter to change your pick.</p>}
      {done && <p className="note" style={{ marginTop: 'var(--l)', color: 'var(--pass)' }}>{done}</p>}
      {error && <p className="error">{error}</p>}

      <ActionBar busy={busy}>
        {done ? <button className="btn" onClick={onBack}>Back to the handbook</button> : <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save and use this from now on'}</button>}
        {!done && <button type="button" className="quiet" onClick={onBack}>Not now</button>}
      </ActionBar>
    </>
  )
}
