import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { query, getOne, getMany, transaction } from '../services/db.js'

const router = Router()

// Get photo chain for a post
router.get('/:postId', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId as string)

    // Verify post exists and is persistent type
    const post = await getOne<{ type: string }>(
      'SELECT type FROM eidola.posts WHERE id = $1',
      [postId]
    )

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    if (post.type !== 'persistent') {
      return res.status(400).json({ error: 'Photo chain only available for persistent posts' })
    }

    // Get chain entries ordered by position
    const chain = await getMany<{
      id: number
      photo_url: string
      position: number
      caption: string | null
      created_at: string
      username: string
      display_name: string | null
      avatar_url: string | null
    }>(
      `SELECT pc.id, pc.photo_url, pc.position, pc.caption, pc.created_at,
              u.username, u.display_name, u.avatar_url
       FROM eidola.photo_chain pc
       JOIN eidola.users u ON pc.user_id = u.id
       WHERE pc.post_id = $1
       ORDER BY pc.position ASC`,
      [postId]
    )

    res.json({
      postId,
      entries: chain.map(entry => ({
        id: entry.id,
        photoUrl: entry.photo_url,
        position: entry.position,
        caption: entry.caption,
        createdAt: entry.created_at,
        user: {
          username: entry.username,
          displayName: entry.display_name,
          avatarUrl: entry.avatar_url
        }
      })),
      totalEntries: chain.length
    })
  } catch (error) {
    console.error('Error fetching photo chain:', error)
    res.status(500).json({ error: 'Failed to fetch photo chain' })
  }
})

// Join the photo chain (check-in at location)
router.post('/:postId/join', requireAuth, async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId as string)
    const { photoUrl, caption, userLat, userLng } = req.body

    if (!photoUrl) {
      return res.status(400).json({ error: 'Photo URL required' })
    }

    // Get post details
    const post = await getOne<{
      type: string
      location: string | null
    }>(
      `SELECT type, ST_AsText(location) as location FROM eidola.posts WHERE id = $1`,
      [postId]
    )

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    if (post.type !== 'persistent') {
      return res.status(400).json({ error: 'Can only join photo chain for persistent posts' })
    }

    // Check if user already in chain
    const existing = await getOne<{ id: number }>(
      'SELECT id FROM eidola.photo_chain WHERE post_id = $1 AND user_id = $2',
      [postId, req.userId]
    )

    if (existing) {
      return res.status(400).json({ error: 'Already joined this photo chain' })
    }

    // Verify user is within range (100m) if location is available
    if (post.location && userLat && userLng) {
      const distance = await getOne<{ distance: number }>(
        `SELECT ST_Distance(
          ST_MakePoint($1, $2)::geography,
          location
        ) as distance FROM eidola.posts WHERE id = $3`,
        [userLng, userLat, postId]
      )

      if (distance && distance.distance > 100) {
        return res.status(400).json({
          error: 'Too far from location',
          distance: Math.round(distance.distance),
          maxDistance: 100
        })
      }
    }

    // Join the chain
    const result = await transaction(async (client) => {
      // Insert chain entry (position is auto-assigned by trigger)
      const insertResult = await client.query<{ id: number; position: number }>(
        `INSERT INTO eidola.photo_chain (post_id, user_id, photo_url, caption)
         VALUES ($1, $2, $3, $4)
         RETURNING id, position`,
        [postId, req.userId, photoUrl, caption]
      )

      // Update checkins count on post
      await client.query(
        'UPDATE eidola.posts SET checkins_count = checkins_count + 1 WHERE id = $1',
        [postId]
      )

      // Award points based on position (earlier = more points)
      const position = insertResult.rows[0].position
      let points = 10 // base points
      if (position === 1) points = 100 // discoverer (shouldn't happen via join, but just in case)
      else if (position === 2) points = 50
      else if (position === 3) points = 30
      else if (position <= 10) points = 20

      await client.query(
        'UPDATE eidola.users SET points = points + $1 WHERE id = $2',
        [points, req.userId]
      )

      return { id: insertResult.rows[0].id, position, points }
    })

    res.status(201).json({
      id: result.id,
      position: result.position,
      points: result.points,
      badge: getBadge(result.position)
    })
  } catch (error) {
    console.error('Error joining photo chain:', error)
    res.status(500).json({ error: 'Failed to join photo chain' })
  }
})

// Check if user can join chain (is within range)
router.get('/:postId/can-join', requireAuth, async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId as string)
    const userLat = parseFloat(req.query.lat as string)
    const userLng = parseFloat(req.query.lng as string)

    // Check if already joined
    const existing = await getOne<{ id: number }>(
      'SELECT id FROM eidola.photo_chain WHERE post_id = $1 AND user_id = $2',
      [postId, req.userId]
    )

    if (existing) {
      return res.json({ canJoin: false, reason: 'already_joined' })
    }

    // Get post location
    const post = await getOne<{ type: string }>(
      'SELECT type FROM eidola.posts WHERE id = $1',
      [postId]
    )

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    if (post.type !== 'persistent') {
      return res.json({ canJoin: false, reason: 'not_persistent' })
    }

    // Check distance if coords provided
    if (!isNaN(userLat) && !isNaN(userLng)) {
      const distance = await getOne<{ distance: number }>(
        `SELECT ST_Distance(
          ST_MakePoint($1, $2)::geography,
          location
        ) as distance FROM eidola.posts WHERE id = $3 AND location IS NOT NULL`,
        [userLng, userLat, postId]
      )

      if (distance) {
        const canJoin = distance.distance <= 100
        return res.json({
          canJoin,
          distance: Math.round(distance.distance),
          maxDistance: 100,
          reason: canJoin ? null : 'too_far'
        })
      }
    }

    // No location check possible, allow join
    res.json({ canJoin: true })
  } catch (error) {
    console.error('Error checking join eligibility:', error)
    res.status(500).json({ error: 'Failed to check eligibility' })
  }
})

function getBadge(position: number): string {
  switch (position) {
    case 1: return '🥇'
    case 2: return '🥈'
    case 3: return '🥉'
    default: return `#${position}`
  }
}

export default router
