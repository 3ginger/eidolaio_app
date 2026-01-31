import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { get } from '../../utils/api'
import LoadingSpinner from '../ui/LoadingSpinner'
import Avatar from '../ui/Avatar'
import { extractDrawingDataUrl } from '../../utils/drawing'
import type { ChallengeSubmissionsResponse, ChallengeSubmission } from '../../types/post'
import { Trophy, Eye, ChevronRight, X } from 'lucide-react'

interface ChallengeChainProps {
  postId: number
  imageUrl: string
  hasSubmitted: boolean
  submissionsCount: number
  onTryChallenge: () => void
}

export default function ChallengeChain({ 
  postId, 
  imageUrl, 
  hasSubmitted, 
  submissionsCount,
  onTryChallenge 
}: ChallengeChainProps) {
  const { getToken } = useAuth()
  const [data, setData] = useState<ChallengeSubmissionsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<ChallengeSubmission | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)

  useEffect(() => {
    if (!hasSubmitted) return

    const fetchSubmissions = async () => {
      setIsLoading(true)
      try {
        const token = await getToken()
        const response = await get<ChallengeSubmissionsResponse>(
          `/challenges/${postId}/submissions`,
          undefined,
          token
        )
        setData(response)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load submissions')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSubmissions()
  }, [postId, hasSubmitted, getToken])

  // Teaser view - user hasn't submitted yet
  if (!hasSubmitted) {
    return (
      <div className="px-4 py-4 border-t bg-gradient-to-r from-eidola-orange/10 to-eidola-magenta/10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5 text-eidola-orange" />
              What do others see?
            </h3>
            <p className="text-sm text-gray-600">
              {submissionsCount > 0 
                ? `${submissionsCount} ${submissionsCount === 1 ? 'person has' : 'people have'} shared their view`
                : 'Be the first to share what you see!'
              }
            </p>
          </div>
        </div>
        
        {submissionsCount > 0 && (
          <div className="mb-3 p-3 bg-white/50 rounded-lg border border-eidola-orange/20">
            <p className="text-sm text-gray-700">
              🔒 Submit your own drawing to unlock and see what {submissionsCount} others saw!
            </p>
          </div>
        )}

        <button
          onClick={onTryChallenge}
          className="w-full py-3 btn-gradient rounded-xl text-white font-medium flex items-center justify-center gap-2"
        >
          <Trophy className="w-5 h-5" />
          Draw What You See
        </button>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="px-4 py-6 border-t">
        <LoadingSpinner size="sm" color="orange" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="px-4 py-4 border-t">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    )
  }

  // No data yet
  if (!data) return null

  const originalDrawingUrl = data.original.drawingData 
    ? extractDrawingDataUrl(data.original.drawingData) 
    : null

  return (
    <div className="border-t">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-eidola-orange" />
          <h3 className="font-semibold">What Others See</h3>
          <span className="text-sm text-gray-500">({data.totalSubmissions})</span>
        </div>
      </div>

      {/* Original creator's drawing */}
      {originalDrawingUrl && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowOriginal(true)}
            className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-eidola-orange/10 to-eidola-magenta/10 rounded-xl"
          >
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <img src={imageUrl} alt="Original" className="w-full h-full object-cover" />
              <img 
                src={originalDrawingUrl} 
                alt="Creator's drawing" 
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">Original by @{data.original.user.username}</span>
                <Trophy className="w-4 h-4 text-eidola-orange" />
              </div>
              <p className="text-xs text-gray-500">Tap to see what they saw</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      )}

      {/* Submissions grid */}
      <div className="px-4 pb-4">
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
                  src={imageUrl} 
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
                {/* Rank badge */}
                <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                  #{submission.rank}
                </div>
                {/* Own submission marker */}
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

      {/* Full-screen submission viewer */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Avatar 
                user={{ 
                  avatarUrl: selectedSubmission.user.avatarUrl, 
                  username: selectedSubmission.user.username 
                }} 
                size="sm" 
              />
              <div>
                <span className="text-white font-medium">@{selectedSubmission.user.username}</span>
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
                src={imageUrl} 
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

      {/* Original drawing viewer */}
      {showOriginal && originalDrawingUrl && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Avatar 
                user={{ 
                  avatarUrl: data.original.user.avatarUrl, 
                  username: data.original.user.username 
                }} 
                size="sm" 
              />
              <div>
                <span className="text-white font-medium">@{data.original.user.username}</span>
                <div className="text-white/60 text-xs flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Original creator
                </div>
              </div>
            </div>
            <button onClick={() => setShowOriginal(false)} className="text-white p-2">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg">
              <img 
                src={imageUrl} 
                alt="Original"
                className="w-full rounded-lg"
              />
              <img 
                src={originalDrawingUrl} 
                alt="Creator's drawing"
                className="absolute inset-0 w-full h-full rounded-lg"
              />
            </div>
          </div>

          {data.original.caption && (
            <div className="p-4 bg-white/10">
              <p className="text-white text-center">"{data.original.caption}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
