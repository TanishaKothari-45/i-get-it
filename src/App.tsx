import { useEffect, useMemo, useRef, useState } from 'react'
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../convex/_generated/api'
import { deviceToken, freshDevice } from './lib/device'
import { track } from './lib/track'
import Start from './screens/Start'
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
import Shelf from './screens/Shelf'
import WhatsNext from './components/WhatsNext'
import SignupNudge from './components/SignupNudge'
import ShelfStrip, { ShelfButton } from './components/ShelfStrip'

type View = 'auto' | 'plan' | 'chapter' | 'done' | 'signin' | 'start-again' | 'tune' | 'compare' | 'library' | 'pricing' | 'explore'

export default function App() {
  const token = useMemo(() => deviceToken(), [])
  const { isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()
  const [pinned, setPinned] = useState<string | null>(() => { try { return localStorage.getItem('igetit.active') } catch { return null } })
  const pin = (id: string | null) => { setPinned(id); try { if (id) localStorage.setItem('igetit.active', id); else localStorage.removeItem('igetit.active') } catch {} }
  const data = useQuery(api.handbooks.current, pinned ? { deviceToken: token, handbookId: pinned as any } : { deviceToken: token })
  const lib = useQuery(api.handbooks.library, { deviceToken: token })
  const plansData = useQuery(api.pricing.plans, { deviceToken: token })
  const ms = useQuery(api.membership.status, { deviceToken: token })
  const isMember = !!ms?.member
  // Chapters a visitor reads before the free account (D26, 9 Oct: 2). The server enforces it (membership.ts tryOpen); the
  // screens only read it, so the number lives in one place.
  const freeChapters: number = (ms as any)?.limits?.visitorChapters ?? 2
  const lockPrice = useMutation(api.pricing.lockPrice)
  const payOrder = useAction(api.payments.order)
  const payConfirm = useAction(api.payments.confirm)
  const [afterSignIn, setAfterSignIn] = useState<View>('done')
  // The early-bird price, said once on the wall after chapter 1 as information (Shaktimaan, 8 Oct); true for our model:
  // a free account opens every chapter of every ready handbook, and paying buys more handbooks of your own.
  const openTier = (plansData as any)?.tiers?.find((t: any) => t.open) ?? (plansData as any)?.tiers?.slice(-1)[0]
  const priceLine = openTier ? `Paying is only for more handbooks of your own: from ₹${Number(openTier.month).toLocaleString('en-IN')} a month early-bird, paid once, nothing auto-renews.` : null
  const [flash, setFlash] = useState<string | null>(null)
  const readyTopics = useQuery(api.handbooks.cachedTopics, {})
  const examples = readyTopics ?? []
  const create = useMutation(api.handbooks.create)
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

  const [view, setView] = useState<View>(() => window.location.pathname === '/pricing' ? 'pricing' : 'auto')   // /pricing is a real address (8 Oct night)
  // The phone's Back button (9 Oct, 55's phone review): one Back used to leave the site from inside a chapter. Each
  // screen change pushes a history entry; Back restores the previous screen; a chapter closes to the handbook.
  const poppingRef = useRef(false)
  const hasHbRef = useRef(false)   // whether a handbook is open, for the Back handler above (set each render below)
  useEffect(() => {
    if (poppingRef.current) { poppingRef.current = false; return }
    if (window.history.state?.view === view) return
    if (window.history.state?.view === undefined) window.history.replaceState({ view }, '')
    else window.history.pushState({ view }, '')
  }, [view])
  useEffect(() => {
    // Back out of a chapter lands on the handbook, never back inside the chapter: the entry before it is often 'auto'
    // (the landing), and 'auto' would resolve to the chapter again mid-read (9 Oct, dev check).
    const onPop = (e: PopStateEvent) => { poppingRef.current = true; const v = e.state?.view as View | undefined; setView(v === 'chapter' || ((v === 'auto' || !v) && hasHbRef.current) ? 'plan' : v ?? 'auto') }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const [doneN, setDoneN] = useState<number | null>(null)
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
  const progress = hb?.progress ?? null
  const currentN = progress?.currentChapter ?? 1
  const passed = progress?.chaptersPassed ?? []
  hasHbRef.current = !!hb
  const total: number = (hb as any)?.total ?? 7   // 7, or 1 to 3 for a quick handbook (7 Oct)
  // The typed line is the name everywhere (D28, 9 Oct, Prateek: "Public speaking advanced level" was showing as the
  // model's own "Advanced Rhetoric and Persuasion"). First letter capitalised for display, nothing else changed.
  const name: string = hb?.topic ? hb.topic.charAt(0).toUpperCase() + hb.topic.slice(1) : ''
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
  const logSet = useMutation(api.handbooks.logSet)
  const [lock, setLock] = useState<{ key: string; note: string; code: string | null } | null>(null)
  // When a chapter won't open, go straight to what unblocks it (7 Oct, Prateek): the 3 free chapters are used, so the
  // free account; today's chapters are used, so membership (a free account has the same 3 a day). A member at 7 a day
  // just sees the note.
  const [signinReason, setSigninReason] = useState<string | null>(null)
  const [pricingNotice, setPricingNotice] = useState<string | null>(null)
  // 8 Oct (UX review #9): Explore goes back to the screen it was opened from, never into the middle of a chapter.
  const [exploreFrom, setExploreFrom] = useState<View>('auto')
  // A book tapped on the Shelf stays lifted on the Shelf while its handbook loads (8 Oct night, Prateek's animation):
  // the splash would tear the Shelf down, so the Shelf keeps rendering until the handbook query answers.
  const [hold, setHold] = useState<'explore' | 'landing' | 'library' | null>(null)
  // D29 (9 Oct): a reader mid-story on the wait screen is not pulled away when the handbook is ready; a button appears above
  // the story instead. Set when they swipe or ask for the next story; cleared when they tap through or the handbook changes.
  const [waitHold, setWaitHold] = useState(false)
  // Declined the wall tonight (second critique): the plan then offers chapter 1 again and the Shelf, not the same ask twice.
  const [wallDeclined, setWallDeclined] = useState(() => { try { return sessionStorage.getItem('igetit.wall-declined') === '1' } catch { return false } })
  const declineWall = () => { setWallDeclined(true); try { sessionStorage.setItem('igetit.wall-declined', '1') } catch {} }
  const goExplore = () => { setExploreFrom(view === 'auto' || view === 'explore' ? (hb ? 'plan' : 'auto') : view); setView('explore') }
  const routeLock = (code: string | null, note: string) => {
    if (code === 'signup-more') { setSigninReason(`To open chapter ${chapter?.n ?? currentN} of ${hb?.topic ?? 'this handbook'}. Chapter 1 stays on this phone whatever you choose.`); setAfterSignIn('chapter'); setView('signin'); return true }   // the same words as the wall (8 Oct night); `note` is kept for the plan's lock card
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
  // "Holdable": a fresh handbook about to open chapter 1 by itself. The Shelf or the landing page stays up, with the
  // lifted book, through the load and this one render, so the reader never sees the splash or a flash of the plan.
  // (view 'chapter' with no cards yet is the half-second while chapter 1's cards are fetched; the plan would flash there.)
  // The chapter a sign-in would open: from the wall (doneN + 1) or from the plan's lock (the chapter on screen).
  const lockedN = doneN && doneN < total ? doneN + 1 : afterSignIn === 'chapter' ? (chapter?.n ?? currentN) : null
  const holdable = hb?.status === 'ready' && ch1Status === 'ready' && passed.length === 0 && (progress?.currentCard ?? 0) === 0 && (view === 'auto' || (view === 'chapter' && !(chapter?.status === 'ready' && Array.isArray(chapter.cards))))
  useEffect(() => { if (hold && hb && view !== 'explore' && view !== 'library' && !holdable) setHold(null) }, [hold, hb, view, holdable])
  useEffect(() => { setWaitHold(false) }, [hb?._id])
  useEffect(() => {
    if (!hb || hb.status !== 'ready' || autoEntered.current === hb._id || view !== 'auto') return
    const fresh = passed.length === 0 && currentN === 1 && (progress?.currentCard ?? 0) === 0
    if (!fresh) { autoEntered.current = hb._id; return }   // not a first open: never enter by itself
    if (ch1Status !== 'ready') return                        // still being written: try again when it is (9 Oct, 55's review)
    autoEntered.current = hb._id; setReadingN(1); setView('chapter')
  }, [hb?._id, hb?.status, ch1Status, view]) // eslint-disable-line react-hooks/exhaustive-deps

  // A link from a post (?t=public-speaking&ch=2, 7 Oct) opens that ready topic straight away, at that chapter,
  // so a reader who just read chapter 1 on Instagram doesn't land on the landing page. Ready topics only: a link
  // never starts a paid generation. A topic already on this phone opens where they left off.
  // A link to one shared handbook (?l=<library id>, D25, 9 Oct, Prateek: "everything right now"): same start as a tap
  // on the Shelf (api.library.start), straight into chapter 1 with the book lifting, no landing page. A handbook already
  // on this phone opens where it was. A bad or unpublished id lands on the Shelf, with nothing to apologise for.
  const [deepLink, setDeepLink] = useState<{ t: string; ch: number; l?: undefined } | { l: string; t?: undefined; ch?: undefined } | null>(() => {
    const q = new URLSearchParams(window.location.search)
    const t = q.get('t'), ch = Number(q.get('ch') ?? 1), l = q.get('l')
    if (l && /^[a-z0-9]{20,40}$/.test(l)) return { l }
    return t ? { t: t.toLowerCase(), ch: Number.isInteger(ch) && ch >= 1 && ch <= 7 ? ch : 1 } : null
  })
  // The book to lift while a ?l= link opens: its title and cover from the Shelf's own list (one query, only on a link).
  const linkShelf = useQuery(api.library.explore, deepLink?.l ? {} : 'skip') as { kind: string; id?: string; key: string; topic: string; cover: string | null }[] | undefined
  const linkBook = deepLink?.l ? linkShelf?.find((x) => x.kind === 'shared' && x.id === deepLink.l) ?? null : null
  // Coming back (8 Oct, Prateek: "stop opening up the handbooks the first thing when a user comes back"): a reader who
  // already has handbooks lands on Your handbooks, one tap from where they left off, never inside a chapter. A first
  // visit still goes straight into chapter 1, and a post link still opens its topic.
  const landed = useRef(false)
  useEffect(() => {
    if (landed.current || lib === undefined || deepLink) return
    landed.current = true
    // A brand-new phone has nothing to come back to: its first handbook is the one it just picked, so never send it to the shelf.
    // A reload inside a session (the pinned handbook touched in the last 30 minutes) reopens where they were (the same
    // frame); the shelf is for coming back after a real break (9 Oct, 55's phone review).
    const pinnedRow = (lib.handbooks ?? []).find((h: any) => String(h._id) === pinned)
    const recent = !!pinnedRow && Date.now() - (pinnedRow as any).lastAt < 30 * 60 * 1000
    if (!freshDevice && !recent && (lib.handbooks?.length ?? 0) > 0 && view === 'auto') { autoEntered.current = hb?._id ?? null; setView('library') }
  }, [lib]) // eslint-disable-line react-hooks/exhaustive-deps
  const linkStarted = useRef(false)
  useEffect(() => {
    if (!deepLink || linkStarted.current) return
    if (deepLink.l) {
      linkStarted.current = true
      landed.current = true   // a link arrival never bounces to Your handbooks
      ;(async () => {
        const r = await startFromLibrary({ libraryId: deepLink.l as any, deviceToken: token })
        track('submit', { via: 'link-shared', topic: deepLink.l })
        pin(String(r.handbookId)); setView('auto')
      })().catch(() => { setView('explore') }).finally(() => setDeepLink(null))
      return
    }
    if (readyTopics === undefined) return
    linkStarted.current = true
    const ch = deepLink.ch ?? 1
    const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const topic = readyTopics.find((x) => slug(x) === deepLink.t)
    const finish = () => setDeepLink(null)
    if (!topic) { finish(); return }
    ;(async () => {
      const r = await create({ topic, level: 'new', voice: 'friend', deviceToken: token })
      if (!r.existing && ch > 1) await setPosition({ handbookId: r.handbookId, chapter: ch, cardIndex: 0, deviceToken: token })
      track('submit', { via: 'link', topic: topic.slice(0, 60) })
      pin(String(r.handbookId))
      if (!r.existing && ch > 1) { setReadingN(ch); setView('chapter') } else setView('auto')
    })().catch(() => {}).finally(finish)
  }, [deepLink, readyTopics]) // eslint-disable-line react-hooks/exhaustive-deps

  // After sign-in, the anonymous night attaches to the person.
  // Merge runs only once the sign-in has reached the server (calling it straight after signIn races the new token).
  // What to do once the attach has finished (8 Oct night): the wall used to open chapter 2 the instant sign-in
  // resolved, before the handbook belonged to the account, so the server refused it and the sign-in screen came back.
  const attachedRef = useRef(false)
  const afterAttachRef = useRef<(() => void) | null>(null)
  // Returns a promise so the sign-in screen can keep saying "Signing you in…" until the chapter actually opens.
  const afterSignedIn = (go: () => void) => new Promise<void>((done) => {
    const run = () => { go(); done() }
    if (attachedRef.current) { run(); return }
    afterAttachRef.current = run
    window.setTimeout(() => { if (afterAttachRef.current === run) { afterAttachRef.current = null; run() } }, 8000)   // never strand them
  })
  useEffect(() => {
    if (!isAuthenticated) { attachedRef.current = false; return }
    attachToMe({ deviceToken: token })
      .finally(() => { attachedRef.current = true; const go = afterAttachRef.current; afterAttachRef.current = null; go?.() })
      .then((r) => { if (r && (r.attached > 0 || r.hidden > 0)) setFlash(`Signed in. ${r.attached} handbook${r.attached === 1 ? '' : 's'} from this device ${r.attached === 1 ? 'is' : 'are'} now in your account, with your settings.${r.hidden ? ' A topic you had on another device too now shows once, the copy with more progress.' : ''}`) })
      .catch(() => {})
  }, [isAuthenticated, attachToMe, token])
  useEffect(() => { window.scrollTo({ top: 0 }) }, [view, hb?._id])
  useEffect(() => { if (view !== 'auto' && view !== 'plan') setFlash(null) }, [view])
  useEffect(() => { if (view !== 'chapter') setReadingN(null) }, [view])
  // Pick up newer cached chapters for anything not started yet (the cache improves over the sprint).
  useEffect(() => { if (hb?._id && hb.status === 'ready') syncFromCache({ handbookId: hb._id, deviceToken: token }).catch(() => {}) }, [hb?._id, hb?.status, syncFromCache, token])

  // Explore: ready topics and the ones other readers started (6 Oct).
  if (view === 'explore' || (hold === 'explore' && (data === undefined || holdable))) {
    return (
      <Shell hideShelf>
        <Shelf onBack={() => setView(exploreFrom)}
          onReady={async (topic) => { setHold('explore'); const r = await create({ topic, level: 'new', voice: 'friend', deviceToken: token }); pin(String(r.handbookId)); setView('auto') }}
          onShared={async (id) => { setHold('explore'); const r = await startFromLibrary({ libraryId: id, deviceToken: token }); pin(String(r.handbookId)); setView('auto') }} />
      </Shell>
    )
  }

  // A first-time visitor's pick stays on the landing page, with the card lifted, until its handbook is ready (8 Oct night).
  if ((hold === 'landing' || (freshDevice && !pinned && view === 'auto')) && !deepLink && (data === undefined || holdable))    return <Landing onExplore={() => setView('explore')} onCreate={async (topic, level, voice) => { setHold('landing'); setDraftTopic(topic); const r = await create({ topic, level, voice, deviceToken: token }); pin(String(r.handbookId)); setFlash(r.existing ? 'You already have this handbook, so we opened it where you left off. Each topic lives in one handbook.' : null); setView('auto') }} />
  const libRows = lib?.handbooks ?? []
  // Your handbooks stays up while a tapped handbook loads (no splash), like the Shelf.
  if (view === 'library' || (hold === 'library' && data === undefined)) {
    return (
      <Shell back={hb ? { label: 'Handbook', onClick: () => setView('plan') } : undefined}>
        <Library rows={libRows as any} signedIn={!!lib?.signedIn} activeId={hb?._id} onOpen={(id) => { setHold('library'); pin(id); setDoneN(null); setView('plan') }}
          onNew={() => { setDraftTopic(''); setView('start-again') }} onSignIn={() => signIn('library')} onPlans={() => setView('pricing')} onExplore={goExplore} />
      </Shell>
    )
  }
  if (deepLink?.l) return <LinkOpening book={linkBook} />
  if (data === undefined || deepLink) return <Shell><div className="splash">Opening your handbook…</div></Shell>

  const signIn = (back: View) => { setAfterSignIn(back); setView('signin') }
  // Open a topic by name: a ready one opens at once; a typed one is written. Past the free typed-topic limit, the
  // payment page opens with the reason (7 Oct, Prateek: a signed-up reader's next step is membership).
  const openTopic = async (t: string) => {
    try { const r = await create({ topic: t, level: 'new', voice: 'friend', deviceToken: token }); pin(String(r.handbookId)); setDoneN(null); setView('auto') }
    catch (e) { if (isMemberLimit(e)) { setPricingNotice(limitMessage(e)); setView('pricing') } else throw e }
  }
  // Home is your shelf when you have handbooks; a first-time visitor's home is the landing page.
  goHome = () => { setDoneN(null); if (libRows.length) setView('library'); else { setView('auto'); window.scrollTo({ top: 0 }) } }
  goShelf = () => { setDoneN(null); goExplore() }

  // Library and pricing can be reached from anywhere, with or without a current handbook.
  if (view === 'pricing') {
    return (
      <Shell back={{ label: 'Back', onClick: () => setView(hb ? 'plan' : 'library') }}>
        <Pricing notice={pricingNotice} plans={plansData as any} fromDone={doneN === total} onLock={async () => lockPrice({ deviceToken: token, handbookId: hb?._id })} onOrder={(plan) => payOrder({ plan })} onConfirm={(r) => payConfirm({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature })} onBack={() => { setPricingNotice(null); setView(hb ? 'plan' : 'library') }} onSignIn={() => { setSigninReason('Sign in first; the payment sheet opens right after. Nothing is charged until you approve it there.'); signIn('pricing') }} />
      </Shell>
    )
  }


  // A first-time visitor (nothing on this phone): the landing page, which has its own box.
  // Sign-in with no handbook yet (UX review #46, 8 Oct): "Sign in to pay" from Pricing used to fall into the Start screen.
  if (!hb && view === 'signin') {
    return (
      <Shell back={{ label: 'Back', onClick: () => setView(afterSignIn) }}>
        <SignIn reason={signinReason} onDone={async () => afterSignedIn(() => { setSigninReason(null); setView(afterSignIn === 'done' ? 'library' : afterSignIn) })} onBack={() => { setSigninReason(null); if (afterSignIn === 'done') { declineWall(); setDoneN(null); setView('plan') } else setView(afterSignIn) }} />
      </Shell>
    )
  }
  if (!hb && view !== 'start-again' && libRows.length === 0 && lib !== undefined) {
    return <Landing onExplore={() => setView('explore')} onCreate={async (topic, level, voice) => { setHold('landing'); setDraftTopic(topic); const r = await create({ topic, level, voice, deviceToken: token }); pin(String(r.handbookId)); setFlash(r.existing ? 'You already have this handbook, so we opened it where you left off. Each topic lives in one handbook.' : null); setView('auto') }} />
  }

  // No handbook yet, or the person wants a different line: the first screen.
  const waitHeld = waitHold && !!hb && hb.status === 'ready' && passed.length === 0 && (view === 'auto' || view === 'chapter')
  if (!hb || view === 'start-again' || (hb.status as string) === 'intent' || hb.status === 'planning' || waitHeld || hb.status === 'question' || hb.status === 'failed' || (hb.status as string) === 'declined') {
    const status = !hb || view === 'start-again' ? 'idle' : (hb.status as string) === 'intent' ? 'intent' : hb.status === 'planning' || waitHeld ? 'writing' : hb.status === 'question' ? 'question' : (hb.status as string) === 'declined' ? 'declined' : 'failed'
    // 8 Oct (UX review #5, #7): the box starts empty, and a reader with handbooks can always go back to them.
    const backToBooks = libRows.length > 0 && (view === 'start-again' || ['failed', 'declined', 'writing', 'question', 'intent'].includes(status)) ? { label: 'Your handbooks', onClick: () => setView('library') } : undefined
    return (
      <Shell back={backToBooks}>
        {view === 'start-again' && libRows.length > 0 && !lib?.signedIn && <SignupNudge onSignIn={() => signIn('start-again')} context="second-topic" compact />}
        <Start
          onPricing={() => setView('pricing')}
          onPickReady={view === 'start-again' ? openTopic : undefined}
          onExplore={goExplore}
          key={hb?._id ?? 'new'}
          initialTopic={view === 'start-again' ? draftTopic : (hb?.topic ?? '')}
          status={status as any}
          question={hb?.question}
          intents={(hb as any)?.intents ?? null}
          onChooseIntent={async (goal, mode) => { if (hb) await chooseIntent({ handbookId: hb._id, goal, mode, deviceToken: token }) }}
          error={hb?.error}
          examples={examples}
          onCreate={async (topic, level, voice) => { setDraftTopic(topic); let r; try { r = await create({ topic, level, voice, deviceToken: token }) } catch (e) { if (isMemberLimit(e)) { setPricingNotice(limitMessage(e)); setView('pricing'); return } throw e } pin(String(r.handbookId)); setFlash(r.existing ? 'You already have this handbook, so we opened it where you left off. Each topic lives in one handbook.' : null); setView('auto') }}
          onAnswer={async (answer) => { if (hb) await answerQuestion({ handbookId: hb._id, answer, deviceToken: token }) }}
          onRetry={async () => { if (hb) await retry({ handbookId: hb._id, deviceToken: token }) }}   /* Start shows its own error */
          onAddOther={async (topic) => { await create({ topic, level: 'new', voice: 'friend', deviceToken: token }) }}
          readyToOpen={waitHeld}
          onOpenReady={() => setWaitHold(false)}
          onEngaged={() => setWaitHold(true)}
          pushback={(hb as any)?.pushback ?? undefined}
          suggestions={(hb as any)?.suggestions ?? []}
        />
      </Shell>
    )
  }

  const plan = hb.plan as any
  const rail = plan ? (
    <>
      <p className="rail-topic">{name}</p>
      <p className="rail-sub">{passed.length} of {total} chapters done</p>
      <ol>
        {plan.chapters?.map((c: any) => (
          <li key={c.n} className={passed.includes(c.n) ? 'done' : c.n === currentN ? 'now' : ''}><span className="n">{passed.includes(c.n) ? '✓' : c.n}</span><span>{c.title}</span></li>
        ))}
      </ol>
      <div className="rail-links">
        <button type="button" className="quiet" onClick={() => { setDoneN(null); setView('plan') }}>The handbook</button>
        <button type="button" className="quiet" onClick={() => setView('library')}>Your handbooks{libRows.length > 1 ? ` (${libRows.length})` : ''}</button>
        <button type="button" className="quiet" onClick={() => setView('tune')}>Who teaches you, and how</button>
        <button type="button" className="quiet" onClick={() => setView('pricing')}>Pricing</button>
        {isMember ? <a className="quiet" href={`/print?h=${hb._id}`} target="_blank" rel="noopener">Print or save as PDF</a> : <button type="button" className="quiet" onClick={() => setView('pricing')}>Print or save as PDF (members)</button>}
        <button type="button" className="quiet" onClick={() => { setDraftTopic(''); setView('start-again') }}>Start another topic</button>
        <button type="button" className="quiet" onClick={goExplore}>The Shelf</button>
      </div>
    </>
  ) : undefined
  const toPlan = { label: 'Handbook', onClick: () => { setDoneN(null); setView('plan') } }
  const chapterReady = chapter?.status === 'ready' && (Array.isArray(chapter.cards) || chapterLocked)
  const lockNote = lock && lock.key === lockKey && chapterLocked ? lock.note : null
  const chapterFailed = chapter?.status === 'failed'

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
        <Compare topic={name} n={chapter.n} variants={chapter.variants as any}
          onVote={async (key) => { await voteModel({ handbookId: hb._id, n: chapter.n, key, deviceToken: token }); setView('plan') }}
          onBack={() => setView('plan')} />
      </Shell>
    )
  }

  if (resolved === 'signin') {
    return (
      <Shell rail={rail} back={{ label: 'Back', onClick: () => setView(afterSignIn) }}>
        <SignIn reason={signinReason} heading={afterSignIn === 'pricing' ? 'Sign in, then pay.' : signinReason && lockedN ? `Chapter ${lockedN} is free with an account.` : undefined} backLabel={afterSignIn === 'done' ? 'Not now, back to the handbook' : undefined} onDone={async () => afterSignedIn(() => {
          setSigninReason(null)
          // From the wall after a chapter (8 Oct night): straight on to the next chapter, which the account now opens
          // (only once the handbook is attached to the account; see afterSignedIn).
          if (afterSignIn === 'done' && doneN && doneN < total) { const next = chapterReady && chapter?.n === doneN + 1; setDoneN(null); setView(next ? 'chapter' : 'plan'); return }
          setView(afterSignIn === 'done' && !doneN ? 'plan' : afterSignIn)
        })} onBack={() => { setSigninReason(null); if (afterSignIn === 'done') { declineWall(); setDoneN(null); setView('plan') } else setView(afterSignIn) }} />
      </Shell>
    )
  }

  if (resolved === 'done' && doneN) {
    const ch = hb.chapters.find((c) => c.n === doneN)
    return (
      <Shell onSignOut={isAuthenticated ? signOut : undefined} rail={rail} back={toPlan}>
        <Done onShelf={goExplore}
          quick={(plan as any)?.format === 'quick' || total < 7}
          total={total}
          nextPicture={firstPicture((hb.chapters.find((c) => c.n === (doneN ?? 0) + 1) as any)?.pictures)}
          topic={name}
          n={doneN}
          passed={passed}
          outcomeLine={ch?.outcomeLine ?? plan?.chapters?.[doneN - 1]?.outcome ?? ''}
          nextTitle={plan?.chapters?.[doneN]?.title}
          nextHook={plan?.chapters?.[doneN]?.hook}
          sources={plan?.sources}
          signedIn={isAuthenticated}
          tomorrowAt={progress?.tomorrowAt}
          onKeep={() => { if (doneN && doneN < total) setSigninReason(`To open chapter ${doneN + 1} of ${name}. Chapter ${doneN} stays on this phone whatever you choose.`); signIn('done') }}
          freeChapters={freeChapters}
          priceLine={priceLine}
          onPricing={() => setView('pricing')}
          onPickTime={async (at) => { await setTomorrow({ handbookId: hb._id, at, deviceToken: token }) }}
          onContinue={() => { setDoneN(null); setView('plan') }}
          stats={doneStats}
          handbookId={hb._id}
          deviceToken={token}
          adapts={hb.source === 'live'}
          whatsNext={<WhatsNext topic={name} deviceToken={token} onReady={async (t) => { const r = await create({ topic: t, level: 'new', voice: 'friend', deviceToken: token }); pin(String(r.handbookId)); setDoneN(null); setView('auto') }} onShared={async (id) => { const r = await startFromLibrary({ libraryId: id, deviceToken: token }); pin(String(r.handbookId)); setDoneN(null); setView('auto') }} />}
          onRate={async (rating) => { await rateChapter({ handbookId: hb._id, n: doneN, rating, deviceToken: token }) }}
          nextReady={chapterReady && chapter?.n === doneN + 1}
          nextFailed={!!chapterFailed && chapter?.n === doneN + 1}
          onNext={() => { setDoneN(null); if (chapterFailed && chapter?.n === doneN + 1) { retry({ handbookId: hb._id, deviceToken: token }).catch(() => {}); setView('plan'); return } if (lockNote && lock && routeLock(lock.code, lock.note)) return; setView(chapterReady ? 'chapter' : 'plan') }}
        />
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
          topic={name}
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
          onLog={async (item, count, feel) => { setReadingN(chapter.n); setView('chapter'); return logSet({ handbookId: hb._id, chapter: item.chapter, cardIndex: item.cardIndex, count, feel, deviceToken: token }) }}
          loggedSets={(hb as any).loggedSets?.[String(chapter.n)] ?? []}
          svg={(chapter as any).svg}
          pictures={(chapter as any).pictures ?? {}}
          credits={(chapter as any).credits ?? {}}
          alts={(chapter as any).alts ?? {}}
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
      <Plan needsAccount={!isAuthenticated && currentN > freeChapters} {...({ declined: wallDeclined && !isAuthenticated, shelfStrip: <ShelfStrip where="plan" onOpen={goExplore} />, onShelf: goExplore } as any)}
        total={total}
        nextTopics={<NextTopics topic={name} deviceToken={token} extra={(plan as any)?.next ?? []} onReady={(t) => { openTopic(t).catch((e) => setFlash(limitMessage(e) ?? "Couldn't open that one. Check your connection and tap again.")) }} onTyped={(t) => { openTopic(t).catch((e) => setFlash(limitMessage(e) ?? "Couldn't open that one. Check your connection and tap again.")) }} onShared={async (id) => { const r = await startFromLibrary({ libraryId: id, deviceToken: token }); pin(String(r.handbookId)); setView('auto') }} />}
        onOpenChapter={(n) => { setReadingN(n); setDoneN(null); setView('chapter') }}
        topic={name}
        plan={plan}
        passed={passed}
        current={currentN}
        chapterReady={!!chapterReady}
        chapterFailed={!!chapterFailed} chapterError={(hb.chapters.find((c) => c.n === currentN) as any)?.error}
        lockNote={lockNote} lockHead={lock?.code?.startsWith('daily') ? 'opens after midnight, India time' : null} onPricing={() => setView('pricing')} onSignUp={lock?.code === 'signup-more' ? () => signIn('chapter') : undefined}
        voiceNote={flash ? flash : (chapter as any)?.stale ? 'You changed how you want to be taught after this chapter was written. Tap start and it gets rewritten and fact-checked for you first, about two minutes.' : hb.source === 'cache' && (hb as any).voice && (hb as any).voice !== 'friend' ? `This one was written in the friendly voice ahead of time. Your "${(hb as any).voice}" choice applies to handbooks written fresh.` : undefined}
        onStart={() => { if (lock && !lock.code && lock.key === lockKey) { setLock(null); setFlash('Trying to open it again…'); return } if (lockNote && lock && routeLock(lock.code, lock.note)) return; if ((chapter as any)?.stale) { refreshIfStale({ handbookId: hb._id, n: currentN, deviceToken: token }).catch(() => {}) ; return } setView('chapter') }}
        onTune={() => setView('tune')}
        onCompare={!tester ? undefined : () => { if (chapter?.variants?.length) { setView('compare'); return } compareModels({ handbookId: hb._id, n: currentN, deviceToken: token }).then(() => setView('compare')).catch(() => {}) }}
        comparing={!!chapter?.variants?.length && chapter.variants.some((v: any) => v.status === 'writing')}
        coverSvg={(hb.chapters.find((c) => c.n === 1) as any)?.svg}
        coverPicture={firstPicture((hb.chapters.find((c) => c.n === 1) as any)?.pictures)}
        coverPending={!!(hb.chapters.find((c) => c.n === 1) as any)?.picturesPending}
        caution={(hb as any).caution ?? null}
        onLibrary={() => setView('library')}
        libraryCount={libRows.length}
        nextUp={passed.length >= total ? null : (progress?.currentCard ?? 0) > 0 && !passed.includes(currentN) && chapter?.cards
          ? { kind: 'resume', n: currentN, card: (progress?.currentCard ?? 0) + 1, left: Math.max(1, chapter.cards.length - (progress?.currentCard ?? 0)) }
          : passed.length > 0 && !passed.includes(currentN) ? { kind: 'next', n: currentN } : null}
        whatsNext={<WhatsNext topic={name} deviceToken={token} onReady={async (t) => { const r = await create({ topic: t, level: 'new', voice: 'friend', deviceToken: token }); pin(String(r.handbookId)); setView('auto') }} onShared={async (id) => { const r = await startFromLibrary({ libraryId: id, deviceToken: token }); pin(String(r.handbookId)); setView('auto') }} />}
        onRetry={() => { setFlash(null); retry({ handbookId: hb._id, deviceToken: token }).catch((e) => setFlash(limitMessage(e) ?? "Couldn't start it again just now. Try in a minute.")) }}
        onChangeLine={() => { setDraftTopic(hb.topic); setView('start-again') }}
      />
    </Shell>
  )
}

// The wordmark takes you home (7 Oct, Prateek): App sets this on every render; there is one App.
let goHome: (() => void) | null = null
let goShelf: (() => void) | null = null

// A ?l= link's first second (D25): the one book, lifted off its plank the way a Shelf tap lifts it, while the handbook
// is copied to this phone. No landing page, no splash. The cover comes from the Shelf's list when it has answered.
const CLOTHS = ['indigo', 'green', 'marigold', 'coral', 'ink']
function LinkOpening({ book }: { book: { key: string; topic: string; cover: string | null } | null }) {
  let h = 0; for (const c of book?.key ?? 'x') h = (h * 17 + c.charCodeAt(0)) >>> 0
  return (
    <div className="shelf-page lifting link-opening" aria-busy="true">
      <p className="lp-visually-hidden" role="status">Opening your handbook…</p>
      <div className="shelf-row">
        <ul className="shelf-books">
          <li className="lifting">
            <span className={`book cloth-${CLOTHS[h % CLOTHS.length]}`} aria-hidden="true">
              <span className="book-spine" />
              {book?.cover && <span className="book-cover"><img src={book.cover} alt="" /></span>}
              <span className="book-plate"><span className="book-title">{book?.topic ?? 'Your handbook'}</span></span>
            </span>
          </li>
        </ul>
        <div className="shelf-plank" aria-hidden="true" />
      </div>
    </div>
  )
}

function Shell({ children, onSignOut, rail, back, hideShelf }: { children: React.ReactNode; onSignOut?: () => Promise<void> | void; rail?: React.ReactNode; back?: { label: string; onClick: () => void }; hideShelf?: boolean }) {
  // The member mark (7 Oct): paying should show, on every screen.
  const member = useQuery(api.membership.status, { deviceToken: deviceToken() })?.member
  // On a phone the side menu is hidden, so ☰ opens the same menu as a sheet (7 Oct, Prateek).
  const [menu, setMenu] = useState(false)
  return (
    <div className="shell">
      <header className="top">
        <button type="button" className="wordmark wordmark-btn" onClick={() => goHome?.()} aria-label="I Get It, home">I Get It{member && <span className="member-mark">Member</span>}<small>Twenty minutes at a time.</small></button>
        {/* The Shelf (8 Oct, Prateek): always one tap away, on every screen. */}
        {!hideShelf && <ShelfButton onOpen={() => goShelf?.()} />}
        <span style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {back && <button type="button" className="back-link" onClick={back.onClick}>← {back.label}</button>}
          {onSignOut && <button type="button" className="quiet hide-phone" onClick={() => onSignOut()}>Sign out</button>}
          {rail && <button type="button" className="menu-btn" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(true)}>☰</button>}
        </span>
      </header>
      {menu && rail && (
        <Sheet onClose={() => setMenu(false)} label="Menu">
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

// The cover shows chapter 1's first Runway picture; the model's freehand drawing only until it arrives.
function firstPicture(pictures?: Record<string, string>): string | undefined {
  const keys = Object.keys(pictures ?? {}).map(Number).sort((a, b) => a - b)
  return keys.length ? pictures![String(keys[0])] : undefined
}
