import ActionBar from '../components/ActionBar'
import RungBar from '../components/RungBar'
import { Link, navigate, paths } from '../lib/router'

export type LibraryItem = {
  _id: string
  topic: string
  status: 'planning' | 'question' | 'ready' | 'failed'
  currentChapter: number
  chaptersPassed: number[]
}

type Props = { items: LibraryItem[] | undefined; signedIn: boolean }

function statusLine(it: LibraryItem): string {
  if (it.status === 'planning') return 'Being written…'
  if (it.status === 'question') return 'Waiting on one answer from you'
  if (it.status === 'failed') return "Didn't come through. Open it to try again."
  const done = it.chaptersPassed.length
  if (done >= 7) return 'All 7 chapters done'
  if (done === 0) return 'Chapter 1 is next'
  return `Chapter ${it.currentChapter} is next · ${done} of 7 done`
}

// Every handbook this person has, newest first. (DESIGN.md section 4, My handbooks.)
export default function Library({ items, signedIn }: Props) {
  if (items === undefined) return <div className="splash">Opening your handbooks…</div>

  return (
    <>
      <h1>Your handbooks</h1>
      {!signedIn && items.length > 0 && (
        <p className="note">These live on this phone. <Link to={paths.signin} className="quiet">Sign in</Link> to keep them on every device.</p>
      )}

      {items.length === 0 ? (
        <p className="lede">Nothing here yet. Type the one thing you keep meaning to learn, and its handbook starts here.</p>
      ) : (
        <ul className="library">
          {items.map((it) => (
            <li key={it._id}>
              <Link to={paths.handbook(it._id)}>
                <span className="t">{it.topic}</span>
                <span className="c">{statusLine(it)}</span>
                {it.status === 'ready' && <RungBar passed={it.chaptersPassed} />}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ActionBar>
        <button className="btn" onClick={() => navigate(paths.new)}>Start a new handbook</button>
      </ActionBar>
    </>
  )
}
