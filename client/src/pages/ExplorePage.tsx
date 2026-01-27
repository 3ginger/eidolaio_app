import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { get } from '../utils/api'
import MapView from '../components/map/MapView'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import { List, Map as MapIcon, MapPin } from 'lucide-react'

interface MapPost {
  id: number
  imageUrl: string
  thumbnailUrl?: string
  title?: string
  isNsfw: boolean
  type: string
  location: { lat: number; lng: number }
  address?: string
  checkinsCount: number
  username: string
}

export default function ExplorePage() {
  const [view, setView] = useState<'map' | 'list'>('map')
  const [posts, setPosts] = useState<MapPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { lat, lng, requestPermission } = useGeolocation()

  useEffect(() => {
    requestPermission()
  }, [requestPermission])

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true)
        const params: Record<string, number> = {}
        if (lat && lng) {
          params.lat = lat
          params.lng = lng
        }
        const data = await get<MapPost[]>('/feed/map', params)
        setPosts(data)
      } catch (err) {
        console.error('Failed to fetch map posts:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
  }, [lat, lng])

  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* View toggle */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <h1 className="text-lg font-semibold">Explore</h1>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('map')}
            className={`p-2 rounded-md transition-colors ${
              view === 'map' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <MapIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2 rounded-md transition-colors ${
              view === 'list' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner className="h-full" />
      ) : view === 'map' ? (
        <MapView
          posts={posts}
          center={lat && lng ? [lat, lng] : undefined}
          zoom={lat && lng ? 13 : 3}
        />
      ) : (
        <div className="overflow-y-auto h-full">
          {posts.length === 0 ? (
            <EmptyState
              icon={<MapPin className="w-12 h-12" />}
              title="No discoveries nearby"
              className="h-full"
            />
          ) : (
            <div className="grid grid-cols-2 gap-2 p-2">
              {posts.map(post => (
                <Link
                  key={post.id}
                  to={`/post/${post.id}`}
                  className="relative aspect-square rounded-xl overflow-hidden bg-gray-100"
                >
                  <img
                    src={post.thumbnailUrl || post.imageUrl}
                    alt={post.title || 'Pareidolia'}
                    className={`w-full h-full object-cover ${post.isNsfw ? 'blur-lg' : ''}`}
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-white text-xs truncate">
                      @{post.username}
                    </p>
                    {post.address && (
                      <p className="text-white/80 text-xs truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {post.address}
                      </p>
                    )}
                  </div>
                  {post.checkinsCount > 0 && (
                    <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded-full text-xs font-medium">
                      {post.checkinsCount} 👀
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
