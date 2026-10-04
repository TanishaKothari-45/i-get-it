import { useState } from 'react'
import ActionBar from '../components/ActionBar'
import Illustration from '../components/Illustration'
import Rich, { inline } from '../components/Rich'

type Variant = { key: string; status: 'writing' | 'ready' | 'failed'; title?: string; outcomeLine?: string; svg?: string; cards?: any[] }
type Props = { topic: string; n: number; variants: Variant[]; onVote: (key: string) => Promise<void>; onBack: () => void }

// Three versions of the same chapter, masked as A, B and C. One tap picks the writer.
export default function Compare({ topic, n, variants, onVote, onBack }: Props) {
  const [tab, setTab] = useState(variants[0]?.key ?? 'A')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const v = variants.find((x) => x.key === tab)
  const readyCount = variants.filter((x) => x.status === 'ready').length

  return (
    <>
      <p className="sub" style={{ marginTop: 10 }}>{topic} · chapter {n}</p>
      <h1>Which one reads best?</h1>
      <p className="lede">Three writers wrote this chapter. Read a bit of each, then tap the one you'd want for the rest of the handbook. You won't be told which is which.</p>

      <div className="tabs" role="tablist">
        {variants.map((x) => (
          <button key={x.key} type="button" role="tab" aria-selected={tab === x.key} className="tab" onClick={() => setTab(x.key)}>
            {x.key}{x.status === 'writing' ? ' · writing…' : x.status === 'failed' ? ' · didn\'t come through' : ''}
          </button>
        ))}
      </div>

      {v?.status === 'ready' && (
        <div className="compare-body">
          <Illustration svg={v.svg} />
          <h2>{v.title}</h2>
          {v.cards?.map((c, i) => c.type === 'exercise' ? (
            <div key={i} className="compare-ex"><p className="kicker">Check</p><p className="question" style={{ fontSize: 'var(--body)' }}>{inline(c.prompt)}</p>
              <ul>{c.options?.map((o: any) => <li key={o.id}>{o.text}</li>)}</ul></div>
          ) : (
            <div key={i}>{c.title && <h2 style={{ fontSize: 'var(--ui)', marginBottom: 4 }}>{c.title}</h2>}<Rich text={c.body} className="serif" /></div>
          ))}
        </div>
      )}
      {v?.status === 'writing' && <p className="note" style={{ marginTop: 'var(--l)' }}>Writing version {v.key}… about a minute. {readyCount > 0 ? 'The other tabs may be ready.' : ''}</p>}
      {v?.status === 'failed' && <p className="error">Version {v.key} didn't come through. Pick from the others.</p>}
      {error && <p className="error">{error}</p>}

      <ActionBar busy={readyCount < variants.length}>
        <button className="btn" disabled={v?.status !== 'ready' || busy} onClick={async () => { setBusy(true); setError(null); try { await onVote(tab) } catch { setError("Couldn't save your pick. Try again."); setBusy(false) } }}>
          {busy ? 'Saving…' : `${tab} reads best`}
        </button>
        <button type="button" className="quiet" onClick={onBack}>Not now</button>
      </ActionBar>
    </>
  )
}
