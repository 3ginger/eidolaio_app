import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

// Check if database is configured
const hasDatabase = !!process.env.POSTGRES_URL

// Create connection pool only if database is configured
const pool = hasDatabase ? new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}) : null

if (pool) {
  // Test connection
  pool.on('connect', () => {
    console.log('Database connected')
  })

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err)
  })
}

// Mock data for demo mode
const mockTags = [
  { id: 1, name: 'faces' },
  { id: 2, name: 'animals' },
  { id: 3, name: 'objects' },
  { id: 4, name: 'nature' },
  { id: 5, name: 'clouds' },
  { id: 6, name: 'rocks' },
  { id: 7, name: 'food' },
  { id: 8, name: 'buildings' },
  { id: 9, name: 'funny' },
  { id: 10, name: 'creepy' },
  { id: 11, name: 'artistic' },
]

const mockPosts = [
  {
    id: 1,
    user_id: 1,
    type: 'persistent',
    title: 'Face in the clouds',
    description: 'I saw this face while looking up at the sky',
    image_url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=400',
    is_nsfw: false,
    user_marked_nsfw: false,
    moderation_status: 'approved',
    user_caption: 'Can you see the face in these clouds?',
    is_challenge: false,
    likes_count: 42,
    comments_count: 5,
    checkins_count: 3,
    submissions_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    username: 'demo_user',
    display_name: 'Demo User',
    avatar_url: null,
    is_liked: false,
  },
  {
    id: 2,
    user_id: 1,
    type: 'challenge',
    title: 'What do you see?',
    description: 'Draw what you see in this rock formation',
    image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    is_nsfw: false,
    user_marked_nsfw: false,
    moderation_status: 'approved',
    user_caption: 'I see a sleeping giant in this mountain',
    is_challenge: true,
    challenge_type: 'draw',
    challenge_difficulty: 'medium',
    likes_count: 128,
    comments_count: 23,
    checkins_count: 0,
    submissions_count: 45,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    username: 'demo_user',
    display_name: 'Demo User',
    avatar_url: null,
    is_liked: true,
  },
]

// Query helper with proper typing
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  if (!pool) {
    throw new Error('Database not configured')
  }
  const start = Date.now()
  const result = await pool.query<T>(text, params)
  const duration = Date.now() - start
  if (duration > 1000) {
    console.log('Slow query:', { text, duration, rows: result.rowCount })
  }
  return result
}

// Get single row
export async function getOne<T>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  if (!pool) {
    // Return mock data based on query
    if (text.includes('tags')) {
      return mockTags[0] as T
    }
    if (text.includes('posts')) {
      return mockPosts[0] as T
    }
    return null
  }
  const result = await pool.query(text, params)
  return (result.rows[0] as T) || null
}

// Get multiple rows
export async function getMany<T>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  if (!pool) {
    // Return mock data based on query
    if (text.includes('tags')) {
      return mockTags as T[]
    }
    if (text.includes('posts')) {
      return mockPosts as T[]
    }
    return []
  }
  const result = await pool.query(text, params)
  return result.rows as T[]
}

// Transaction helper
export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  if (!pool) {
    throw new Error('Database not configured')
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// Check if database is available
export function isDatabaseAvailable(): boolean {
  return hasDatabase
}

export default pool
