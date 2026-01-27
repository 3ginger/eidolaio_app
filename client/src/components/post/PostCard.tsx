import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Post } from '../../types/post'
import NSFWOverlay from '../common/NSFWOverlay'
import Avatar from '../ui/Avatar'
import DrawingToggleButton from '../ui/DrawingToggleButton'
import { getTimeRemaining, formatRelativeDate } from '../../utils/dateTime'
import { extractDrawingDataUrl, hasValidDrawing } from '../../utils/drawing'
import { Heart, MessageCircle, MapPin, Clock, Trophy, Share2, Link2, Users } from 'lucide-react'

interface PostCardProps {
  post: Post
  onLike: (postId: number) => Promise<void>
}

export default function PostCard({ post, onLike }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false)
  const [likesCount, setLikesCount] = useState(post.likesCount)
  const [showNsfw, setShowNsfw] = useState(false)
  const [heartAnimation, setHeartAnimation] = useState(false)
  const [showDrawing, setShowDrawing] = useState(false)

  const drawingDataUrl = extractDrawingDataUrl(post.userDrawing)
  const hasDrawing = hasValidDrawing(post.userDrawing, post.type)

  const handleLike = async () => {
    setIsLiked(!isLiked)
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1)
    await onLike(post.id)
  }

  const handleDoubleTap = async () => {
    if (!isLiked) {
      setHeartAnimation(true)
      setIsLiked(true)
      setLikesCount(prev => prev + 1)
      await onLike(post.id)
      setTimeout(() => setHeartAnimation(false), 1000)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`
    if (navigator.share) {
      await navigator.share({
        title: post.title || 'Check out this pareidolia!',
        text: post.userCaption || 'What do you see?',
        url,
      })
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  const timeRemaining = post.expiresAt
    ? getTimeRemaining(new Date(post.expiresAt))
    : null

  return (
    <article className="bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link to={`/profile/${post.user?.username}`} className="flex items-center gap-3">
          <Avatar user={{ avatarUrl: post.user?.avatarUrl, username: post.user?.username }} />
          <div>
            <span className="font-semibold text-sm">@{post.user?.username}</span>
            {post.address && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />
                {post.address}
              </div>
            )}
          </div>
        </Link>

        {/* Post type badge */}
        <div className="flex items-center gap-2">
          {post.type === 'temporary' && timeRemaining && (
            <span className="flex items-center gap-1 text-xs text-eidola-orange bg-orange-50 px-2 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              {timeRemaining}
            </span>
          )}
          {post.isChallenge && (
            <span className="flex items-center gap-1 text-xs text-eidola-magenta bg-purple-50 px-2 py-1 rounded-full">
              <Trophy className="w-3 h-3" />
              Challenge
            </span>
          )}
        </div>
      </div>

      {/* Image */}
      <div className="relative">
        <Link to={`/post/${post.id}`} className="block">
          {post.isNsfw && !showNsfw ? (
            <NSFWOverlay onReveal={() => setShowNsfw(true)}>
              <img
                src={post.thumbnailUrl || post.imageUrl}
                alt={post.title || 'Pareidolia'}
                className="w-full aspect-square object-cover blur-xl"
              />
            </NSFWOverlay>
          ) : (
            <div className="relative" onDoubleClick={handleDoubleTap}>
              <img
                src={showDrawing && drawingDataUrl ? drawingDataUrl : (post.thumbnailUrl || post.imageUrl)}
                alt={post.title || 'Pareidolia'}
                className="w-full aspect-square object-cover"
              />
              {/* Heart animation on double tap */}
              {heartAnimation && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Heart className="w-24 h-24 text-red-500 fill-current heart-pop" />
                </div>
              )}
            </div>
          )}
        </Link>

        {/* Drawing toggle button */}
        {hasDrawing && !post.isNsfw && (
          <DrawingToggleButton
            showDrawing={showDrawing}
            onToggle={(e) => {
              e.preventDefault()
              setShowDrawing(!showDrawing)
            }}
            className="absolute bottom-3 right-3 z-10"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 transition-colors ${
              isLiked ? 'text-red-500' : 'text-gray-700'
            }`}
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-sm font-medium">{likesCount}</span>
          </button>

          <Link to={`/post/${post.id}`} className="flex items-center gap-1 text-gray-700">
            <MessageCircle className="w-6 h-6" />
            <span className="text-sm font-medium">{post.commentsCount}</span>
          </Link>
        </div>

        <button onClick={handleShare} className="text-gray-700">
          <Share2 className="w-6 h-6" />
        </button>
      </div>

      {/* Caption */}
      {post.userCaption && (
        <div className="px-4 pb-3">
          <p className="text-sm">
            <Link to={`/profile/${post.user?.username}`} className="font-semibold">
              @{post.user?.username}
            </Link>{' '}
            {post.userCaption}
          </p>
        </div>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {post.tags.map(tag => (
            <span key={tag} className="text-sm text-eidola-teal">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Chain linkage */}
      {(post.chainParentId || (post.chainEntryCount && post.chainEntryCount > 0)) && (
        <div className="px-4 pb-3 flex items-center gap-3">
          {post.chainParentId && (
            <Link
              to={`/post/${post.chainParentId}`}
              className="flex items-center gap-1.5 text-sm text-eidola-teal hover:underline"
            >
              <Link2 className="w-4 h-4" />
              Part of a chain
            </Link>
          )}
          {post.chainEntryCount && post.chainEntryCount > 0 && (
            <Link
              to={`/chain/${post.id}`}
              className="flex items-center gap-1.5 text-sm text-eidola-teal hover:underline"
            >
              <Users className="w-4 h-4" />
              {post.chainEntryCount} {post.chainEntryCount === 1 ? 'visitor' : 'visitors'}
            </Link>
          )}
        </div>
      )}

      {/* Timestamp */}
      <div className="px-4 pb-4">
        <time className="text-xs text-gray-400">
          {formatRelativeDate(new Date(post.createdAt))}
        </time>
      </div>
    </article>
  )
}
