import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Post } from '../../types/post'
import NSFWOverlay from '../common/NSFWOverlay'
import Avatar from '../ui/Avatar'
import DrawingToggleButton from '../ui/DrawingToggleButton'
import { getTimeRemaining, formatRelativeDate } from '../../utils/dateTime'
import { calculateConfessionPoints } from '../../config/points'
import { extractDrawingDataUrl, hasValidDrawing } from '../../utils/drawing'
import { Heart, MessageCircle, MapPin, Clock, Trophy, Share2, Link2, Users, Bot, CheckCircle } from 'lucide-react'

interface PostCardProps {
  post: Post
  onLike: (postId: number) => Promise<void>
  onSus?: (postId: number) => Promise<void>
  onReal?: (postId: number) => Promise<void>
  onConfess?: (postId: number) => Promise<void>
}

export default function PostCard({ post, onLike, onSus, onReal, onConfess }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false)
  const [likesCount, setLikesCount] = useState(post.likesCount)
  const [isSus, setIsSus] = useState(post.isSus || false)
  const [isReal, setIsReal] = useState(post.isReal || false)
  const [susCount, setSusCount] = useState(post.susCount || 0)
  const [realCount, setRealCount] = useState(post.realCount || 0)
  const [isBusted, setIsBusted] = useState(post.isBusted || false)
  const [showNsfw, setShowNsfw] = useState(false)
  const [heartAnimation, setHeartAnimation] = useState(false)
  const [showDrawing, setShowDrawing] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // Calculate trust ratio
  const totalVotes = susCount + realCount
  const trustPercent = totalVotes > 0 ? Math.round((realCount / totalVotes) * 100) : 100
  
  // Trust level for visual treatment (can be used for background tinting later)
  const _trustLevel = isBusted ? 'busted' 
    : totalVotes < 1 ? 'neutral'
    : trustPercent >= 70 ? 'trusted'
    : trustPercent >= 40 ? 'disputed'
    : 'suspicious'
  void _trustLevel // Reserved for future visual treatment

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

  const handleSus = async () => {
    if (!onSus) return
    const wasReal = isReal
    setIsSus(!isSus)
    setSusCount(prev => isSus ? prev - 1 : prev + 1)
    // If was real, remove that vote
    if (!isSus && wasReal) {
      setIsReal(false)
      setRealCount(prev => prev - 1)
    }
    await onSus(post.id)
  }

  const handleReal = async () => {
    if (!onReal) return
    const wasSus = isSus
    setIsReal(!isReal)
    setRealCount(prev => isReal ? prev - 1 : prev + 1)
    // If was sus, remove that vote
    if (!isReal && wasSus) {
      setIsSus(false)
      setSusCount(prev => prev - 1)
    }
    await onReal(post.id)
  }

  const handleConfess = async () => {
    if (!onConfess || isBusted) return
    setShowConfetti(true)
    setIsBusted(true)
    await onConfess(post.id)
    setTimeout(() => setShowConfetti(false), 2000)
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
          {isBusted && (
            <span className="flex items-center gap-1 text-xs text-white bg-gradient-to-r from-purple-500 to-pink-500 px-2.5 py-1 rounded-full font-medium">
              <Bot className="w-3 h-3" />
              Busted
            </span>
          )}
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

          {/* Busted indicator - grouped with other stats */}
          {isBusted && (
            <span className="flex items-center gap-1 text-xs text-white bg-gradient-to-r from-purple-500 to-pink-500 px-2.5 py-1 rounded-full font-medium shadow-sm">
              <Bot className="w-3.5 h-3.5" />
              Busted{susCount > 0 ? ` · ${susCount}` : ''}
            </span>
          )}
        </div>

        {/* Trust voting buttons */}
        {!isBusted && onReal && onSus && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReal}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isReal 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Real
            </button>
            <button
              onClick={handleSus}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isSus 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-purple-50 hover:text-purple-600'
              }`}
            >
              <Bot className="w-4 h-4" />
              AI?
            </button>
          </div>
        )}

        <button onClick={handleShare} className="text-gray-700">
          <Share2 className="w-6 h-6" />
        </button>
      </div>

      {/* Trust meter - only show if there are votes */}
      {totalVotes > 0 && !isBusted && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span className="text-green-600">{realCount} real</span>
            <span>·</span>
            <span className="text-purple-600">{susCount} AI?</span>
            <span className="ml-auto font-medium" style={{
              color: trustPercent >= 70 ? '#16a34a' : trustPercent >= 40 ? '#d97706' : '#dc2626'
            }}>
              {trustPercent}% trust
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{
                width: `${trustPercent}%`,
                backgroundColor: trustPercent >= 70 ? '#16a34a' : trustPercent >= 40 ? '#d97706' : '#dc2626'
              }}
            />
          </div>
        </div>
      )}

      {/* Confess banner for owner - different based on trust level */}
      {post.isOwner && !isBusted && (susCount > 0 || realCount > 0) && onConfess && (() => {
        const potentialPoints = calculateConfessionPoints(realCount, susCount)
        const isTrusted = realCount > susCount
        
        return (
          <div className={`mx-4 mb-3 p-3 rounded-xl border ${
            isTrusted 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
              : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm flex-1">
                {isTrusted ? (
                  <>
                    <span className="font-medium text-green-700">🎭 They believe it's real!</span>
                    <span className="text-green-600 font-bold ml-1">+{potentialPoints} pts</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-purple-700">{susCount} suspect AI.</span>
                    <span className="text-purple-600 font-bold ml-1">+{potentialPoints} pts</span>
                  </>
                )}
              </div>
              <button
                onClick={handleConfess}
                className={`text-xs px-3 py-1.5 rounded-full font-medium hover:opacity-90 transition-opacity whitespace-nowrap ${
                  isTrusted
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                }`}
              >
                Confess
              </button>
            </div>
          </div>
        )
      })()}

      {/* Confetti animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="text-6xl animate-bounce">🎉</div>
        </div>
      )}

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
