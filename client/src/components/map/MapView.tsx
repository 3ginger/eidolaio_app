import { useEffect, useRef } from 'react'
import L from 'leaflet'

interface MapPost {
  id: number
  imageUrl: string
  thumbnailUrl?: string
  title?: string
  isNsfw: boolean
  type: string
  location: { lat: number; lng: number }
  address?: string
  checkinsCount: number
  username: string
}

interface MapViewProps {
  posts: MapPost[]
  center?: [number, number]
  zoom?: number
  onMarkerClick?: (postId: number) => void
}

export default function MapView({ posts, center, zoom = 13, onMarkerClick }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return

    // Initialize map
    const map = L.map(mapRef.current, {
      center: center || [51.505, -0.09], // Default to London
      zoom,
      zoomControl: false,
    })

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    leafletMapRef.current = map

    return () => {
      map.remove()
      leafletMapRef.current = null
    }
  }, [])

  // Update center when props change
  useEffect(() => {
    if (leafletMapRef.current && center) {
      leafletMapRef.current.setView(center, zoom)
    }
  }, [center, zoom])

  // Add markers for posts
  useEffect(() => {
    if (!leafletMapRef.current) return

    const map = leafletMapRef.current

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer)
      }
    })

    // Add markers for each post
    posts.forEach(post => {
      const { lat, lng } = post.location

      // Create custom marker icon
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div class="w-12 h-12 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
            <img
              src="${post.thumbnailUrl || post.imageUrl}"
              alt=""
              class="w-full h-full object-cover ${post.isNsfw ? 'blur-lg' : ''}"
            />
            ${post.checkinsCount > 0 ? `
              <div class="absolute -top-1 -right-1 bg-eidola-orange text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                ${post.checkinsCount}
              </div>
            ` : ''}
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      })

      const marker = L.marker([lat, lng], { icon }).addTo(map)

      // Create popup content
      const popupContent = document.createElement('div')
      popupContent.className = 'p-2 min-w-[200px]'
      popupContent.innerHTML = `
        <a href="/post/${post.id}" class="block">
          <img
            src="${post.thumbnailUrl || post.imageUrl}"
            alt="${post.title || 'Pareidolia'}"
            class="w-full h-32 object-cover rounded-lg mb-2 ${post.isNsfw ? 'blur-lg' : ''}"
          />
          <div class="font-medium text-sm">${post.title || 'What do you see?'}</div>
          <div class="text-xs text-gray-500">by @${post.username}</div>
          ${post.address ? `<div class="text-xs text-gray-400 mt-1">${post.address}</div>` : ''}
        </a>
      `

      marker.bindPopup(popupContent, {
        maxWidth: 250,
        className: 'custom-popup',
      })

      marker.on('click', () => {
        if (onMarkerClick) {
          onMarkerClick(post.id)
        }
      })
    })
  }, [posts, onMarkerClick])

  return (
    <div ref={mapRef} className="w-full h-full" />
  )
}
