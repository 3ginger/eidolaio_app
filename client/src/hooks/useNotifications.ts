import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { get, post } from '../utils/api'

interface NotificationActor {
  username: string
  displayName: string | null
  avatarUrl: string | null
}

interface NotificationPost {
  id: number
  imageUrl: string
  thumbnailUrl: string | null
}

export interface Notification {
  id: number
  type: 'like' | 'comment' | 'follow' | 'chain_join'
  message: string | null
  isRead: boolean
  createdAt: string
  actor: NotificationActor | null
  post: NotificationPost | null
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
  page: number
  hasMore: boolean
}

export function useNotifications() {
  const { getToken, isSignedIn } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  const fetchNotifications = useCallback(async (pageNum: number = 1) => {
    if (!isSignedIn) return

    try {
      setIsLoading(true)
      const token = await getToken()
      const data = await get<NotificationsResponse>(
        '/notifications',
        { page: pageNum, limit: 20 },
        token
      )

      if (pageNum === 1) {
        setNotifications(data.notifications)
      } else {
        setNotifications(prev => [...prev, ...data.notifications])
      }

      setUnreadCount(data.unreadCount)
      setHasMore(data.hasMore)
      setPage(pageNum)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [getToken, isSignedIn])

  const fetchUnreadCount = useCallback(async () => {
    if (!isSignedIn) return

    try {
      const token = await getToken()
      const data = await get<{ count: number }>('/notifications/count', undefined, token)
      setUnreadCount(data.count)
    } catch (error) {
      console.error('Error fetching notification count:', error)
    }
  }, [getToken, isSignedIn])

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const token = await getToken()
      await post(`/notifications/${notificationId}/read`, undefined, token)

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [getToken])

  const markAllAsRead = useCallback(async () => {
    try {
      const token = await getToken()
      await post('/notifications/read-all', undefined, token)

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [getToken])

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchNotifications(page + 1)
    }
  }, [hasMore, isLoading, page, fetchNotifications])

  const refresh = useCallback(() => {
    fetchNotifications(1)
  }, [fetchNotifications])

  // Initial fetch when signed in
  useEffect(() => {
    if (isSignedIn) {
      fetchUnreadCount()
    }
  }, [isSignedIn, fetchUnreadCount])

  return {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    loadMore,
    refresh,
  }
}
