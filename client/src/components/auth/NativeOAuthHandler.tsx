import { useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSignIn, useClerk } from '@clerk/clerk-react'
import { App } from '@capacitor/app'
import { isNativePlatform, isOAuthCallback } from '../../utils/nativeAuth'

/**
 * Handles OAuth callbacks in native Capacitor app via deep links.
 *
 * Flow:
 * 1. User taps OAuth button -> ASWebAuth opens Account Portal
 * 2. User completes Google/Apple OAuth in ASWebAuth
 * 3. Clerk redirects to backend -> backend creates sign-in token
 * 4. Backend redirects to https://eidola.io/sso-callback?ticket=TOKEN
 * 5. ASWebAuth captures the redirect, Swift sends nativeOAuthCallback event
 * 6. NativeOAuthButtons handles the event (primary path)
 *
 * This component handles the deep link fallback path (eidola:// scheme):
 * - Cold start with deep link
 * - Deep link while app is in foreground
 */
export default function NativeOAuthHandler() {
  const navigate = useNavigate()
  const { signIn, setActive: setSignInActive } = useSignIn()
  const clerk = useClerk()
  const processedUrlsRef = useRef<Set<string>>(new Set())
  const processingRef = useRef(false)

  const handleOAuthCallback = useCallback(async (url: string) => {
    console.log('[NativeOAuthHandler] Received deep link:', url)

    if (!isOAuthCallback(url)) {
      console.log('[NativeOAuthHandler] Not an OAuth callback, ignoring')
      return
    }

    // Deduplicate: don't process the same URL twice
    if (processedUrlsRef.current.has(url) || processingRef.current) {
      console.log('[NativeOAuthHandler] Already processed/processing this URL, skipping')
      return
    }
    processingRef.current = true
    processedUrlsRef.current.add(url)

    console.log('[NativeOAuthHandler] Processing OAuth callback...')

    try {
      const parsedUrl = new URL(url)
      const ticket = parsedUrl.searchParams.get('ticket') || parsedUrl.searchParams.get('__clerk_ticket')

      // Sign-in token approach: backend created a ticket after verifying OAuth
      if (ticket && signIn) {
        console.log('[NativeOAuthHandler] Using sign-in ticket')
        const result = await signIn.create({ strategy: 'ticket', ticket })

        console.log('[NativeOAuthHandler] Ticket result status:', result.status)

        if (result.status === 'complete' && result.createdSessionId) {
          console.log('[NativeOAuthHandler] Setting active session:', result.createdSessionId)
          await setSignInActive({ session: result.createdSessionId })
          navigate('/feed', { replace: true })
          return
        }
      }

      // Fallback: check for session ID in URL params
      const sessionId = parsedUrl.searchParams.get('__clerk_created_session')
      if (sessionId) {
        console.log('[NativeOAuthHandler] Using session ID from URL:', sessionId)
        await clerk.setActive({ session: sessionId })
        navigate('/feed', { replace: true })
        return
      }

      console.error('[NativeOAuthHandler] No ticket or session in callback URL')
      navigate('/', { replace: true })

    } catch (error: unknown) {
      // If already signed in, just navigate to feed
      const clerkError = error as { errors?: Array<{ code?: string }> }
      if (clerkError?.errors?.[0]?.code === 'session_exists') {
        console.log('[NativeOAuthHandler] Already signed in, navigating to feed')
        navigate('/feed', { replace: true })
        return
      }
      console.error('[NativeOAuthHandler] Failed to handle OAuth callback:', error)
      navigate('/', { replace: true })
    } finally {
      processingRef.current = false
    }
  }, [signIn, setSignInActive, clerk, navigate])

  useEffect(() => {
    if (!isNativePlatform()) {
      return
    }

    console.log('[NativeOAuthHandler] Setting up deep link listener')

    let listener: { remove: () => void } | null = null

    const setupListener = async () => {
      listener = await App.addListener('appUrlOpen', ({ url }) => {
        handleOAuthCallback(url)
      })
    }

    setupListener()

    // Also check if app was launched with a URL (cold start)
    App.getLaunchUrl().then((launchUrl) => {
      if (launchUrl?.url && isOAuthCallback(launchUrl.url)) {
        console.log('[NativeOAuthHandler] App launched with OAuth callback URL')
        handleOAuthCallback(launchUrl.url)
      }
    })

    return () => {
      listener?.remove()
    }
  }, [handleOAuthCallback])

  return null
}
