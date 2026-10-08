import { useEffect, useRef, useState } from 'react'

// "Try it" card (8 Oct, block 2): the chapter's one idea as a small interactive page the reader works with their thumb
// (drag the bakery's value, bend the screen). Written once per chapter by Sonnet, shown in a locked box: no network,
// no storage, scripts only. When the page says it is done, the chapter can count it as the reader's proof.
export type TryItCard = { type: 'tryit'; title?: string; idea: string; html?: string }
type Props = { card: TryItCard; done?: boolean; onDone?: () => Promise<void> }

export default function TryItFrame({ card, done, onDone }: Props) {
  const box = useRef<HTMLIFrameElement>(null)
  const [finished, setFinished] = useState(!!done)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    const onMsg = async (e: MessageEvent) => {
      if (e.source !== box.current?.contentWindow || !e.data || e.data.type !== 'done' || finished || saving) return
      setSaving(true)
      try { await onDone?.(); setFinished(true) } catch { /* the page still works; the proof can be logged again */ } finally { setSaving(false) }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [finished, saving, onDone])
  return (
    <div className="tryit no-tap">
      <p className="story-kicker">{card.title ?? 'Try it'}</p>
      <p className="story-text size-md" style={{ marginBottom: 10 }}>{card.idea}</p>
      {card.html ? (
        <div className="tryit-box"><iframe ref={box} title={card.title ?? 'Try it'} sandbox="allow-scripts" srcDoc={card.html} /></div>
      ) : (
        <div className="tryit-box move-pending" aria-label="Being built" />
      )}
      <p className="doit-hint">{finished ? 'Got it. Tap → to keep going.' : 'Play with it until it clicks.'}</p>
      {!finished && !card.html && <p className="doit-hint">Still being built. Tap → if you like; it will be here next time.</p>}
    </div>
  )
}
