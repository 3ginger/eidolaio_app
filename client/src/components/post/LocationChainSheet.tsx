import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { get } from '../../utils/api'
import { useGeolocation } from '../../hooks/useGeolocation'
import { getPositionBadge } from '../../utils/badges'
import type { PhotoChainEntry } from '../../types/post'
import { X, MapPin, Camera, Loader2 } from 'lucide-react'

interface LocationChainSheetProps {
  postId: number | null
  onClose: () => void
}

export default function LocationChainSheet({ postId, onClose }: LocationChainSheetProps) {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const { lat, lng, requestPermission } = useGeolocation()
  const [entries, setEntries] = useState<PhotoChainEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [canJoin, setCanJoin] = useState(false)
  const [distance, setDistance] = useState<number | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)

  // Fetch chain entries
  useEffect(() => {
    if (!postId) return
    setIsLoading(true)
    const fetchChain = async () => {
      try {
        const token = await getToken()
        const data = await get<{ entries: PhotoChainEntry[] }>(`/chain/${postId}`, undefined, token)
        setEntries(data.entries)
      } catch (err) {
        console.error('Failed to fetch chain:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchChain()
  }, [postId, getToken])

  // Check if user can join
  useEffect(() => {
    if (!postId || !lat || !lng) return
    const checkCanJoin = async () => {
      try {
        const token = await getToken()
        const data = await get<{ canJoin: boolean; distance?: number }>(`/chain/${postId}/can-join`, { lat, lng }, token)
        setCanJoin(data.canJoin)
        if (data.distance) setDistance(data.distance)
      } catch (err) {
        console.error('Failed to check join eligibility:', err)
      }
    }
    checkCanJoin()
  }, [postId, lat, lng, getToken])

  // Lock body scroll
  useEffect(() => {
    if (!postId) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [postId])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      setDragY(0)
      onClose()
    }, 200)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    setIsDragging(true)
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const diff = e.touches[0].clientY - dragStartY.current
    if (diff > 0) setDragY(diff)
  }
  const handleTouchEnd = () => {
    setIsDragging(false)
    if (dragY > 100) handleClose()
    else setDragY(0)
  }

  const handleJoinChain = () => {
    handleClose()
    navigate(`/create?joinChain=${postId}`)
  }

  if (!postId) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-black/50"
      onClick={handleBackdropClick}
      onTouchMove={(e) => e.stopPropagation()}
      style={{
        touchAction: 'none',
        opacity: isClosing ? 0 : 1 - dragY / 300,
        transition: isDragging ? 'none' : 'opacity 0.2s ease-out',
      }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl flex flex-col"
        style={{
          maxHeight: '70vh',
          overscrollBehavior: 'contain',
          transform: isClosing ? 'translateY(100%)' : `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 flex justify-center py-3 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 pb-3 border-b">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-eidola-teal" />
            <h2 className="font-semibold text-base">Photo Chain</h2>
            {!isLoading && <span className="text-sm text-gray-500">({entries.length})</span>}
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3" style={{ overscrollBehavior: 'contain' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No visitors yet</p>
              <p className="text-xs mt-1">Be the first to visit this spot!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3">
                  <div className="text-2xl w-10 text-center flex-shrink-0">
                    {getPositionBadge(entry.position)}
                  </div>
                  <img
                    src={entry.photoUrl}
                    alt={`${entry.user?.username}'s photo`}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/profile/${entry.user?.username}`}
                      className="font-medium text-sm truncate block"
                      onClick={handleClose}
                    >
                      {entry.user?.username}
                    </Link>
                    {entry.caption && (
                      <p className="text-xs text-gray-500 truncate">{entry.caption}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Join button */}
        <div
          className="flex-shrink-0 border-t bg-white px-4 py-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}
        >
          {!lat || !lng ? (
            <button
              onClick={() => requestPermission()}
              className="w-full py-3 bg-gray-100 rounded-xl text-gray-700 font-medium flex items-center justify-center gap-2"
            >
              <MapPin className="w-5 h-5" />
              Enable location to join
            </button>
          ) : canJoin ? (
            <button
              onClick={handleJoinChain}
              className="w-full py-3 btn-gradient rounded-xl text-white font-medium flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Join the Chain
            </button>
          ) : distance !== null ? (
            <div className="text-center text-gray-500 text-sm py-2">
              You're {Math.round(distance)}m away (need to be within 100m)
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  )
}
