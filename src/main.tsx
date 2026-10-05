import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexReactClient } from 'convex/react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import './index.css'
import App from './App.tsx'
import Stats from './screens/Stats'
import { api } from '../convex/_generated/api'
import { deviceToken } from './lib/device'
import { registerServiceWorker } from './lib/push'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

// Makes the app installable and lets nudges arrive with the app closed.
registerServiceWorker()

// /stats is the public numbers page; every other page load counts as a visit (once a day per phone).
const onStats = window.location.pathname.replace(/\/+$/, '') === '/stats'
if (!onStats) {
  const utm = new URLSearchParams(window.location.search).get('utm_source')
  const ref = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : undefined
  convex.mutation(api.stats.recordVisit, { visitor: deviceToken(), source: utm ?? ref }).catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      {onStats ? <Stats /> : <App />}
    </ConvexAuthProvider>
  </StrictMode>,
)
