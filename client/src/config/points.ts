// Points configuration - mirrors backend config
export const POINTS = {
  VOTE: 1,
  CONFESS_BASE: 70,
  CONFESS_MAX: 200,
  CONFESS_TRUST_MULTIPLIER: 2,
}

// Calculate potential confession points (same logic as backend)
export function calculateConfessionPoints(realCount: number, susCount: number): number {
  if (realCount > susCount) {
    const trustRatio = realCount / Math.max(susCount, 1)
    return Math.min(
      POINTS.CONFESS_MAX, 
      Math.round(POINTS.CONFESS_BASE * Math.max(trustRatio, POINTS.CONFESS_TRUST_MULTIPLIER))
    )
  }
  return POINTS.CONFESS_BASE
}
