import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { get, post } from '../../utils/api'
import { useGeolocation } from '../../hooks/useGeolocation'
import { Camera, MapPin, Loader2, ChevronRight } from 'lucide-react'

interface ChainEntry {
  id: number
  photoUrl: string
  position: number
  caption?: string
  createdAt: string
  user?: {
    username: string
    displayName?: string
    avatarUrl?: string
  }
}

interface PhotoChainProps {
  postId: number
}

export default function PhotoChain({ postId }: PhotoChainProps) {
  const [entries, setEntries] = useState<ChainEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [canJoin, setCanJoin] = useState(false)
  const [distance, setDistance] = useState<number | null>(null)
  const [showJoinFlow, setShowJoinFlow] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const { lat, lng, requestPermission } = useGeolocation()

  // Fetch chain entries
  useEffect(() => {
    const fetchChain = async () => {
      try {
        const data = await get<{ entries: ChainEntry[] }>(`/chain/${postId}`)
        setEntries(data.entries)
      } catch (err) {
        console.error('Failed to fetch chain:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchChain()
  }, [postId])

  // Check if user can join
  useEffect(() => {
    if (lat && lng) {
      const checkCanJoin = async () => {
        try {
          const data = await get<{ canJoin: boolean; distance?: number }>(`/chain/${postId}/can-join`, { lat, lng })
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
  }, [postId, lat, lng])

  const handleJoin = async (photoUrl: string, caption: string) => {
    try {
      setIsJoining(true)
      const result = await post<{ position: number; badge: string }>(`/chain/${postId}/join`, {
        photoUrl,
        caption,
        userLat: lat,
        userLng: lng,
      })

      // Refetch chain
      const data = await get<{ entries: ChainEntry[] }>(`/chain/${postId}`)
      setEntries(data.entries)

      alert(`You're ${result.badge} in the chain!`)
      setShowJoinFlow(false)
    } catch (err) {
      console.error('Failed to join chain:', err)
      alert(err instanceof Error ? err.message : 'Failed to join')
    } finally {
      setIsJoining(false)
    }
  }

  const getBadge = (position: number): string => {
    switch (position) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${position}`
    }
  }

  if (isLoading) {
    return (
      <div className="px-4 py-6 border-t">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-eidola-teal" />
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
                  {getBadge(entry.position)}
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
              <button className="w-full text-center text-sm text-eidola-teal py-2">
                View all {entries.length} visitors
                <ChevronRight className="w-4 h-4 inline ml-1" />
              </button>
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
            onClick={() => setShowJoinFlow(true)}
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

      {/* Join flow modal */}
      {showJoinFlow && (
        <JoinChainModal
          onSubmit={handleJoin}
          onClose={() => setShowJoinFlow(false)}
          isLoading={isJoining}
        />
      )}
    </div>
  )
}

// Simple join modal component
function JoinChainModal({
  onSubmit,
  onClose,
  isLoading,
}: {
  onSubmit: (photoUrl: string, caption: string) => Promise<void>
  onClose: () => void
  isLoading: boolean
}) {
  const [photoUrl, setPhotoUrl] = useState('')
  const [caption, setCaption] = useState('')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPhotoUrl(url)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="bg-white w-full rounded-t-3xl p-4 safe-area-bottom">
        <h3 className="text-lg font-semibold mb-4">Take your photo</h3>

        {/* Photo preview */}
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Your photo"
            className="w-full aspect-video object-cover rounded-xl mb-4"
          />
        ) : (
          <label className="block w-full aspect-video bg-gray-100 rounded-xl mb-4 flex items-center justify-center cursor-pointer">
            <div className="text-center">
              <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <span className="text-gray-500">Tap to take photo</span>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        )}

        {/* Caption */}
        <input
          type="text"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Add a caption (optional)"
          className="w-full px-4 py-3 bg-gray-100 rounded-xl mb-4 focus:outline-none"
        />

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 rounded-xl font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(photoUrl, caption)}
            disabled={!photoUrl || isLoading}
            className="flex-1 py-3 btn-gradient rounded-xl text-white font-medium disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Join Chain'}
          </button>
        </div>
      </div>
    </div>
  )
}
