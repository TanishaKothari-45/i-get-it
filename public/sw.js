// The service worker: makes I Get It installable, and shows a nudge when Convex sends one,
// even with the app closed. Tapping the nudge opens the page it points at.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data ? event.data.text() : '' } }
  const title = data.title || 'I Get It'
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'igetit-nudge',       // a newer nudge replaces an older one, never a pile
    renotify: true,                        // ...and still pops up; without this a replacement arrives silently
    data: { url: data.url || '/' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const same = open.find((c) => new URL(c.url).origin === self.location.origin)
    if (same) { await same.focus(); return same.navigate(url) }
    return self.clients.openWindow(url)
  })())
})
