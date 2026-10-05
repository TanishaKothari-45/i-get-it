// Nudges on this device: can this browser get them, asking (only after the person taps Allow on
// our card), subscribing, remembering "Not now", and Android's one-tap "add to home screen".

export type PushSupport = 'supported' | 'ios-needs-install' | 'unsupported'

const NOT_NOW_KEY = 'igetit.nudge.notNowAt'
const NOT_NOW_FOR_MS = 7 * 24 * 60 * 60 * 1000   // after "Not now", stay quiet for a week

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

export function isInstalled(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

// iPhones only allow nudges from an app added to the Home Screen; everywhere else a tab is enough.
export function pushSupport(): PushSupport {
  if (isIOS() && !isInstalled()) return 'ios-needs-install'
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window ? 'supported' : 'unsupported'
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
}

export async function existingSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return reg ? reg.pushManager.getSubscription() : null
}

// The browser's own permission prompt, then a push address for this device. null if they said no.
export async function askAndSubscribe(publicKey: string): Promise<PushSubscriptionJSON | null> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription())
    ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) as BufferSource })
  return sub.toJSON()
}

export function timezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function saidNotNowRecently(): boolean {
  try { const at = Number(localStorage.getItem(NOT_NOW_KEY)); return !!at && Date.now() - at < NOT_NOW_FOR_MS } catch { return false }
}

export function rememberNotNow() {
  try { localStorage.setItem(NOT_NOW_KEY, String(Date.now())) } catch { /* private windows can refuse storage */ }
}

// Android: the browser offers an install prompt; we hold it until the person taps our button.
let deferredInstall: InstallPromptEvent | null = null
const installListeners = new Set<() => void>()
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e as InstallPromptEvent; installListeners.forEach((f) => f()) })
window.addEventListener('appinstalled', () => { deferredInstall = null; installListeners.forEach((f) => f()) })

export function canInstall(): boolean { return deferredInstall !== null }

export function onInstallChange(listener: () => void): () => void {
  installListeners.add(listener)
  return () => { installListeners.delete(listener) }
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredInstall) return false
  const event = deferredInstall
  deferredInstall = null
  await event.prompt()
  const { outcome } = await event.userChoice
  installListeners.forEach((f) => f())
  return outcome === 'accepted'
}

function base64UrlToBytes(base64Url: string): Uint8Array {
  const padded = base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}
