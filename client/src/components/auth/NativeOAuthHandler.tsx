import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClerk } from '@clerk/clerk-react'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { isNativePlatform, isOAuthCallback } from '../../utils/nativeAuth'

/**
 * Handles OAuth callbacks in native Capacitor app via deep links
 *
 * When user completes OAuth in system browser, the app receives
 * a deep link callback (eidola://oauth-callback?...) which this
 * component processes to establish the Clerk session.
 */
export default function NativeOAuthHandler() {
  const navigate = useNavigate()
  const clerk = useClerk()

  useEffect(() => {
    if (!isNativePlatform()) {
      return
    }

    // Listen for app URL open events (deep links)
    const setupListener = async () => {
      const listener = await App.addListener('appUrlOpen', async ({ url }) => {
        console.log('[NativeOAuthHandler] Received deep link:', url)

        if (!isOAuthCallback(url)) {
          console.log('[NativeOAuthHandler] Not an OAuth callback, ignoring')
          return
        }

        try {
          // Close the system browser window
          await Browser.close()
        } catch (e) {
          // Browser may already be closed
          console.log('[NativeOAuthHandler] Browser close error (may be expected):', e)
        }

        try {
          // Handle the OAuth callback to establish session
          // The URL contains the OAuth response parameters
          console.log('[NativeOAuthHandler] Processing OAuth callback...')
          await clerk.handleRedirectCallback({
            redirectUrl: url
          })
          console.log('[NativeOAuthHandler] OAuth callback processed successfully')

          // Navigate to feed after successful auth
          navigate('/feed', { replace: true })
        } catch (error) {
          console.error('[NativeOAuthHandler] Failed to handle OAuth callback:', error)
          // On error, navigate to home to show login options
          navigate('/', { replace: true })
        }
      })

      return listener
    }

    let cleanup: (() => void) | undefined

    setupListener().then((listener) => {
      cleanup = () => listener.remove()
    })

    return () => {
      cleanup?.()
    }
  }, [clerk, navigate])

  // This component doesn't render anything
  return null
}
