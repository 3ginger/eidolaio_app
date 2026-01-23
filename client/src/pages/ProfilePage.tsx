import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useUser, useProfile } from '../hooks/useUser'
import { get, post } from '../utils/api'
import { Settings, Grid3X3, Trophy, MapPin, Loader2 } from 'lucide-react'

interface ProfilePost {
  id: number
  imageUrl: string
  thumbnailUrl?: string
  isNsfw: boolean
  likesCount: number
  commentsCount: number
  type: string
}

export default function ProfilePage() {
  const { username } = useParams<{ username?: string }>()
  const { user: currentUser, isLoading: currentUserLoading } = useUser()
  const { profile, isLoading: profileLoading } = useProfile(username)

  const [posts, setPosts] = useState<ProfilePost[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'challenges' | 'checkins'>('posts')
  const [isFollowing, setIsFollowing] = useState(false)

  // Determine which user to show
  const user = username ? profile : currentUser
  const isOwnProfile = !username || username === currentUser?.username
  const isLoading = username ? profileLoading : currentUserLoading

  useEffect(() => {
    if (profile) {
      setIsFollowing(profile.isFollowing || false)
    }
  }, [profile])

  useEffect(() => {
    if (!user) return

    const fetchPosts = async () => {
      try {
        setPostsLoading(true)
        const data = await get<{ posts: ProfilePost[] }>(`/user/${user.username}/posts`)
        setPosts(data.posts)
      } catch (err) {
        console.error('Failed to fetch posts:', err)
      } finally {
        setPostsLoading(false)
      }
    }

    fetchPosts()
  }, [user])

  const handleFollow = async () => {
    if (!user) return
    const result = await post<{ following: boolean }>(`/user/${user.username}/follow`)
    setIsFollowing(result.following)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-eidola-orange" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500">User not found</p>
        <Link to="/feed" className="text-eidola-orange">
          Back to Feed
        </Link>
      </div>
    )
  }

  const filteredPosts = posts.filter(p => {
    if (activeTab === 'challenges') return p.type === 'challenge'
    if (activeTab === 'checkins') return p.type === 'persistent'
    return true
  })

  return (
    <div className="max-w-lg mx-auto pb-20">
      {/* Header */}
      <div className="px-4 py-6">
        <div className="flex items-start justify-between mb-4">
          {/* Avatar */}
          <img
            src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
            alt={user.username}
            className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
          />

          {/* Actions */}
          <div className="flex gap-2">
            {isOwnProfile ? (
              <Link
                to="/settings"
                className="p-2 bg-gray-100 rounded-full"
              >
                <Settings className="w-5 h-5" />
              </Link>
            ) : (
              <button
                onClick={handleFollow}
                className={`px-6 py-2 rounded-full font-medium ${
                  isFollowing
                    ? 'bg-gray-100 text-gray-700'
                    : 'btn-gradient text-white'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        {/* Name & username */}
        <h1 className="text-xl font-bold">{user.displayName || user.username}</h1>
        <p className="text-gray-500">@{user.username}</p>

        {/* Bio */}
        {user.bio && (
          <p className="mt-2 text-gray-700">{user.bio}</p>
        )}

        {/* Stats */}
        <div className="flex gap-6 mt-4">
          <div className="text-center">
            <div className="font-bold">{user.postsCount || 0}</div>
            <div className="text-sm text-gray-500">Posts</div>
          </div>
          <div className="text-center">
            <div className="font-bold">{user.followersCount || 0}</div>
            <div className="text-sm text-gray-500">Followers</div>
          </div>
          <div className="text-center">
            <div className="font-bold">{user.followingCount || 0}</div>
            <div className="text-sm text-gray-500">Following</div>
          </div>
          <div className="text-center">
            <div className="font-bold">{user.points || 0}</div>
            <div className="text-sm text-gray-500">Points</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 ${
            activeTab === 'posts' ? 'border-b-2 border-eidola-orange text-eidola-orange' : 'text-gray-500'
          }`}
        >
          <Grid3X3 className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('challenges')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 ${
            activeTab === 'challenges' ? 'border-b-2 border-eidola-orange text-eidola-orange' : 'text-gray-500'
          }`}
        >
          <Trophy className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('checkins')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 ${
            activeTab === 'checkins' ? 'border-b-2 border-eidola-orange text-eidola-orange' : 'text-gray-500'
          }`}
        >
          <MapPin className="w-5 h-5" />
        </button>
      </div>

      {/* Posts grid */}
      {postsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-eidola-orange" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="text-4xl">
            {activeTab === 'posts' && '📸'}
            {activeTab === 'challenges' && '🏆'}
            {activeTab === 'checkins' && '📍'}
          </div>
          <p className="text-gray-500">
            {activeTab === 'posts' && 'No posts yet'}
            {activeTab === 'challenges' && 'No challenges yet'}
            {activeTab === 'checkins' && 'No check-ins yet'}
          </p>
          {isOwnProfile && (
            <Link to="/create" className="btn-gradient px-6 py-2 rounded-full text-white">
              Create One
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 p-1">
          {filteredPosts.map(post => (
            <Link
              key={post.id}
              to={`/post/${post.id}`}
              className="relative aspect-square bg-gray-100"
            >
              <img
                src={post.thumbnailUrl || post.imageUrl}
                alt=""
                className={`w-full h-full object-cover ${post.isNsfw ? 'blur-lg' : ''}`}
              />
              {/* Engagement overlay on hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                <span className="flex items-center gap-1">
                  ❤️ {post.likesCount}
                </span>
                <span className="flex items-center gap-1">
                  💬 {post.commentsCount}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
