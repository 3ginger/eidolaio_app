import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { post } from '../../utils/api'
import FabricCanvas from '../drawing/FabricCanvas'
import Alert from '../ui/Alert'
import { X, Loader2, Trophy, Send } from 'lucide-react'

interface ChallengeSubmitProps {
  postId: number
  type: 'draw' | 'text'
  imageUrl: string
  onClose: () => void
}

interface SubmitResult {
  similarityScore: number
  rank: number
  points: number
}

export default function ChallengeSubmit({ postId, type, imageUrl, onClose }: ChallengeSubmitProps) {
  const { getToken } = useAuth()
  const [drawingData, setDrawingData] = useState<object | null>(null)
  const [textGuess, setTextGuess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (type === 'draw' && !drawingData) {
      setError('Please draw what you see')
      return
    }
    if (type === 'text' && !textGuess.trim()) {
      setError('Please enter your guess')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const token = await getToken()
      const data = await post<SubmitResult>(`/challenges/${postId}/submit`, {
        drawingData: type === 'draw' ? drawingData : undefined,
        textGuess: type === 'text' ? textGuess : undefined,
      }, token)

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show result screen
  if (result) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">
            {result.rank === 1 ? '🥇' : result.rank === 2 ? '🥈' : result.rank === 3 ? '🥉' : '🎉'}
          </div>

          <h2 className="text-2xl font-bold mb-2">
            {result.rank <= 3 ? 'Amazing!' : 'Great job!'}
          </h2>

          <div className="text-lg text-gray-600 mb-8">
            You ranked #{result.rank}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-br from-eidola-orange to-eidola-magenta p-4 rounded-xl text-white">
              <div className="text-3xl font-bold">
                {Math.round(result.similarityScore * 100)}%
              </div>
              <div className="text-sm opacity-80">Match Score</div>
            </div>
            <div className="bg-gradient-to-br from-eidola-teal to-eidola-magenta p-4 rounded-xl text-white">
              <div className="text-3xl font-bold">
                +{result.points}
              </div>
              <div className="text-sm opacity-80">Points Earned</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 rounded-xl font-medium"
            >
              Close
            </button>
            <button
              onClick={() => window.location.href = `/post/${postId}`}
              className="flex-1 py-3 btn-gradient rounded-xl text-white font-medium flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5" />
              Leaderboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <button onClick={onClose}>
          <X className="w-6 h-6" />
        </button>
        <h2 className="font-semibold">
          {type === 'draw' ? 'Draw what you see' : 'Guess what they see'}
        </h2>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="text-eidola-orange font-medium disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit'}
        </button>
      </div>

      {error && <Alert type="error" message={error} className="mx-4 mt-4" />}

      {type === 'draw' ? (
        // Drawing challenge
        <div className="flex-1">
          <FabricCanvas
            imageUrl={imageUrl}
            onSave={setDrawingData}
          />
        </div>
      ) : (
        // Text challenge
        <div className="flex-1 flex flex-col p-4">
          {/* Show image */}
          <div className="relative mb-4">
            <img
              src={imageUrl}
              alt="Challenge"
              className="w-full rounded-xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-xl flex items-end p-4">
              <span className="text-white font-medium">What do you see?</span>
            </div>
          </div>

          {/* Text input */}
          <div className="flex-1 flex flex-col">
            <label className="text-sm font-medium mb-2">
              Your guess:
            </label>
            <textarea
              value={textGuess}
              onChange={e => setTextGuess(e.target.value)}
              placeholder="I see a face that looks like..."
              className="flex-1 p-4 bg-gray-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-eidola-orange/50"
            />
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !textGuess.trim()}
            className="mt-4 py-3 btn-gradient rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Guess
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
