import { Router, Request, Response } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { getMany, getOne } from '../services/db.js'

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
  user_caption: string | null
  user_drawing: object | null
  is_challenge: boolean
  likes_count: number
  comments_count: number
  checkins_count: number
  sus_count: number
  real_count: number
  is_busted: boolean
  expires_at: string | null
  created_at: string
  username: string
  display_name: string | null
  avatar_url: string | null
  is_liked: boolean
  is_sus: boolean
  is_real: boolean
  is_owner: boolean
}

// Personalized feed (following + interests + trending)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit

    // Get posts from followed users OR matching interests OR trending
    // Exclude posts from test users (is_test_user = true)
    const posts = await getMany<PostRow>(
      `WITH followed_posts AS (
        SELECT p.*, 1 as priority
        FROM eidola.posts p
        JOIN eidola.users pu ON p.user_id = pu.id
        WHERE p.user_id IN (SELECT following_id FROM eidola.follows WHERE follower_id = $1)
          AND (p.expires_at IS NULL OR p.expires_at > NOW())
          AND COALESCE(pu.is_test_user, false) = false
      ),
      interest_posts AS (
        SELECT p.*, 2 as priority
        FROM eidola.posts p
        JOIN eidola.users pu ON p.user_id = pu.id
        JOIN eidola.post_tags pt ON p.id = pt.post_id
        JOIN eidola.user_interests ui ON pt.tag_id = ui.tag_id AND ui.user_id = $1
        WHERE (p.expires_at IS NULL OR p.expires_at > NOW())
          AND p.id NOT IN (SELECT id FROM followed_posts)
          AND COALESCE(pu.is_test_user, false) = false
      ),
      trending_posts AS (
        SELECT p.*, 3 as priority
        FROM eidola.posts p
        JOIN eidola.users pu ON p.user_id = pu.id
        WHERE p.created_at > NOW() - INTERVAL '7 days'
          AND (p.expires_at IS NULL OR p.expires_at > NOW())
          AND p.id NOT IN (SELECT id FROM followed_posts)
          AND p.id NOT IN (SELECT id FROM interest_posts)
          AND COALESCE(pu.is_test_user, false) = false
        ORDER BY (p.likes_count + p.comments_count * 2) DESC
        LIMIT 50
      ),
      combined AS (
        SELECT * FROM followed_posts
        UNION ALL SELECT * FROM interest_posts
        UNION ALL SELECT * FROM trending_posts
      )
      SELECT c.*,
             u.username, u.display_name, u.avatar_url,
             EXISTS(SELECT 1 FROM eidola.likes WHERE post_id = c.id AND user_id = $1) as is_liked,
             EXISTS(SELECT 1 FROM eidola.sus WHERE post_id = c.id AND user_id = $1) as is_sus,
             EXISTS(SELECT 1 FROM eidola.real_votes WHERE post_id = c.id AND user_id = $1) as is_real,
             c.user_id = $1 as is_owner
      FROM combined c
      JOIN eidola.users u ON c.user_id = u.id
      ORDER BY c.priority, c.created_at DESC
      LIMIT $2 OFFSET $3`,
      [req.userId, limit, offset]
    )

    res.json({
      posts: posts.map(formatPost),
      page,
      hasMore: posts.length === limit
    })
  } catch (error) {
    console.error('Error fetching feed:', error)
    res.status(500).json({ error: 'Failed to fetch feed' })
  }
})

// Explore/discover feed (all posts, location-based if coords provided)
router.get('/explore', optionalAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit
    const lat = parseFloat(req.query.lat as string)
    const lng = parseFloat(req.query.lng as string)
    const radius = parseFloat(req.query.radius as string) || 50000 // 50km default

    let query: string
    let params: unknown[]

    if (!isNaN(lat) && !isNaN(lng)) {
      // Location-based query (exclude test users)
      query = `
        SELECT p.*,
               u.username, u.display_name, u.avatar_url,
               ST_Distance(p.location, ST_MakePoint($4, $3)::geography) as distance,
               ${req.userId ? 'EXISTS(SELECT 1 FROM eidola.likes WHERE post_id = p.id AND user_id = $6) as is_liked' : 'false as is_liked'},
               ${req.userId ? 'EXISTS(SELECT 1 FROM eidola.sus WHERE post_id = p.id AND user_id = $6) as is_sus' : 'false as is_sus'},
               ${req.userId ? 'EXISTS(SELECT 1 FROM eidola.real_votes WHERE post_id = p.id AND user_id = $6) as is_real' : 'false as is_real'},
               ${req.userId ? 'p.user_id = $6 as is_owner' : 'false as is_owner'}
        FROM eidola.posts p
        JOIN eidola.users u ON p.user_id = u.id
        WHERE p.location IS NOT NULL
          AND ST_DWithin(p.location, ST_MakePoint($4, $3)::geography, $5)
          AND (p.expires_at IS NULL OR p.expires_at > NOW())
          AND COALESCE(u.is_test_user, false) = false
        ORDER BY distance ASC
        LIMIT $1 OFFSET $2`
      params = [limit, offset, lat, lng, radius]
      if (req.userId) params.push(req.userId)
    } else {
      // General explore (trending + recent, exclude test users)
      query = `
        SELECT p.*,
               u.username, u.display_name, u.avatar_url,
               ${req.userId ? 'EXISTS(SELECT 1 FROM eidola.likes WHERE post_id = p.id AND user_id = $3) as is_liked' : 'false as is_liked'},
               ${req.userId ? 'EXISTS(SELECT 1 FROM eidola.sus WHERE post_id = p.id AND user_id = $3) as is_sus' : 'false as is_sus'},
               ${req.userId ? 'EXISTS(SELECT 1 FROM eidola.real_votes WHERE post_id = p.id AND user_id = $3) as is_real' : 'false as is_real'},
               ${req.userId ? 'p.user_id = $3 as is_owner' : 'false as is_owner'}
        FROM eidola.posts p
        JOIN eidola.users u ON p.user_id = u.id
        WHERE (p.expires_at IS NULL OR p.expires_at > NOW())
          AND COALESCE(u.is_test_user, false) = false
        ORDER BY (p.likes_count + p.comments_count) DESC, p.created_at DESC
        LIMIT $1 OFFSET $2`
      params = [limit, offset]
      if (req.userId) params.push(req.userId)
    }

    const posts = await getMany<PostRow & { distance?: number }>(query, params)

    res.json({
      posts: posts.map(p => ({
        ...formatPost(p),
        distance: p.distance
      })),
      page,
      hasMore: posts.length === limit
    })
  } catch (error) {
    console.error('Error fetching explore feed:', error)
    res.status(500).json({ error: 'Failed to fetch explore feed' })
  }
})

// Get posts with locations for map view
router.get('/map', optionalAuth, async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string)
    const lng = parseFloat(req.query.lng as string)
    const radius = parseFloat(req.query.radius as string) || 100000 // 100km default
    const limit = parseInt(req.query.limit as string) || 100

    let query: string
    let params: unknown[]

    if (!isNaN(lat) && !isNaN(lng)) {
      // Map view with location filter (exclude test users)
      query = `
        SELECT p.id, p.image_url, p.thumbnail_url, p.title, p.is_nsfw, p.type,
               ST_X(p.location::geometry) as lng, ST_Y(p.location::geometry) as lat,
               p.address, p.checkins_count, u.username
        FROM eidola.posts p
        JOIN eidola.users u ON p.user_id = u.id
        WHERE p.location IS NOT NULL
          AND ST_DWithin(p.location, ST_MakePoint($2, $1)::geography, $3)
          AND (p.expires_at IS NULL OR p.expires_at > NOW())
          AND COALESCE(u.is_test_user, false) = false
        ORDER BY p.created_at DESC
        LIMIT $4`
      params = [lat, lng, radius, limit]
    } else {
      // Return all location posts if no coords (exclude test users)
      query = `
        SELECT p.id, p.image_url, p.thumbnail_url, p.title, p.is_nsfw, p.type,
               ST_X(p.location::geometry) as lng, ST_Y(p.location::geometry) as lat,
               p.address, p.checkins_count, u.username
        FROM eidola.posts p
        JOIN eidola.users u ON p.user_id = u.id
        WHERE p.location IS NOT NULL
          AND (p.expires_at IS NULL OR p.expires_at > NOW())
          AND COALESCE(u.is_test_user, false) = false
        ORDER BY p.created_at DESC
        LIMIT $1`
      params = [limit]
    }

    const posts = await getMany<{
      id: number
      image_url: string
      thumbnail_url: string | null
      title: string | null
      is_nsfw: boolean
      type: string
      lat: number
      lng: number
      address: string | null
      checkins_count: number
      username: string
    }>(query, params)

    res.json(posts.map(p => ({
      id: p.id,
      imageUrl: p.image_url,
      thumbnailUrl: p.thumbnail_url,
      title: p.title,
      isNsfw: p.is_nsfw,
      type: p.type,
      location: { lat: p.lat, lng: p.lng },
      address: p.address,
      checkinsCount: p.checkins_count,
      username: p.username
    })))
  } catch (error) {
    console.error('Error fetching map posts:', error)
    res.status(500).json({ error: 'Failed to fetch map posts' })
  }
})

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
    userCaption: post.user_caption,
    userDrawing: post.user_drawing,
    isChallenge: post.is_challenge,
    likesCount: post.likes_count,
    commentsCount: post.comments_count,
    checkinsCount: post.checkins_count,
    susCount: post.sus_count,
    realCount: post.real_count,
    isBusted: post.is_busted,
    expiresAt: post.expires_at,
    createdAt: post.created_at,
    user: {
      username: post.username,
      displayName: post.display_name,
      avatarUrl: post.avatar_url
    },
    isLiked: post.is_liked,
    isSus: post.is_sus,
    isReal: post.is_real,
    isOwner: post.is_owner
  }
}

export default router
