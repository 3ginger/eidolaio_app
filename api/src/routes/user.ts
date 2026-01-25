import { Router, Request, Response } from 'express'
import { clerkClient } from '@clerk/express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { query, getOne, getMany } from '../services/db.js'

// Admin emails from environment variable (comma-separated)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

const router = Router()

interface UserRow {
  id: number
  clerk_user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  points: number
  is_admin: boolean
  created_at: string
  updated_at: string
}

// Get current user profile
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    let user = await getOne<UserRow>(
      'SELECT *, COALESCE(is_admin, false) as is_admin FROM eidola.users WHERE id = $1',
      [req.userId]
    )

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if user should be admin based on email (auto-promote from env var)
    if (!user.is_admin && ADMIN_EMAILS.length > 0 && req.clerkUserId) {
      try {
        const clerkUser = await clerkClient.users.getUser(req.clerkUserId)
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

    // Get counts
    const stats = await getOne<{
      posts_count: string
      followers_count: string
      following_count: string
    }>(
      `SELECT
        (SELECT COUNT(*) FROM eidola.posts WHERE user_id = $1) as posts_count,
        (SELECT COUNT(*) FROM eidola.follows WHERE following_id = $1) as followers_count,
        (SELECT COUNT(*) FROM eidola.follows WHERE follower_id = $1) as following_count`,
      [req.userId]
    )

    // Get interests
    const interests = await getMany<{ name: string }>(
      `SELECT t.name FROM eidola.tags t
       JOIN eidola.user_interests ui ON t.id = ui.tag_id
       WHERE ui.user_id = $1`,
      [req.userId]
    )

    res.json({
      id: user.id,
      clerkUserId: user.clerk_user_id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      points: user.points,
      isAdmin: user.is_admin,
      createdAt: user.created_at,
      postsCount: parseInt(stats?.posts_count || '0'),
      followersCount: parseInt(stats?.followers_count || '0'),
      followingCount: parseInt(stats?.following_count || '0'),
      interests: interests.map(i => i.name)
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// Update user profile
router.patch('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const { username, displayName, avatarUrl, bio } = req.body

    // Check username uniqueness if changing
    if (username) {
      const existing = await getOne<{ id: number }>(
        'SELECT id FROM eidola.users WHERE username = $1 AND id != $2',
        [username, req.userId]
      )
      if (existing) {
        return res.status(400).json({ error: 'Username already taken' })
      }
    }

    await query(
      `UPDATE eidola.users SET
        username = COALESCE($1, username),
        display_name = COALESCE($2, display_name),
        avatar_url = COALESCE($3, avatar_url),
        bio = COALESCE($4, bio),
        updated_at = NOW()
       WHERE id = $5`,
      [username, displayName, avatarUrl, bio, req.userId]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

// Get user by username
router.get('/:username', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { username } = req.params

    const user = await getOne<UserRow>(
      'SELECT * FROM eidola.users WHERE username = $1',
      [username]
    )

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get counts
    const stats = await getOne<{
      posts_count: string
      followers_count: string
      following_count: string
    }>(
      `SELECT
        (SELECT COUNT(*) FROM eidola.posts WHERE user_id = $1) as posts_count,
        (SELECT COUNT(*) FROM eidola.follows WHERE following_id = $1) as followers_count,
        (SELECT COUNT(*) FROM eidola.follows WHERE follower_id = $1) as following_count`,
      [user.id]
    )

    // Check if current user follows this user
    let isFollowing = false
    if (req.userId) {
      const followCheck = await getOne<{ follower_id: number }>(
        'SELECT follower_id FROM eidola.follows WHERE follower_id = $1 AND following_id = $2',
        [req.userId, user.id]
      )
      isFollowing = !!followCheck
    }

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      points: user.points,
      createdAt: user.created_at,
      postsCount: parseInt(stats?.posts_count || '0'),
      followersCount: parseInt(stats?.followers_count || '0'),
      followingCount: parseInt(stats?.following_count || '0'),
      isFollowing
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// Get user's posts
router.get('/:username/posts', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { username } = req.params
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit

    // Get user ID
    const user = await getOne<{ id: number }>('SELECT id FROM eidola.users WHERE username = $1', [username])
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const posts = await getMany<{
      id: number
      image_url: string
      thumbnail_url: string | null
      is_nsfw: boolean
      likes_count: number
      comments_count: number
      type: string
    }>(
      `SELECT id, image_url, thumbnail_url, is_nsfw, likes_count, comments_count, type
       FROM eidola.posts
       WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [user.id, limit, offset]
    )

    res.json({
      posts: posts.map(p => ({
        id: p.id,
        imageUrl: p.image_url,
        thumbnailUrl: p.thumbnail_url,
        isNsfw: p.is_nsfw,
        likesCount: p.likes_count,
        commentsCount: p.comments_count,
        type: p.type
      })),
      page,
      hasMore: posts.length === limit
    })
  } catch (error) {
    console.error('Error fetching user posts:', error)
    res.status(500).json({ error: 'Failed to fetch posts' })
  }
})

// Follow/unfollow user
router.post('/:username/follow', requireAuth, async (req: Request, res: Response) => {
  try {
    const { username } = req.params

    // Get user to follow
    const userToFollow = await getOne<{ id: number }>('SELECT id FROM eidola.users WHERE username = $1', [username])
    if (!userToFollow) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Can't follow yourself
    if (userToFollow.id === req.userId) {
      return res.status(400).json({ error: "Can't follow yourself" })
    }

    // Check if already following
    const existing = await getOne<{ follower_id: number }>(
      'SELECT follower_id FROM eidola.follows WHERE follower_id = $1 AND following_id = $2',
      [req.userId, userToFollow.id]
    )

    if (existing) {
      // Unfollow
      await query('DELETE FROM eidola.follows WHERE follower_id = $1 AND following_id = $2', [req.userId, userToFollow.id])
      res.json({ following: false })
    } else {
      // Follow
      await query('INSERT INTO eidola.follows (follower_id, following_id) VALUES ($1, $2)', [req.userId, userToFollow.id])
      res.json({ following: true })
    }
  } catch (error) {
    console.error('Error toggling follow:', error)
    res.status(500).json({ error: 'Failed to toggle follow' })
  }
})

// Update interests
router.put('/me/interests', requireAuth, async (req: Request, res: Response) => {
  try {
    const { interests } = req.body // Array of tag names

    if (!Array.isArray(interests)) {
      return res.status(400).json({ error: 'Interests must be an array' })
    }

    // Clear existing interests
    await query('DELETE FROM eidola.user_interests WHERE user_id = $1', [req.userId])

    // Add new interests
    for (const tagName of interests) {
      const tag = await getOne<{ id: number }>('SELECT id FROM eidola.tags WHERE name = $1', [tagName.toLowerCase()])
      if (tag) {
        await query('INSERT INTO eidola.user_interests (user_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.userId, tag.id])
      }
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error updating interests:', error)
    res.status(500).json({ error: 'Failed to update interests' })
  }
})

// Sync user from Clerk webhook
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { clerkUserId, username, displayName, avatarUrl } = req.body

    if (!clerkUserId) {
      return res.status(400).json({ error: 'clerkUserId required' })
    }

    await query(
      `INSERT INTO eidola.users (clerk_user_id, username, display_name, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (clerk_user_id) DO UPDATE SET
         display_name = COALESCE($3, eidola.users.display_name),
         avatar_url = COALESCE($4, eidola.users.avatar_url),
         updated_at = NOW()`,
      [clerkUserId, username || `user_${Date.now()}`, displayName, avatarUrl]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error syncing user:', error)
    res.status(500).json({ error: 'Failed to sync user' })
  }
})

// Get all tags (for interest picker)
router.get('/tags/all', async (_req: Request, res: Response) => {
  try {
    const tags = await getMany<{ id: number; name: string }>('SELECT id, name FROM eidola.tags ORDER BY name')
    res.json(tags)
  } catch (error) {
    console.error('Error fetching tags:', error)
    res.status(500).json({ error: 'Failed to fetch tags' })
  }
})

export default router
