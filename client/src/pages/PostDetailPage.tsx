import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { usePost, useComments, likePost } from '../hooks/usePosts'
import PhotoChain from '../components/post/PhotoChain'
import NSFWOverlay from '../components/common/NSFWOverlay'
import ChallengeSubmit from '../components/challenge/ChallengeSubmit'
import {
  Heart,
  MessageCircle,
  MapPin,
  Clock,
  Share2,
  MoreHorizontal,
  Loader2,
  ChevronLeft,
  Send
} from 'lucide-react'

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const postId = id ? parseInt(id) : undefined
  const { post, isLoading, error } = usePost(postId)
  const { comments, isLoading: commentsLoading, addComment } = useComments(postId)
  const [showNsfw, setShowNsfw] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [showChallenge, setShowChallenge] = useState(false)

  // Sync like state when post loads
  useState(() => {
    if (post) {
      setIsLiked(post.isLiked || false)
      setLikesCount(post.likesCount)
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-eidola-orange" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500">{error || 'Post not found'}</p>
        <Link to="/feed" className="text-eidola-orange">
          Back to Feed
        </Link>
      </div>
    )
  }

  const handleLike = async () => {
    if (!postId) return
    const result = await likePost(postId)
    setIsLiked(result.liked)
    setLikesCount(prev => result.liked ? prev + 1 : prev - 1)
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    await addComment(newComment)
    setNewComment('')
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: post.title || 'Check out this pareidolia!',
        text: post.userCaption || 'What do you see?',
        url: window.location.href,
      })
    } else {
      await navigator.clipboard.writeText(window.location.href)
      alert('Link copied!')
    }
  }

  const timeRemaining = post.expiresAt
    ? getTimeRemaining(new Date(post.expiresAt))
    : null

  return (
    <div className="max-w-lg mx-auto bg-white min-h-screen">
      {/* Header */}
      <div className="sticky top-14 z-10 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-md border-b">
        <Link to="/feed" className="p-1">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex items-center gap-2">
          <img
            src={post.user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user?.username}`}
            alt={post.user?.username}
            className="w-8 h-8 rounded-full"
          />
          <span className="font-medium">@{post.user?.username}</span>
        </div>
        <button className="p-1">
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </div>

      {/* Image */}
      <div className="relative">
        {post.isNsfw && !showNsfw ? (
          <NSFWOverlay onReveal={() => setShowNsfw(true)}>
            <img
              src={post.imageUrl}
              alt={post.title || 'Pareidolia'}
              className="w-full blur-xl"
            />
          </NSFWOverlay>
        ) : (
          <img
            src={post.imageUrl}
            alt={post.title || 'Pareidolia'}
            className="w-full"
            onDoubleClick={handleLike}
          />
        )}

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {post.type === 'temporary' && timeRemaining && (
            <div className="bg-white/90 px-3 py-1 rounded-full text-sm flex items-center gap-1">
              <Clock className="w-4 h-4 text-eidola-orange" />
              {timeRemaining}
            </div>
          )}
          {post.location && (
            <div className="bg-white/90 px-3 py-1 rounded-full text-sm flex items-center gap-1">
              <MapPin className="w-4 h-4 text-eidola-teal" />
              {post.address || 'View on map'}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 ${isLiked ? 'text-red-500' : ''}`}
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-sm font-medium">{likesCount}</span>
          </button>
          <button className="flex items-center gap-1">
            <MessageCircle className="w-6 h-6" />
            <span className="text-sm font-medium">{post.commentsCount}</span>
          </button>
        </div>
        <button onClick={handleShare}>
          <Share2 className="w-6 h-6" />
        </button>
      </div>

      {/* Caption */}
      {post.userCaption && (
        <div className="px-4 py-3 border-b">
          <p className="text-lg">
            <span className="font-medium">@{post.user?.username}</span>{' '}
            {post.userCaption}
          </p>
          {post.title && (
            <h2 className="text-xl font-semibold mt-2">{post.title}</h2>
          )}
        </div>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="px-4 py-2 flex flex-wrap gap-2 border-b">
          {post.tags.map(tag => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 rounded-full text-sm text-gray-600"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Challenge section */}
      {post.isChallenge && (
        <div className="px-4 py-4 border-b bg-gradient-to-r from-eidola-orange/10 to-eidola-magenta/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Challenge</h3>
              <p className="text-sm text-gray-600">
                {post.challengeType === 'draw' ? 'Draw what you see' : 'Guess what they see'}
              </p>
            </div>
            <button
              onClick={() => setShowChallenge(true)}
              className="btn-gradient px-4 py-2 rounded-full text-white"
            >
              Try It
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {post.submissionsCount} submissions
          </div>
        </div>
      )}

      {/* Photo Chain (for persistent posts) */}
      {post.type === 'persistent' && postId && (
        <PhotoChain postId={postId} />
      )}

      {/* Comments */}
      <div className="px-4 py-4">
        <h3 className="font-semibold mb-4">Comments</h3>

        {commentsLoading ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        ) : comments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No comments yet</p>
        ) : (
          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <img
                  src={comment.user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user?.username}`}
                  alt={comment.user?.username}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                />
                <div>
                  <span className="font-medium text-sm">@{comment.user?.username}</span>
                  <p className="text-sm">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comment input */}
      <form
        onSubmit={handleComment}
        className="sticky bottom-0 flex items-center gap-2 px-4 py-3 bg-white border-t"
      >
        <input
          type="text"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-eidola-orange/50"
        />
        <button
          type="submit"
          disabled={!newComment.trim()}
          className="p-2 text-eidola-orange disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      {/* Challenge modal */}
      {showChallenge && postId && (
        <ChallengeSubmit
          postId={postId}
          type={post.challengeType || 'draw'}
          imageUrl={post.imageUrl}
          onClose={() => setShowChallenge(false)}
        />
      )}
    </div>
  )
}

function getTimeRemaining(expiresAt: Date): string {
  const now = new Date()
  const diff = expiresAt.getTime() - now.getTime()

  if (diff <= 0) return 'Expired'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) {
    return `${Math.floor(hours / 24)}d left`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m left`
  }
  return `${minutes}m left`
}
