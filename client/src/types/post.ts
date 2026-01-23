export type PostType = 'persistent' | 'temporary' | 'challenge'
export type ChallengeType = 'draw' | 'text'
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard'
export type ModerationStatus = 'pending' | 'approved' | 'flagged'

export interface Post {
  id: number
  userId: number
  type: PostType
  title?: string
  description?: string
  imageUrl: string
  thumbnailUrl?: string

  // Moderation
  isNsfw: boolean
  userMarkedNsfw: boolean
  moderationStatus: ModerationStatus
  moderationScore?: {
    adult?: number
    neutral?: number
    [key: string]: number | undefined
  }

  // Location
  location?: {
    lat: number
    lng: number
  }
  address?: string

  // User's interpretation
  userDrawing?: object // Fabric.js canvas data
  userCaption?: string

  // Challenge
  isChallenge: boolean
  challengeType?: ChallengeType
  challengeDifficulty?: ChallengeDifficulty

  // Engagement
  likesCount: number
  commentsCount: number
  checkinsCount: number
  submissionsCount: number

  // Timestamps
  expiresAt?: string
  createdAt: string
  updatedAt: string

  // Joined data
  user?: {
    username: string
    displayName?: string
    avatarUrl?: string
  }
  tags?: string[]
  isLiked?: boolean
  timeRemaining?: string
}

export interface Comment {
  id: number
  postId: number
  userId: number
  content: string
  createdAt: string
  user?: {
    username: string
    displayName?: string
    avatarUrl?: string
  }
}

export interface PhotoChainEntry {
  id: number
  postId: number
  userId: number
  photoUrl: string
  position: number
  caption?: string
  createdAt: string
  user?: {
    username: string
    displayName?: string
    avatarUrl?: string
  }
}

export interface Tag {
  id: number
  name: string
}
