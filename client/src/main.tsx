import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { ToastProvider } from './contexts/ToastContext'
import App from './App'
import './index.css'

// Initialize Capacitor plugins on native platforms
if (Capacitor.isNativePlatform()) {
  // Configure status bar for iOS
  StatusBar.setStyle({ style: Style.Light }).catch(() => {})
  StatusBar.setBackgroundColor({ color: '#ff8c42' }).catch(() => {})

  // Hide splash screen after app loads (with a small delay for smooth transition)
  setTimeout(() => {
    SplashScreen.hide().catch(() => {})
  }, 500)
}

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkPubKey) {
  console.warn('Missing VITE_CLERK_PUBLISHABLE_KEY - auth will be disabled')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      {clerkPubKey ? (
        <ClerkProvider publishableKey={clerkPubKey}>
          <App />
        </ClerkProvider>
      ) : (
        <App />
      )}
    </ToastProvider>
  </React.StrictMode>,
)
