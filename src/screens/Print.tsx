import { useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { deviceToken } from '../lib/device'
import Rich from '../components/Rich'
import { PolicyLinks } from './Policy'

// /print?h=<handbook>: the whole handbook on one clean page, to print or save as a PDF (members, 7 Oct).
// The server decides who may see it (handbooks.printable). Copy is (agent) until Prateek rewrites it.
const KICKER: Record<string, string> = { example: 'Story time', mistake: 'The mistake everyone makes', try: 'Try it', watch: 'Watch' }

export default function Print() {
  const id = new URLSearchParams(window.location.search).get('h') ?? ''
  const data = useQuery(api.handbooks.printable, id ? { handbookId: id as Id<'handbooks'>, deviceToken: deviceToken() } : 'skip')
  useEffect(() => { if (data?.member) document.title = `${data.topic} · I Get It` }, [data])

  return (
    <div className="shell print-page">
      <header className="top no-print">
        <a className="wordmark" href="/" style={{ color: 'inherit', textDecoration: 'none' }}>I Get It<small>Seven chapters. Twenty minutes a night.</small></a>
      </header>
      <main className="policy">
        {!id ? <p className="lede">No handbook chosen. Open one and tap "Print or save as PDF".</p>
          : data === undefined ? <p className="note">Loading…</p>
          : !data.member ? (
            <>
              <h1>Print or save as PDF</h1>
              <p className="lede">Saving a whole handbook as one page is for members. Everything you've read stays in the app either way.</p>
              <p><a href="/">Back to I Get It</a>, then Pricing, to see what members get.</p>
            </>
          ) : (
            <>
              <p className="sub no-print" style={{ marginTop: 10 }}>Your handbook, on one page</p>
              <h1>{data.topic}</h1>
              <p className="no-print"><button type="button" className="btn" onClick={() => window.print()}>Print or save as PDF</button></p>
              <p className="note no-print">On a phone: Share, then Print, then pinch out on the preview to save it as a PDF. Chapters not written yet aren't included; quiz answers show for chapters you've passed.</p>
              {data.chapters.map((c) => (
                <section key={c.n} className="print-chapter">
                  <h2>Chapter {c.n} of {data.total}: {c.title}</h2>
                  {c.outcomeLine && <p><em>{c.outcomeLine}</em></p>}
                  {c.cards.map((card: any, i: number) => card.type === 'exercise' ? (
                    <div key={i} className="print-quiz">
                      <p><strong>Quiz:</strong> {card.prompt}</p>
                      <ul className="policy-list">{card.options.map((o: any) => <li key={o.id}>{o.text}</li>)}</ul>
                      {card.answer && <p><strong>Answer:</strong> {card.answer}</p>}
                    </div>
                  ) : card.type === 'watch' ? (
                    <p key={i}><strong>{KICKER.watch}:</strong> {card.who}, {card.what}. {card.watchFor}</p>
                  ) : (
                    <div key={i}>
                      {(KICKER[card.type] || card.title) && <h3>{card.title ?? KICKER[card.type]}</h3>}
                      <Rich text={card.body ?? ''} />
                    </div>
                  ))}
                </section>
              ))}
            </>
          )}
      </main>
      <footer className="foot no-print"><p><PolicyLinks /></p></footer>
    </div>
  )
}
