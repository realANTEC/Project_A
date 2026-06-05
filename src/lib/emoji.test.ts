import { describe, expect, it } from 'vitest'
import { emojiGraphemes, emojiOnlyCount, isJumboEmoji, notoEmojiUrl, notoStaticUrl, splitEmoji } from './emoji'

describe('emojiOnlyCount / isJumboEmoji', () => {
  it('counts a short emoji-only message (spaces allowed)', () => {
    expect(emojiOnlyCount('❤️')).toBe(1)
    expect(emojiOnlyCount('😂😂')).toBe(2)
    expect(emojiOnlyCount('😀 😀 😀')).toBe(3)
    expect(isJumboEmoji('❤️')).toBe(true)
  })

  it('is 0 / not jumbo when any non-emoji text is present', () => {
    expect(emojiOnlyCount('ok 👍')).toBe(0)
    expect(emojiOnlyCount('hello')).toBe(0)
    expect(isJumboEmoji('nice 🎉')).toBe(false)
  })

  it('treats ZWJ / skin-tone sequences as a single emoji', () => {
    expect(emojiOnlyCount('👍🏽')).toBe(1)
    expect(emojiOnlyCount('👨‍👩‍👧')).toBe(1)
  })

  it('stops being jumbo beyond 3 emoji', () => {
    expect(emojiOnlyCount('😀😀😀😀')).toBe(4)
    expect(isJumboEmoji('😀😀😀😀')).toBe(false)
  })

  it('splits an emoji-only message into individual emoji', () => {
    expect(emojiGraphemes('😀 😂')).toEqual(['😀', '😂'])
    expect(emojiGraphemes('👨‍👩‍👧')).toEqual(['👨‍👩‍👧'])
  })

  it('builds the Noto animated-emoji URL from codepoints', () => {
    expect(notoEmojiUrl('😂')).toBe('https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.webp')
    expect(notoEmojiUrl('❤️')).toBe('https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.webp')
    expect(notoStaticUrl('😂')).toBe('https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/emoji.svg')
  })

  it('splits mixed text into text runs and individual emoji', () => {
    expect(splitEmoji('hi 🤔😌')).toEqual([{ text: 'hi ' }, { emoji: '🤔' }, { emoji: '😌' }])
    expect(splitEmoji('no emoji here')).toEqual([{ text: 'no emoji here' }])
    expect(splitEmoji('👍🏽 done')).toEqual([{ emoji: '👍🏽' }, { text: ' done' }])
    expect(splitEmoji('')).toEqual([])
  })
})
