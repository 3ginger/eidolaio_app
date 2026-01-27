import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { get } from '../../utils/api'
import { useGeolocation } from '../../hooks/useGeolocation'
import LoadingSpinner from '../ui/LoadingSpinner'
import { getPositionBadge } from '../../utils/badges'
import type { PhotoChainEntry } from '../../types/post'
import { Camera, MapPin, ChevronRight } from 'lucide-react'

interface PhotoChainProps {
  postId: number
}

export default function PhotoChain({ postId }: PhotoChainProps) {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [entries, setEntries] = useState<PhotoChainEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [canJoin, setCanJoin] = useState(false)
  const [distance, setDistance] = useState<number | null>(null)
  const { lat, lng, requestPermission } = useGeolocation()

  // Fetch chain entries
  useEffect(() => {
    const fetchChain = async () => {
      try {
        const token = await getToken()
        const data = await get<{ entries: PhotoChainEntry[] }>(`/chain/${postId}`, undefined, token)
        setEntries(data.entries)
      } catch (err) {
        console.error('Failed to fetch chain:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchChain()
  }, [postId, getToken])

  // Check if user can join
  useEffect(() => {
    if (lat && lng) {
      const checkCanJoin = async () => {
        try {
          const token = await getToken()
          const data = await get<{ canJoin: boolean; distance?: number }>(`/chain/${postId}/can-join`, { lat, lng }, token)
          setCanJoin(data.canJoin)
          if (data.distance) {
            setDistance(data.distance)
          }
        } catch (err) {
          console.error('Failed to check join eligibility:', err)
        }
      }

      checkCanJoin()
    }
  }, [postId, lat, lng, getToken])

  // Navigate to full creation flow for joining
  const handleJoinChain = () => {
    navigate(`/create?joinChain=${postId}`)
  }

  if (isLoading) {
    return (
      <div className="px-4 py-6 border-t">
        <LoadingSpinner size="sm" color="teal" />
      </div>
    )
  }

  return (
    <div className="border-t">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-eidola-teal" />
          <h3 className="font-semibold">Photo Chain</h3>
          <span className="text-sm text-gray-500">({entries.length} visitors)</span>
        </div>
        {entries.length > 0 && (
          <Link to={`/chain/${postId}`} className="text-sm text-eidola-teal hover:underline">
            View chain
          </Link>
        )}
      </div>

      {/* Chain entries */}
      <div className="px-4 pb-4">
        {entries.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Be the first to visit this spot!
          </p>
        ) : (
          <div className="space-y-3">
            {entries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3">
                {/* Position badge */}
                <div className="text-2xl w-10 text-center">
                  {getPositionBadge(entry.position)}
                </div>

                {/* Photo thumbnail */}
                <img
                  src={entry.photoUrl}
                  alt={`${entry.user?.username}'s photo`}
                  className="w-12 h-12 rounded-lg object-cover"
                />

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/profile/${entry.user?.username}`}
                    className="font-medium text-sm truncate block"
                  >
                    @{entry.user?.username}
                  </Link>
                  {entry.caption && (
                    <p className="text-xs text-gray-500 truncate">{entry.caption}</p>
                  )}
                </div>
              </div>
            ))}

            {entries.length > 5 && (
              <Link
                to={`/chain/${postId}`}
                className="block w-full text-center text-sm text-eidola-teal py-2 hover:underline"
              >
                View all {entries.length} visitors
                <ChevronRight className="w-4 h-4 inline ml-1" />
              </Link>
            )}
            {entries.length > 0 && entries.length <= 5 && (
              <Link
                to={`/chain/${postId}`}
                className="block w-full text-center text-sm text-eidola-teal py-2 hover:underline"
              >
                View full chain
                <ChevronRight className="w-4 h-4 inline ml-1" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Join button */}
      <div className="px-4 pb-4">
        {!lat || !lng ? (
          <button
            onClick={() => requestPermission()}
            className="w-full py-3 bg-gray-100 rounded-xl text-gray-700 font-medium flex items-center justify-center gap-2"
          >
            <MapPin className="w-5 h-5" />
            Enable location to join
          </button>
        ) : canJoin ? (
          <button
            onClick={handleJoinChain}
            className="w-full py-3 btn-gradient rounded-xl text-white font-medium flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Join the Chain
          </button>
        ) : distance !== null ? (
          <div className="text-center text-gray-500 text-sm py-3">
            You're {Math.round(distance)}m away (need to be within 100m)
          </div>
        ) : null}
      </div>
    </div>
  )
}
