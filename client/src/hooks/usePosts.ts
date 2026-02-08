import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { get, post, del } from '../utils/api'
import { usePaginatedData } from './usePaginatedData'
import type { Post, Comment, Tag } from '../types/post'

export function useFeed() {
  const { items: posts, ...rest } = usePaginatedData<Post>({
    endpoint: '/feed',
    requiresAuth: true,
  })
  return { posts, ...rest }
}

export function useExplorePosts(lat?: number, lng?: number) {
  const params = lat && lng ? { lat, lng } : undefined
  const { items: posts, ...rest } = usePaginatedData<Post>({
    endpoint: '/feed/explore',
    params,
  })
  return { posts, ...rest }
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
        const token = await getToken()
        const data = await get<Comment[]>(`/posts/${postId}/comments`, undefined, token)
        setComments(data)
      } catch (err) {
        console.error('Failed to fetch comments:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchComments()
  }, [postId, getToken])

  const addComment = async (content: string) => {
    if (!postId) return
    const token = await getToken()
    await post(`/posts/${postId}/comments`, { content }, token)
    // Refetch comments
    const data = await get<Comment[]>(`/posts/${postId}/comments`, undefined, token)
    setComments(data)
  }

  const toggleCommentLike = async (commentId: number) => {
    if (!postId) return
    const token = await getToken()

    // Optimistic update
    setComments(prev => prev.map(c => {
      if (c.id !== commentId) return c
      const wasLiked = c.isLiked
      return {
        ...c,
        isLiked: !wasLiked,
        likesCount: wasLiked ? c.likesCount - 1 : c.likesCount + 1,
      }
    }))

    try {
      await likeComment(postId, commentId, token)
    } catch (err) {
      // Revert on error
      setComments(prev => prev.map(c => {
        if (c.id !== commentId) return c
        const wasLiked = c.isLiked
        return {
          ...c,
          isLiked: !wasLiked,
          likesCount: wasLiked ? c.likesCount - 1 : c.likesCount + 1,
        }
      }))
      console.error('Failed to toggle comment like:', err)
    }
  }

  return { comments, isLoading, addComment, toggleCommentLike }
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

export async function likeComment(postId: number, commentId: number, token?: string | null): Promise<{ liked: boolean }> {
  return post(`/posts/${postId}/comments/${commentId}/like`, undefined, token)
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

export async function susPost(postId: number, token?: string | null): Promise<{ sus: boolean; removedReal?: boolean; pointsEarned?: number }> {
  return post(`/posts/${postId}/sus`, undefined, token)
}

export async function realPost(postId: number, token?: string | null): Promise<{ real: boolean; removedSus?: boolean; pointsEarned?: number }> {
  return post(`/posts/${postId}/real`, undefined, token)
}

export async function confessPost(postId: number, token?: string | null): Promise<{ busted: boolean; pointsEarned?: number }> {
  return post(`/posts/${postId}/confess`, undefined, token)
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
