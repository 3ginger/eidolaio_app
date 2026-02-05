import { Link } from 'react-router-dom'
import { useComments } from '../../hooks/usePosts'

interface InlineCommentsProps {
  postId: number
  commentsCount: number
  onViewAll: () => void
}

const MAX_PREVIEW_COMMENTS = 2
const MAX_COMMENT_LENGTH = 100

export default function InlineComments({ postId, commentsCount, onViewAll }: InlineCommentsProps) {
  const { comments, isLoading } = useComments(postId)

  // Don't show anything if no comments
  if (commentsCount === 0) return null

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="px-4 pb-2 space-y-2">
        {Array.from({ length: Math.min(commentsCount, MAX_PREVIEW_COMMENTS) }).map((_, i) => (
          <div key={i} className="flex gap-2 animate-pulse">
            <div className="h-3 w-16 bg-gray-200 rounded" />
            <div className="h-3 flex-1 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const previewComments = comments.slice(0, MAX_PREVIEW_COMMENTS)
  const hasMoreComments = commentsCount > MAX_PREVIEW_COMMENTS

  if (previewComments.length === 0) return null

  return (
    <div className="px-4 pb-2">
      {/* View all comments link */}
      {hasMoreComments && (
        <button
          onClick={onViewAll}
          className="text-sm text-gray-500 mb-1.5 hover:text-gray-700"
        >
          View all {commentsCount} comments
        </button>
      )}

      {/* Comment previews */}
      <div className="space-y-1">
        {previewComments.map((comment) => {
          const truncatedContent = comment.content.length > MAX_COMMENT_LENGTH
            ? comment.content.slice(0, MAX_COMMENT_LENGTH) + '...'
            : comment.content

          return (
            <p key={comment.id} className="text-sm">
              <Link
                to={`/profile/${comment.user?.username}`}
                className="font-semibold hover:underline"
              >
                {comment.user?.username}
              </Link>{' '}
              <span className="text-gray-800">{truncatedContent}</span>
            </p>
          )
        })}
      </div>

      {/* Add a comment prompt if few comments */}
      {commentsCount <= MAX_PREVIEW_COMMENTS && (
        <button
          onClick={onViewAll}
          className="text-sm text-gray-400 mt-1.5 hover:text-gray-600"
        >
          Add a comment...
        </button>
      )}
    </div>
  )
}
