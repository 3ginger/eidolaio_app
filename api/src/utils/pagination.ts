import type { Request } from 'express'

interface PaginationParams {
  page: number
  limit: number
  offset: number
}

/**
 * Parses pagination parameters from query string
 * @param query - The request query object
 * @param defaultLimit - Default number of items per page (default: 20)
 * @param maxLimit - Maximum allowed items per page (default: 100)
 */
export function parsePagination(
  query: Request['query'],
  defaultLimit = 20,
  maxLimit = 100
): PaginationParams {
  const page = Math.max(1, parseInt(query.page as string) || 1)
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit as string) || defaultLimit))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Creates a pagination response object
 */
export function paginationResponse<T>(
  items: T[],
  page: number,
  limit: number
): { items: T[]; page: number; hasMore: boolean } {
  return {
    items,
    page,
    hasMore: items.length === limit,
  }
}
