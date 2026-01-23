import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser as useClerkUser } from '@clerk/clerk-react'
import { get, patch, put } from '../utils/api'
import type { User } from '../types/user'

// Declare Clerk on window
declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>
      }
      user?: {
        id: string
      }
      loaded?: boolean
    }
  }
}

interface UseUserReturn {
  user: User | null
  isLoading: boolean
  error: string | null
  updateProfile: (data: Partial<User>) => Promise<void>
  updateInterests: (interests: string[]) => Promise<void>
  refetch: () => Promise<void>
}

export function useUser(): UseUserReturn {
  const { isSignedIn, isLoaded } = useClerkUser()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchAttempted = useRef(false)

  const getToken = useCallback(async (): Promise<string | null> => {
    // Try to get token from window.Clerk directly
    if (window.Clerk?.session) {
      return window.Clerk.session.getToken()
    }
    return null
  }, [])

  const fetchUser = useCallback(async () => {
    // Wait for Clerk to be loaded
    if (!isLoaded) {
      return
    }

    // If not signed in, clear user
    if (!isSignedIn) {
      setUser(null)
      setIsLoading(false)
      return
    }

    // Check if Clerk is ready on window
    if (!window.Clerk?.session) {
      // Wait a bit for Clerk to initialize
      setTimeout(() => {
        if (window.Clerk?.session && !fetchAttempted.current) {
          fetchAttempted.current = true
          fetchUser()
        }
      }, 500)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const token = await getToken()

      if (!token) {
        setError('Failed to get authentication token')
        setUser(null)
        setIsLoading(false)
        return
      }

      const data = await get<User>('/user/me', undefined, token)
      setUser(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching user:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch user')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [isLoaded, isSignedIn, getToken])

  // Fetch user when auth state changes
  useEffect(() => {
    fetchAttempted.current = false
    fetchUser()
  }, [fetchUser])

  // Also listen for Clerk to load on window
  useEffect(() => {
    const checkClerk = () => {
      if (window.Clerk?.loaded && window.Clerk?.session && isSignedIn && !user && !fetchAttempted.current) {
        fetchAttempted.current = true
        fetchUser()
      }
    }

    // Check immediately
    checkClerk()

    // Also poll for a short time in case Clerk loads later
    const interval = setInterval(checkClerk, 200)
    const timeout = setTimeout(() => clearInterval(interval), 3000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [isSignedIn, user, fetchUser])

  const updateProfile = async (data: Partial<User>) => {
    const token = await getToken()
    if (!token) throw new Error('Not authenticated')
    await patch('/user/me', data, token)
    await fetchUser()
  }

  const updateInterests = async (interests: string[]) => {
    const token = await getToken()
    if (!token) throw new Error('Not authenticated')
    await put('/user/me/interests', { interests }, token)
    await fetchUser()
  }

  return {
    user,
    isLoading: !isLoaded || isLoading,
    error,
    updateProfile,
    updateInterests,
    refetch: fetchUser,
  }
}

// Hook for viewing other users' profiles
export function useProfile(username: string | undefined) {
  const [profile, setProfile] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!username) {
      setProfile(null)
      setIsLoading(false)
      return
    }

    const fetchProfile = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await get<User>(`/user/${username}`)
        setProfile(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch profile')
        setProfile(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [username])

  return { profile, isLoading, error }
}
