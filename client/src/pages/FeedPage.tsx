import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useFeed, likePost, susPost, realPost, confessPost } from '../hooks/usePosts'
import { useToast } from '../contexts/ToastContext'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PostCard from '../components/post/PostCard'
import CommentsSheet from '../components/post/CommentsSheet'
import LocationChainSheet from '../components/post/LocationChainSheet'
import ChallengeSheet from '../components/post/ChallengeSheet'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import { Loader2, RefreshCw } from 'lucide-react'

export default function FeedPage() {
  const { getToken } = useAuth()
  const [commentPostId, setCommentPostId] = useState<number | null>(null)
  const [chainPostId, setChainPostId] = useState<number | null>(null)
  const [challengePostId, setChallengePostId] = useState<number | null>(null)
  const { showSuccess } = useToast()
  const { posts, isLoading, error, hasMore, loadMore, refresh } = useFeed()

  const {
    isRefreshing,
    pullDistance,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = usePullToRefresh({ onRefresh: refresh })

  // Find challenge post for ChallengeSheet props
  const challengePost = challengePostId ? posts.find(p => p.id === challengePostId) : null

  if (isLoading && posts.length === 0) {
    return <LoadingSpinner fullHeight />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-gray-500">{error}</p>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 btn-gradient rounded-full"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        emoji="👀"
        title="Your feed is empty"
        description="Follow people or select interests to see pareidolia discoveries here"
        className="min-h-[50vh]"
      />
    )
  }

  const handleLike = async (postId: number) => {
    const token = await getToken()
    await likePost(postId, token)
  }

  const handleSus = async (postId: number) => {
    const token = await getToken()
    const result = await susPost(postId, token)
    if (result.pointsEarned && result.pointsEarned > 0) {
      showSuccess(`+${result.pointsEarned} point for contributing to the community!`)
    }
  }

  const handleReal = async (postId: number) => {
    const token = await getToken()
    const result = await realPost(postId, token)
    if (result.pointsEarned && result.pointsEarned > 0) {
      showSuccess(`+${result.pointsEarned} point for contributing to the community!`)
    }
  }

  const handleConfess = async (postId: number) => {
    const token = await getToken()
    const result = await confessPost(postId, token)
    if (result.pointsEarned && result.pointsEarned > 0) {
      showSuccess(`+${result.pointsEarned} points for being honest! Respect.`)
    }
  }

  return (
    <div
      className="max-w-lg mx-auto overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: isRefreshing ? 48 : (pullDistance > 0 ? pullDistance : 0) }}
      >
        <div
          className={`flex items-center gap-2 text-sm ${
            isRefreshing ? 'text-eidola-orange' : 'text-gray-500'
          }`}
          style={isRefreshing ? {} : {
            transform: `rotate(${Math.min(pullDistance * 3, 360)}deg)`,
            opacity: Math.min(pullDistance / 60, 1),
          }}
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing && <span>Refreshing...</span>}
        </div>
      </div>

      {/* Manual refresh button (fallback for non-touch devices) */}
      {!isRefreshing && (
        <button
          onClick={refresh}
          className="w-full py-3 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-eidola-orange transition-colors md:flex hidden"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      )}

      {/* Posts */}
      <div className="divide-y divide-gray-100">
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            onLike={handleLike}
            onSus={handleSus}
            onReal={handleReal}
            onConfess={handleConfess}
            onComment={setCommentPostId}
            onLocationChain={setChainPostId}
            onChallengeChain={setChallengePostId}
          />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="py-8 flex justify-center">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="px-6 py-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}

      {/* Comments sheet */}
      <CommentsSheet
        postId={commentPostId}
        onClose={() => setCommentPostId(null)}
      />

      {/* Location chain sheet */}
      <LocationChainSheet
        postId={chainPostId}
        onClose={() => setChainPostId(null)}
      />

      {/* Challenge sheet */}
      <ChallengeSheet
        postId={challengePostId}
        imageUrl={challengePost?.imageUrl}
        hasSubmitted={challengePost?.hasSubmitted || false}
        submissionsCount={challengePost?.submissionsCount || 0}
        onClose={() => setChallengePostId(null)}
      />
    </div>
  )
}
