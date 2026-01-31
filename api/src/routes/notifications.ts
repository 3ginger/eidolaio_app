import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { query, getOne, getMany } from '../services/db.js'

const router = Router()

interface NotificationRow {
  id: number
  user_id: number
  type: string
  actor_id: number | null
  post_id: number | null
  message: string | null
  is_read: boolean
  created_at: string
  actor_username: string | null
  actor_display_name: string | null
  actor_avatar_url: string | null
  post_image_url: string | null
  post_thumbnail_url: string | null
}

// Get user notifications
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit
    const unreadOnly = req.query.unread === 'true'

    const whereClause = unreadOnly
      ? 'WHERE n.user_id = $1 AND n.is_read = false'
      : 'WHERE n.user_id = $1'

    const notifications = await getMany<NotificationRow>(
      `SELECT n.*,
              a.username as actor_username,
              a.display_name as actor_display_name,
              a.avatar_url as actor_avatar_url,
              p.image_url as post_image_url,
              p.thumbnail_url as post_thumbnail_url
       FROM eidola.notifications n
       LEFT JOIN eidola.users a ON n.actor_id = a.id
       LEFT JOIN eidola.posts p ON n.post_id = p.id
       ${whereClause}
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.userId, limit, offset]
    )

    // Get unread count
    const unreadCount = await getOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM eidola.notifications WHERE user_id = $1 AND is_read = false',
      [req.userId]
    )

    res.json({
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        message: n.message,
        isRead: n.is_read,
        createdAt: n.created_at,
        actor: n.actor_id ? {
          username: n.actor_username,
          displayName: n.actor_display_name,
          avatarUrl: n.actor_avatar_url,
        } : null,
        post: n.post_id ? {
          id: n.post_id,
          imageUrl: n.post_image_url,
          thumbnailUrl: n.post_thumbnail_url,
        } : null,
      })),
      unreadCount: parseInt(unreadCount?.count || '0'),
      page,
      hasMore: notifications.length === limit,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

// Get unread count only
router.get('/count', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await getOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM eidola.notifications WHERE user_id = $1 AND is_read = false',
      [req.userId]
    )
    res.json({ count: parseInt(result?.count || '0') })
  } catch (error) {
    console.error('Error fetching notification count:', error)
    res.status(500).json({ error: 'Failed to fetch notification count' })
  }
})

// Mark single notification as read
router.post('/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id as string)

    await query(
      'UPDATE eidola.notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [notificationId, req.userId]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    res.status(500).json({ error: 'Failed to mark notification as read' })
  }
})

// Mark all notifications as read
router.post('/read-all', requireAuth, async (req: Request, res: Response) => {
  try {
    await query(
      'UPDATE eidola.notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.userId]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    res.status(500).json({ error: 'Failed to mark notifications as read' })
  }
})

// Helper function to create a notification (exported for use by other routes)
export async function createNotification({
  userId,
  type,
  actorId,
  postId,
  message,
}: {
  userId: number
  type: 'like' | 'comment' | 'follow' | 'chain_join' | 'sus'
  actorId?: number
  postId?: number
  message?: string
}) {
  // Don't create notification for self-actions
  if (actorId && userId === actorId) return

  try {
    await query(
      `INSERT INTO eidola.notifications (user_id, type, actor_id, post_id, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, actorId || null, postId || null, message || null]
    )
  } catch (error) {
    // Log but don't throw - notifications are non-critical
    console.error('Error creating notification:', error)
  }
}

export default router
