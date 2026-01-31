import { useState, useEffect, useCallback, useRef } from 'react'

interface UseAsyncDataOptions<T> {
  fetcher: () => Promise<T>
  deps?: unknown[]
  enabled?: boolean
  onError?: (error: Error) => void
}

interface UseAsyncDataResult<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAsyncData<T>({
  fetcher,
  deps = [],
  enabled = true,
  onError,
}: UseAsyncDataOptions<T>): UseAsyncDataResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)

  // Keep fetcher ref up to date
  fetcherRef.current = fetcher

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await fetcherRef.current()
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      if (onError && err instanceof Error) {
        onError(err)
      }
      console.error('useAsyncData error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [onError])

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])

  return { data, isLoading, error, refetch: fetchData }
}

export default useAsyncData
