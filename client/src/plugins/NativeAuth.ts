import { registerPlugin } from '@capacitor/core'

export interface NativeAuthPlugin {
  /**
   * Opens ASWebAuthenticationSession for OAuth authentication
   * This shows a system browser modal (not Safari/Chrome) that:
   * - Shares cookies with Safari for SSO
   * - Automatically returns to the app after auth
   * - Shows a system consent dialog
   *
   * @param options.url - The OAuth authorization URL
   * @param options.callbackURLScheme - The URL scheme to listen for (e.g., "eidola")
   * @returns Promise with the callback URL containing OAuth tokens/codes
   */
  authenticate(options: {
    url: string
    callbackURLScheme: string
  }): Promise<{ url: string }>
}

// Register the native plugin
// This connects to the Swift NativeAuthPlugin class
const NativeAuth = registerPlugin<NativeAuthPlugin>('NativeAuth')

export default NativeAuth
