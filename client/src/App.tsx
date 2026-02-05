import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { SignedIn, RedirectToSignIn, useAuth } from '@clerk/clerk-react'
import * as Sentry from '@sentry/react'
import { isNativePlatform } from './utils/nativeAuth'
import LandingPage from './pages/LandingPage'
import NativeLoginPage from './pages/NativeLoginPage'
import NativeOAuthHandler from './components/auth/NativeOAuthHandler'
import SSOCallbackHandler from './components/auth/SSOCallbackHandler'
import FeedPage from './pages/FeedPage'
import ExplorePage from './pages/ExplorePage'
import ChallengesPage from './pages/ChallengesPage'
import PostDetailPage from './pages/PostDetailPage'
import CreatePostPage from './pages/CreatePostPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'
import ChainFeedPage from './pages/ChainFeedPage'
import Header from './components/layout/Header'
import MobileNav from './components/layout/MobileNav'

// Check if Clerk is configured
const hasClerk = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function ErrorFallback() {
  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h1>
        <p className="text-gray-600 mb-4">The error has been reported.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Reload App
        </button>
      </div>
    </div>
  )
}

function NativeLandingRedirect() {
  // If running in native app, redirect to feed immediately
  // ProtectedRoute will handle showing login if not authenticated
  if (isNativePlatform()) {
    return <Navigate to="/feed" replace />
  }

  // Show landing page on web
  return <LandingPage />
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()

  // Log auth state changes for debugging
  console.log('[Eidola] ProtectedRoute - hasClerk:', hasClerk, 'isLoaded:', isLoaded, 'isSignedIn:', isSignedIn)

  // Clerk loading timeout - log critical error after 10 seconds
  useEffect(() => {
    if (!isLoaded) {
      const timer = setTimeout(() => {
        console.error('[Eidola] CRITICAL: Clerk loading timeout - 10s elapsed, isLoaded still false')
        Sentry.captureMessage('Clerk loading timeout - 10s elapsed', 'error')
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [isLoaded])

  if (!hasClerk) {
    console.log('[Eidola] No Clerk key, bypassing auth')
    return <>{children}</>
  }

  // Show loading spinner while Clerk initializes
  if (!isLoaded) {
    console.log('[Eidola] Clerk still loading, showing spinner...')
    return (
      <div className="min-h-screen bg-eidola-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eidola-orange"></div>
      </div>
    )
  }

  if (!isSignedIn) {
    console.log('[Eidola] User not signed in, redirecting...')
    // Native: show in-app login page instead of Clerk's redirect
    if (isNativePlatform()) {
      console.log('[Eidola] Native platform - redirecting to /native-login')
      return <Navigate to="/native-login" replace />
    }
    // Web: use Clerk's redirect
    console.log('[Eidola] Web platform - using Clerk redirect')
    return <RedirectToSignIn />
  }

  console.log('[Eidola] User authenticated, rendering protected content')

  return <SignedIn>{children}</SignedIn>
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isCreateFlow = location.pathname === '/create'

  return (
    <div className="h-screen bg-eidola-bg flex flex-col overflow-hidden">
      <Header />
      <main className={`flex-1 min-h-0 overflow-y-auto pt-[calc(3rem+env(safe-area-inset-top))] ${!isCreateFlow ? 'pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0' : ''}`}>
        {children}
      </main>
      {!isCreateFlow && <MobileNav />}
    </div>
  )
}

export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <BrowserRouter>
        {/* Handle OAuth deep link callbacks in native app */}
        <NativeOAuthHandler />

        <Routes>
          {/* Public landing page (redirects to /feed or /login on native) */}
          <Route path="/" element={<NativeLandingRedirect />} />

          {/* Native app entry point - redirects to /feed after setting native flag */}
          {/* iOS app loads https://eidola.io/native, initNativePlatform() persists to sessionStorage */}
          <Route path="/native" element={<Navigate to="/feed" replace />} />
          <Route path="/native/*" element={<Navigate to="/feed" replace />} />

          {/* SSO callback route - handles both web and native OAuth */}
          <Route path="/sso-callback" element={<SSOCallbackHandler />} />

          {/* Native login page for iOS app */}
          <Route path="/native-login" element={<NativeLoginPage />} />

          {/* Protected app routes */}
          <Route path="/feed" element={
            <ProtectedRoute>
              <AppLayout>
                <FeedPage />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/explore" element={
            <ProtectedRoute>
              <AppLayout>
                <ExplorePage />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/challenges" element={
            <ProtectedRoute>
              <AppLayout>
                <ChallengesPage />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/create" element={
            <ProtectedRoute>
              <CreatePostPage />
            </ProtectedRoute>
          } />
          <Route path="/post/:id" element={
            <ProtectedRoute>
              <AppLayout>
                <PostDetailPage />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/chain/:postId" element={
            <ProtectedRoute>
              <AppLayout>
                <ChainFeedPage />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/profile/:username?" element={
            <ProtectedRoute>
              <AppLayout>
                <ProfilePage />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AppLayout>
                <AdminPage />
              </AppLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  )
}
