import { useState, useRef } from 'react'
import { useComments } from '../../hooks/usePosts'
import { formatRelativeDate } from '../../utils/dateTime'
import Avatar from '../ui/Avatar'
import { X, Send, Loader2 } from 'lucide-react'

interface CommentsSheetProps {
  postId: number | null
  onClose: () => void
}

export default function CommentsSheet({ postId, onClose }: CommentsSheetProps) {
  const { comments, isLoading, addComment } = useComments(postId ?? undefined)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragStartY = useRef(0)

  // Handle close with animation
  const handleClose = () => {
    inputRef.current?.blur()
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      setDragY(0)
      onClose()
    }, 200)
  }

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  // Drag to dismiss handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const currentY = e.touches[0].clientY
    const diff = currentY - dragStartY.current
    // Only allow dragging down
    if (diff > 0) {
      setDragY(diff)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    // If dragged more than 100px, close the sheet
    if (dragY > 100) {
      handleClose()
    } else {
      // Snap back
      setDragY(0)
    }
  }

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await addComment(newComment.trim())
      setNewComment('')
    } catch (err) {
      console.error('Failed to add comment:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!postId) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50"
      onClick={handleBackdropClick}
      style={{
        opacity: isClosing ? 0 : 1 - dragY / 300,
        transition: isDragging ? 'none' : 'opacity 0.2s ease-out',
      }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl flex flex-col"
        style={{
          height: '60vh',
          transform: isClosing ? 'translateY(100%)' : `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b">
          <div className="w-8" />
          <h2 className="font-semibold text-base">Comments</h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments list - scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No comments yet</p>
              <p className="text-xs mt-1">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar
                    user={{ avatarUrl: comment.user?.avatarUrl, username: comment.user?.username }}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-sm">{comment.user?.username}</span>
                      <span className="text-xs text-gray-400">
                        {formatRelativeDate(new Date(comment.createdAt))}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 mt-0.5">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comment input - always visible at bottom */}
        <div
          className="border-t bg-white px-4 py-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}
        >
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-eidola-orange/50"
              style={{ fontSize: '16px' }}
              disabled={isSubmitting}
              autoComplete="off"
              autoCorrect="off"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="p-2 text-eidola-orange disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
