import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import type { FunctionReturnType } from 'convex/server'
import { api } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'
import { languageInfo } from '../convex/languages'
import { deviceToken } from './lib/device'
import { Link, matchRoute, navigate, navState, paths, usePath, type BonusKind, type Route } from './lib/router'
import Nav from './components/Nav'
import ActionBar from './components/ActionBar'
import Start from './screens/Start'
import Plan from './screens/Plan'
import Chapter, { type AnswerResult, type Card, type Recap } from './screens/Chapter'
import Done from './screens/Done'
import SignIn from './screens/SignIn'
import Library from './screens/Library'

type Level = 'new' | 'some'
type Voice = 'friend' | 'straight' | 'stories'
type HandbookView = Extract<FunctionReturnType<typeof api.handbooks.get>, { kind: 'mine' }>['handbook']
type HandbookRouteName = Extract<Route, { id: string }>

export default function App() {
  const token = useMemo(() => deviceToken(), [])
  const path = usePath()
  const route = matchRoute(path)
  const { isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()
  const attachToMe = useMutation(api.handbooks.attachToMe)

  // After sign-in, the anonymous nights on this device attach to the person.
  useEffect(() => { if (isAuthenticated) attachToMe({ deviceToken: token }).catch(() => {}) }, [isAuthenticated, attachToMe, token])

  const onSignOut = async () => { await signOut(); navigate(paths.home) }

  let screen: ReactNode
  switch (route.name) {
    case 'home': screen = <Home token={token} />; break
    case 'new': screen = <NewHandbook token={token} />; break
    case 'library': screen = <LibraryRoute token={token} signedIn={isAuthenticated} />; break
    case 'signin': screen = <SignInRoute token={token} />; break
    case 'handbook':
    case 'chapter':
    case 'done':
    case 'bonus': screen = <HandbookRoute key={route.id} route={route} token={token} />; break
    default: screen = <NotFound />
  }

  return (
    <div className="shell">
      <header className="top">
        <Link to={paths.home} className="wordmark">I Get It<small>Seven chapters. Twenty minutes a night.</small></Link>
        <Nav path={path} signedIn={isAuthenticated} onSignOut={onSignOut} />
      </header>
      <main>{screen}</main>
      <footer className="foot"><p>Built in public for GrowthX Build Sprint, October 2026.</p></footer>
    </div>
  )
}

// ---------- small pieces ----------

function Splash({ children }: { children: ReactNode }) {
  return <div className="splash">{children}</div>
}

function Redirect({ to }: { to: string }) {
  useEffect(() => { navigate(to, { replace: true }) }, [to])
  return null
}

function useTitle(title: string | null) {
  useEffect(() => { document.title = title ? `${title} · I Get It` : 'I Get It' }, [title])
}

// The page's language follows the handbook's, so screen readers and fonts treat Hindi as Hindi.
function usePageLanguage(language: string | null) {
  useEffect(() => {
    const code = (language && languageInfo(language)?.code) || 'en'
    document.documentElement.lang = code
    return () => { document.documentElement.lang = 'en' }
  }, [language])
}

function useCreateHandbook(token: string) {
  const create = useMutation(api.handbooks.create)
  return async (topic: string, level: Level, voice: Voice, language?: string) => {
    const { handbookId } = await create({ topic, level, voice, language, deviceToken: token })
    navigate(paths.handbook(handbookId))
  }
}

// ---------- routes ----------

// The bare link: back to the most recent handbook, on the card they left. First visit: the start screen.
function Home({ token }: { token: string }) {
  const current = useQuery(api.handbooks.current, { deviceToken: token })
  useEffect(() => {
    if (!current) return
    navigate(current.resumeChapter ? paths.chapter(current.handbookId, current.resumeChapter) : paths.handbook(current.handbookId), { replace: true })
  }, [current])
  if (current === null) return <NewHandbook token={token} />
  return <Splash>Opening your handbook…</Splash>
}

function NewHandbook({ token }: { token: string }) {
  useTitle(null)
  const create = useCreateHandbook(token)
  const examples = useQuery(api.handbooks.cachedTopics, {}) ?? []
  const keptLine = navState<{ topic?: string }>()?.topic ?? ''
  return <Start initialTopic={keptLine} status="idle" examples={examples} onCreate={create} />
}

function LibraryRoute({ token, signedIn }: { token: string; signedIn: boolean }) {
  useTitle('My handbooks')
  const items = useQuery(api.handbooks.mine, { deviceToken: token })
  return <Library items={items} signedIn={signedIn} />
}

function SignInRoute({ token }: { token: string }) {
  useTitle('Sign in')
  const attachToMe = useMutation(api.handbooks.attachToMe)
  const next = navState<{ next?: string }>()?.next ?? paths.library
  return (
    <SignIn
      onDone={async () => { await attachToMe({ deviceToken: token }); navigate(next, { replace: true }) }}
      onBack={() => { if (window.history.length > 1) window.history.back(); else navigate(paths.home) }}
    />
  )
}

function HandbookRoute({ route, token }: { route: HandbookRouteName; token: string }) {
  const data = useQuery(api.handbooks.get, { handbookId: route.id, deviceToken: token })
  const examples = useQuery(api.handbooks.cachedTopics, {}) ?? []
  const create = useCreateHandbook(token)
  const answerQuestion = useMutation(api.handbooks.answerQuestion)
  const retry = useMutation(api.handbooks.retry)
  const setTomorrow = useMutation(api.handbooks.setTomorrow)
  const goFurther = useMutation(api.handbooks.goFurther)
  const hb = data?.kind === 'mine' ? data.handbook : null
  useTitle(hb ? (hb.plan?.topic ?? hb.topic) : null)
  usePageLanguage(hb?.language ?? null)

  if (data === undefined) return <Splash>Opening your handbook…</Splash>
  if (data.kind === 'missing') return <NotFound />
  if (data.kind === 'notMine') return <NotMine topic={data.topic} level={data.level} voice={data.voice} language={data.language} token={token} />
  if (!hb) return <NotFound />

  const id = hb._id
  // Still being written, asked a question, or failed: the start screen in that state.
  if (hb.status !== 'ready' || !hb.plan) {
    const status = hb.status === 'planning' ? 'writing' : hb.status === 'question' ? 'question' : 'failed'
    return (
      <Start
        key={`${id}-${hb.status}`}
        initialTopic={hb.topic}
        status={status}
        question={hb.question}
        error={hb.error}
        examples={examples}
        onCreate={create}
        onAnswer={async (answer) => { await answerQuestion({ handbookId: id, answer, deviceToken: token }) }}
        onRetry={async () => { await retry({ handbookId: id, deviceToken: token }) }}
      />
    )
  }

  const plan = hb.plan
  const progress = hb.progress
  const currentN = progress?.currentChapter ?? 1
  const passed = progress?.chaptersPassed ?? []
  const isReady = (n: number) => hb.chapters.some((c) => c.n === n && c.status === 'ready' && Array.isArray(c.cards))
  const topic = plan.topic ?? hb.topic
  // The bonus a chapter unlocked, if any: "deeper" (all right first time) or "another" (any miss).
  const bonusOf = (n: number): { kind: BonusKind; done: boolean } | null => {
    if (progress?.deeperUnlocked?.includes(n)) return { kind: 'deeper', done: !!progress.bonusPassed?.includes(n) }
    if (progress?.anotherUnlocked?.includes(n)) return { kind: 'another', done: !!progress.anotherPassed?.includes(n) }
    return null
  }

  if (route.name === 'bonus') {
    // Only a bonus they've earned.
    if (bonusOf(route.n)?.kind !== route.kind) return <Redirect to={paths.handbook(id)} />
    return <BonusRoute key={`${id}-${route.kind}-${route.n}`} hb={hb} n={route.n} kind={route.kind} token={token} />
  }

  if (route.name === 'chapter') {
    // Only chapters they've reached, once written.
    if (route.n > currentN || !isReady(route.n)) return <Redirect to={paths.handbook(id)} />
    return <ChapterRoute key={`${id}-${route.n}`} hb={hb} n={route.n} token={token} />
  }

  if (route.name === 'done') {
    if (!passed.includes(route.n)) return <Redirect to={paths.handbook(id)} />
    const n = route.n
    return (
      <Done
        topic={topic}
        n={n}
        passed={passed}
        outcomeLine={hb.chapters.find((c) => c.n === n)?.outcomeLine ?? plan.chapters?.[n - 1]?.outcome ?? ''}
        nextTitle={plan.chapters?.[n]?.title}
        nextHook={plan.chapters?.[n]?.hook}
        signedIn={hb.signedIn}
        tomorrowAt={progress?.tomorrowAt}
        onKeep={() => navigate(paths.signin, { state: { next: paths.done(id, n) } })}
        onPickTime={async (at) => { await setTomorrow({ handbookId: id, at, deviceToken: token }) }}
        onContinue={() => navigate(paths.handbook(id))}
        bonus={(() => { const b = bonusOf(n); return b ? { ...b, onGo: () => navigate(paths.bonus(id, n, b.kind)) } : undefined })()}
        deviceToken={token}
        whatsNext={n === 7 ? {
          topic,
          nextLine: plan.horizon14 ?? undefined,
          related: Array.isArray(plan.related) ? plan.related.filter((t: unknown) => typeof t === 'string' && t.trim()).slice(0, 3) : [],
          fresh: examples.filter((t) => t !== topic && !(plan.related ?? []).includes(t)).slice(0, 3),
          onGoFurther: async () => { const { handbookId } = await goFurther({ handbookId: id, deviceToken: token }); navigate(paths.handbook(handbookId)) },
          onStart: (t) => create(t, 'new', hb.voice, hb.language),
        } : undefined}
      />
    )
  }

  const current = hb.chapters.find((c) => c.n === currentN)
  return (
    <Plan
      topic={topic}
      plan={plan}
      passed={passed}
      current={currentN}
      chapterReady={isReady(currentN)}
      chapterFailed={current?.status === 'failed'}
      chapterLink={(n) => (n <= currentN && isReady(n) ? paths.chapter(id, n) : null)}
      bonusFor={(n) => { const b = bonusOf(n); return b ? { href: paths.bonus(id, n, b.kind), label: BONUS_TEXT[b.kind].planLink[b.done ? 1 : 0] } : null }}
      voiceNote={hb.bookVoice && hb.voice !== hb.bookVoice ? `This one was written in the friendly voice ahead of time. Your "${hb.voice}" choice applies to handbooks written fresh.` : undefined}
      onStart={() => navigate(paths.chapter(id, currentN))}
      onRetry={() => { retry({ handbookId: id, deviceToken: token }).catch(() => {}) }}
      onChangeLine={() => navigate(paths.new, { state: { topic: hb.topic } })}
    />
  )
}

// One chapter. Recall cards are decided once, when the chapter opens, so the stack doesn't shift mid-way.
function ChapterRoute({ hb, n, token }: { hb: HandbookView; n: number; token: string }) {
  const progress = hb.progress
  const isCurrent = n === (progress?.currentChapter ?? 1)
  const [askRecall] = useState(() => isCurrent && (progress?.chaptersPassed.length ?? 0) > 0 && progress?.currentCard === 0)
  const recall = useQuery(api.handbooks.recallFor, askRecall ? { handbookId: hb._id as Id<'handbooks'>, deviceToken: token } : 'skip')
  const setPosition = useMutation(api.handbooks.setPosition)
  const recordAnswer = useMutation(api.handbooks.recordAnswer)
  const finishChapter = useMutation(api.handbooks.finishChapter)
  const requestSimpler = useMutation(api.handbooks.requestSimpler)

  if (askRecall && recall === undefined) return <Splash>Opening chapter {n}…</Splash>
  const chapter = hb.chapters.find((c) => c.n === n)!
  const plan = hb.plan

  return (
    <Chapter
      topic={plan.topic ?? hb.topic}
      n={n}
      title={chapter.title ?? plan.chapters?.[n - 1]?.title ?? `Chapter ${n}`}
      cards={chapter.cards as Card[]}
      recap={recapOf(hb.chapters.find((c) => c.n === n - 1), plan)}
      recall={(recall ?? []) as any}
      passed={progress?.chaptersPassed ?? []}
      passedExercises={progress?.passedExercises ?? []}
      startAt={isCurrent ? (progress?.currentCard ?? 0) : 0}
      handbookPath={paths.handbook(hb._id)}
      onPosition={(cardIndex) => { if (isCurrent) setPosition({ handbookId: hb._id, chapter: n, cardIndex, deviceToken: token }).catch(() => {}) }}
      onAnswer={async (item, optionId, attempt) => (await recordAnswer({ handbookId: hb._id, chapter: item.chapter, cardIndex: item.cardIndex, optionId, attempt, recall: !!item.recall, deviceToken: token })) as AnswerResult}
      onFinish={async () => { await finishChapter({ handbookId: hb._id, n, deviceToken: token }); navigate(paths.done(hb._id, n)) }}
      onSimpler={async (item) => requestSimpler({ handbookId: hb._id, chapter: item.chapter, cardIndex: item.cardIndex, deviceToken: token })}
    />
  )
}

type ChapterView = HandbookView['chapters'][number]

// The previous chapter's "In one breath" card (flagged as the summary in a translated chapter), or its outcome line if it has none.
function recapOf(prev: ChapterView | undefined, plan: any): Recap | null {
  if (!prev || prev.status !== 'ready' || !Array.isArray(prev.cards)) return null
  const title = prev.title ?? plan?.chapters?.[prev.n - 1]?.title ?? `Chapter ${prev.n}`
  const summary = (prev.cards as Card[]).find((c) => c.type === 'teach' && (c.summary || /in one breath/i.test(c.title ?? '')))
  if (summary) return { chapter: prev.n, title, card: summary }
  if (prev.outcomeLine) return { chapter: prev.n, title, card: { type: 'teach', title: 'In one breath', body: prev.outcomeLine } }
  return null
}

// Words for the two bonus lessons. (agent: placeholders until rewritten, see DESIGN.md)
const BONUS_TEXT: Record<BonusKind, { label: (n: number) => string; heading: string; lede: (title: string) => string; finish: string; planLink: [string, string] }> = {
  deeper: {
    label: (n) => `Bonus · chapter ${n}`,
    heading: 'Going deeper.',
    lede: (t) => `One layer deeper on ${t}: the nuance, the edge cases, a harder real case. Optional, and it doesn't change your plan.`,
    finish: 'Finish the bonus',
    planLink: ['Go deeper (bonus)', 'Bonus done · read it again'],
  },
  another: {
    label: (n) => `Another way · chapter ${n}`,
    heading: 'Another way in.',
    lede: (t) => `${t}, explained from a different angle: a new comparison, a slower example, fresh questions. Optional, and it doesn't change your plan.`,
    finish: 'Finish',
    planLink: ['See it another way', 'Seen it another way · read it again'],
  },
}

// A bonus lesson for chapter n ("go deeper" or "another way"). Written the first time anyone asks, shared after.
function BonusRoute({ hb, n, kind, token }: { hb: HandbookView; n: number; kind: BonusKind; token: string }) {
  const requestBonus = useMutation(api.handbooks.requestBonus)
  const recordAnswer = useMutation(api.handbooks.recordAnswer)
  const finishBonus = useMutation(api.handbooks.finishBonus)
  const bonus = hb.bonus.find((b) => b.n === n && b.kind === kind)
  const text = BONUS_TEXT[kind]
  const chapterTitle = hb.chapters.find((c) => c.n === n)?.title ?? hb.plan?.chapters?.[n - 1]?.title ?? `Chapter ${n}`
  const [error, setError] = useState<string | null>(null)
  const [slow, setSlow] = useState(false)
  const writing = !bonus || bonus.status === 'writing'

  const ask = async () => {
    setError(null)
    try { await requestBonus({ handbookId: hb._id, n, kind, deviceToken: token }) }
    catch (e) { setError(String((e as Error)?.message ?? e).includes('busy') ? 'Busy right now. Try again in a few minutes.' : "Couldn't start it just now. Try again in a minute.") }
  }
  // First visit: ask for it. A failed one waits for "Try again".
  useEffect(() => { if (!bonus) ask() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!writing) { setSlow(false); return }
    const t = setTimeout(() => setSlow(true), 8000)
    return () => clearTimeout(t)
  }, [writing])

  if (bonus?.status === 'ready' && Array.isArray(bonus.cards)) {
    return (
      <Chapter
        topic={hb.plan?.topic ?? hb.topic}
        n={n}
        title={bonus.title ?? chapterTitle}
        cards={bonus.cards as Card[]}
        recall={[]}
        passed={hb.progress?.chaptersPassed ?? []}
        passedExercises={[]}
        startAt={0}
        label={text.label(n)}
        finishLabel={text.finish}
        allowSimpler={false}
        handbookPath={paths.handbook(hb._id)}
        onPosition={() => {}}
        onAnswer={async (item, optionId, attempt) => (await recordAnswer({ handbookId: hb._id, chapter: n, cardIndex: item.cardIndex, optionId, attempt, bonus: true, bonusKind: kind, deviceToken: token })) as AnswerResult}
        onFinish={async () => { await finishBonus({ handbookId: hb._id, n, kind, deviceToken: token }); navigate(paths.handbook(hb._id)) }}
        onSimpler={async () => ({ ready: false })}
      />
    )
  }

  const failed = bonus?.status === 'failed'
  return (
    <>
      <p className="label" style={{ marginTop: 'var(--l)' }}>{text.label(n)}</p>
      <h1 style={{ marginTop: 6 }}>{text.heading}</h1>
      <p className="lede">{text.lede(chapterTitle)}</p>
      {(failed || error) && <p className="error">{error ?? "It didn't come through. Your chapter is saved; try again."}</p>}
      <ActionBar busy={writing && !error} note={writing && !error && slow ? 'About 30 seconds. It reads the chapter you just did first.' : undefined}>
        {failed || error
          ? <button className="btn" onClick={ask}>Try again</button>
          : <button className="btn" disabled>Writing it…</button>}
        <Link to={paths.handbook(hb._id)} className="quiet">Back to the handbook</Link>
      </ActionBar>
    </>
  )
}

// Someone else's link: show what it's about and offer their own copy (ready topics open straight away).
function NotMine({ topic, level, voice, language, token }: { topic: string; level: Level; voice: Voice; language: string; token: string }) {
  useTitle(topic)
  const create = useCreateHandbook(token)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startMine = async () => {
    setBusy(true); setError(null)
    try { await create(topic, level, voice, language) }
    catch (e) { setError(String((e as Error)?.message ?? e).includes('busy') ? 'Busy right now. Try again in a few minutes.' : "Couldn't start it just now. Try once more in a minute.") }
    finally { setBusy(false) }
  }
  return (
    <>
      <h1>This handbook is someone else's.</h1>
      <p className="lede">You can start your own on the same thing: <strong>{topic}</strong>.</p>
      {error && <p className="error">{error}</p>}
      <ActionBar busy={busy}>
        <button className="btn" onClick={startMine} disabled={busy}>{busy ? 'Starting yours…' : 'Start my own'}</button>
      </ActionBar>
    </>
  )
}

function NotFound() {
  useTitle(null)
  return (
    <>
      <h1>Nothing here.</h1>
      <p className="lede">This link doesn't lead to a handbook.</p>
      <ActionBar>
        <button className="btn" onClick={() => navigate(paths.library)}>Go to my handbooks</button>
      </ActionBar>
    </>
  )
}
