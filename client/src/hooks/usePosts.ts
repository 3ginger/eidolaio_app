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
