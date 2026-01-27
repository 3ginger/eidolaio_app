import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { usePost, useComments, likePost, deletePost, reportPost } from '../hooks/usePosts'
import PhotoChain from '../components/post/PhotoChain'
import NSFWOverlay from '../components/common/NSFWOverlay'
import ChallengeSubmit from '../components/challenge/ChallengeSubmit'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import Alert from '../components/ui/Alert'
import DrawingToggleButton from '../components/ui/DrawingToggleButton'
import { getTimeRemainingVerbose } from '../utils/dateTime'
import { extractDrawingDataUrl } from '../utils/drawing'
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
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const postId = id ? parseInt(id) : undefined
  const { post, isLoading, error } = usePost(postId)
  const { comments, isLoading: commentsLoading, addComment } = useComments(postId)
  const [showNsfw, setShowNsfw] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [showChallenge, setShowChallenge] = useState(false)
  const [showDrawing, setShowDrawing] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState<'spam' | 'nsfw' | 'harassment' | 'copyright' | 'other'>('spam')
  const [reportDescription, setReportDescription] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Sync like state when post loads
  useEffect(() => {
    if (post) {
      setIsLiked(post.isLiked || false)
      setLikesCount(post.likesCount)
    }
  }, [post])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const isOwnPost = post?.isOwner || false

  if (isLoading) {
    return <LoadingSpinner fullHeight />
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
    const token = await getToken()
    const result = await likePost(postId, token)
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

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setShowMenu(false)
    alert('Link copied!')
  }

  const handleDelete = async () => {
    if (!postId) return
    if (!confirm('Are you sure you want to delete this post?')) return
    const token = await getToken()
    await deletePost(postId, token)
    navigate('/feed')
  }

  const handleReport = () => {
    setShowMenu(false)
    setShowReportModal(true)
    setReportReason('spam')
    setReportDescription('')
    setReportError(null)
  }

  const submitReport = async () => {
    if (!postId) return
    try {
      setReportSubmitting(true)
      setReportError(null)
      const token = await getToken()
      await reportPost(postId, reportReason, reportDescription || undefined, token)
      setShowReportModal(false)
      alert('Report submitted. Thank you for helping keep our community safe.')
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Failed to submit report')
    } finally {
      setReportSubmitting(false)
    }
  }

  const timeRemaining = post.expiresAt
    ? getTimeRemainingVerbose(new Date(post.expiresAt))
    : null

  return (
    <div className="max-w-lg mx-auto bg-white min-h-screen">
      {/* Header */}
      <div className="sticky top-14 z-10 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-md border-b">
        <Link to="/feed" className="p-1">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex items-center gap-2">
          <Avatar user={{ avatarUrl: post.user?.avatarUrl, username: post.user?.username }} size="sm" />
          <span className="font-medium">@{post.user?.username}</span>
        </div>
        <div className="relative" ref={menuRef}>
          <button className="p-1" onClick={() => setShowMenu(!showMenu)}>
            <MoreHorizontal className="w-6 h-6" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border py-1 z-20">
              <button
                onClick={handleCopyLink}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              >
                Copy link
              </button>
              <button
                onClick={handleReport}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              >
                Report
              </button>
              {isOwnPost && (
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-100"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image */}
      <div className="relative">
        {(() => {
          const drawingDataUrl = extractDrawingDataUrl(post.userDrawing)
          const hasDrawing = !!drawingDataUrl
          const displayUrl = showDrawing && drawingDataUrl ? drawingDataUrl : post.imageUrl

          return (
            <>
              {post.isNsfw && !showNsfw ? (
                <NSFWOverlay onReveal={() => setShowNsfw(true)}>
                  <img
                    src={displayUrl}
                    alt={post.title || 'Pareidolia'}
                    className="w-full blur-xl"
                  />
                </NSFWOverlay>
              ) : (
                <img
                  src={displayUrl}
                  alt={post.title || 'Pareidolia'}
                  className="w-full aspect-square object-cover"
                  onDoubleClick={handleLike}
                />
              )}

              {/* Drawing toggle button - small icon in corner */}
              {hasDrawing && post.type !== 'challenge' && (
                <DrawingToggleButton
                  showDrawing={showDrawing}
                  onToggle={() => setShowDrawing(prev => !prev)}
                  className="absolute bottom-3 right-3"
                />
              )}
            </>
          )
        })()}

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
                <Avatar
                  user={{ avatarUrl: comment.user?.avatarUrl, username: comment.user?.username }}
                  size="sm"
                  className="flex-shrink-0"
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

      {/* Report modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Report Post"
      >
        {reportError && <Alert type="error" message={reportError} className="mb-4" />}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Reason</label>
          <select
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value as typeof reportReason)}
            className="w-full px-3 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-eidola-orange/50"
          >
            <option value="spam">Spam</option>
            <option value="nsfw">NSFW content</option>
            <option value="harassment">Harassment</option>
            <option value="copyright">Copyright violation</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Description (optional)</label>
          <textarea
            value={reportDescription}
            onChange={(e) => setReportDescription(e.target.value)}
            placeholder="Add more details..."
            className="w-full px-3 py-2 bg-gray-100 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-eidola-orange/50"
            rows={3}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowReportModal(false)}
            className="flex-1 py-2 bg-gray-100 rounded-lg font-medium hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={submitReport}
            disabled={reportSubmitting}
            className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50"
          >
            {reportSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
