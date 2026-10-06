import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexReactClient } from 'convex/react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import './index.css'
import App from './App.tsx'
import Stats from './screens/Stats'
import Admin from './screens/Admin'
import { initTrack } from './lib/track'
import { api } from '../convex/_generated/api'
import { deviceToken } from './lib/device'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)
initTrack(convex)

// /stats is the public numbers page and /admin the owner's; every other page load counts as a visit (once a day per phone).
const path = window.location.pathname.replace(/\/+$/, '')
const onStats = path === '/stats'
const onAdmin = path === '/admin'
if (!onStats && !onAdmin) {
  const utm = new URLSearchParams(window.location.search).get('utm_source')
  const ref = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : undefined
  convex.mutation(api.stats.recordVisit, { visitor: deviceToken(), source: utm ?? ref }).catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      {onAdmin ? <Admin /> : onStats ? <Stats /> : <App />}
    </ConvexAuthProvider>
  </StrictMode>,
)
