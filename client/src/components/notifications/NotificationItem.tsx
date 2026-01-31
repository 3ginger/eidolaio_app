import { Link } from 'react-router-dom'
import Avatar from '../ui/Avatar'
import type { Notification } from '../../hooks/useNotifications'
import { Heart, MessageCircle, UserPlus, Link2 } from 'lucide-react'
import { formatRelativeDate } from '../../utils/dateTime'

interface NotificationItemProps {
  notification: Notification
  onClick?: () => void
}

const typeIcons = {
  like: <Heart className="w-4 h-4 text-red-500" />,
  comment: <MessageCircle className="w-4 h-4 text-blue-500" />,
  follow: <UserPlus className="w-4 h-4 text-green-500" />,
  chain_join: <Link2 className="w-4 h-4 text-eidola-teal" />,
}

export default function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const { type, actor, post, message, isRead, createdAt } = notification

  // Determine where to link to
  const linkTo = post
    ? `/post/${post.id}`
    : actor
      ? `/@${actor.username}`
      : '/feed'

  return (
    <Link
      to={linkTo}
      onClick={onClick}
      className={`flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors ${
        !isRead ? 'bg-eidola-orange/5' : ''
      }`}
    >
      {/* Avatar with type icon overlay */}
      <div className="relative flex-shrink-0">
        <Avatar
          user={{
            avatarUrl: actor?.avatarUrl ?? undefined,
            username: actor?.username || 'Unknown',
          }}
          size="sm"
        />
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
          {typeIcons[type]}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">
            {actor?.displayName || actor?.username || 'Someone'}
          </span>{' '}
          <span className="text-gray-600">{message}</span>
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatRelativeDate(createdAt)}
        </p>
      </div>

      {/* Post thumbnail */}
      {post && (
        <div className="flex-shrink-0">
          <img
            src={post.thumbnailUrl || post.imageUrl}
            alt=""
            className="w-10 h-10 rounded-lg object-cover"
          />
        </div>
      )}

      {/* Unread indicator */}
      {!isRead && (
        <div className="flex-shrink-0 w-2 h-2 bg-eidola-orange rounded-full self-center" />
      )}
    </Link>
  )
}
