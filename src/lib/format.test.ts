import { describe, expect, it } from 'vitest'
import { formatCount, relativeTime } from './format'

describe('formatCount', () => {
  it('passes small numbers through', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(942)).toBe('942')
  })
  it('abbreviates thousands', () => {
    expect(formatCount(1200)).toBe('1.2k')
    expect(formatCount(9400)).toBe('9.4k')
    expect(formatCount(23000)).toBe('23k')
  })
  it('drops a trailing .0', () => {
    expect(formatCount(2000)).toBe('2k')
  })
  it('abbreviates millions', () => {
    expect(formatCount(1_200_000)).toBe('1.2M')
  })
})

describe('relativeTime', () => {
  it('returns "now" for very recent timestamps', () => {
    expect(relativeTime(new Date().toISOString())).toBe('now')
  })
  it('returns minutes and hours', () => {
    expect(relativeTime(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('5m')
    expect(relativeTime(new Date(Date.now() - 3 * 3_600_000).toISOString())).toBe('3h')
  })
  it('returns days', () => {
    expect(relativeTime(new Date(Date.now() - 2 * 86_400_000).toISOString())).toBe('2d')
  })
  it('handles invalid input', () => {
    expect(relativeTime('not-a-date')).toBe('')
  })
})
