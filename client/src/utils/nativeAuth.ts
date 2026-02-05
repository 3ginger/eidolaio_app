/**
 * Detects if running in a native Capacitor app
 * When using server.url to load from remote, Capacitor.isNativePlatform() returns false
 * because it thinks it's running in a web browser. We detect via path segment instead.
 * Using /native path instead of ?native=true because WKWebView may strip query params.
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false
  // Check path segment first (most reliable in iOS WKWebView)
  const pathname = window.location.pathname
  if (pathname === '/native' || pathname.startsWith('/native/')) return true
  // Fallback to sessionStorage (persists after redirect)
  if (sessionStorage?.getItem('isNative') === 'true') return true
  // Check for native WKWebView bridge (always available in Capacitor WKWebView)
  if (window.webkit?.messageHandlers?.startOAuth) return true
  return false
}

/**
 * Initialize native platform detection by persisting the path detection to sessionStorage
 * Call this early in app initialization before any navigation occurs
 */
export function initNativePlatform(): void {
  if (typeof window === 'undefined') return
  // Check for /native path and persist to sessionStorage
  const pathname = window.location.pathname
  if (pathname === '/native' || pathname.startsWith('/native/')) {
    sessionStorage?.setItem('isNative', 'true')
  }
}

/**
 * Check if a URL is an OAuth callback from Clerk
 * Handles both custom scheme (eidola://) and Universal Link (https://eidola.io) URLs
 */
export function isOAuthCallback(url: string): boolean {
  // Check for Clerk-specific parameters
  if (url.includes('__clerk')) return true

  // Check for sign-in ticket
  if (url.includes('ticket=')) return true

  // Check for our callback paths
  const callbackPaths = ['oauth-callback', 'oauth-complete', 'sso-callback']
  return callbackPaths.some(path => url.includes(path))
}
