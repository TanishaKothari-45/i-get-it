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
import Tune from './screens/Tune'
import Compare from './screens/Compare'
import Library from './screens/Library'
import Pricing from './screens/Pricing'
import Landing from './screens/Landing'
import SignupNudge from './components/SignupNudge'

type View = 'auto' | 'plan' | 'chapter' | 'done' | 'signin' | 'start-again' | 'tune' | 'compare' | 'library' | 'pricing'

export default function App() {
  const token = useMemo(() => deviceToken(), [])
  const { isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()
  const [pinned, setPinned] = useState<string | null>(() => { try { return localStorage.getItem('igetit.active') } catch { return null } })
  const pin = (id: string | null) => { setPinned(id); try { if (id) localStorage.setItem('igetit.active', id); else localStorage.removeItem('igetit.active') } catch {} }
  const data = useQuery(api.handbooks.current, pinned ? { deviceToken: token, handbookId: pinned as any } : { deviceToken: token })
  const lib = useQuery(api.handbooks.library, { deviceToken: token })
  const plansData = useQuery(api.pricing.plans, { deviceToken: token })
  const lockPrice = useMutation(api.pricing.lockPrice)
  const [afterSignIn, setAfterSignIn] = useState<View>('done')
  const [flash, setFlash] = useState<string | null>(null)
  const examples = useQuery(api.handbooks.cachedTopics, {}) ?? []
  const create = useMutation(api.handbooks.create)
  const answerQuestion = useMutation(api.handbooks.answerQuestion)
  const retry = useMutation(api.handbooks.retry)
  const setPosition = useMutation(api.handbooks.setPosition)
  const recordAnswer = useMutation(api.handbooks.recordAnswer)
  const finishChapter = useMutation(api.handbooks.finishChapter)
  const setTomorrow = useMutation(api.handbooks.setTomorrow)
  const attachToMe = useMutation(api.handbooks.attachToMe)
  const requestSimpler = useMutation(api.handbooks.requestSimpler)
  const saveProfile = useMutation(api.handbooks.saveProfile)
  const refreshIfStale = useMutation(api.handbooks.refreshIfStale)
  const compareModels = useMutation(api.handbooks.compareModels)
  const voteModel = useMutation(api.handbooks.voteModel)
  const syncFromCache = useMutation(api.handbooks.syncFromCache)
  const profile = useQuery(api.handbooks.myProfile, { deviceToken: token })

  const [view, setView] = useState<View>('auto')
  const [doneN, setDoneN] = useState<number | null>(null)
  const [draftTopic, setDraftTopic] = useState('')
  // The writer comparison is for testers only: open the app once with ?compare=1 and this phone remembers it.
  const [tester] = useState(() => {
    try {
      if (new URLSearchParams(window.location.search).get('compare') === '1') localStorage.setItem('igetit.tester', '1')
      return localStorage.getItem('igetit.tester') === '1'
    } catch { return false }
  })

  const hb = data?.handbook ?? null
  const progress = hb?.progress ?? null
  const currentN = progress?.currentChapter ?? 1
  const passed = progress?.chaptersPassed ?? []
  const chapter = hb?.chapters.find((c) => c.n === currentN)
  const recall = useQuery(api.handbooks.recallFor, hb && passed.length > 0 && progress?.currentCard === 0 ? { handbookId: hb._id, deviceToken: token } : 'skip') ?? []

  // After sign-in, the anonymous night attaches to the person.
  // Merge runs only once the sign-in has reached the server (calling it straight after signIn races the new token).
  useEffect(() => {
    if (!isAuthenticated) return
    attachToMe({ deviceToken: token })
      .then((r) => { if (r && (r.attached > 0 || r.hidden > 0)) setFlash(`Signed in. ${r.attached} handbook${r.attached === 1 ? '' : 's'} from this device ${r.attached === 1 ? 'is' : 'are'} now in your account, with your settings.${r.hidden ? ' A topic you had on another device too now shows once, the copy with more progress.' : ''}`) })
      .catch(() => {})
  }, [isAuthenticated, attachToMe, token])
  useEffect(() => { window.scrollTo({ top: 0 }) }, [view, hb?._id])
  useEffect(() => { if (view !== 'auto' && view !== 'plan') setFlash(null) }, [view])
  // Pick up newer cached chapters for anything not started yet (the cache improves over the sprint).
  useEffect(() => { if (hb?._id && hb.status === 'ready') syncFromCache({ handbookId: hb._id, deviceToken: token }).catch(() => {}) }, [hb?._id, hb?.status, syncFromCache, token])

  if (data === undefined) return <Shell><div className="splash">Opening your handbook…</div></Shell>

  const signIn = (back: View) => { setAfterSignIn(back); setView('signin') }
  const libRows = lib?.handbooks ?? []

  // Library and pricing can be reached from anywhere, with or without a current handbook.
  if (view === 'library') {
    return (
      <Shell back={hb ? { label: 'Handbook', onClick: () => setView('plan') } : undefined}>
        <Library rows={libRows as any} signedIn={!!lib?.signedIn} activeId={hb?._id} onOpen={(id) => { pin(id); setDoneN(null); setView('plan') }}
          onNew={() => { setDraftTopic(''); setView('start-again') }} onSignIn={() => signIn('library')} onPlans={() => setView('pricing')} />
      </Shell>
    )
  }
  if (view === 'pricing') {
    return (
      <Shell back={{ label: 'Back', onClick: () => setView(hb ? 'plan' : 'library') }}>
        <Pricing plans={plansData as any} fromDone={doneN === 7} onLock={async () => lockPrice({ deviceToken: token, handbookId: hb?._id })} onBack={() => setView(hb ? 'plan' : 'library')} onSignIn={() => signIn('pricing')} />
      </Shell>
    )
  }

  // A first-time visitor (nothing on this phone): the landing page, which has its own box.
  if (!hb && view !== 'start-again' && libRows.length === 0 && lib !== undefined) {
    return <Landing onCreate={async (topic, level, voice) => { setDraftTopic(topic); const r = await create({ topic, level, voice, deviceToken: token }); pin(String(r.handbookId)); setFlash(r.existing ? 'You already have this handbook, so we opened it where you left off. Each topic lives in one handbook.' : null); setView('auto') }} />
  }

  // No handbook yet, or the person wants a different line: the first screen.
  if (!hb || view === 'start-again' || hb.status === 'planning' || hb.status === 'question' || hb.status === 'failed') {
    const status = !hb || view === 'start-again' ? 'idle' : hb.status === 'planning' ? 'writing' : hb.status === 'question' ? 'question' : 'failed'
    return (
      <Shell>
        {view === 'start-again' && libRows.length > 0 && !lib?.signedIn && <SignupNudge onSignIn={() => signIn('start-again')} context="second-topic" compact />}
        <Start
          key={hb?._id ?? 'new'}
          initialTopic={view === 'start-again' ? (draftTopic || hb?.topic || '') : (hb?.topic ?? '')}
          status={status as any}
          question={hb?.question}
          error={hb?.error}
          examples={examples}
          onCreate={async (topic, level, voice) => { setDraftTopic(topic); const r = await create({ topic, level, voice, deviceToken: token }); pin(String(r.handbookId)); setFlash(r.existing ? 'You already have this handbook, so we opened it where you left off. Each topic lives in one handbook.' : null); setView('auto') }}
          onAnswer={async (answer) => { if (hb) await answerQuestion({ handbookId: hb._id, answer, deviceToken: token }) }}
          onRetry={async () => { if (hb) await retry({ handbookId: hb._id, deviceToken: token }) }}
        />
      </Shell>
    )
  }

  const plan = hb.plan as any
  const rail = plan ? (
    <>
      <p className="rail-topic">{plan.topic ?? hb.topic}</p>
      <p className="rail-sub">{passed.length} of 7 chapters done</p>
      <ol>
        {plan.chapters?.map((c: any) => (
          <li key={c.n} className={passed.includes(c.n) ? 'done' : c.n === currentN ? 'now' : ''}><span className="n">{passed.includes(c.n) ? '✓' : c.n}</span><span>{c.title}</span></li>
        ))}
      </ol>
      <div className="rail-links">
        <button type="button" className="quiet" onClick={() => { setDoneN(null); setView('plan') }}>The handbook</button>
        <button type="button" className="quiet" onClick={() => setView('library')}>Your handbooks{libRows.length > 1 ? ` (${libRows.length})` : ''}</button>
        <button type="button" className="quiet" onClick={() => setView('tune')}>Make it yours</button>
        <button type="button" className="quiet" onClick={() => setView('pricing')}>Pricing</button>
        <button type="button" className="quiet" onClick={() => { setDraftTopic(hb.topic); setView('start-again') }}>Start another topic</button>
      </div>
    </>
  ) : undefined
  const toPlan = { label: 'Handbook', onClick: () => { setDoneN(null); setView('plan') } }
  const chapterReady = chapter?.status === 'ready' && Array.isArray(chapter.cards)
  const chapterFailed = chapter?.status === 'failed'

  // Which screen, when nothing has been chosen on this visit.
  const resolved: View = view !== 'auto' ? view
    : passed.length === 7 ? 'plan'
    : (progress?.currentCard ?? 0) > 0 ? 'chapter'
    : 'plan'

  if (resolved === 'tune') {
    return (
      <Shell rail={rail} back={toPlan}>
        <Tune initial={profile ?? null} onSave={async (p) => saveProfile({ deviceToken: token, ...p })} onBack={() => setView('plan')} signedIn={isAuthenticated} onSignIn={() => signIn('tune')} />
      </Shell>
    )
  }

  if (resolved === 'compare' && chapter?.variants?.length) {
    return (
      <Shell rail={rail} back={toPlan}>
        <Compare topic={plan?.topic ?? hb.topic} n={chapter.n} variants={chapter.variants as any}
          onVote={async (key) => { await voteModel({ handbookId: hb._id, n: chapter.n, key, deviceToken: token }); setView('plan') }}
          onBack={() => setView('plan')} />
      </Shell>
    )
  }

  if (resolved === 'signin') {
    return (
      <Shell rail={rail} back={{ label: 'Back', onClick: () => setView(afterSignIn) }}>
        <SignIn onDone={async () => { setView(afterSignIn === 'done' && !doneN ? 'plan' : afterSignIn) }} onBack={() => setView(afterSignIn)} />
      </Shell>
    )
  }

  if (resolved === 'done' && doneN) {
    const ch = hb.chapters.find((c) => c.n === doneN)
    return (
      <Shell onSignOut={isAuthenticated ? signOut : undefined} rail={rail} back={toPlan}>
        <Done
          topic={plan?.topic ?? hb.topic}
          n={doneN}
          passed={passed}
          outcomeLine={ch?.outcomeLine ?? plan?.chapters?.[doneN - 1]?.outcome ?? ''}
          nextTitle={plan?.chapters?.[doneN]?.title}
          nextHook={plan?.chapters?.[doneN]?.hook}
          sources={plan?.sources}
          signedIn={isAuthenticated}
          tomorrowAt={progress?.tomorrowAt}
          onKeep={() => signIn('done')}
          onPricing={() => setView('pricing')}
          onPickTime={async (at) => { await setTomorrow({ handbookId: hb._id, at, deviceToken: token }) }}
          onContinue={() => { setDoneN(null); setView('plan') }}
        />
      </Shell>
    )
  }

  if (resolved === 'chapter' && chapter && chapterReady) {
    return (
      <Shell onSignOut={isAuthenticated ? signOut : undefined} rail={rail}>
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
          onSimpler={async (item) => requestSimpler({ handbookId: hb._id, chapter: item.chapter, cardIndex: item.cardIndex, deviceToken: token })}
          svg={(chapter as any).svg}
          pictures={(chapter as any).pictures ?? {}}
          onExit={() => setView('plan')}
          handbookId={hb._id}
          deviceToken={token}
        />
      </Shell>
    )
  }

  return (
    <Shell onSignOut={isAuthenticated ? signOut : undefined} rail={rail}>
      <Plan
        topic={plan?.topic ?? hb.topic}
        plan={plan}
        passed={passed}
        current={currentN}
        chapterReady={!!chapterReady}
        chapterFailed={!!chapterFailed}
        voiceNote={flash ? flash : (chapter as any)?.stale ? 'You changed how you want to be taught after this chapter was written. Tap start and it gets rewritten and fact-checked for you first, about a minute.' : hb.source === 'cache' && (hb as any).voice && (hb as any).voice !== 'friend' ? `This one was written in the friendly voice ahead of time. Your "${(hb as any).voice}" choice applies to handbooks written fresh.` : undefined}
        onStart={() => { if ((chapter as any)?.stale) { refreshIfStale({ handbookId: hb._id, n: currentN, deviceToken: token }).catch(() => {}) ; return } setView('chapter') }}
        onTune={() => setView('tune')}
        onCompare={!tester ? undefined : () => { if (chapter?.variants?.length) { setView('compare'); return } compareModels({ handbookId: hb._id, n: currentN, deviceToken: token }).then(() => setView('compare')).catch(() => {}) }}
        comparing={!!chapter?.variants?.length && chapter.variants.some((v: any) => v.status === 'writing')}
        coverSvg={(hb.chapters.find((c) => c.n === 1) as any)?.svg}
        onLibrary={() => setView('library')}
        libraryCount={libRows.length}
        onRetry={() => { retry({ handbookId: hb._id, deviceToken: token }).catch(() => {}) }}
        onChangeLine={() => { setDraftTopic(hb.topic); setView('start-again') }}
      />
    </Shell>
  )
}

function Shell({ children, onSignOut, rail, back }: { children: React.ReactNode; onSignOut?: () => Promise<void> | void; rail?: React.ReactNode; back?: { label: string; onClick: () => void } }) {
  return (
    <div className="shell">
      <header className="top">
        <p className="wordmark">I Get It<small>Seven chapters. Twenty minutes a night.</small></p>
        <span style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {back && <button type="button" className="back-link" onClick={back.onClick}>← {back.label}</button>}
          {onSignOut && <button type="button" className="quiet" onClick={() => onSignOut()}>Sign out</button>}
        </span>
      </header>
      {rail && <aside className="rail">{rail}</aside>}
      <main>{children}</main>
      <footer className="foot"><p>Built in public for GrowthX Build Sprint, October 2026.</p></footer>
    </div>
  )
}
