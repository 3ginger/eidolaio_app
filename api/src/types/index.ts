/**
 * Shared TypeScript types for the API
 */

// User types
export interface UserRow {
  id: number
  clerk_user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  points: number
  is_admin: boolean
  is_test_user: boolean
  created_at: string
  updated_at: string
}

export interface UserPublic {
  id: number
  username: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  points: number
  createdAt: string
}

// Post types
export interface PostRow {
  id: number
  user_id: number
  type: string
  title: string | null
  description: string | null
  image_url: string
  thumbnail_url: string | null
  is_nsfw: boolean
  user_marked_nsfw: boolean
  moderation_status: string
  moderation_score: object | null
  location: string | null
  address: string | null
  user_drawing: object | null
  user_caption: string | null
  is_challenge: boolean
  challenge_type: string | null
  challenge_difficulty: string | null
  chain_parent_id: number | null
  likes_count: number
  comments_count: number
  checkins_count: number
  submissions_count: number
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface PostPublic {
  id: number
  userId: number
  type: string
  title: string | null
  description: string | null
  imageUrl: string
  thumbnailUrl: string | null
  isNsfw: boolean
  userCaption: string | null
  userDrawing: object | null
  isChallenge: boolean
  challengeType: string | null
  challengeDifficulty: string | null
  likesCount: number
  commentsCount: number
  checkinsCount: number
  expiresAt: string | null
  createdAt: string
  user: {
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
  isLiked: boolean
}

// Comment types
export interface CommentRow {
  id: number
  post_id: number
  user_id: number
  content: string
  created_at: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

export interface CommentPublic {
  id: number
  content: string
  createdAt: string
  user: {
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
}

// Notification types
export type NotificationType = 'like' | 'comment' | 'follow' | 'chain_join' | 'sus'

export interface NotificationRow {
  id: number
  user_id: number
  type: NotificationType
  actor_id: number | null
  post_id: number | null
  message: string | null
  is_read: boolean
  created_at: string
}
