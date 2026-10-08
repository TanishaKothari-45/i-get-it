import { useEffect, useMemo, useRef, useState } from 'react'
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import type { FunctionReturnType } from 'convex/server'
import { api } from '../convex/_generated/api'
import { deviceToken } from './lib/device'
import { track } from './lib/track'
import Start, { type NewSources } from './screens/Start'
import { ENGLISH, languageInfo } from '../convex/languages'
import { absorb } from './components/SourcesInput'
import { shrinkPhoto } from './lib/photo'
import type { Id } from '../convex/_generated/dataModel'
import Plan from './screens/Plan'
import Chapter, { type AnswerResult, type Card } from './screens/Chapter'
import Done from './screens/Done'
import SignIn from './screens/SignIn'
import Tune from './screens/Tune'
import Compare from './screens/Compare'
import Library from './screens/Library'
import { PolicyLinks } from './screens/Policy'
import { isMemberLimit, limitCode, limitMessage } from './lib/limits'
import NextTopics from './components/NextTopics'
import Sheet from './components/Sheet'
import Pricing from './screens/Pricing'
import Landing from './screens/Landing'
import Explore from './screens/Explore'
import WhatsNext from './components/WhatsNext'
import SignupNudge from './components/SignupNudge'
import ActionBar from './components/ActionBar'

type View = 'auto' | 'plan' | 'chapter' | 'done' | 'signin' | 'start-again' | 'tune' | 'compare' | 'library' | 'pricing' | 'explore' | 'bonus'
type BonusKind = 'deeper' | 'another'

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
  const payOrder = useAction(api.payments.order)
  const payConfirm = useAction(api.payments.confirm)
  const [afterSignIn, setAfterSignIn] = useState<View>('done')
  const [flash, setFlash] = useState<string | null>(null)
  const readyTopics = useQuery(api.handbooks.cachedTopics, {})
  const examples = readyTopics ?? []
  const create = useMutation(api.handbooks.create)
  const uploadUrl = useMutation(api.sources.uploadUrl)
  // A handbook from a typed line, or from what they saved. Photos go to Convex's file storage first (shrunk on the
  // phone) and are deleted once read.
  const createFrom = async (topic: string, level: 'new' | 'some', voice: 'friend' | 'straight' | 'stories', language: string, sources?: NewSources) => {
    const images: Id<'_storage'>[] = []
    for (const photo of sources?.photos ?? []) {
      const blob = await shrinkPhoto(photo)
      const res = await fetch(await uploadUrl({ deviceToken: token }), { method: 'POST', headers: { 'Content-Type': blob.type || 'image/jpeg' }, body: blob })
      if (!res.ok) throw new Error('upload failed')
      images.push((await res.json()).storageId)
    }
    return create({ topic, level, voice, language, deviceToken: token, links: sources?.links?.length ? sources.links : undefined, images: images.length ? images : undefined, creator: sources?.creator })
  }
  // "Share to I Get It" (Android, installed app): the share sheet opens /share?url=…&text=…. Read the links once, put the
  // address back to /, and open the first screen with them listed.
  const [shared] = useState(() => {
    try {
      if (window.location.pathname !== '/share') return ''
      const q = new URLSearchParams(window.location.search)
      window.history.replaceState(null, '', '/')
      return [q.get('url'), q.get('text'), q.get('title')].filter(Boolean).join(' ')
    } catch { return '' }
  })
  const answerQuestion = useMutation(api.handbooks.answerQuestion)
  const retry = useMutation(api.handbooks.retry)
  const setPosition = useMutation(api.handbooks.setPosition)
  const recordAnswer = useMutation(api.handbooks.recordAnswer)
  const finishChapter = useMutation(api.handbooks.finishChapter)
  const rateChapter = useMutation(api.handbooks.rateChapter)
  const chooseIntent = useMutation(api.handbooks.chooseIntent)
  const startFromLibrary = useMutation(api.library.start)
  const setTomorrow = useMutation(api.handbooks.setTomorrow)
  const attachToMe = useMutation(api.handbooks.attachToMe)
  const saveProfile = useMutation(api.handbooks.saveProfile)
  const refreshIfStale = useMutation(api.handbooks.refreshIfStale)
  const compareModels = useMutation(api.handbooks.compareModels)
  const voteModel = useMutation(api.handbooks.voteModel)
  const syncFromCache = useMutation(api.handbooks.syncFromCache)
  const profile = useQuery(api.handbooks.myProfile, { deviceToken: token })

  const [view, setView] = useState<View>(() => (shared ? 'start-again' : 'auto'))
  const [doneN, setDoneN] = useState<number | null>(null)
  const [bonusSel, setBonusSel] = useState<{ n: number; kind: BonusKind } | null>(null)
  // The chapter on screen stays on screen when its last quiz passes it and the server moves the reader on (6 Oct).
  const [readingN, setReadingN] = useState<number | null>(null)
  const [doneStats, setDoneStats] = useState<{ minutes: number; right: number; total: number } | null>(null)
  const [draftTopic, setDraftTopic] = useState('')
  // The writer comparison is for testers only: open the app once with ?compare=1 and this phone remembers it.
  const [tester] = useState(() => {
    try {
      if (new URLSearchParams(window.location.search).get('compare') === '1') localStorage.setItem('igetit.tester', '1')
      return localStorage.getItem('igetit.tester') === '1'
    } catch { return false }
  })

  const hb = data?.handbook ?? null
  // The page's language follows the handbook's, so screen readers and fonts treat Hindi as Hindi.
  useEffect(() => { document.documentElement.lang = languageInfo(hb?.language ?? '')?.code ?? 'en' }, [hb?.language])
  const progress = hb?.progress ?? null
  const currentN = progress?.currentChapter ?? 1
  const passed = progress?.chaptersPassed ?? []
  const total: number = (hb as any)?.total ?? 7   // 7, or 1 to 3 for a quick handbook (7 Oct)
  const chapter = hb?.chapters.find((c) => c.n === (readingN ?? currentN))
  const recallLive = useQuery(api.handbooks.recallFor, hb && (passed.length > 0 || currentN > 1) && progress?.currentCard === 0 ? { handbookId: hb._id, deviceToken: token } : 'skip')
  // Keep the "Remember this?" cards once loaded. The query stops when the reader leaves card 0, and dropping them
  // mid-chapter shifted every frame and skipped the first quiz (7 Oct: Avengers chapter 2 couldn't be finished).
  const recallKey = hb ? `${hb._id}:${currentN}` : ''
  const [recallKept, setRecallKept] = useState<{ key: string; items: any[] } | null>(null)
  useEffect(() => { if (recallLive?.length && recallKey) setRecallKept({ key: recallKey, items: recallLive }) }, [recallLive, recallKey])
  const recall = recallKept?.key === recallKey ? recallKept.items : (recallLive ?? [])
  // A chapter not opened yet comes without its cards ("locked", membership.ts). Entering it asks the server to open
  // it, which uses today's reading allowance; if there's none left, the handbook screen says when it opens.
  const openChapter = useMutation(api.handbooks.openChapter)
  const [lock, setLock] = useState<{ key: string; note: string; code: string | null } | null>(null)
  // When a chapter won't open, go straight to what unblocks it (7 Oct, Prateek): the 3 free chapters are used, so the
  // free account; today's chapters are used, so membership (a free account has the same 3 a day). A member at 7 a day
  // just sees the note.
  const [signinReason, setSigninReason] = useState<string | null>(null)
  const [pricingNotice, setPricingNotice] = useState<string | null>(null)
  const routeLock = (code: string | null, note: string) => {
    if (code === 'signup-more') { setSigninReason(note); setAfterSignIn('chapter'); setView('signin'); return true }
    if (code === 'daily-free') { setPricingNotice(note); setView('pricing'); return true }
    return false
  }
  const chapterLocked = chapter?.status === 'ready' && !!(chapter as any).locked
  // Signing up opens what a visitor couldn't, once the handbook is attached to the account (signedIn), so the key
  // includes it and the open is tried again then.
  const lockKey = hb && chapter ? `${hb._id}:${chapter.n}:${(hb as any).signedIn ? 'in' : 'out'}` : ''
  const wantsChapter = view === 'chapter' || (view === 'auto' && (progress?.currentCard ?? 0) > 0)
  useEffect(() => {
    if (!wantsChapter || !chapterLocked || !hb || !chapter || lock?.key === lockKey) return
    openChapter({ handbookId: hb._id, n: chapter.n, deviceToken: token })
      .catch((e) => { const code = limitCode(e), note = limitMessage(e) ?? "Couldn't open this chapter just now. Try again in a minute."; setLock({ key: lockKey, code, note }); routeLock(code, note) })
  }, [wantsChapter, chapterLocked, lockKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // First time in a handbook (7 Oct: 11 of 30 readers saw their plan and never opened chapter 1): go straight into
  // chapter 1 when it's ready; the plan is one tap away (the chapter's close button). Once per handbook per visit, and
  // only on the way in: a typed topic whose chapter 1 is still being written shows the plan, as before.
  const autoEntered = useRef<string | null>(null)
  const ch1Status = hb?.chapters.find((c) => c.n === 1)?.status
  useEffect(() => {
    if (!hb || hb.status !== 'ready' || autoEntered.current === hb._id || view !== 'auto') return
    autoEntered.current = hb._id
    const fresh = passed.length === 0 && currentN === 1 && (progress?.currentCard ?? 0) === 0
    if (fresh && ch1Status === 'ready') { setReadingN(1); setView('chapter') }
  }, [hb?._id, hb?.status, ch1Status, view]) // eslint-disable-line react-hooks/exhaustive-deps

  // A link from a post (?t=public-speaking&ch=2, 7 Oct) opens that ready topic straight away, at that chapter,
  // so a reader who just read chapter 1 on Instagram doesn't land on the landing page. Ready topics only: a link
  // never starts a paid generation. A topic already on this phone opens where they left off.
  const [deepLink, setDeepLink] = useState(() => {
    const q = new URLSearchParams(window.location.search)
    const t = q.get('t'), ch = Number(q.get('ch') ?? 1)
    return t ? { t: t.toLowerCase(), ch: Number.isInteger(ch) && ch >= 1 && ch <= 7 ? ch : 1 } : null
  })
  const linkStarted = useRef(false)
  useEffect(() => {
    if (!deepLink || readyTopics === undefined || linkStarted.current) return
    linkStarted.current = true
    const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const topic = readyTopics.find((x) => slug(x) === deepLink.t)
    const finish = () => setDeepLink(null)
    if (!topic) { finish(); return }
    ;(async () => {
      const r = await create({ topic, level: 'new', voice: 'friend', deviceToken: token })
      if (!r.existing && deepLink.ch > 1) await setPosition({ handbookId: r.handbookId, chapter: deepLink.ch, cardIndex: 0, deviceToken: token })
      track('submit', { via: 'link', topic: topic.slice(0, 60) })
      pin(String(r.handbookId))
      if (!r.existing && deepLink.ch > 1) { setReadingN(deepLink.ch); setView('chapter') } else setView('auto')
    })().catch(() => {}).finally(finish)
  }, [deepLink, readyTopics]) // eslint-disable-line react-hooks/exhaustive-deps

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
  useEffect(() => { if (view !== 'chapter') setReadingN(null) }, [view])
  // Pick up newer cached chapters for anything not started yet (the cache improves over the sprint).
  useEffect(() => { if (hb?._id && hb.status === 'ready') syncFromCache({ handbookId: hb._id, deviceToken: token }).catch(() => {}) }, [hb?._id, hb?.status, syncFromCache, token])

  if (data === undefined || deepLink) return <Shell><div className="splash">Opening your handbook…</div></Shell>

  const signIn = (back: View) => { setAfterSignIn(back); setView('signin') }
  // Open a topic by name: a ready one opens at once; a typed one is written. Past the free typed-topic limit, the
  // payment page opens with the reason (7 Oct, Prateek: a signed-up reader's next step is membership).
  const openTopic = async (t: string) => {
    try { const r = await create({ topic: t, level: 'new', voice: 'friend', deviceToken: token }); pin(String(r.handbookId)); setDoneN(null); setView('auto') }
    catch (e) { if (isMemberLimit(e)) { setPricingNotice(limitMessage(e)); setView('pricing') } else throw e }
  }
  const libRows = lib?.handbooks ?? []
  // Home is your shelf when you have handbooks; a first-time visitor's home is the landing page.
  goHome = () => { setDoneN(null); if (libRows.length) setView('library'); else { setView('auto'); window.scrollTo({ top: 0 }) } }

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
        <Pricing notice={pricingNotice} plans={plansData as any} fromDone={doneN === total} onLock={async () => lockPrice({ deviceToken: token, handbookId: hb?._id })} onOrder={(plan) => payOrder({ plan })} onConfirm={(r) => payConfirm({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature })} onBack={() => { setPricingNotice(null); setView(hb ? 'plan' : 'library') }} onSignIn={() => signIn('pricing')} />
      </Shell>
    )
  }

  // Explore: ready topics and the ones other readers started (6 Oct).
  if (view === 'explore') {
    return (
      <Shell>
        <Explore onBack={() => setView('auto')}
          onReady={async (topic) => { const r = await create({ topic, level: 'new', voice: 'friend', deviceToken: token }); pin(String(r.handbookId)); setView('auto') }}
          onShared={async (id) => { const r = await startFromLibrary({ libraryId: id, deviceToken: token }); pin(String(r.handbookId)); setView('auto') }} />
      </Shell>
    )
  }

  // A first-time visitor (nothing on this phone): the landing page, which has its own box.
  if (!hb && view !== 'start-again' && libRows.length === 0 && lib !== undefined) {
    return <Landing onExplore={() => setView('explore')} onCreate={async (topic, level, voice) => { setDraftTopic(topic); const g = absorb(topic, [], null, true); const r = await createFrom(g.text.trim(), level, voice, ENGLISH, g.links.length || g.creator ? { links: g.creator ? [] : g.links, photos: [], creator: g.creator ?? undefined } : undefined); pin(String(r.handbookId)); setFlash(r.existing ? 'You already have this handbook, so we opened it where you left off. Each topic lives in one handbook.' : null); setView('auto') }} />
  }

  // No handbook yet, or the person wants a different line: the first screen.
  if (!hb || view === 'start-again' || (hb.status as string) === 'intent' || hb.status === 'planning' || hb.status === 'question' || hb.status === 'failed' || (hb.status as string) === 'declined') {
    const status = !hb || view === 'start-again' ? 'idle' : (hb.status as string) === 'intent' ? 'intent' : hb.status === 'planning' ? 'writing' : hb.status === 'question' ? 'question' : (hb.status as string) === 'declined' ? 'declined' : 'failed'
    return (
      <Shell>
        {view === 'start-again' && libRows.length > 0 && !lib?.signedIn && <SignupNudge onSignIn={() => signIn('start-again')} context="second-topic" compact />}
        <Start
          onPricing={() => setView('pricing')}
          key={hb?._id ?? 'new'}
          initialTopic={view === 'start-again' ? (draftTopic || hb?.topic || '') : (hb?.topic ?? '')}
          status={status as any}
          question={hb?.question}
          intents={(hb as any)?.intents ?? null}
          onChooseIntent={async (goal, mode) => { if (hb) await chooseIntent({ handbookId: hb._id, goal, mode, deviceToken: token }) }}
          error={hb?.error}
          examples={examples}
          onCreate={async (topic, level, voice, language, sources) => { setDraftTopic(topic); let r; try { r = await createFrom(topic, level, voice, language, sources) } catch (e) { if (isMemberLimit(e)) { setPricingNotice(limitMessage(e)); setView('pricing'); return } throw e } pin(String(r.handbookId)); setFlash(r.existing ? 'You already have this handbook, so we opened it where you left off. Each topic lives in one handbook.' : null); setView('auto') }}
          onAnswer={async (answer) => { if (hb) await answerQuestion({ handbookId: hb._id, answer, deviceToken: token }) }}
          onRetry={async () => { if (hb) await retry({ handbookId: hb._id, deviceToken: token }) }}
          onAddOther={async (topic) => { await create({ topic, level: 'new', voice: 'friend', deviceToken: token }) }}
          pushback={(hb as any)?.pushback ?? undefined}
          suggestions={(hb as any)?.suggestions ?? []}
          initialLinks={view === 'start-again' ? shared : ''}
          sources={view === 'start-again' ? [] : ((hb as any)?.sources ?? [])}
          creator={view === 'start-again' ? null : ((hb as any)?.creator ?? null)}
          choices={view === 'start-again' ? null : ((hb as any)?.choices ?? null)}
        />
      </Shell>
    )
  }

  const plan = hb.plan as any
  const rail = plan ? (
    <>
      <p className="rail-topic">{plan.topic ?? hb.topic}</p>
      <p className="rail-sub">{passed.length} of {total} chapters done</p>
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
        <a className="quiet" href={`/print?h=${hb._id}`} target="_blank" rel="noopener">Print or save as PDF</a>
        <button type="button" className="quiet" onClick={() => { setDraftTopic(hb.topic); setView('start-again') }}>Start another topic</button>
        <button type="button" className="quiet" onClick={() => setView('explore')}>Explore what others are learning</button>
      </div>
    </>
  ) : undefined
  const toPlan = { label: 'Handbook', onClick: () => { setDoneN(null); setView('plan') } }
  const chapterReady = chapter?.status === 'ready' && (Array.isArray(chapter.cards) || chapterLocked)
  const lockNote = lock && lock.key === lockKey && chapterLocked ? lock.note : null
  const chapterFailed = chapter?.status === 'failed'
  // The bonus a finished chapter unlocked, if any: "deeper" (all right first time) or "another" (any miss).
  const bonusOf = (n: number): { kind: BonusKind; done: boolean } | null => {
    if (progress?.deeperUnlocked?.includes(n)) return { kind: 'deeper', done: !!progress.bonusPassed?.includes(n) }
    if (progress?.anotherUnlocked?.includes(n)) return { kind: 'another', done: !!progress.anotherPassed?.includes(n) }
    return null
  }
  const openBonus = (n: number, kind: BonusKind) => { setBonusSel({ n, kind }); setView('bonus') }
  // Switch to another handbook (a new or next-level one) and show it from the top.

  // Which screen, when nothing has been chosen on this visit.
  const resolved: View = view === 'chapter' && lockNote ? 'plan' : view !== 'auto' ? view
    : passed.length >= total ? 'plan'
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
        <SignIn reason={signinReason} onDone={async () => { setSigninReason(null); setView(afterSignIn === 'done' && !doneN ? 'plan' : afterSignIn) }} onBack={() => { setSigninReason(null); setView(afterSignIn) }} />
      </Shell>
    )
  }

  if (resolved === 'done' && doneN) {
    const ch = hb.chapters.find((c) => c.n === doneN)
    return (
      <Shell onSignOut={isAuthenticated ? signOut : undefined} rail={rail} back={toPlan}>
        <Done
          total={total}
          nextPicture={firstPicture((hb.chapters.find((c) => c.n === (doneN ?? 0) + 1) as any)?.pictures)}
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
          stats={doneStats}
          handbookId={hb._id}
          deviceToken={token}
          adapts={hb.source === 'live'}
          whatsNext={<WhatsNext topic={plan?.topic ?? hb.topic} deviceToken={token} onReady={async (t) => { const r = await create({ topic: t, level: 'new', voice: 'friend', deviceToken: token }); pin(String(r.handbookId)); setDoneN(null); setView('auto') }} onShared={async (id) => { const r = await startFromLibrary({ libraryId: id, deviceToken: token }); pin(String(r.handbookId)); setDoneN(null); setView('auto') }} />}
          onRate={async (rating) => { await rateChapter({ handbookId: hb._id, n: doneN, rating, deviceToken: token }) }}
          nextReady={chapterReady && chapter?.n === doneN + 1}
          onNext={() => { setDoneN(null); if (lockNote && lock && routeLock(lock.code, lock.note)) return; setView(chapterReady ? 'chapter' : 'plan') }}
          bonus={(() => { const b = bonusOf(doneN); return b ? { ...b, onGo: () => openBonus(doneN, b.kind) } : undefined })()}
        />
      </Shell>
    )
  }

  if (resolved === 'bonus' && bonusSel && bonusOf(bonusSel.n)?.kind === bonusSel.kind) {
    return (
      <Shell onSignOut={isAuthenticated ? signOut : undefined} rail={rail} back={toPlan}>
        <BonusScreen key={`${hb._id}-${bonusSel.kind}-${bonusSel.n}`} hb={hb} n={bonusSel.n} kind={bonusSel.kind} token={token} onBack={() => { setBonusSel(null); setView('plan') }} />
      </Shell>
    )
  }

  if (resolved === 'chapter' && chapter && chapterReady && !chapterLocked) {
    return (
      <Shell onSignOut={isAuthenticated ? signOut : undefined} rail={rail}>
        <Chapter
          total={total}
          recapReteach={(chapter as any).recapReteach ?? []}
          lastTime={((hb.chapters.find((c) => c.n === chapter.n - 1)?.cards ?? []) as any[]).find((c) => c.type !== 'exercise' && /^in one breath$/i.test((c.title ?? '').trim())) ?? null}
          key={`${hb._id}-${chapter.n}`}
          topic={plan?.topic ?? hb.topic}
          n={chapter.n}
          title={chapter.title ?? plan?.chapters?.[chapter.n - 1]?.title ?? `Chapter ${chapter.n}`}
          cards={chapter.cards as Card[]}
          recall={(chapter.n === currentN ? recall : []) as any}
          passed={passed}
          passedExercises={progress?.passedExercises ?? []}
          startAt={progress?.currentCard ?? 0}
          startPart={(progress as any)?.currentPart ?? 0}
          onPosition={(cardIndex, part) => { setReadingN(chapter.n); setView('chapter'); setPosition({ handbookId: hb._id, chapter: chapter.n, cardIndex, part, deviceToken: token }).catch(() => {}) }}
          onAnswer={async (item, optionId, attempt) => { setReadingN(chapter.n); setView('chapter'); return (await recordAnswer({ handbookId: hb._id, chapter: item.chapter, cardIndex: item.cardIndex, optionId, attempt, recall: !!item.recall, deviceToken: token })) as AnswerResult }}
          onFinish={async (stats) => { await finishChapter({ handbookId: hb._id, n: chapter.n, deviceToken: token }); setDoneStats(stats); setDoneN(chapter.n); setView('done') }}
          svg={(chapter as any).svg}
          pictures={(chapter as any).pictures ?? {}}
          credits={(chapter as any).credits ?? {}}
          caution={(hb as any).caution ?? null}
          picturesPending={!!(chapter as any).picturesPending}
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
        total={total}
        nextTopics={<NextTopics topic={plan?.topic ?? hb.topic} deviceToken={token} extra={(plan as any)?.next ?? []} onReady={(t) => { openTopic(t).catch(() => {}) }} onTyped={(t) => { openTopic(t).catch(() => {}) }} onShared={async (id) => { const r = await startFromLibrary({ libraryId: id, deviceToken: token }); pin(String(r.handbookId)); setView('auto') }} />}
        onOpenChapter={(n) => { setReadingN(n); setDoneN(null); setView('chapter') }}
        topic={plan?.topic ?? hb.topic}
        plan={plan}
        passed={passed}
        current={currentN}
        chapterReady={!!chapterReady}
        chapterFailed={!!chapterFailed} chapterError={(hb.chapters.find((c) => c.n === currentN) as any)?.error}
        lockNote={lockNote} onPricing={() => setView('pricing')} onSignUp={lock?.code === 'signup-more' ? () => signIn('chapter') : undefined}
        voiceNote={flash ? flash : (chapter as any)?.stale ? 'You changed how you want to be taught after this chapter was written. Tap start and it gets rewritten and fact-checked for you first, about a minute.' : hb.source === 'cache' && (hb as any).voice && (hb as any).voice !== 'friend' ? `This one was written in the friendly voice ahead of time. Your "${(hb as any).voice}" choice applies to handbooks written fresh.` : undefined}
        onStart={() => { if (lockNote && lock && routeLock(lock.code, lock.note)) return; if ((chapter as any)?.stale) { refreshIfStale({ handbookId: hb._id, n: currentN, deviceToken: token }).catch(() => {}) ; return } setView('chapter') }}
        onTune={() => setView('tune')}
        onCompare={!tester ? undefined : () => { if (chapter?.variants?.length) { setView('compare'); return } compareModels({ handbookId: hb._id, n: currentN, deviceToken: token }).then(() => setView('compare')).catch(() => {}) }}
        comparing={!!chapter?.variants?.length && chapter.variants.some((v: any) => v.status === 'writing')}
        coverSvg={(hb.chapters.find((c) => c.n === 1) as any)?.svg}
        coverPicture={firstPicture((hb.chapters.find((c) => c.n === 1) as any)?.pictures)}
        coverPending={!!(hb.chapters.find((c) => c.n === 1) as any)?.picturesPending}
        caution={(hb as any).caution ?? null}
        onLibrary={() => setView('library')}
        bonusFor={(n) => { const b = bonusOf(n); return b ? { label: BONUS_TEXT[b.kind].planLink[b.done ? 1 : 0], onGo: () => openBonus(n, b.kind) } : null }}
        libraryCount={libRows.length}
        sourceLabels={sourceLabelsOf((hb as any).sources)}
        sourcesNote={sourcesNoteOf((hb as any).sources, (hb as any).creator ?? null)}
        sourceLinks={((hb as any).sources ?? []).map((x: SourceView) => x.url)}
        nextUp={passed.length >= total ? null : (progress?.currentCard ?? 0) > 0 && !passed.includes(currentN) && chapter?.cards
          ? { kind: 'resume', n: currentN, card: (progress?.currentCard ?? 0) + 1, left: Math.max(1, chapter.cards.length - (progress?.currentCard ?? 0)) }
          : passed.length > 0 && !passed.includes(currentN) ? { kind: 'next', n: currentN } : null}
        whatsNext={<WhatsNext topic={plan?.topic ?? hb.topic} deviceToken={token} onReady={async (t) => { const r = await create({ topic: t, level: 'new', voice: 'friend', deviceToken: token }); pin(String(r.handbookId)); setView('auto') }} onShared={async (id) => { const r = await startFromLibrary({ libraryId: id, deviceToken: token }); pin(String(r.handbookId)); setView('auto') }} />}
        onRetry={() => { retry({ handbookId: hb._id, deviceToken: token }).catch(() => {}) }}
        onChangeLine={() => { setDraftTopic(hb.topic); setView('start-again') }}
      />
    </Shell>
  )
}

// The wordmark takes you home (7 Oct, Prateek): App sets this on every render; there is one App.
let goHome: (() => void) | null = null

function Shell({ children, onSignOut, rail, back }: { children: React.ReactNode; onSignOut?: () => Promise<void> | void; rail?: React.ReactNode; back?: { label: string; onClick: () => void } }) {
  // The member mark (7 Oct): paying should show, on every screen.
  const member = useQuery(api.membership.status, { deviceToken: deviceToken() })?.member
  // On a phone the side menu is hidden, so ☰ opens the same menu as a sheet (7 Oct, Prateek).
  const [menu, setMenu] = useState(false)
  return (
    <div className="shell">
      <header className="top">
        <button type="button" className="wordmark wordmark-btn" onClick={() => goHome?.()} aria-label="I Get It, home">I Get It{member && <span className="member-mark">Member</span>}<small>Seven chapters. Twenty minutes a night.</small></button>
        <span style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {back && <button type="button" className="back-link" onClick={back.onClick}>← {back.label}</button>}
          {onSignOut && <button type="button" className="quiet hide-phone" onClick={() => onSignOut()}>Sign out</button>}
          {rail && <button type="button" className="menu-btn" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(true)}>☰</button>}
        </span>
      </header>
      {menu && rail && (
        <Sheet onClose={() => setMenu(false)}>
          <nav className="menu-sheet" onClick={(e) => { if ((e.target as HTMLElement).closest('button, a')) setMenu(false) }}>
            {rail}
            {onSignOut && <button type="button" className="quiet" onClick={() => onSignOut()}>Sign out</button>}
          </nav>
        </Sheet>
      )}
      {rail && <aside className="rail">{rail}</aside>}
      <main>{children}</main>
      <footer className="foot"><p><PolicyLinks /></p><p>Built in public for GrowthX Build Sprint, October 2026.</p></footer>
    </div>
  )
}

// Words for the two bonus lessons. (agent) placeholders until Prateek rewrites them, as DESIGN.md asks.
const BONUS_TEXT: Record<BonusKind, { label: (n: number) => string; heading: string; lede: (title: string) => string; finish: string; planLink: [string, string] }> = {
  deeper: {
    label: (n) => `Bonus · chapter ${n}`,
    heading: 'Going deeper.',
    lede: (t) => `One layer deeper on ${t}: the nuance, the edge cases, a harder real case. Optional, and it doesn't change your path.`,
    finish: 'Finish the bonus',
    planLink: ['Go deeper (bonus) ▸', 'Bonus done · read it again'],
  },
  another: {
    label: (n) => `Another way · chapter ${n}`,
    heading: 'Another way in.',
    lede: (t) => `${t}, explained from a different angle: a new comparison, a slower example, fresh questions. Optional, and it doesn't change your path.`,
    finish: 'Finish',
    planLink: ['See it another way ▸', 'Seen it another way · read it again'],
  },
}

type HandbookData = NonNullable<NonNullable<FunctionReturnType<typeof api.handbooks.current>>['handbook']>

// A bonus lesson for chapter n. Written the first time they ask, then played in the same Stories player.
function BonusScreen({ hb, n, kind, token, onBack }: { hb: HandbookData; n: number; kind: BonusKind; token: string; onBack: () => void }) {
  const requestBonus = useMutation(api.bonus.requestBonus)
  const recordAnswer = useMutation(api.handbooks.recordAnswer)
  const finishBonus = useMutation(api.bonus.finishBonus)
  const bonus = hb.bonus.find((b) => b.n === n && b.kind === kind)
  const text = BONUS_TEXT[kind]
  const chapterTitle = hb.chapters.find((c) => c.n === n)?.title ?? (hb.plan as any)?.chapters?.[n - 1]?.title ?? `Chapter ${n}`
  const [error, setError] = useState<string | null>(null)
  const writing = !bonus || bonus.status === 'writing'

  const ask = async () => {
    setError(null)
    try { await requestBonus({ handbookId: hb._id, n, kind, deviceToken: token }) }
    catch (e) { setError(String((e as Error)?.message ?? e).includes('busy') ? 'Busy right now. Try again in a few minutes.' : "Couldn't start it just now. Try again in a minute.") }
  }
  // First visit: ask for it. A failed one waits for "Try again".
  useEffect(() => { if (!bonus) ask() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (bonus?.status === 'ready' && Array.isArray(bonus.cards)) {
    return (
      <Chapter
        topic={(hb.plan as any)?.topic ?? hb.topic}
        n={n}
        title={bonus.title ?? chapterTitle}
        cards={bonus.cards as Card[]}
        recall={[]}
        passed={hb.progress?.chaptersPassed ?? []}
        passedExercises={[]}
        startAt={0}
        label={text.label(n)}
        finishLabel={text.finish}
        tools={false}
        onPosition={() => {}}
        onAnswer={async (item, optionId, attempt) => (await recordAnswer({ handbookId: hb._id, chapter: n, cardIndex: item.cardIndex, optionId, attempt, bonus: true, bonusKind: kind, deviceToken: token })) as AnswerResult}
        onFinish={async () => { await finishBonus({ handbookId: hb._id, n, kind, deviceToken: token }); onBack() }}
        pictures={{}}
        onExit={onBack}
        handbookId={hb._id}
        deviceToken={token}
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
      <ActionBar busy={writing && !error} note={writing && !error ? 'Writing it and checking its facts… about a minute.' : undefined}>
        {failed || error
          ? <button className="btn" onClick={ask}>Try again</button>
          : <button className="btn" disabled>Writing it…</button>}
        <button type="button" className="quiet" onClick={onBack}>Back to the handbook</button>
      </ActionBar>
    </>
  )
}

// The cover shows chapter 1's first Runway picture; the model's freehand drawing only until it arrives.
function firstPicture(pictures?: Record<string, string>): string | undefined {
  const keys = Object.keys(pictures ?? {}).map(Number).sort((a, b) => a - b)
  return keys.length ? pictures![String(keys[0])] : undefined
}

// ---------- handbooks from what they saved ----------

type SourceView = { kind: 'youtube' | 'instagram' | 'image'; url?: string; status: string }

// What the reader calls each thing they shared, numbered in the order they added it: "Reel 1", "Video 2", "Photo 3".
function sourceLabelsOf(sources?: SourceView[]): string[] | undefined {
  if (!sources?.length) return undefined
  const name = { instagram: 'Reel', youtube: 'Video', image: 'Photo' } as const
  return sources.map((x, i) => `${name[x.kind]} ${i + 1}`)
}

// The plan's credit line: which of the things they shared it was built from.
function sourcesNoteOf(sources: SourceView[] | undefined, creator: string | null): string | undefined {
  const labels = sourceLabelsOf(sources)
  const used = (sources ?? []).flatMap((x, i) => (x.status === 'read' ? [labels![i]] : []))
  if (!used.length) return undefined
  return creator ? `Based on @${creator}'s reels: ${used.join(' · ')}.` : `Built from what you shared: ${used.join(' · ')}.`
}
