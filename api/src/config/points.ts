// Points configuration - centralized, no magic numbers
export const POINTS = {
  // Voting points (one-time per post)
  VOTE: 1,
  
  // Confession points
  CONFESS_BASE: 70,           // When people already suspect AI
  CONFESS_MAX: 200,           // Max when people trusted it
  CONFESS_TRUST_MULTIPLIER: 2, // Multiplier when realCount > susCount
}

// Calculate confession points based on trust level
export function calculateConfessionPoints(realCount: number, susCount: number): number {
  if (realCount > susCount) {
    // People believed it was real - bonus for honesty!
    const trustRatio = realCount / Math.max(susCount, 1)
    return Math.min(
      POINTS.CONFESS_MAX, 
      Math.round(POINTS.CONFESS_BASE * Math.max(trustRatio, POINTS.CONFESS_TRUST_MULTIPLIER))
    )
  }
  return POINTS.CONFESS_BASE
}
