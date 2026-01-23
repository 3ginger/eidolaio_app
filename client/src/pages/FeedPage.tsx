import { useFeed, likePost } from '../hooks/usePosts'
import PostCard from '../components/post/PostCard'
import { Loader2, RefreshCw } from 'lucide-react'

export default function FeedPage() {
  const { posts, isLoading, error, hasMore, loadMore, refresh } = useFeed()

  if (isLoading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-eidola-orange" />
      </div>
    )
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
        <div className="text-6xl">👀</div>
        <h2 className="text-xl font-semibold text-eidola-text">Your feed is empty</h2>
        <p className="text-gray-500 text-center">
          Follow people or select interests to see pareidolia discoveries here
        </p>
      </div>
    )
  }

  const handleLike = async (postId: number) => {
    await likePost(postId)
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Pull to refresh hint */}
      <button
        onClick={refresh}
        className="w-full py-3 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-eidola-orange transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Refresh
      </button>

      {/* Posts */}
      <div className="divide-y divide-gray-100">
        {posts.map(post => (
          <PostCard key={post.id} post={post} onLike={handleLike} />
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
    </div>
  )
}
