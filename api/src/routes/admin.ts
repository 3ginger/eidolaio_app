import { Router, Request, Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { query, getOne, getMany } from '../services/db.js'

const router = Router()

interface ReportRow {
  id: number
  post_id: number
  reporter_id: number
  reason: string
  description: string | null
  status: string
  created_at: string
  resolved_at: string | null
  resolved_by: number | null
  reporter_username: string
  post_image_url: string
  post_title: string | null
  post_user_id: number
  post_username: string
}

// Get all reports (paginated)
router.get('/reports', requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit
    const status = req.query.status as string | undefined

    let whereClause = ''
    const params: unknown[] = []
    let paramIndex = 1

    if (status && ['pending', 'dismissed', 'sustained'].includes(status)) {
      whereClause = `WHERE r.status = $${paramIndex++}`
      params.push(status)
    }

    const reports = await getMany<ReportRow>(
      `SELECT r.id, r.post_id, r.reporter_id, r.reason, r.description,
              r.status, r.created_at, r.resolved_at, r.resolved_by,
              reporter.username as reporter_username,
              p.image_url as post_image_url, p.title as post_title,
              p.user_id as post_user_id, post_owner.username as post_username
       FROM eidola.reports r
       JOIN eidola.users reporter ON r.reporter_id = reporter.id
       JOIN eidola.posts p ON r.post_id = p.id
       JOIN eidola.users post_owner ON p.user_id = post_owner.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    )

    // Get counts
    const countResult = await getOne<{ total: number; pending: number }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
       FROM eidola.reports`
    )

    res.json({
      reports: reports.map(r => ({
        id: r.id,
        postId: r.post_id,
        reporterId: r.reporter_id,
        reason: r.reason,
        description: r.description,
        status: r.status,
        createdAt: r.created_at,
        resolvedAt: r.resolved_at,
        resolvedBy: r.resolved_by,
        reporter: { username: r.reporter_username },
        post: {
          id: r.post_id,
          imageUrl: r.post_image_url,
          title: r.post_title,
          userId: r.post_user_id,
          username: r.post_username
        }
      })),
      page,
      hasMore: reports.length === limit,
      totalCount: countResult?.total || 0,
      pendingCount: countResult?.pending || 0
    })
  } catch (error) {
    console.error('Error fetching reports:', error)
    res.status(500).json({ error: 'Failed to fetch reports' })
  }
})

// Update report status
router.patch('/reports/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const reportId = parseInt(req.params.id as string)
    const { status } = req.body

    if (!status || !['dismissed', 'sustained'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: dismissed or sustained' })
    }

    // Check if report exists
    const report = await getOne<{ id: number; post_id: number }>(
      'SELECT id, post_id FROM eidola.reports WHERE id = $1',
      [reportId]
    )

    if (!report) {
      return res.status(404).json({ error: 'Report not found' })
    }

    // Update report
    await query(
      `UPDATE eidola.reports
       SET status = $1, resolved_at = NOW(), resolved_by = $2
       WHERE id = $3`,
      [status, req.userId, reportId]
    )

    // If sustained, flag the post as NSFW
    if (status === 'sustained') {
      await query(
        'UPDATE eidola.posts SET is_nsfw = true, moderation_status = $1 WHERE id = $2',
        ['flagged', report.post_id]
      )
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error updating report:', error)
    res.status(500).json({ error: 'Failed to update report' })
  }
})

// Admin delete post
router.delete('/posts/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id as string)

    // Check if post exists
    const post = await getOne<{ id: number }>('SELECT id FROM eidola.posts WHERE id = $1', [postId])

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Delete post
    await query('DELETE FROM eidola.posts WHERE id = $1', [postId])

    // Update any related reports to sustained
    await query(
      `UPDATE eidola.reports
       SET status = 'sustained', resolved_at = NOW(), resolved_by = $1
       WHERE post_id = $2 AND status = 'pending'`,
      [req.userId, postId]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting post:', error)
    res.status(500).json({ error: 'Failed to delete post' })
  }
})

// Admin stats
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const stats = await getOne<{
      total_posts: number
      total_users: number
      pending_reports: number
      flagged_posts: number
    }>(
      `SELECT
        (SELECT COUNT(*) FROM eidola.posts) as total_posts,
        (SELECT COUNT(*) FROM eidola.users) as total_users,
        (SELECT COUNT(*) FROM eidola.reports WHERE status = 'pending') as pending_reports,
        (SELECT COUNT(*) FROM eidola.posts WHERE moderation_status = 'flagged') as flagged_posts`
    )

    res.json({
      totalPosts: stats?.total_posts || 0,
      totalUsers: stats?.total_users || 0,
      pendingReports: stats?.pending_reports || 0,
      flaggedPosts: stats?.flagged_posts || 0
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

export default router
