import { useState, useEffect, useCallback } from 'react'

interface GeolocationState {
  lat: number | null
  lng: number | null
  accuracy: number | null
  error: string | null
  isLoading: boolean
}

interface UseGeolocationReturn extends GeolocationState {
  refresh: () => void
  requestPermission: () => Promise<boolean>
}

export function useGeolocation(autoFetch = false): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    error: null,
    isLoading: autoFetch,
  })

  const getPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        isLoading: false,
      }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          isLoading: false,
        })
      },
      (error) => {
        let message = 'Failed to get location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Location unavailable'
            break
          case error.TIMEOUT:
            message = 'Location request timed out'
            break
        }
        setState(prev => ({
          ...prev,
          error: message,
          isLoading: false,
        }))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    )
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.permissions) {
      // Try to get position directly
      getPosition()
      return true
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' })
      if (result.state === 'granted') {
        getPosition()
        return true
      } else if (result.state === 'prompt') {
        getPosition() // This will trigger the permission prompt
        return true
      } else {
        setState(prev => ({
          ...prev,
          error: 'Location permission denied',
          isLoading: false,
        }))
        return false
      }
    } catch {
      getPosition()
      return true
    }
  }, [getPosition])

  useEffect(() => {
    if (autoFetch) {
      getPosition()
    }
  }, [autoFetch, getPosition])

  return {
    ...state,
    refresh: getPosition,
    requestPermission,
  }
}

// Calculate distance between two points in meters
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

// Format distance for display
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}
