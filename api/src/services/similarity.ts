// Image and text similarity service
// Simplified implementation - in production would use @xenova/transformers

// Compare two drawings/images
export async function compareDrawings(
  drawing1: object | string,
  drawing2: object | string
): Promise<number> {
  // In production, this would use CLIP embeddings via @xenova/transformers
  // For now, return a random score to demonstrate the flow

  console.log('Comparing drawings...')

  // Simulate comparison - returns a score between 0.3 and 0.9
  const baseScore = 0.3
  const randomBonus = Math.random() * 0.6
  return baseScore + randomBonus
}

// Compare two texts using sentence embeddings
export async function compareTexts(text1: string, text2: string): Promise<number> {
  // In production, this would use sentence-transformers via @xenova/transformers

  console.log('Comparing texts:', { text1, text2 })

  // Simple word overlap similarity
  const words1 = new Set(text1.toLowerCase().split(/\s+/))
  const words2 = new Set(text2.toLowerCase().split(/\s+/))

  let overlap = 0
  words1.forEach(word => {
    if (words2.has(word)) overlap++
  })

  const jaccard = overlap / (words1.size + words2.size - overlap)

  // Add some randomness to make it more interesting
  const randomBonus = Math.random() * 0.2
  return Math.min(1, jaccard + randomBonus + 0.2)
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0

  return dotProduct / denominator
}

// Compare image URL to drawing
export async function compareImageToDrawing(
  imageUrl: string,
  drawing: object | string
): Promise<number> {
  return compareDrawings(imageUrl, drawing)
}
