import { describe, expect, it } from 'vitest'
import { MESSAGE_REACTIONS, groupReactions } from './messages'

describe('groupReactions', () => {
  it('groups by emoji with counts and flags my own reaction', () => {
    const out = groupReactions(
      [
        { userId: 'a', emoji: '❤️' },
        { userId: 'b', emoji: '❤️' },
        { userId: 'c', emoji: '👍' },
      ],
      'b',
    )
    expect(out.find((r) => r.emoji === '❤️')).toEqual({ emoji: '❤️', count: 2, mine: true })
    expect(out.find((r) => r.emoji === '👍')).toEqual({ emoji: '👍', count: 1, mine: false })
  })

  it('returns nothing for no reactions', () => {
    expect(groupReactions([], 'me')).toEqual([])
  })

  it('mine stays false when I have not reacted', () => {
    const out = groupReactions([{ userId: 'x', emoji: '😮' }], 'me')
    expect(out).toEqual([{ emoji: '😮', count: 1, mine: false }])
  })

  it('exposes the six quick reactions', () => {
    expect(MESSAGE_REACTIONS).toHaveLength(6)
    expect(MESSAGE_REACTIONS).toContain('❤️')
    expect(MESSAGE_REACTIONS).toContain('👍')
  })
})
