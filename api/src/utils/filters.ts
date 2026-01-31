/**
 * SQL filter utilities for common query patterns
 */

/**
 * Returns a SQL clause to exclude test users from queries
 * @param alias - The table alias for the users table (default: 'u')
 */
export const excludeTestUsers = (alias = 'u'): string =>
  `COALESCE(${alias}.is_test_user, false) = false`

/**
 * Returns a SQL clause to check if a post is not expired
 * @param alias - The table alias for the posts table (default: 'p')
 */
export const notExpired = (alias = 'p'): string =>
  `(${alias}.expires_at IS NULL OR ${alias}.expires_at > NOW())`
