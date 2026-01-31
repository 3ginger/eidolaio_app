import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useNotifications } from '../../hooks/useNotifications'
import { useClickOutside } from '../../hooks/useClickOutside'
import NotificationItem from './NotificationItem'
import { Bell, Loader2, Check, BellOff } from 'lucide-react'

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    loadMore,
  } = useNotifications()

  useClickOutside(dropdownRef, () => setIsOpen(false), isOpen)

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(1)
    }
  }, [isOpen, fetchNotifications])

  const handleNotificationClick = (notificationId: number, isRead: boolean) => {
    if (!isRead) {
      markAsRead(notificationId)
    }
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button with badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-eidola-orange' : 'text-gray-600'}`} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-eidola-orange text-white text-xs font-medium rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] bg-white rounded-xl shadow-xl border overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-eidola-orange hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="overflow-y-auto max-h-[calc(70vh-100px)]">
            {isLoading && notifications.length === 0 ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 flex flex-col items-center text-gray-400">
                <BellOff className="w-10 h-10 mb-2" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <>
                <div className="divide-y">
                  {notifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification.id, notification.isRead)}
                    />
                  ))}
                </div>

                {/* Load more */}
                {hasMore && (
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="w-full py-3 text-sm text-eidola-orange hover:bg-gray-50 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      'Load more'
                    )}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2 bg-gray-50">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs text-gray-500 hover:text-eidola-orange"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
