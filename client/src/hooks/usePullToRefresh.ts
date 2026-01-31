import { useState, useRef, useCallback, TouchEvent } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  maxPull?: number
}

interface UsePullToRefreshResult {
  isRefreshing: boolean
  pullDistance: number
  handleTouchStart: (e: TouchEvent) => void
  handleTouchMove: (e: TouchEvent) => void
  handleTouchEnd: () => void
}

/**
 * Hook for implementing pull-to-refresh functionality
 *
 * @param options - Configuration options
 * @param options.onRefresh - Async function to call when refresh is triggered
 * @param options.threshold - Distance in pixels to trigger refresh (default: 60)
 * @param options.maxPull - Maximum pull distance (default: 120)
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 60,
  maxPull = 120,
}: UsePullToRefreshOptions): UsePullToRefreshResult {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const isPulling = useRef(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only start pull if at top of scroll container
    const target = e.currentTarget as HTMLElement
    if (target.scrollTop !== 0) return

    startY.current = e.touches[0].clientY
    isPulling.current = true
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current || isRefreshing) return

    const currentY = e.touches[0].clientY
    const diff = currentY - startY.current

    // Only pull down, not up
    if (diff > 0) {
      // Apply resistance to make pull feel natural
      const resistance = 0.5
      const newDistance = Math.min(diff * resistance, maxPull)
      setPullDistance(newDistance)
    }
  }, [isRefreshing, maxPull])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return

    isPulling.current = false

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }

    setPullDistance(0)
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  return {
    isRefreshing,
    pullDistance,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
}
