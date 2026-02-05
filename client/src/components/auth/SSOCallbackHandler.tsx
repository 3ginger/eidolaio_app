import { useEffect, useState } from 'react'
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react'

/**
 * SSO Callback Handler
 *
 * This component handles the OAuth callback redirect. When accessed:
 * - From web: Uses Clerk's standard AuthenticateWithRedirectCallback
 * - From native app: Redirects to custom URL scheme to return to the app
 *
 * The native app's ASWebAuthenticationSession is configured to capture
 * eidola:// URLs, so redirecting to the custom scheme will automatically
 * close the auth sheet and return control to the app.
 */
export default function SSOCallbackHandler() {
  const [isNativeRedirect, setIsNativeRedirect] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if this callback is from a native OAuth flow
    // We detect this by checking for a special 'native' parameter or
    // if the redirect URL is a custom scheme
    const params = new URLSearchParams(window.location.search)
    const hasNativeParam = params.get('native') === 'true'

    // Also check if there's a __clerk_status or similar parameter
    // indicating this is an OAuth completion
    const hasClerkParams = params.has('__clerk_status') ||
                           params.has('__clerk_created_session') ||
                           window.location.search.includes('__clerk')

    // Check sessionStorage for native OAuth flow indicator
    const isNativeOAuthFlow = sessionStorage.getItem('native_oauth_flow') === 'true'

    console.log('[SSOCallbackHandler] Checking callback context:', {
      hasNativeParam,
      hasClerkParams,
      isNativeOAuthFlow,
      search: window.location.search
    })

    if (isNativeOAuthFlow || hasNativeParam) {
      // This is a native OAuth callback - redirect to custom scheme
      console.log('[SSOCallbackHandler] Native OAuth detected, redirecting to eidola:// scheme')

      // Clear the flag
      sessionStorage.removeItem('native_oauth_flow')

      // Build the custom scheme URL with all query parameters
      const customSchemeUrl = `eidola://sso-callback${window.location.search}`
      console.log('[SSOCallbackHandler] Redirecting to:', customSchemeUrl)

      // Set state before redirect
      setIsNativeRedirect(true)

      // Redirect to custom URL scheme
      // This will be captured by ASWebAuthenticationSession
      window.location.href = customSchemeUrl
    } else {
      // This is a web OAuth callback
      setIsNativeRedirect(false)
    }
  }, [])

  // Show loading while determining context
  if (isNativeRedirect === null) {
    return (
      <div className="min-h-screen bg-eidola-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eidola-orange mx-auto"></div>
          <p className="mt-4 text-gray-600">Completing sign in...</p>
        </div>
      </div>
    )
  }

  // Native redirect - show message while redirecting
  if (isNativeRedirect) {
    return (
      <div className="min-h-screen bg-eidola-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eidola-orange mx-auto"></div>
          <p className="mt-4 text-gray-600">Returning to app...</p>
        </div>
      </div>
    )
  }

  // Web callback - use Clerk's standard handler
  return <AuthenticateWithRedirectCallback />
}
