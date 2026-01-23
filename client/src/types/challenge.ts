export interface ChallengeSubmission {
  id: number
  challengeId: number
  userId: number
  drawingData?: object // For draw challenges
  textGuess?: string // For text challenges
  similarityScore?: number // 0-1
  rank?: number
  createdAt: string
  user?: {
    username: string
    displayName?: string
    avatarUrl?: string
  }
}

export interface Leaderboard {
  challengeId: number
  submissions: ChallengeSubmission[]
  totalSubmissions: number
}
