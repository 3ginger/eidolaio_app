import { useState, useCallback, useEffect, useMemo } from 'react'
import DebugConsole from './DebugConsole'
import { isNativePlatform } from '../../utils/nativeAuth'

export default function GlobalDebugTrigger() {
  const [showDebug, setShowDebug] = useState(false)
  const [tapCount, setTapCount] = useState(0)
  const [lastTapTime, setLastTapTime] = useState(0)

  // Check at render time, not module load time (after initNativePlatform runs)
  const isDebugEnabled = useMemo(() => {
    return isNativePlatform() ||
      (typeof window !== 'undefined' && window.location.search.includes('debug=true'))
  }, [])

  const handleTap = useCallback(() => {
    const now = Date.now()
    if (now - lastTapTime > 500) {
      setTapCount(1)
    } else {
      setTapCount(prev => prev + 1)
    }
    setLastTapTime(now)
  }, [lastTapTime])

  useEffect(() => {
    if (tapCount >= 3) {
      setShowDebug(true)
      setTapCount(0)
    }
  }, [tapCount])

  if (!isDebugEnabled) return null

  return (
    <>
      {/* Invisible tap zone - fixed in top-left, always on top */}
      <div
        onClick={handleTap}
        className="fixed top-0 left-0 w-20 h-20 z-[200]"
        style={{ touchAction: 'manipulation' }}
        aria-hidden="true"
      />
      <DebugConsole isOpen={showDebug} onClose={() => setShowDebug(false)} />
    </>
  )
}
