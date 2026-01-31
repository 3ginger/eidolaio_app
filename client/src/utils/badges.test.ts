import { describe, it, expect } from 'vitest'
import { getPositionBadge, getPositionBadgeColor } from './badges'

describe('badges utils', () => {
  describe('getPositionBadge', () => {
    describe('emoji format (default)', () => {
      it('returns gold medal for 1st place', () => {
        expect(getPositionBadge(1)).toBe('🥇')
        expect(getPositionBadge(1, 'emoji')).toBe('🥇')
      })

      it('returns silver medal for 2nd place', () => {
        expect(getPositionBadge(2)).toBe('🥈')
      })

      it('returns bronze medal for 3rd place', () => {
        expect(getPositionBadge(3)).toBe('🥉')
      })

      it('returns hash format for other positions', () => {
        expect(getPositionBadge(4)).toBe('#4')
        expect(getPositionBadge(10)).toBe('#10')
        expect(getPositionBadge(100)).toBe('#100')
      })
    })

    describe('text format', () => {
      it('returns ordinal for 1st place', () => {
        expect(getPositionBadge(1, 'text')).toBe('1st')
      })

      it('returns ordinal for 2nd place', () => {
        expect(getPositionBadge(2, 'text')).toBe('2nd')
      })

      it('returns ordinal for 3rd place', () => {
        expect(getPositionBadge(3, 'text')).toBe('3rd')
      })

      it('returns th suffix for other positions', () => {
        expect(getPositionBadge(4, 'text')).toBe('4th')
        expect(getPositionBadge(10, 'text')).toBe('10th')
        expect(getPositionBadge(21, 'text')).toBe('21th')
      })
    })
  })

  describe('getPositionBadgeColor', () => {
    it('returns gold colors for 1st place', () => {
      expect(getPositionBadgeColor(1)).toBe('bg-yellow-100 text-yellow-700')
    })

    it('returns gray colors for 2nd place', () => {
      expect(getPositionBadgeColor(2)).toBe('bg-gray-100 text-gray-700')
    })

    it('returns orange colors for 3rd place', () => {
      expect(getPositionBadgeColor(3)).toBe('bg-orange-100 text-orange-700')
    })

    it('returns teal colors for other positions', () => {
      expect(getPositionBadgeColor(4)).toBe('bg-eidola-teal/10 text-eidola-teal')
      expect(getPositionBadgeColor(100)).toBe('bg-eidola-teal/10 text-eidola-teal')
    })
  })
})
