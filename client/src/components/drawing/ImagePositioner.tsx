import { useState, useRef, useCallback, useEffect } from 'react'
import { Check, X, RotateCcw, ZoomIn, Move } from 'lucide-react'

export interface ImageTransform {
  x: number
  y: number
  scale: number
  rotation: number
}

interface ImagePositionerProps {
  imageUrl: string
  onDone: (transform: ImageTransform) => void
  onCancel: () => void
}

interface TouchPoint {
  id: number
  x: number
  y: number
}

export default function ImagePositioner({ imageUrl, onDone, onCancel }: ImagePositionerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<ImageTransform>({
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
  })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // Touch tracking
  const touchesRef = useRef<TouchPoint[]>([])
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null)
  const lastDistanceRef = useRef<number | null>(null)
  const lastAngleRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)

  // Calculate initial scale to fit image in container
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height })

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })

        // Calculate scale to fit image in container
        const fitScale = Math.min(
          rect.width / img.width,
          rect.height / img.height
        )
        setTransform(prev => ({ ...prev, scale: fitScale }))
      }
    }
    img.src = imageUrl
  }, [imageUrl])

  // Update container size on resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Get distance between two touch points
  const getDistance = (p1: TouchPoint, p2: TouchPoint): number => {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Get angle between two touch points
  const getAngle = (p1: TouchPoint, p2: TouchPoint): number => {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI)
  }

  // Get center point between two touches (available for future pinch-to-center feature)
  const _getCenter = (p1: TouchPoint, p2: TouchPoint): { x: number; y: number } => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    }
  }
  void _getCenter // Prevent unused warning

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const touches = Array.from(e.touches).map(t => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY,
    }))
    touchesRef.current = touches

    if (touches.length === 1) {
      // Single touch - start dragging
      isDraggingRef.current = true
      lastTouchRef.current = { x: touches[0].x, y: touches[0].y }
    } else if (touches.length === 2) {
      // Two touches - start pinch/rotate
      lastDistanceRef.current = getDistance(touches[0], touches[1])
      lastAngleRef.current = getAngle(touches[0], touches[1])
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const touches = Array.from(e.touches).map(t => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY,
    }))

    if (touches.length === 1 && isDraggingRef.current && lastTouchRef.current) {
      // Single touch - pan
      const dx = touches[0].x - lastTouchRef.current.x
      const dy = touches[0].y - lastTouchRef.current.y

      setTransform(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }))

      lastTouchRef.current = { x: touches[0].x, y: touches[0].y }
    } else if (touches.length === 2) {
      // Two touches - pinch to zoom and rotate
      const currentDistance = getDistance(touches[0], touches[1])
      const currentAngle = getAngle(touches[0], touches[1])

      if (lastDistanceRef.current !== null && lastAngleRef.current !== null) {
        // Calculate scale change
        const scaleDelta = currentDistance / lastDistanceRef.current

        // Calculate rotation change
        let angleDelta = currentAngle - lastAngleRef.current
        // Normalize angle delta to handle wrap-around
        if (angleDelta > 180) angleDelta -= 360
        if (angleDelta < -180) angleDelta += 360

        setTransform(prev => ({
          ...prev,
          scale: Math.max(0.1, Math.min(5, prev.scale * scaleDelta)),
          rotation: prev.rotation + angleDelta,
        }))
      }

      lastDistanceRef.current = currentDistance
      lastAngleRef.current = currentAngle
    }

    touchesRef.current = touches
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const remainingTouches = Array.from(e.touches).map(t => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY,
    }))

    if (remainingTouches.length === 0) {
      isDraggingRef.current = false
      lastTouchRef.current = null
      lastDistanceRef.current = null
      lastAngleRef.current = null
    } else if (remainingTouches.length === 1) {
      // Switched from two touches to one - reset to drag mode
      isDraggingRef.current = true
      lastTouchRef.current = { x: remainingTouches[0].x, y: remainingTouches[0].y }
      lastDistanceRef.current = null
      lastAngleRef.current = null
    }

    touchesRef.current = remainingTouches
  }, [])

  // Mouse support for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true
    lastTouchRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingRef.current && lastTouchRef.current) {
      const dx = e.clientX - lastTouchRef.current.x
      const dy = e.clientY - lastTouchRef.current.y

      setTransform(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }))

      lastTouchRef.current = { x: e.clientX, y: e.clientY }
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
    lastTouchRef.current = null
  }, [])

  // Mouse wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(5, prev.scale * delta)),
    }))
  }, [])

  // Reset to default position
  const handleReset = () => {
    if (imageSize.width && containerSize.width) {
      const fitScale = Math.min(
        containerSize.width / imageSize.width,
        containerSize.height / imageSize.height
      )
      setTransform({
        x: 0,
        y: 0,
        scale: fitScale,
        rotation: 0,
      })
    }
  }

  // Double tap to reset
  const lastTapRef = useRef<number>(0)
  const handleDoubleTap = useCallback(() => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      handleReset()
    }
    lastTapRef.current = now
  }, [containerSize, imageSize])

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <button onClick={onCancel} className="p-1">
          <X className="w-6 h-6" />
        </button>
        <h2 className="font-semibold">Position your image</h2>
        <button
          onClick={() => onDone(transform)}
          className="p-1 text-eidola-orange"
        >
          <Check className="w-6 h-6" />
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-gray-800 text-white text-center py-2 text-sm flex items-center justify-center gap-4">
        <span className="flex items-center gap-1">
          <Move className="w-4 h-4" /> Drag
        </span>
        <span className="flex items-center gap-1">
          <ZoomIn className="w-4 h-4" /> Pinch
        </span>
        <span className="flex items-center gap-1">
          <RotateCcw className="w-4 h-4" /> Rotate
        </span>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden touch-none cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleDoubleTap}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px)`,
          }}
        >
          <img
            src={imageUrl}
            alt="Position your image"
            className="max-w-none select-none pointer-events-none"
            style={{
              transform: `scale(${transform.scale}) rotate(${transform.rotation}deg)`,
              transformOrigin: 'center center',
            }}
            draggable={false}
          />
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="bg-white px-4 py-3 flex items-center justify-center gap-4 border-t">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>

        {/* Scale indicator */}
        <div className="text-sm text-gray-500">
          {Math.round(transform.scale * 100)}%
        </div>

        {/* Rotation indicator */}
        <div className="text-sm text-gray-500">
          {Math.round(transform.rotation)}°
        </div>
      </div>
    </div>
  )
}
