import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { get } from '../utils/api'
import { Loader2, Trophy, Pencil, Type } from 'lucide-react'

interface Challenge {
  id: number
  imageUrl: string
  thumbnailUrl?: string
  title?: string
  challengeType: 'draw' | 'text'
  challengeDifficulty: 'easy' | 'medium' | 'hard'
  submissionsCount: number
  createdAt: string
  user: {
    username: string
    displayName?: string
    avatarUrl?: string
  }
  hasSubmitted: boolean
}

const difficultyColors = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'draw' | 'text'>('all')

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        setIsLoading(true)
        const params = filter !== 'all' ? { type: filter } : {}
        const data = await get<{ challenges: Challenge[] }>('/challenges', params)
        setChallenges(data.challenges)
      } catch (err) {
        console.error('Failed to fetch challenges:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchChallenges()
  }, [filter])

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-eidola-orange" />
          Challenges
        </h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'draw', 'text'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === type
                ? 'bg-eidola-orange text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type === 'draw' && <Pencil className="w-4 h-4 inline mr-1" />}
            {type === 'text' && <Type className="w-4 h-4 inline mr-1" />}
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Challenges grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-eidola-orange" />
        </div>
      ) : challenges.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Trophy className="w-16 h-16 text-gray-300" />
          <p className="text-gray-500">No challenges yet</p>
          <Link to="/create" className="btn-gradient px-6 py-2 rounded-full text-white">
            Create One
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {challenges.map(challenge => (
            <Link
              key={challenge.id}
              to={`/post/${challenge.id}`}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div className="relative aspect-video">
                <img
                  src={challenge.thumbnailUrl || challenge.imageUrl}
                  alt={challenge.title || 'Challenge'}
                  className="w-full h-full object-cover"
                />
                {/* Challenge type badge */}
                <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  {challenge.challengeType === 'draw' ? (
                    <>
                      <Pencil className="w-3 h-3" /> Draw
                    </>
                  ) : (
                    <>
                      <Type className="w-3 h-3" /> Guess
                    </>
                  )}
                </div>
                {/* Difficulty badge */}
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[challenge.challengeDifficulty]}`}>
                  {challenge.challengeDifficulty}
                </div>
                {/* Completed badge */}
                {challenge.hasSubmitted && (
                  <div className="absolute bottom-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                    ✓ Completed
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="font-semibold truncate">
                  {challenge.title || 'What do you see?'}
                </h3>
                <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                  <span>by @{challenge.user.username}</span>
                  <span>{challenge.submissionsCount} submissions</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
