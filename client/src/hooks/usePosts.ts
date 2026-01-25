import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { get, post, del } from '../utils/api'
import type { Post, Comment, Tag } from '../types/post'

interface PostsResponse {
  posts: Post[]
  page: number
  hasMore: boolean
}

interface UsePostsReturn {
  posts: Post[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

export function useFeed(): UsePostsReturn {
  const { getToken } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = useCallback(async (pageNum: number, append = false) => {
    try {
      setIsLoading(true)
      setError(null)
      const token = await getToken()
      const data = await get<PostsResponse>('/feed', { page: pageNum }, token)

      if (append) {
        setPosts(prev => [...prev, ...data.posts])
      } else {
        setPosts(data.posts)
      }
      setHasMore(data.hasMore)
      setPage(pageNum)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts')
    } finally {
      setIsLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchPosts(1)
  }, [fetchPosts])

  const loadMore = async () => {
    if (hasMore && !isLoading) {
      await fetchPosts(page + 1, true)
    }
  }

  const refresh = async () => {
    await fetchPosts(1)
  }

  return { posts, isLoading, error, hasMore, loadMore, refresh }
}

export function useExplorePosts(lat?: number, lng?: number) {
  const [posts, setPosts] = useState<Post[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = useCallback(async (pageNum: number, append = false) => {
    try {
      setIsLoading(true)
      const params: Record<string, number> = { page: pageNum }
      if (lat && lng) {
        params.lat = lat
        params.lng = lng
      }
      const data = await get<PostsResponse>('/feed/explore', params)

      if (append) {
        setPosts(prev => [...prev, ...data.posts])
      } else {
        setPosts(data.posts)
      }
      setHasMore(data.hasMore)
      setPage(pageNum)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts')
    } finally {
      setIsLoading(false)
    }
  }, [lat, lng])

  useEffect(() => {
    fetchPosts(1)
  }, [fetchPosts])

  return {
    posts,
    isLoading,
    error,
    hasMore,
    loadMore: async () => {
      if (hasMore && !isLoading) {
        await fetchPosts(page + 1, true)
      }
    },
    refresh: () => fetchPosts(1)
  }
}

export function usePost(postId: number | undefined) {
  const { getToken } = useAuth()
  const [post, setPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!postId) return

    const fetchPost = async () => {
      try {
        setIsLoading(true)
        const token = await getToken()
        const data = await get<Post>(`/posts/${postId}`, undefined, token)
        setPost(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch post')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPost()
  }, [postId, getToken])

  return { post, isLoading, error }
}

export function useComments(postId: number | undefined) {
  const { getToken } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!postId) return

    const fetchComments = async () => {
      try {
        setIsLoading(true)
        const data = await get<Comment[]>(`/posts/${postId}/comments`)
        setComments(data)
      } catch (err) {
        console.error('Failed to fetch comments:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchComments()
  }, [postId])

  const addComment = async (content: string) => {
    if (!postId) return
    const token = await getToken()
    await post(`/posts/${postId}/comments`, { content }, token)
    // Refetch comments
    const data = await get<Comment[]>(`/posts/${postId}/comments`)
    setComments(data)
  }

  return { comments, isLoading, addComment }
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const data = await get<Tag[]>('/user/tags/all')
        setTags(data)
      } catch (err) {
        console.error('Failed to fetch tags:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTags()
  }, [])

  return { tags, isLoading }
}

// Post actions
export async function likePost(postId: number, token?: string | null): Promise<{ liked: boolean }> {
  return post(`/posts/${postId}/like`, undefined, token)
}

export async function deletePost(postId: number, token?: string | null): Promise<void> {
  await del(`/posts/${postId}`, token)
}

export async function reportPost(
  postId: number,
  reason: 'spam' | 'nsfw' | 'harassment' | 'copyright' | 'other',
  description?: string,
  token?: string | null
): Promise<{ success: boolean; message: string }> {
  return post(`/posts/${postId}/report`, { reason, description }, token)
}

export async function createPost(data: {
  type: 'persistent' | 'temporary' | 'challenge'
  imageUrl: string
  thumbnailUrl?: string
  title?: string
  description?: string
  userMarkedNsfw?: boolean
  location?: { lat: number; lng: number }
  address?: string
  userDrawing?: object
  userCaption?: string
  isChallenge?: boolean
  challengeType?: 'draw' | 'text'
  challengeDifficulty?: 'easy' | 'medium' | 'hard'
  expiresAt?: string
  tags?: string[]
}, token?: string | null): Promise<{ id: number }> {
  return post('/posts', data, token)
}
