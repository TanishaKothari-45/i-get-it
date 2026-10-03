import { useEffect, useMemo, useState } from 'react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../convex/_generated/api'
import { deviceToken } from './lib/device'
import Start from './screens/Start'
import Plan from './screens/Plan'
import Chapter, { type AnswerResult, type Card } from './screens/Chapter'
import Done from './screens/Done'
import SignIn from './screens/SignIn'

type View = 'auto' | 'plan' | 'chapter' | 'done' | 'signin' | 'start-again'

export default function App() {
  const token = useMemo(() => deviceToken(), [])
  const { isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()
  const data = useQuery(api.handbooks.current, { deviceToken: token })
  const examples = useQuery(api.handbooks.cachedTopics, {}) ?? []
  const create = useMutation(api.handbooks.create)
  const answerQuestion = useMutation(api.handbooks.answerQuestion)
  const retry = useMutation(api.handbooks.retry)
  const setPosition = useMutation(api.handbooks.setPosition)
  const recordAnswer = useMutation(api.handbooks.recordAnswer)
  const finishChapter = useMutation(api.handbooks.finishChapter)
  const setTomorrow = useMutation(api.handbooks.setTomorrow)
  const attachToMe = useMutation(api.handbooks.attachToMe)

  const [view, setView] = useState<View>('auto')
  const [doneN, setDoneN] = useState<number | null>(null)
  const [draftTopic, setDraftTopic] = useState('')

  const hb = data?.handbook ?? null
  const progress = hb?.progress ?? null
  const currentN = progress?.currentChapter ?? 1
  const passed = progress?.chaptersPassed ?? []
  const chapter = hb?.chapters.find((c) => c.n === currentN)
  const recall = useQuery(api.handbooks.recallFor, hb && passed.length > 0 && progress?.currentCard === 0 ? { handbookId: hb._id, deviceToken: token } : 'skip') ?? []

  // After sign-in, the anonymous night attaches to the person.
  useEffect(() => { if (isAuthenticated) attachToMe({ deviceToken: token }).catch(() => {}) }, [isAuthenticated, attachToMe, token])
  useEffect(() => { window.scrollTo({ top: 0 }) }, [view, hb?._id])

  if (data === undefined) return <Shell><div className="splash">Opening your handbook…</div></Shell>

  // No handbook yet, or the person wants a different line: the first screen.
  if (!hb || view === 'start-again' || hb.status === 'planning' || hb.status === 'question' || hb.status === 'failed') {
    const status = !hb || view === 'start-again' ? 'idle' : hb.status === 'planning' ? 'writing' : hb.status === 'question' ? 'question' : 'failed'
    return (
      <Shell>
        <Start
          key={hb?._id ?? 'new'}
          initialTopic={view === 'start-again' ? (draftTopic || hb?.topic || '') : (hb?.topic ?? '')}
          status={status as any}
          question={hb?.question}
          error={hb?.error}
          examples={examples}
          onCreate={async (topic, level) => { setDraftTopic(topic); await create({ topic, level, deviceToken: token }); setView('auto') }}
          onAnswer={async (answer) => { if (hb) await answerQuestion({ handbookId: hb._id, answer, deviceToken: token }) }}
          onRetry={async () => { if (hb) await retry({ handbookId: hb._id, deviceToken: token }) }}
        />
      </Shell>
    )
  }

  const plan = hb.plan as any
  const chapterReady = chapter?.status === 'ready' && Array.isArray(chapter.cards)
  const chapterFailed = chapter?.status === 'failed'

  // Which screen, when nothing has been chosen on this visit.
  const resolved: View = view !== 'auto' ? view
    : passed.length === 7 ? 'plan'
    : (progress?.currentCard ?? 0) > 0 ? 'chapter'
    : 'plan'

  if (resolved === 'signin') {
    return (
      <Shell>
        <SignIn onDone={async () => { await attachToMe({ deviceToken: token }); setView('done') }} onBack={() => setView('done')} />
      </Shell>
    )
  }

  if (resolved === 'done' && doneN) {
    const ch = hb.chapters.find((c) => c.n === doneN)
    return (
      <Shell onSignOut={isAuthenticated ? signOut : undefined}>
        <Done
          topic={plan?.topic ?? hb.topic}
          n={doneN}
          passed={passed}
          outcomeLine={ch?.outcomeLine ?? plan?.chapters?.[doneN - 1]?.outcome ?? ''}
          nextTitle={plan?.chapters?.[doneN]?.title}
          signedIn={isAuthenticated}
          tomorrowAt={progress?.tomorrowAt}
          onKeep={() => setView('signin')}
          onPickTime={async (at) => { await setTomorrow({ handbookId: hb._id, at, deviceToken: token }) }}
          onContinue={() => { setDoneN(null); setView('plan') }}
        />
      </Shell>
    )
  }

  if (resolved === 'chapter' && chapter && chapterReady) {
    return (
      <Shell onSignOut={isAuthenticated ? signOut : undefined}>
        <Chapter
          key={`${hb._id}-${chapter.n}`}
          topic={plan?.topic ?? hb.topic}
          n={chapter.n}
          title={chapter.title ?? plan?.chapters?.[chapter.n - 1]?.title ?? `Chapter ${chapter.n}`}
          cards={chapter.cards as Card[]}
          recall={recall as any}
          passed={passed}
          passedExercises={progress?.passedExercises ?? []}
          startAt={progress?.currentCard ?? 0}
          onPosition={(cardIndex) => { setPosition({ handbookId: hb._id, chapter: chapter.n, cardIndex, deviceToken: token }).catch(() => {}) }}
          onAnswer={async (item, optionId, attempt) => (await recordAnswer({ handbookId: hb._id, chapter: item.chapter, cardIndex: item.cardIndex, optionId, attempt, recall: !!item.recall, deviceToken: token })) as AnswerResult}
          onFinish={async () => { await finishChapter({ handbookId: hb._id, n: chapter.n, deviceToken: token }); setDoneN(chapter.n); setView('done') }}
        />
      </Shell>
    )
  }

  return (
    <Shell onSignOut={isAuthenticated ? signOut : undefined}>
      <Plan
        topic={plan?.topic ?? hb.topic}
        plan={plan}
        passed={passed}
        current={currentN}
        chapterReady={!!chapterReady}
        chapterFailed={!!chapterFailed}
        onStart={() => setView('chapter')}
        onRetry={() => { retry({ handbookId: hb._id, deviceToken: token }).catch(() => {}) }}
        onChangeLine={() => { setDraftTopic(hb.topic); setView('start-again') }}
      />
    </Shell>
  )
}

function Shell({ children, onSignOut }: { children: React.ReactNode; onSignOut?: () => Promise<void> | void }) {
  return (
    <div className="shell">
      <header className="top">
        <p className="wordmark">I Get It<small>Seven chapters. Twenty minutes a night.</small></p>
        {onSignOut && <button type="button" className="quiet" onClick={() => onSignOut()}>Sign out</button>}
      </header>
      <main>{children}</main>
      <footer className="foot"><p>Built in public for GrowthX Build Sprint, October 2026.</p></footer>
    </div>
  )
}
