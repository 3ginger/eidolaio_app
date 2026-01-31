import { Router, Request, Response } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { query, getOne, getMany, transaction } from '../services/db.js'
import { compareDrawings, compareTexts } from '../services/similarity.js'

const router = Router()

// Get all challenges
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit
    const difficulty = req.query.difficulty as string | undefined
    const type = req.query.type as string | undefined

    // Exclude challenges from test users
    let whereClause = 'WHERE p.is_challenge = true AND (p.expires_at IS NULL OR p.expires_at > NOW()) AND COALESCE(u.is_test_user, false) = false'
    const params: unknown[] = []
    let paramIndex = 1

    if (difficulty) {
      whereClause += ` AND p.challenge_difficulty = $${paramIndex++}`
      params.push(difficulty)
    }

    if (type) {
      whereClause += ` AND p.challenge_type = $${paramIndex++}`
      params.push(type)
    }

    const challenges = await getMany<{
      id: number
      image_url: string
      thumbnail_url: string | null
      title: string | null
      challenge_type: string
      challenge_difficulty: string
      submissions_count: number
      created_at: string
      username: string
      display_name: string | null
      avatar_url: string | null
      has_submitted: boolean
    }>(
      `SELECT p.id, p.image_url, p.thumbnail_url, p.title,
              p.challenge_type, p.challenge_difficulty, p.submissions_count, p.created_at,
              u.username, u.display_name, u.avatar_url,
              ${req.userId ? `EXISTS(SELECT 1 FROM eidola.challenge_submissions WHERE challenge_id = p.id AND user_id = $${paramIndex++}) as has_submitted` : 'false as has_submitted'}
       FROM eidola.posts p
       JOIN eidola.users u ON p.user_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, ...(req.userId ? [req.userId] : []), limit, offset]
    )

    res.json({
      challenges: challenges.map(c => ({
        id: c.id,
        imageUrl: c.image_url,
        thumbnailUrl: c.thumbnail_url,
        title: c.title,
        challengeType: c.challenge_type,
        challengeDifficulty: c.challenge_difficulty,
        submissionsCount: c.submissions_count,
        createdAt: c.created_at,
        user: {
          username: c.username,
          displayName: c.display_name,
          avatarUrl: c.avatar_url
        },
        hasSubmitted: c.has_submitted
      })),
      page,
      hasMore: challenges.length === limit
    })
  } catch (error) {
    console.error('Error fetching challenges:', error)
    res.status(500).json({ error: 'Failed to fetch challenges' })
  }
})

// Get challenge leaderboard
router.get('/:id/leaderboard', async (req: Request, res: Response) => {
  try {
    const challengeId = parseInt(req.params.id as string)

    // Verify it's a challenge
    const challenge = await getOne<{ is_challenge: boolean; challenge_type: string }>(
      'SELECT is_challenge, challenge_type FROM eidola.posts WHERE id = $1',
      [challengeId]
    )

    if (!challenge?.is_challenge) {
      return res.status(404).json({ error: 'Challenge not found' })
    }

    // Exclude submissions from test users
    const submissions = await getMany<{
      id: number
      user_id: number
      similarity_score: number
      rank: number
      created_at: string
      username: string
      display_name: string | null
      avatar_url: string | null
    }>(
      `SELECT cs.id, cs.user_id, cs.similarity_score, cs.rank, cs.created_at,
              u.username, u.display_name, u.avatar_url
       FROM eidola.challenge_submissions cs
       JOIN eidola.users u ON cs.user_id = u.id
       WHERE cs.challenge_id = $1
         AND COALESCE(u.is_test_user, false) = false
       ORDER BY cs.similarity_score DESC, cs.created_at ASC
       LIMIT 100`,
      [challengeId]
    )

    res.json({
      challengeId,
      challengeType: challenge.challenge_type,
      submissions: submissions.map(s => ({
        id: s.id,
        userId: s.user_id,
        similarityScore: s.similarity_score,
        rank: s.rank,
        createdAt: s.created_at,
        user: {
          username: s.username,
          displayName: s.display_name,
          avatarUrl: s.avatar_url
        }
      })),
      totalSubmissions: submissions.length
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

// Submit to challenge
router.post('/:id/submit', requireAuth, async (req: Request, res: Response) => {
  try {
    const challengeId = parseInt(req.params.id as string)
    const { drawingData, textGuess } = req.body

    // Get challenge details
    const challenge = await getOne<{
      is_challenge: boolean
      challenge_type: string
      user_drawing: object | null
      user_caption: string | null
      image_url: string
    }>(
      'SELECT is_challenge, challenge_type, user_drawing, user_caption, image_url FROM eidola.posts WHERE id = $1',
      [challengeId]
    )

    if (!challenge?.is_challenge) {
      return res.status(404).json({ error: 'Challenge not found' })
    }

    // Check if already submitted
    const existing = await getOne<{ id: number }>(
      'SELECT id FROM eidola.challenge_submissions WHERE challenge_id = $1 AND user_id = $2',
      [challengeId, req.userId]
    )

    if (existing) {
      return res.status(400).json({ error: 'Already submitted to this challenge' })
    }

    // Validate submission based on challenge type
    if (challenge.challenge_type === 'draw' && !drawingData) {
      return res.status(400).json({ error: 'Drawing data required for draw challenges' })
    }
    if (challenge.challenge_type === 'text' && !textGuess) {
      return res.status(400).json({ error: 'Text guess required for text challenges' })
    }

    // Calculate similarity score
    let similarityScore = 0

    if (challenge.challenge_type === 'draw' && challenge.user_drawing) {
      // Compare drawings using CLIP
      try {
        similarityScore = await compareDrawings(drawingData, challenge.user_drawing)
      } catch (err) {
        console.error('Drawing comparison error:', err)
        similarityScore = Math.random() * 0.5 + 0.3 // Fallback random score 0.3-0.8
      }
    } else if (challenge.challenge_type === 'text' && challenge.user_caption) {
      // Compare text using sentence similarity
      try {
        similarityScore = await compareTexts(textGuess, challenge.user_caption)
      } catch (err) {
        console.error('Text comparison error:', err)
        similarityScore = Math.random() * 0.5 + 0.3
      }
    }

    // Insert submission and update ranks
    await transaction(async (client) => {
      // Insert submission
      await client.query(
        `INSERT INTO eidola.challenge_submissions (challenge_id, user_id, drawing_data, text_guess, similarity_score)
         VALUES ($1, $2, $3, $4, $5)`,
        [challengeId, req.userId, JSON.stringify(drawingData), textGuess, similarityScore]
      )

      // Update submission count
      await client.query(
        'UPDATE eidola.posts SET submissions_count = submissions_count + 1 WHERE id = $1',
        [challengeId]
      )

      // Recalculate ranks for all submissions
      await client.query(
        `WITH ranked AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY similarity_score DESC, created_at ASC) as new_rank
          FROM eidola.challenge_submissions
          WHERE challenge_id = $1
        )
        UPDATE eidola.challenge_submissions cs
        SET rank = r.new_rank
        FROM ranked r
        WHERE cs.id = r.id`,
        [challengeId]
      )

      // Award points based on score
      const points = Math.floor(similarityScore * 100)
      await client.query(
        'UPDATE eidola.users SET points = points + $1 WHERE id = $2',
        [points, req.userId]
      )
    })

    // Get updated rank
    const submission = await getOne<{ rank: number }>(
      'SELECT rank FROM eidola.challenge_submissions WHERE challenge_id = $1 AND user_id = $2',
      [challengeId, req.userId]
    )

    res.status(201).json({
      similarityScore,
      rank: submission?.rank || 1,
      points: Math.floor(similarityScore * 100)
    })
  } catch (error) {
    console.error('Error submitting to challenge:', error)
    res.status(500).json({ error: 'Failed to submit to challenge' })
  }
})

// Get user's submission for a challenge
router.get('/:id/my-submission', requireAuth, async (req: Request, res: Response) => {
  try {
    const challengeId = parseInt(req.params.id as string)

    const submission = await getOne<{
      id: number
      drawing_data: object | null
      text_guess: string | null
      similarity_score: number
      rank: number
      created_at: string
    }>(
      `SELECT id, drawing_data, text_guess, similarity_score, rank, created_at
       FROM eidola.challenge_submissions
       WHERE challenge_id = $1 AND user_id = $2`,
      [challengeId, req.userId]
    )

    if (!submission) {
      return res.status(404).json({ error: 'No submission found' })
    }

    res.json({
      id: submission.id,
      drawingData: submission.drawing_data,
      textGuess: submission.text_guess,
      similarityScore: submission.similarity_score,
      rank: submission.rank,
      createdAt: submission.created_at
    })
  } catch (error) {
    console.error('Error fetching submission:', error)
    res.status(500).json({ error: 'Failed to fetch submission' })
  }
})

export default router
