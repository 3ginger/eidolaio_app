// API utility functions
const API_BASE = import.meta.env.VITE_API_URL || 'https://api-omega-opal-59.vercel.app/api'

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
  token?: string | null
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, token, ...fetchOptions } = options

  // Build URL with query params
  let url = `${API_BASE}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value))
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      url += `?${queryString}`
    }
  }

  // Default headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((fetchOptions.headers as Record<string, string>) || {}),
  }

  // Add Authorization header if token is provided
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new ApiError(response.status, error.error || error.message || 'Request failed')
  }

  return response.json()
}

// GET request
export async function get<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>,
  token?: string | null
): Promise<T> {
  return fetchApi<T>(endpoint, { method: 'GET', params, token })
}

// POST request
export async function post<T>(
  endpoint: string,
  data?: unknown,
  token?: string | null
): Promise<T> {
  return fetchApi<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
    token,
  })
}

// PATCH request
export async function patch<T>(
  endpoint: string,
  data?: unknown,
  token?: string | null
): Promise<T> {
  return fetchApi<T>(endpoint, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
    token,
  })
}

// PUT request
export async function put<T>(
  endpoint: string,
  data?: unknown,
  token?: string | null
): Promise<T> {
  return fetchApi<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
    token,
  })
}

// DELETE request
export async function del<T>(endpoint: string, token?: string | null): Promise<T> {
  return fetchApi<T>(endpoint, { method: 'DELETE', token })
}

export { ApiError }
