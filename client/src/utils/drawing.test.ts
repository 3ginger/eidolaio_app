import { describe, it, expect } from 'vitest'
import { extractDrawingDataUrl, hasValidDrawing } from './drawing'

describe('drawing utils', () => {
  describe('extractDrawingDataUrl', () => {
    it('returns null for undefined input', () => {
      expect(extractDrawingDataUrl(undefined)).toBeNull()
    })

    it('returns null for empty object', () => {
      expect(extractDrawingDataUrl({})).toBeNull()
    })

    it('returns null for object without dataUrl', () => {
      expect(extractDrawingDataUrl({ someOtherProp: 'value' })).toBeNull()
    })

    it('returns dataUrl when present', () => {
      const drawing = { dataUrl: 'data:image/png;base64,abc123' }
      expect(extractDrawingDataUrl(drawing)).toBe('data:image/png;base64,abc123')
    })

    it('returns dataUrl even with other properties', () => {
      const drawing = {
        dataUrl: 'data:image/png;base64,xyz789',
        width: 500,
        height: 500,
      }
      expect(extractDrawingDataUrl(drawing)).toBe('data:image/png;base64,xyz789')
    })
  })

  describe('hasValidDrawing', () => {
    it('returns false for undefined drawing', () => {
      expect(hasValidDrawing(undefined)).toBe(false)
    })

    it('returns false for drawing without dataUrl', () => {
      expect(hasValidDrawing({})).toBe(false)
    })

    it('returns true for valid drawing with dataUrl', () => {
      expect(hasValidDrawing({ dataUrl: 'data:image/png;base64,abc' })).toBe(true)
    })

    it('returns false for challenge post type even with valid drawing', () => {
      const drawing = { dataUrl: 'data:image/png;base64,abc' }
      expect(hasValidDrawing(drawing, 'challenge')).toBe(false)
    })

    it('returns true for non-challenge post types with valid drawing', () => {
      const drawing = { dataUrl: 'data:image/png;base64,abc' }
      expect(hasValidDrawing(drawing, 'persistent')).toBe(true)
      expect(hasValidDrawing(drawing, 'temporary')).toBe(true)
    })
  })
})
