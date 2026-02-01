import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from '@clerk/clerk-react'
import { Capacitor } from '@capacitor/core'
import LandingPage from './pages/LandingPage'
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

function NativeLandingRedirect() {
  const isNative = Capacitor.isNativePlatform()

  // If running in native app, redirect to feed immediately
  // ProtectedRoute will handle showing login if not authenticated
  if (isNative) {
    return <Navigate to="/feed" replace />
  }

  // Show landing page on web
  return <LandingPage />
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useAuth()

  if (!hasClerk) {
    return <>{children}</>
  }

  // Show loading spinner while Clerk initializes
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-eidola-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eidola-orange"></div>
      </div>
    )
  }

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  )
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isCreateFlow = location.pathname === '/create'

  return (
    <div className="min-h-screen bg-eidola-bg flex flex-col">
      <Header />
      <main className={`flex-1 ${!isCreateFlow ? 'pb-20 md:pb-0' : ''}`}>
        {children}
      </main>
      {!isCreateFlow && <MobileNav />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page (redirects to /feed or /login on native) */}
        <Route path="/" element={<NativeLandingRedirect />} />

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
            <div className="h-screen bg-eidola-bg flex flex-col overflow-hidden">
              <Header />
              <CreatePostPage />
            </div>
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
  )
}
