import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import { useGeolocation } from '../../hooks/useGeolocation'
import LoadingSpinner from '../ui/LoadingSpinner'
import { MapPin, Search, X, Crosshair } from 'lucide-react'

interface LocationPickerProps {
  onSelect: (location: { lat: number; lng: number }, address: string) => void
  onCancel: () => void
  initialLocation?: { lat: number; lng: number } | null
  initialAddress?: string
}

interface SearchResult {
  place_id: number
  lat: string
  lon: string
  display_name: string
}

// Helper to create marker icon
const createMarkerIcon = () => L.divIcon({
  className: 'custom-marker',
  html: `<div class="w-10 h-10 flex items-center justify-center">
    <div class="w-4 h-4 bg-eidola-orange rounded-full border-4 border-white shadow-lg"></div>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})

export default function LocationPicker({ onSelect, onCancel, initialLocation, initialAddress }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  const { lat, lng, requestPermission, isLoading: geoLoading } = useGeolocation()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(initialLocation || null)
  const [selectedAddress, setSelectedAddress] = useState(initialAddress || '')

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return

    // Use initial location if available, otherwise default
    const initialCenter: [number, number] = initialLocation
      ? [initialLocation.lat, initialLocation.lng]
      : [51.505, -0.09]
    const initialZoom = initialLocation ? 15 : 13

    const map = L.map(mapRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Handle map click
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng
      await setMarkerAndReverse(lat, lng)
    })

    leafletMapRef.current = map

    // If there's an initial location, add the marker
    if (initialLocation) {
      markerRef.current = L.marker([initialLocation.lat, initialLocation.lng], {
        icon: createMarkerIcon(),
        draggable: true
      }).addTo(map)
      setupMarkerDragHandler(markerRef.current)
    } else {
      // Request location only if no initial location
      requestPermission()
    }

    return () => {
      map.remove()
      leafletMapRef.current = null
    }
  }, [])

  // Update map when geolocation is available
  useEffect(() => {
    if (lat && lng && leafletMapRef.current && !selectedLocation) {
      leafletMapRef.current.setView([lat, lng], 15)
    }
  }, [lat, lng, selectedLocation])

  // Setup drag handler for marker
  const setupMarkerDragHandler = (marker: L.Marker) => {
    marker.on('dragend', async () => {
      const pos = marker.getLatLng()
      await reverseGeocode(pos.lat, pos.lng)
      setSelectedLocation({ lat: pos.lat, lng: pos.lng })
    })
  }

  // Set marker and reverse geocode
  const setMarkerAndReverse = async (lat: number, lng: number) => {
    if (!leafletMapRef.current) return

    // Update or create marker
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      markerRef.current = L.marker([lat, lng], {
        icon: createMarkerIcon(),
        draggable: true
      }).addTo(leafletMapRef.current)
      setupMarkerDragHandler(markerRef.current)
    }

    // Reverse geocode
    await reverseGeocode(lat, lng)
    setSelectedLocation({ lat, lng })
  }

  // Reverse geocode using Nominatim
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      )
      const data = await response.json()
      const address = data.display_name?.split(',').slice(0, 3).join(',') || 'Unknown location'
      setSelectedAddress(address)
    } catch (err) {
      console.error('Reverse geocode error:', err)
      setSelectedAddress('Unknown location')
    }
  }

  // Search locations
  const handleSearch = async (query: string) => {
    setSearchQuery(query)

    if (query.length < 3) {
      setSearchResults([])
      return
    }

    try {
      setIsSearching(true)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`
      )
      const data = await response.json()
      setSearchResults(data)
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  // Select search result
  const handleSelectResult = async (result: SearchResult) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)

    if (leafletMapRef.current) {
      leafletMapRef.current.setView([lat, lng], 16)
    }

    await setMarkerAndReverse(lat, lng)
    setSearchResults([])
    setSearchQuery('')
  }

  // Go to current location
  const goToCurrentLocation = () => {
    if (lat && lng && leafletMapRef.current) {
      leafletMapRef.current.setView([lat, lng], 16)
      setMarkerAndReverse(lat, lng)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b flex items-center gap-3">
        <button onClick={onCancel}>
          <X className="w-6 h-6" />
        </button>
        <h2 className="font-semibold flex-1">Select Location</h2>
        <button
          onClick={() => selectedLocation && onSelect(selectedLocation, selectedAddress)}
          disabled={!selectedLocation}
          className="text-eidola-orange font-medium disabled:opacity-50"
        >
          Done
        </button>
      </div>

      {/* Search bar */}
      <div className="relative bg-white px-4 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search for a place..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-xl focus:outline-none"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <LoadingSpinner size="sm" color="default" />
            </div>
          )}
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="absolute left-4 right-4 top-full bg-white border rounded-xl shadow-lg mt-1 z-[9999] max-h-64 overflow-y-auto">
            {searchResults.map(result => (
              <button
                key={result.place_id}
                onClick={() => handleSelectResult(result)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0"
              >
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{result.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div ref={mapRef} className="flex-1" />

      {/* Current location button */}
      <button
        onClick={goToCurrentLocation}
        disabled={geoLoading || !lat}
        className="absolute bottom-24 right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center disabled:opacity-50"
      >
        {geoLoading ? (
          <LoadingSpinner size="sm" color="default" />
        ) : (
          <Crosshair className="w-5 h-5 text-eidola-teal" />
        )}
      </button>

      {/* Selected location info */}
      {selectedLocation && (
        <div className="bg-white px-4 py-4 border-t">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-eidola-teal flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">{selectedAddress}</div>
              <div className="text-sm text-gray-500">
                {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
