import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSignIn } from '@clerk/clerk-react'
import { isNativePlatform } from '../../utils/nativeAuth'

// TypeScript declarations for WKWebView message handlers
declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        startOAuth?: {
          postMessage: (body: { url: string; callbackHost: string; callbackPath: string }) => void
        }
      }
    }
  }
}

interface NativeOAuthCallbackDetail {
  success: boolean
  url: string | null
  error: string | null
}

/**
 * OAuth buttons for the native iOS app
 *
 * Opens Clerk's Account Portal sign-in page in ASWebAuthenticationSession.
 * The entire OAuth flow happens in ONE browser context with consistent cookies:
 *
 * 1. Open accounts.eidola.io/sign-in in ASWebAuthenticationSession
 * 2. Clerk creates its own __client in that browser context
 * 3. User taps Google/Apple → OAuth happens in same browser
 * 4. After auth, Clerk redirects to eidola://sso-callback#__clerk_ticket=...
 * 5. ASWebAuthenticationSession captures the eidola:// redirect
 * 6. We use handleRedirectCallback() or signIn with ticket to activate session
 *
 * This avoids the cookie mismatch between WKWebView and ASWebAuthenticationSession
 * that breaks the rotating_token_nonce flow.
 */

export default function NativeOAuthButtons() {
  const { signIn, setActive } = useSignIn()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const waitForNativeCallback = (): Promise<NativeOAuthCallbackDetail> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('nativeOAuthCallback', handler)
        reject(new Error('OAuth timeout - no response from native layer after 120s'))
      }, 120000)

      const handler = (event: Event) => {
        clearTimeout(timeout)
        window.removeEventListener('nativeOAuthCallback', handler)
        const detail = (event as CustomEvent<NativeOAuthCallbackDetail>).detail
        resolve(detail)
      }

      window.addEventListener('nativeOAuthCallback', handler)
    })
  }

  const handleOAuth = async () => {
    if (!isNativePlatform()) {
      console.error('[NativeOAuth] Not running on native platform')
      setError('Native authentication not available')
      return
    }

    if (!window.webkit?.messageHandlers?.startOAuth) {
      console.error('[NativeOAuth] WKScriptMessageHandler not available')
      setError('Native bridge not available. Please update the app.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('[NativeOAuth] Starting Account Portal OAuth flow')

      // Open Clerk Account Portal in ASWebAuthenticationSession.
      // After sign-in, Clerk redirects to our backend which creates a sign-in token
      // and redirects to eidola://oauth-callback?ticket=TOKEN.
      // The token is redeemed in the WKWebView to create a session.
      const backendCallback = 'https://api.eidola.io/api/auth/native-callback'
      const signInUrl = `https://accounts.eidola.io/sign-in?redirect_url=${encodeURIComponent(backendCallback)}`

      console.log('[NativeOAuth] Sign-in URL:', signInUrl)

      // Set up listener BEFORE sending message to native
      const callbackPromise = waitForNativeCallback()

      // Open in ASWebAuthenticationSession via native bridge
      // Uses HTTPS callback matcher: ASWebAuthenticationSession.Callback.https(host:path:)
      window.webkit.messageHandlers.startOAuth.postMessage({
        url: signInUrl,
        callbackHost: 'eidola.io',
        callbackPath: '/sso-callback',
      })

      console.log('[NativeOAuth] Message sent to native, waiting for callback...')

      // Wait for native callback
      const callback = await callbackPromise

      if (!callback.success) {
        if (callback.error === 'USER_CANCELLED') {
          console.log('[NativeOAuth] User cancelled authentication')
          setIsLoading(false)
          return
        }
        throw new Error(callback.error || 'Authentication failed')
      }

      if (!callback.url) {
        throw new Error('No callback URL received from native layer')
      }

      console.log('[NativeOAuth] Callback URL:', callback.url.substring(0, 200))

      // Parse callback URL
      const url = new URL(callback.url)

      // Check for error from backend
      const errorParam = url.searchParams.get('error')
      if (errorParam) {
        throw new Error(`Authentication failed: ${errorParam}`)
      }

      // Get sign-in ticket from backend callback
      const ticket = url.searchParams.get('ticket') || url.searchParams.get('__clerk_ticket')

      if (ticket && signIn) {
        console.log('[NativeOAuth] Using sign-in ticket to create session in WKWebView')
        const result = await signIn.create({ strategy: 'ticket', ticket })
        console.log('[NativeOAuth] Sign-in result:', result.status)

        if (result.status === 'complete' && result.createdSessionId) {
          await setActive({ session: result.createdSessionId })
          navigate('/feed', { replace: true })
          return
        }
        throw new Error('Sign-in with ticket did not complete')
      }

      throw new Error('No ticket in callback URL: ' + callback.url.substring(0, 200))
    } catch (err) {
      console.error('[NativeOAuth] OAuth error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed'
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      <button
        onClick={handleOAuth}
        disabled={isLoading}
        className="flex items-center justify-center gap-3 px-6 py-4 bg-black rounded-full text-white text-lg font-semibold shadow-md hover:shadow-lg transition-shadow disabled:opacity-50"
      >
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
        ) : (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        )}
        Sign In
      </button>

      <p className="text-xs text-gray-500 text-center mt-2">
        Sign in securely with your existing account
      </p>
    </div>
  )
}
