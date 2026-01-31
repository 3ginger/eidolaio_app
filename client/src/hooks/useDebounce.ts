import { useState, useEffect } from 'react'

/**
 * Debounces a value by delaying updates until after the specified delay.
 * Useful for reducing API calls on rapid state changes (e.g., geolocation, search).
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Returns a debounced version of coordinates.
 * Useful for map/location updates that should not trigger too many API calls.
 */
export function useDebouncedCoords(
  lat: number | null,
  lng: number | null,
  delay: number = 300
): { lat: number | null; lng: number | null } {
  const debouncedLat = useDebounce(lat, delay)
  const debouncedLng = useDebounce(lng, delay)

  return { lat: debouncedLat, lng: debouncedLng }
}
