import { Request, Response, NextFunction } from 'express'
import { getAuth } from '@clerk/express'
import { getOne, query } from '../services/db.js'

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      userId?: number
      clerkUserId?: string
    }
  }
}

interface DbUser {
  id: number
  clerk_user_id: string
  username: string
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
