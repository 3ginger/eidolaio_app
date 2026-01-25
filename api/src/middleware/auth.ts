import { Request, Response, NextFunction } from 'express'
import { clerkClient, getAuth } from '@clerk/express'
import { getOne, query } from '../services/db.js'

// Admin emails from environment variable (comma-separated)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      userId?: number
      clerkUserId?: string
      isAdmin?: boolean
    }
  }
}

interface DbUser {
  id: number
  clerk_user_id: string
  username: string
  is_admin: boolean
}

// Middleware to extract and verify user from Clerk
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Get Clerk auth (if configured)
    const auth = getAuth(req)

    if (!auth?.userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    req.clerkUserId = auth.userId

    // Get or create user in database
    let user = await getOne<DbUser>(
      'SELECT id, clerk_user_id, username FROM eidola.users WHERE clerk_user_id = $1',
      [auth.userId]
    )

    if (!user) {
      // Create user with default username
      const username = `user_${Date.now()}`
      const result = await query<DbUser>(
        `INSERT INTO eidola.users (clerk_user_id, username)
         VALUES ($1, $2)
         RETURNING id, clerk_user_id, username`,
        [auth.userId, username]
      )
      user = result.rows[0]
    }

    req.userId = user.id
    next()
  } catch (error) {
    console.error('Auth error:', error)
    res.status(500).json({ error: 'Authentication error' })
  }
}

// Admin middleware - requires user to be admin
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // First verify the user is authenticated
    const auth = getAuth(req)

    if (!auth?.userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    req.clerkUserId = auth.userId

    // Get user and check admin status
    let user = await getOne<DbUser>(
      'SELECT id, clerk_user_id, username, COALESCE(is_admin, false) as is_admin FROM eidola.users WHERE clerk_user_id = $1',
      [auth.userId]
    )

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    // Check if user should be admin based on email (auto-promote from env var)
    if (!user.is_admin && ADMIN_EMAILS.length > 0) {
      try {
        const clerkUser = await clerkClient.users.getUser(auth.userId)
        const userEmail = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress?.toLowerCase()

        if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
          // Auto-promote to admin
          await query('UPDATE eidola.users SET is_admin = true WHERE id = $1', [user.id])
          user.is_admin = true
        }
      } catch (err) {
        console.error('Failed to check Clerk email for admin:', err)
      }
    }

    if (!user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    req.userId = user.id
    req.isAdmin = true
    next()
  } catch (error) {
    console.error('Admin auth error:', error)
    res.status(500).json({ error: 'Authentication error' })
  }
}

// Optional auth - doesn't require login but attaches user if present
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req)

    if (auth?.userId) {
      req.clerkUserId = auth.userId

      const user = await getOne<DbUser>(
        'SELECT id FROM eidola.users WHERE clerk_user_id = $1',
        [auth.userId]
      )

      if (user) {
        req.userId = user.id
      }
    }

    next()
  } catch {
    // Continue without auth
    next()
  }
}
