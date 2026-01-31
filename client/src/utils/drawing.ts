export function extractDrawingDataUrl(userDrawing?: object): string | null {
  if (
    userDrawing &&
    typeof userDrawing === 'object' &&
    'dataUrl' in userDrawing
  ) {
    return (userDrawing as { dataUrl: string }).dataUrl
  }
  return null
}

export function hasValidDrawing(userDrawing?: object, _postType?: string): boolean {
  const dataUrl = extractDrawingDataUrl(userDrawing)
  return !!dataUrl
}
