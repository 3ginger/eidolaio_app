import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@clerk/clerk-react'
import { get } from '../../utils/api'
import { extractDrawingDataUrl } from '../../utils/drawing'
import Avatar from '../ui/Avatar'
import type { ChallengeSubmissionsResponse, ChallengeSubmission } from '../../types/post'
import { X, Trophy, Eye, Loader2 } from 'lucide-react'

interface ChallengeSheetProps {
  postId: number | null
  imageUrl?: string
  hasSubmitted?: boolean
  submissionsCount?: number
  onTryChallenge?: () => void
  onClose: () => void
}

export default function ChallengeSheet({
  postId,
  imageUrl,
  hasSubmitted = false,
  submissionsCount = 0,
  onTryChallenge,
  onClose,
}: ChallengeSheetProps) {
  const { getToken } = useAuth()
  const [data, setData] = useState<ChallengeSubmissionsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<ChallengeSubmission | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)

  // Fetch submissions if user has submitted
  useEffect(() => {
    if (!postId || !hasSubmitted) return
    setIsLoading(true)
    const fetchSubmissions = async () => {
      try {
        const token = await getToken()
        const response = await get<ChallengeSubmissionsResponse>(
          `/challenges/${postId}/submissions`,
          undefined,
          token
        )
        setData(response)
      } catch (err) {
        console.error('Failed to load submissions:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSubmissions()
  }, [postId, hasSubmitted, getToken])

  // Lock body scroll
  useEffect(() => {
    if (!postId) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [postId])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      setDragY(0)
      setSelectedSubmission(null)
      onClose()
    }, 200)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    setIsDragging(true)
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const diff = e.touches[0].clientY - dragStartY.current
    if (diff > 0) setDragY(diff)
  }
  const handleTouchEnd = () => {
    setIsDragging(false)
    if (dragY > 100) handleClose()
    else setDragY(0)
  }

  const handleTryChallenge = () => {
    handleClose()
    onTryChallenge?.()
  }

  if (!postId) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-black/50"
      onClick={handleBackdropClick}
      onTouchMove={(e) => e.stopPropagation()}
      style={{
        touchAction: 'none',
        opacity: isClosing ? 0 : 1 - dragY / 300,
        transition: isDragging ? 'none' : 'opacity 0.2s ease-out',
      }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl flex flex-col"
        style={{
          maxHeight: '75vh',
          overscrollBehavior: 'contain',
          transform: isClosing ? 'translateY(100%)' : `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 flex justify-center py-3 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 pb-3 border-b">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-eidola-magenta" />
            <h2 className="font-semibold text-base">Challenge</h2>
            <span className="text-sm text-gray-500">({submissionsCount})</span>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3" style={{ overscrollBehavior: 'contain' }}>
          {!hasSubmitted ? (
            /* Teaser view - user hasn't submitted */
            <div className="py-4">
              <div className="text-center mb-4">
                <Eye className="w-10 h-10 text-eidola-orange mx-auto mb-2" />
                <h3 className="font-semibold text-lg">What do others see?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {submissionsCount > 0
                    ? `${submissionsCount} ${submissionsCount === 1 ? 'person has' : 'people have'} shared their view`
                    : 'Be the first to share what you see!'}
                </p>
              </div>

              {submissionsCount > 0 && (
                <div className="mb-4 p-3 bg-gradient-to-r from-eidola-orange/10 to-eidola-magenta/10 rounded-lg border border-eidola-orange/20">
                  <p className="text-sm text-gray-700 text-center">
                    Submit your own drawing to unlock and see what {submissionsCount} others saw!
                  </p>
                </div>
              )}
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : data ? (
            /* Submissions grid */
            <div>
              <div className="grid grid-cols-3 gap-2">
                {data.submissions.map((submission) => {
                  const drawingUrl = submission.drawingData
                    ? extractDrawingDataUrl(submission.drawingData)
                    : null

                  return (
                    <button
                      key={submission.id}
                      onClick={() => setSelectedSubmission(submission)}
                      className={`relative aspect-square rounded-lg overflow-hidden ${
                        submission.isOwn ? 'ring-2 ring-eidola-orange' : ''
                      }`}
                    >
                      <img
                        src={imageUrl || data.imageUrl}
                        alt={`${submission.user.username}'s submission`}
                        className="w-full h-full object-cover"
                      />
                      {drawingUrl && (
                        <img
                          src={drawingUrl}
                          alt="Drawing overlay"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                        #{submission.rank}
                      </div>
                      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                        {Math.round(submission.similarityScore * 100)}%
                      </div>
                      {submission.isOwn && (
                        <div className="absolute bottom-1 right-1 bg-eidola-orange text-white text-xs px-1.5 py-0.5 rounded">
                          You
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Action button */}
        <div
          className="flex-shrink-0 border-t bg-white px-4 py-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}
        >
          {!hasSubmitted ? (
            <button
              onClick={handleTryChallenge}
              className="w-full py-3 btn-gradient rounded-xl text-white font-medium flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5" />
              Draw What You See
            </button>
          ) : (
            <button
              onClick={handleTryChallenge}
              className="w-full py-3 bg-gray-100 rounded-xl text-gray-700 font-medium flex items-center justify-center gap-2"
            >
              Try Again
            </button>
          )}
        </div>
      </div>

      {/* Full-screen submission viewer */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Avatar
                user={{
                  avatarUrl: selectedSubmission.user.avatarUrl,
                  username: selectedSubmission.user.username,
                }}
                size="sm"
              />
              <div>
                <span className="text-white font-medium">{selectedSubmission.user.username}</span>
                <div className="text-white/60 text-xs">
                  Rank #{selectedSubmission.rank} · {Math.round(selectedSubmission.similarityScore * 100)}% match
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedSubmission(null)} className="text-white p-2">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg">
              <img
                src={imageUrl || data?.imageUrl || ''}
                alt="Challenge"
                className="w-full rounded-lg"
              />
              {selectedSubmission.drawingData && (
                <img
                  src={extractDrawingDataUrl(selectedSubmission.drawingData) || ''}
                  alt="Drawing"
                  className="absolute inset-0 w-full h-full rounded-lg"
                />
              )}
            </div>
          </div>

          {selectedSubmission.textGuess && (
            <div className="p-4 bg-white/10">
              <p className="text-white text-center">"{selectedSubmission.textGuess}"</p>
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  )
}
