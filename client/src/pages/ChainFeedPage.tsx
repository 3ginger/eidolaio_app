import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { get } from '../utils/api'
import type { Post, PhotoChainEntry } from '../types/post'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import Avatar from '../components/ui/Avatar'
import DrawingToggleButton from '../components/ui/DrawingToggleButton'
import { getPositionBadge, getPositionBadgeColor } from '../utils/badges'
import { formatRelativeDate } from '../utils/dateTime'
import { extractDrawingDataUrl } from '../utils/drawing'
import { ArrowLeft, MapPin, Link2 } from 'lucide-react'

interface ChainEntry extends PhotoChainEntry {
  userDrawing?: object
}

export default function ChainFeedPage() {
  const { postId } = useParams<{ postId: string }>()
  const { getToken } = useAuth()
  const [originalPost, setOriginalPost] = useState<Post | null>(null)
  const [entries, setEntries] = useState<ChainEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!postId) return

    const fetchChainData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const token = await getToken()

        // Fetch original post
        const post = await get<Post>(`/posts/${postId}`, undefined, token)
        setOriginalPost(post)

        // Fetch chain entries
        const chainData = await get<{ entries: ChainEntry[] }>(`/chain/${postId}`, undefined, token)
        setEntries(chainData.entries)
      } catch (err) {
        console.error('Failed to fetch chain:', err)
        setError(err instanceof Error ? err.message : 'Failed to load chain')
      } finally {
        setIsLoading(false)
      }
    }

    fetchChainData()
  }, [postId, getToken])

  if (isLoading) {
    return <LoadingSpinner fullHeight color="teal" />
  }

  if (error || !originalPost) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500 mb-4">{error || 'Post not found'}</p>
        <Link to="/feed" className="text-eidola-teal hover:underline">
          Back to feed
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b flex items-center gap-3">
        <Link to={`/post/${postId}`} className="p-1 -ml-1 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="font-semibold">Photo Chain</h1>
          <p className="text-sm text-gray-500">{entries.length} visitors</p>
        </div>
      </div>

      {/* Original post (anchor) */}
      <div className="bg-white border-b">
        <div className="px-4 py-3 flex items-center gap-2 bg-eidola-teal/10">
          <Link2 className="w-5 h-5 text-eidola-teal" />
          <span className="font-medium text-eidola-teal text-sm">Original Post</span>
        </div>

        <Link to={`/post/${originalPost.id}`} className="block">
          <div className="flex items-center gap-3 px-4 py-3">
            <Avatar user={{ avatarUrl: originalPost.user?.avatarUrl, username: originalPost.user?.username }} />
            <div>
              <span className="font-semibold text-sm">@{originalPost.user?.username}</span>
              {originalPost.address && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="w-3 h-3" />
                  {originalPost.address}
                </div>
              )}
            </div>
          </div>

          <img
            src={originalPost.thumbnailUrl || originalPost.imageUrl}
            alt={originalPost.title || 'Original post'}
            className="w-full aspect-square object-cover"
          />
        </Link>

        {originalPost.userCaption && (
          <div className="px-4 py-3">
            <p className="text-sm">
              <span className="font-semibold">@{originalPost.user?.username}</span>{' '}
              {originalPost.userCaption}
            </p>
          </div>
        )}
      </div>

      {/* Chain entries */}
      {entries.length === 0 ? (
        <EmptyState
          title="No one has joined this chain yet"
          description="Be the first to visit this spot!"
        />
      ) : (
        <div className="divide-y">
          {entries.map((entry) => (
            <ChainEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}

function ChainEntryCard({ entry }: { entry: ChainEntry }) {
  const [showDrawing, setShowDrawing] = useState(false)

  const drawingDataUrl = extractDrawingDataUrl(entry.userDrawing)
  const hasDrawing = !!drawingDataUrl

  return (
    <article className="bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link to={`/profile/${entry.user?.username}`} className="flex items-center gap-3">
          <Avatar user={{ avatarUrl: entry.user?.avatarUrl, username: entry.user?.username }} />
          <div>
            <span className="font-semibold text-sm">@{entry.user?.username}</span>
            <div className="text-xs text-gray-500">
              {formatRelativeDate(new Date(entry.createdAt))}
            </div>
          </div>
        </Link>

        {/* Position badge */}
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPositionBadgeColor(entry.position)}`}>
          {getPositionBadge(entry.position, 'text')}
        </span>
      </div>

      {/* Photo */}
      <div className="relative">
        <img
          src={showDrawing && drawingDataUrl ? drawingDataUrl : entry.photoUrl}
          alt={`${entry.user?.username}'s contribution`}
          className="w-full aspect-square object-cover"
        />

        {/* Drawing toggle button */}
        {hasDrawing && (
          <DrawingToggleButton
            showDrawing={showDrawing}
            onToggle={() => setShowDrawing(prev => !prev)}
            className="absolute bottom-3 right-3 z-10"
          />
        )}
      </div>

      {/* Caption */}
      {entry.caption && (
        <div className="px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold">@{entry.user?.username}</span>{' '}
            {entry.caption}
          </p>
        </div>
      )}
    </article>
  )
}
