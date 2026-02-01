import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSignIn, useSignUp, useClerk } from '@clerk/clerk-react'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { isNativePlatform, isOAuthCallback } from '../../utils/nativeAuth'

/**
 * Handles OAuth callbacks in native Capacitor app via deep links
 *
 * Flow:
 * 1. User taps OAuth button -> signIn.create() stores OAuth state
 * 2. Browser.open() opens OAuth URL in ASWebAuthenticationSession
 * 3. User authenticates with provider
 * 4. Provider redirects to eidola://oauth-callback
 * 5. This component receives the deep link
 * 6. We reload signIn to get the session created by Clerk
 * 7. Set the session as active
 */
export default function NativeOAuthHandler() {
  const navigate = useNavigate()
  const { signIn, setActive: setSignInActive } = useSignIn()
  const { signUp, setActive: setSignUpActive } = useSignUp()
  const clerk = useClerk()

  const handleOAuthCallback = useCallback(async (url: string) => {
    console.log('[NativeOAuthHandler] Received deep link:', url)

    if (!isOAuthCallback(url)) {
      console.log('[NativeOAuthHandler] Not an OAuth callback, ignoring')
      return
    }

    // Close the browser window
    try {
      await Browser.close()
    } catch (e) {
      console.log('[NativeOAuthHandler] Browser close error (expected):', e)
    }

    console.log('[NativeOAuthHandler] Processing OAuth callback...')

    try {
      // Try to reload signIn first (most common case)
      if (signIn) {
        console.log('[NativeOAuthHandler] Reloading signIn...')
        await signIn.reload()

        console.log('[NativeOAuthHandler] SignIn status:', signIn.status)
        console.log('[NativeOAuthHandler] SignIn createdSessionId:', signIn.createdSessionId)

        if (signIn.status === 'complete' && signIn.createdSessionId) {
          console.log('[NativeOAuthHandler] Setting active session from signIn')
          await setSignInActive({ session: signIn.createdSessionId })
          navigate('/feed', { replace: true })
          return
        }
      }

      // Try signUp if signIn didn't work (new user)
      if (signUp) {
        console.log('[NativeOAuthHandler] Trying signUp reload...')
        await signUp.reload()

        console.log('[NativeOAuthHandler] SignUp status:', signUp.status)

        if (signUp.status === 'complete' && signUp.createdSessionId) {
          console.log('[NativeOAuthHandler] Setting active session from signUp')
          await setSignUpActive({ session: signUp.createdSessionId })
          navigate('/feed', { replace: true })
          return
        }
      }

      // Fallback: try clerk.handleRedirectCallback for web-style callbacks
      console.log('[NativeOAuthHandler] Trying handleRedirectCallback fallback...')
      await clerk.handleRedirectCallback({
        redirectUrl: url
      })

      // Check if we now have an active session
      if (clerk.session) {
        console.log('[NativeOAuthHandler] Session established via handleRedirectCallback')
        navigate('/feed', { replace: true })
        return
      }

      console.error('[NativeOAuthHandler] No session created after OAuth callback')
      navigate('/', { replace: true })

    } catch (error) {
      console.error('[NativeOAuthHandler] Failed to handle OAuth callback:', error)
      navigate('/', { replace: true })
    }
  }, [signIn, signUp, setSignInActive, setSignUpActive, clerk, navigate])

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
