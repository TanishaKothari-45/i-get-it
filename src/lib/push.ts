// Reminders and install (6 Oct). The service worker makes the app installable and shows reminders.
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) })
}

export const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent)
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

function keyBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

// Ask the phone for permission and subscribe. Returns the subscription to store, or why it couldn't.
export async function subscribe(publicKey: string): Promise<{ ok: true; subscription: { endpoint: string; keys: { p256dh: string; auth: string } } } | { ok: false; why: 'unsupported' | 'ios-install' | 'denied' | 'failed' }> {
  if (isIOS() && !isStandalone()) return { ok: false, why: 'ios-install' }
  if (!pushSupported()) return { ok: false, why: 'unsupported' }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, why: 'denied' }
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) })
    const j = sub.toJSON() as any
    return { ok: true, subscription: { endpoint: j.endpoint, keys: { p256dh: j.keys.p256dh, auth: j.keys.auth } } }
  } catch { return { ok: false, why: 'failed' } }
}

// Android/Chrome offer an install prompt; we keep it for a button on the Done screen.
let deferred: any = null
export function captureInstallPrompt() { window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e }) }
export const canInstall = () => !!deferred
export async function install() { if (!deferred) return false; deferred.prompt(); const r = await deferred.userChoice; deferred = null; return r?.outcome === 'accepted' }
