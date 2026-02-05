import { Router, Request, Response } from 'express'
import { clerkClient, getAuth } from '@clerk/express'

const router = Router()

/**
 * GET /api/auth/native-callback
 *
 * Receives redirect from Clerk Account Portal after sign-in.
 * Creates a sign-in token and redirects to the native app.
 *
 * Flow:
 * 1. App opens accounts.eidola.io/sign-in in ASWebAuthenticationSession
 * 2. User signs in (Google, Apple, email)
 * 3. Clerk redirects here with session info
 * 4. We identify the user and create a sign-in token
 * 5. Redirect to eidola://oauth-callback?ticket=TOKEN
 */
router.get('/native-callback', async (req: Request, res: Response) => {
  try {
    console.log('[NativeAuth] Callback received, query:', JSON.stringify(req.query))

    // Try to get the authenticated user from Clerk middleware
    const auth = getAuth(req)
    let userId = auth?.userId

    // If Clerk middleware didn't authenticate, check for session ID in query params
    if (!userId) {
      const sessionId = req.query.__clerk_created_session as string
      if (sessionId) {
        console.log('[NativeAuth] Got session ID from query:', sessionId)
        // Try to get the user from the session
        try {
          const session = await clerkClient.sessions.getSession(sessionId)
          userId = session.userId
          console.log('[NativeAuth] Got userId from session:', userId)
        } catch (e) {
          console.error('[NativeAuth] Failed to get session:', e)
        }
      }
    }

    // If still no user, check for __clerk_ticket (handshake token)
    if (!userId) {
      const ticket = req.query.__clerk_ticket as string
      if (ticket) {
        console.log('[NativeAuth] Got clerk ticket, forwarding to app')
        res.redirect(`https://eidola.io/sso-callback?ticket=${encodeURIComponent(ticket)}`)
        return
      }
    }

    if (!userId) {
      console.error('[NativeAuth] Could not identify user from callback')
      res.redirect('https://eidola.io/sso-callback?error=auth_failed')
      return
    }

    console.log('[NativeAuth] Creating sign-in token for user:', userId)

    // Create a sign-in token for this user
    const signInToken = await clerkClient.signInTokens.createSignInToken({
      userId,
      expiresInSeconds: 300,
    })

    console.log('[NativeAuth] Sign-in token created, redirecting to app')

    // Redirect to https://eidola.io/sso-callback so ASWebAuthenticationSession
    // (configured with .https(host: "eidola.io", path: "/sso-callback")) captures it
    res.redirect(`https://eidola.io/sso-callback?ticket=${encodeURIComponent(signInToken.token)}`)
  } catch (error) {
    console.error('[NativeAuth] Error:', error)
    res.redirect('https://eidola.io/sso-callback?error=server_error')
  }
})

export default router
