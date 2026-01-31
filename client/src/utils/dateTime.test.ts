import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getTimeRemaining, getTimeRemainingVerbose, formatRelativeDate } from './dateTime'

describe('dateTime utils', () => {
  describe('getTimeRemaining', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns "Expired" for past dates', () => {
      const pastDate = new Date('2024-01-14T12:00:00Z')
      expect(getTimeRemaining(pastDate)).toBe('Expired')
    })

    it('returns minutes for short durations', () => {
      const futureDate = new Date('2024-01-15T12:30:00Z')
      expect(getTimeRemaining(futureDate)).toBe('30m')
    })

    it('returns hours and minutes for moderate durations', () => {
      const futureDate = new Date('2024-01-15T14:45:00Z')
      expect(getTimeRemaining(futureDate)).toBe('2h 45m')
    })

    it('returns days for long durations', () => {
      const futureDate = new Date('2024-01-18T12:00:00Z')
      expect(getTimeRemaining(futureDate)).toBe('3d')
    })
  })

  describe('getTimeRemainingVerbose', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns "Expired" for past dates', () => {
      const pastDate = new Date('2024-01-14T12:00:00Z')
      expect(getTimeRemainingVerbose(pastDate)).toBe('Expired')
    })

    it('returns verbose format with "left"', () => {
      const futureDate = new Date('2024-01-15T12:30:00Z')
      expect(getTimeRemainingVerbose(futureDate)).toBe('30m left')
    })

    it('returns hours and minutes with "left"', () => {
      const futureDate = new Date('2024-01-15T14:45:00Z')
      expect(getTimeRemainingVerbose(futureDate)).toBe('2h 45m left')
    })

    it('returns days with "left"', () => {
      const futureDate = new Date('2024-01-18T12:00:00Z')
      expect(getTimeRemainingVerbose(futureDate)).toBe('3d left')
    })
  })

  describe('formatRelativeDate', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns "Just now" for very recent times', () => {
      const recentDate = new Date('2024-01-15T11:59:45Z')
      expect(formatRelativeDate(recentDate)).toBe('Just now')
    })

    it('returns minutes for times less than an hour ago', () => {
      const minutesAgo = new Date('2024-01-15T11:30:00Z')
      expect(formatRelativeDate(minutesAgo)).toBe('30m ago')
    })

    it('returns hours for times less than a day ago', () => {
      const hoursAgo = new Date('2024-01-15T08:00:00Z')
      expect(formatRelativeDate(hoursAgo)).toBe('4h ago')
    })

    it('returns days for times less than a week ago', () => {
      const daysAgo = new Date('2024-01-12T12:00:00Z')
      expect(formatRelativeDate(daysAgo)).toBe('3d ago')
    })

    it('returns formatted date for times more than a week ago', () => {
      const weekAgo = new Date('2024-01-01T12:00:00Z')
      const result = formatRelativeDate(weekAgo)
      // The exact format depends on locale, so just check it's a date string
      expect(result).toMatch(/\d/)
    })
  })
})
