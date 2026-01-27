import { Router, Request, Response } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { query, getOne, getMany, transaction } from '../services/db.js'
import { moderateImage } from '../services/moderation.js'

const router = Router()

interface PostRow {
  id: number
  user_id: number
  type: string
  title: string | null
  description: string | null
  image_url: string
  thumbnail_url: string | null
  is_nsfw: boolean
  user_marked_nsfw: boolean
  moderation_status: string
  moderation_score: object | null
  location: string | null
  address: string | null
  user_drawing: object | null
  user_caption: string | null
  is_challenge: boolean
  challenge_type: string | null
  challenge_difficulty: string | null
  chain_parent_id: number | null
  likes_count: number
  comments_count: number
  checkins_count: number
  submissions_count: number
  expires_at: string | null
  created_at: string
  updated_at: string
  username: string
  display_name: string | null
  avatar_url: string | null
  is_liked: boolean
}

// Get all posts (with pagination)
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit
    const type = req.query.type as string | undefined

    let whereClause = 'WHERE 1=1'
    const params: unknown[] = []
    let paramIndex = 1

    // Filter by type if specified
    if (type) {
      whereClause += ` AND p.type = $${paramIndex++}`
      params.push(type)
    }

    // Exclude expired temporary posts
    whereClause += ` AND (p.expires_at IS NULL OR p.expires_at > NOW())`

    const posts = await getMany<PostRow>(
      `SELECT p.*,
              u.username, u.display_name, u.avatar_url,
              ${req.userId ? `EXISTS(SELECT 1 FROM eidola.likes WHERE post_id = p.id AND user_id = $${paramIndex++}) as is_liked` : 'false as is_liked'}
       FROM eidola.posts p
       JOIN eidola.users u ON p.user_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, ...(req.userId ? [req.userId] : []), limit, offset]
    )

    res.json({
      posts: posts.map(formatPost),
      page,
      hasMore: posts.length === limit
    })
  } catch (error) {
    console.error('Error fetching posts:', error)
    res.status(500).json({ error: 'Failed to fetch posts' })
  }
})

// Get single post
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id as string)

    const post = await getOne<PostRow & { is_owner: boolean }>(
      `SELECT p.*,
              u.username, u.display_name, u.avatar_url,
              ${req.userId ? 'EXISTS(SELECT 1 FROM eidola.likes WHERE post_id = p.id AND user_id = $2) as is_liked' : 'false as is_liked'},
              ${req.userId ? 'p.user_id = $2 as is_owner' : 'false as is_owner'}
       FROM eidola.posts p
       JOIN eidola.users u ON p.user_id = u.id
       WHERE p.id = $1`,
      req.userId ? [postId, req.userId] : [postId]
    )

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Get tags
    const tags = await getMany<{ name: string }>(
      `SELECT t.name FROM eidola.tags t
       JOIN eidola.post_tags pt ON t.id = pt.tag_id
       WHERE pt.post_id = $1`,
      [postId]
    )

    res.json({
      ...formatPost(post),
      tags: tags.map(t => t.name),
      isOwner: post.is_owner
    })
  } catch (error) {
    console.error('Error fetching post:', error)
    res.status(500).json({ error: 'Failed to fetch post' })
  }
})

// Create new post
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      type,
      title,
      description,
      imageUrl,
      thumbnailUrl,
      userMarkedNsfw,
      location,
      address,
      userDrawing,
      userCaption,
      isChallenge,
      challengeType,
      challengeDifficulty,
      expiresAt,
      tags
    } = req.body

    // Validate required fields
    if (!type || !imageUrl) {
      return res.status(400).json({ error: 'Missing required fields: type, imageUrl' })
    }

    // Run content moderation (async)
    let moderationScore = null
    let isNsfw = userMarkedNsfw || false

    try {
      moderationScore = await moderateImage(imageUrl)
      // Auto-flag if high adult score and user didn't mark
      if (moderationScore && moderationScore.adult > 0.7 && !userMarkedNsfw) {
        isNsfw = true
      }
    } catch (err) {
      console.error('Moderation error:', err)
    }

    // Build location point if provided
    let locationPoint = null
    if (location?.lat && location?.lng) {
      locationPoint = `POINT(${location.lng} ${location.lat})`
    }

    const result = await transaction(async (client) => {
      // Insert post - build query dynamically based on whether location is provided
      const hasLocation = locationPoint !== null

      const postResult = await client.query<{ id: number }>(
        `INSERT INTO eidola.posts (
          user_id, type, title, description, image_url, thumbnail_url,
          is_nsfw, user_marked_nsfw, moderation_status, moderation_score,
          location, address, user_drawing, user_caption,
          is_challenge, challenge_type, challenge_difficulty, expires_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          ${hasLocation ? `ST_GeographyFromText($11)` : 'NULL'}, ${hasLocation ? '$12' : '$11'}, ${hasLocation ? '$13' : '$12'}, ${hasLocation ? '$14' : '$13'},
          ${hasLocation ? '$15' : '$14'}, ${hasLocation ? '$16' : '$15'}, ${hasLocation ? '$17' : '$16'}, ${hasLocation ? '$18' : '$17'}
        ) RETURNING id`,
        hasLocation
          ? [
              req.userId, type, title, description, imageUrl, thumbnailUrl,
              isNsfw, userMarkedNsfw || false, 'approved', JSON.stringify(moderationScore),
              locationPoint, address, JSON.stringify(userDrawing), userCaption,
              isChallenge || false, challengeType, challengeDifficulty, expiresAt
            ]
          : [
              req.userId, type, title, description, imageUrl, thumbnailUrl,
              isNsfw, userMarkedNsfw || false, 'approved', JSON.stringify(moderationScore),
              address, JSON.stringify(userDrawing), userCaption,
              isChallenge || false, challengeType, challengeDifficulty, expiresAt
            ]
      )

      const postId = postResult.rows[0].id

      // Add tags if provided
      if (tags && Array.isArray(tags) && tags.length > 0) {
        for (const tagName of tags) {
          // Get or create tag
          const tagResult = await client.query<{ id: number }>(
            `INSERT INTO eidola.tags (name) VALUES ($1)
             ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [tagName.toLowerCase()]
          )
          const tagId = tagResult.rows[0].id

          // Link tag to post
          await client.query(
            'INSERT INTO eidola.post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [postId, tagId]
          )
        }
      }

      return postId
    })

    res.status(201).json({ id: result })
  } catch (error) {
    console.error('Error creating post:', error)
    res.status(500).json({ error: 'Failed to create post' })
  }
})

// Like/unlike post
router.post('/:id/like', requireAuth, async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id as string)

    // Check if already liked
    const existing = await getOne<{ id: number }>(
      'SELECT id FROM eidola.likes WHERE post_id = $1 AND user_id = $2',
      [postId, req.userId]
    )

    if (existing) {
      // Unlike
      await query('DELETE FROM eidola.likes WHERE post_id = $1 AND user_id = $2', [postId, req.userId])
      await query('UPDATE eidola.posts SET likes_count = likes_count - 1 WHERE id = $1', [postId])
      res.json({ liked: false })
    } else {
      // Like
      await query('INSERT INTO eidola.likes (post_id, user_id) VALUES ($1, $2)', [postId, req.userId])
      await query('UPDATE eidola.posts SET likes_count = likes_count + 1 WHERE id = $1', [postId])
      res.json({ liked: true })
    }
  } catch (error) {
    console.error('Error toggling like:', error)
    res.status(500).json({ error: 'Failed to toggle like' })
  }
})

// Get comments for a post
router.get('/:id/comments', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id as string)

    const comments = await getMany<{
      id: number
      content: string
      created_at: string
      username: string
      display_name: string | null
      avatar_url: string | null
    }>(
      `SELECT c.id, c.content, c.created_at,
              u.username, u.display_name, u.avatar_url
       FROM eidola.comments c
       JOIN eidola.users u ON c.user_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [postId]
    )

    res.json(comments.map(c => ({
      id: c.id,
      content: c.content,
      createdAt: c.created_at,
      user: {
        username: c.username,
        displayName: c.display_name,
        avatarUrl: c.avatar_url
      }
    })))
  } catch (error) {
    console.error('Error fetching comments:', error)
    res.status(500).json({ error: 'Failed to fetch comments' })
  }
})

// Add comment to post
router.post('/:id/comments', requireAuth, async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id as string)
    const { content } = req.body

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Comment content required' })
    }

    const result = await query<{ id: number }>(
      'INSERT INTO eidola.comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING id',
      [postId, req.userId, content.trim()]
    )

    // Update comment count
    await query('UPDATE eidola.posts SET comments_count = comments_count + 1 WHERE id = $1', [postId])

    res.status(201).json({ id: result.rows[0].id })
  } catch (error) {
    console.error('Error adding comment:', error)
    res.status(500).json({ error: 'Failed to add comment' })
  }
})

// Delete post (owner only)
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id as string)

    // Verify ownership
    const post = await getOne<{ user_id: number }>('SELECT user_id FROM eidola.posts WHERE id = $1', [postId])

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    if (post.user_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this post' })
    }

    await query('DELETE FROM eidola.posts WHERE id = $1', [postId])

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting post:', error)
    res.status(500).json({ error: 'Failed to delete post' })
  }
})

// Report a post
router.post('/:id/report', requireAuth, async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id as string)
    const { reason, description } = req.body

    if (!reason || !['spam', 'nsfw', 'harassment', 'copyright', 'other'].includes(reason)) {
      return res.status(400).json({ error: 'Invalid or missing reason. Must be: spam, nsfw, harassment, copyright, or other' })
    }

    // Check if post exists
    const post = await getOne<{ id: number }>('SELECT id FROM eidola.posts WHERE id = $1', [postId])
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Check if user already reported this post
    const existingReport = await getOne<{ id: number }>(
      'SELECT id FROM eidola.reports WHERE post_id = $1 AND reporter_id = $2',
      [postId, req.userId]
    )
    if (existingReport) {
      return res.status(400).json({ error: 'You have already reported this post' })
    }

    // Create report
    await query(
      'INSERT INTO eidola.reports (post_id, reporter_id, reason, description) VALUES ($1, $2, $3, $4)',
      [postId, req.userId, reason, description || null]
    )

    res.json({ success: true, message: 'Report submitted successfully' })
  } catch (error) {
    console.error('Error reporting post:', error)
    res.status(500).json({ error: 'Failed to submit report' })
  }
})

// Helper to format post for API response
function formatPost(post: PostRow) {
  return {
    id: post.id,
    userId: post.user_id,
    type: post.type,
    title: post.title,
    description: post.description,
    imageUrl: post.image_url,
    thumbnailUrl: post.thumbnail_url,
    isNsfw: post.is_nsfw,
    userMarkedNsfw: post.user_marked_nsfw,
    moderationStatus: post.moderation_status,
    moderationScore: post.moderation_score,
    location: post.location ? parseLocation(post.location) : null,
    address: post.address,
    userDrawing: post.user_drawing,
    userCaption: post.user_caption,
    isChallenge: post.is_challenge,
    challengeType: post.challenge_type,
    challengeDifficulty: post.challenge_difficulty,
    chainParentId: post.chain_parent_id,
    likesCount: post.likes_count,
    commentsCount: post.comments_count,
    checkinsCount: post.checkins_count,
    submissionsCount: post.submissions_count,
    expiresAt: post.expires_at,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    user: {
      username: post.username,
      displayName: post.display_name,
      avatarUrl: post.avatar_url
    },
    isLiked: post.is_liked
  }
}

function parseLocation(locationStr: string): { lat: number; lng: number } | null {
  // Parse PostGIS POINT format
  const match = locationStr.match(/POINT\(([^ ]+) ([^)]+)\)/)
  if (match) {
    return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) }
  }
  return null
}

export default router
