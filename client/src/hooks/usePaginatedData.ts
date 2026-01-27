import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { get } from '../utils/api'

interface PaginatedResponse<T> {
  posts: T[]
  page: number
  hasMore: boolean
}

interface UsePaginatedDataOptions {
  endpoint: string
  params?: Record<string, unknown>
  requiresAuth?: boolean
}

interface UsePaginatedDataReturn<T> {
  items: T[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

export function usePaginatedData<T>(options: UsePaginatedDataOptions): UsePaginatedDataReturn<T> {
  const { endpoint, params = {}, requiresAuth = false } = options
  const { getToken } = useAuth()
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (pageNum: number, append = false) => {
    try {
      setIsLoading(true)
      setError(null)
      const token = requiresAuth ? await getToken() : null
      const data = await get<PaginatedResponse<T>>(endpoint, { ...params, page: pageNum }, token)

      if (append) {
        setItems(prev => [...prev, ...data.posts])
      } else {
        setItems(data.posts)
      }
      setHasMore(data.hasMore)
      setPage(pageNum)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, JSON.stringify(params), requiresAuth, getToken])

  useEffect(() => {
    fetchData(1)
  }, [fetchData])

  const loadMore = async () => {
    if (hasMore && !isLoading) {
      await fetchData(page + 1, true)
    }
  }

  const refresh = async () => {
    await fetchData(1)
  }

  return { items, isLoading, error, hasMore, loadMore, refresh }
}
