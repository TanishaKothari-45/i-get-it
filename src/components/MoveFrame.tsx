import Rich from './Rich'

// "Move" card (8 Oct): the move shown moving. A looping, code-drawn figure written by the model, in a locked box
// (no network, no storage, scripts only), with the cues to watch for under it. Until the figure lands, the cues alone.
export type MoveCard = { type: 'move'; title?: string; body?: string; cues: string[]; html?: string }

export default function MoveFrame({ card }: { card: MoveCard }) {
  return (
    <div className="move no-tap">
      <p className="story-kicker">{card.title ?? 'The move'}</p>
      {card.html ? (
        <div className="move-box"><iframe title={card.title ?? 'The move'} sandbox="allow-scripts" srcDoc={card.html} /></div>
      ) : (
        <div className="move-box move-pending" aria-label="The figure is being drawn" />
      )}
      <ul className="move-cues">{card.cues.slice(0, 3).map((c, k) => <li key={k}>{c}</li>)}</ul>
      {card.body && <Rich text={card.body} className="story-text size-md" />}
    </div>
  )
}
