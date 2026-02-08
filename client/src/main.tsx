import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { ClerkProvider } from '@clerk/clerk-react'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { ToastProvider } from './contexts/ToastContext'
import { DebugProvider } from './contexts/DebugContext'
import GlobalDebugTrigger from './components/debug/GlobalDebugTrigger'
import { isNativePlatform, initNativePlatform } from './utils/nativeAuth'
import App from './App'
import './index.css'

// Initialize native platform detection before anything else
// This persists the ?native=true URL parameter to sessionStorage
initNativePlatform()

// Initialize Sentry before anything else
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: 1.0,
  })
  console.log('[Eidola] Sentry initialized')
}

// Initialize Capacitor plugins on native platforms
if (isNativePlatform()) {
  // Configure status bar for iOS
  StatusBar.setStyle({ style: Style.Light }).catch(() => {})
  StatusBar.setBackgroundColor({ color: '#ff8c42' }).catch(() => {})

  // Hide splash screen after app loads (with a small delay for smooth transition)
  setTimeout(() => {
    SplashScreen.hide().catch(() => {})
  }, 500)
}

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Log startup info for debugging
console.log('[Eidola] App initializing...')
console.log('[Eidola] Native:', isNativePlatform())
console.log('[Eidola] API URL:', import.meta.env.VITE_API_URL || 'not set')
console.log('[Eidola] Clerk key present:', !!clerkPubKey)

if (!clerkPubKey) {
  console.warn('[Eidola] Missing VITE_CLERK_PUBLISHABLE_KEY - auth will be disabled')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DebugProvider>
      <GlobalDebugTrigger />
      <ToastProvider>
        {clerkPubKey ? (
          <ClerkProvider publishableKey={clerkPubKey}>
            <App />
          </ClerkProvider>
        ) : (
          <App />
        )}
      </ToastProvider>
    </DebugProvider>
  </React.StrictMode>,
)
