import { Capacitor } from '@capacitor/core'

/**
 * Detects if running in a native Capacitor app
 * Uses both URL parameter (set by Capacitor config) and Capacitor.isNativePlatform()
 */
export function isNativePlatform(): boolean {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('native') === 'true' || Capacitor.isNativePlatform()
}

/**
 * Check if a URL is an OAuth callback from Clerk
 */
export function isOAuthCallback(url: string): boolean {
  return url.includes('__clerk') ||
         url.includes('oauth-callback') ||
         url.includes('oauth-complete') ||
         url.includes('sso-callback')
}
