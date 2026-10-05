import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexReactClient } from 'convex/react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './lib/push'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

// Makes the app installable and lets nudges arrive with the app closed.
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  </StrictMode>,
)
