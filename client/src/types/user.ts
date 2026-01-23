export interface User {
  id: number
  clerkUserId: string
  username: string
  displayName?: string
  avatarUrl?: string
  bio?: string
  points: number
  createdAt: string
  updatedAt: string
  followersCount?: number
  followingCount?: number
  postsCount?: number
  isFollowing?: boolean
}

export interface UserInterest {
  userId: number
  tagId: number
  tagName: string
}
