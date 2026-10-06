import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexReactClient } from 'convex/react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import './index.css'
import App from './App.tsx'
import Stats from './screens/Stats'
import Admin from './screens/Admin'
import Policy, { POLICY_PAGES, type PolicyPage } from './screens/Policy'
import Print from './screens/Print'
import { initTrack, startSession } from './lib/track'
import { registerServiceWorker, captureInstallPrompt } from './lib/push'
import { api } from '../convex/_generated/api'
import { deviceToken } from './lib/device'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)
initTrack(convex)
registerServiceWorker()
captureInstallPrompt()

// /stats is the public numbers page and /admin the owner's; every other page load counts as a visit (once a day per phone).
const path = window.location.pathname.replace(/\/+$/, '')
const onStats = path === '/stats'
const onAdmin = path === '/admin'
// /terms, /privacy, /refunds, /contact: plain pages, not counted as visits.
const policy = POLICY_PAGES.find((p) => path === `/${p}`) as PolicyPage | undefined
const onPrint = path === '/print'   // a member's handbook on one page (7 Oct)
if (!onStats && !onAdmin && !policy && !onPrint) {
  startSession(path || '/')
  const utm = new URLSearchParams(window.location.search).get('utm_source')
  const ref = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : undefined
  convex.mutation(api.stats.recordVisit, { visitor: deviceToken(), source: utm ?? ref }).catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      {onPrint ? <Print /> : policy ? <Policy page={policy} /> : onAdmin ? <Admin /> : onStats ? <Stats /> : <App />}
    </ConvexAuthProvider>
  </StrictMode>,
)
