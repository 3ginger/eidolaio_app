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

  // Chain
  chainParentId?: number // If this post is part of a chain, the original post ID
  chainEntryCount?: number // Number of entries in this post's chain

  // Engagement
  likesCount: number
  commentsCount: number
  checkinsCount: number
  submissionsCount: number
  susCount: number
  realCount: number
  isBusted: boolean

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
  isSus?: boolean
  isReal?: boolean
  isOwner?: boolean
  hasSubmitted?: boolean
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

export type ReportReason = 'spam' | 'nsfw' | 'harassment' | 'copyright' | 'other'
export type ReportStatus = 'pending' | 'dismissed' | 'sustained'

export interface Report {
  id: number
  postId: number
  reporterId: number
  reason: ReportReason
  description?: string
  status: ReportStatus
  createdAt: string
  resolvedAt?: string
  resolvedBy?: number
}

export interface ChallengeSubmission {
  id: number
  userId: number
  drawingData: object | null
  textGuess: string | null
  similarityScore: number
  rank: number
  createdAt: string
  isOwn: boolean
  user: {
    username: string
    displayName?: string
    avatarUrl?: string
  }
}

export interface ChallengeSubmissionsResponse {
  challengeId: number
  challengeType: string
  imageUrl: string
  original: {
    drawingData: object | null
    caption: string | null
    user: {
      username: string
      avatarUrl?: string
    }
  }
  submissions: ChallengeSubmission[]
  totalSubmissions: number
}
