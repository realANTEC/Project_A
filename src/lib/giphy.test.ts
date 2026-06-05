import { describe, expect, it } from 'vitest'
import { stickerUrlOf } from './giphy'

describe('stickerUrlOf', () => {
  it('detects a lone GIPHY media URL (with or without query/whitespace)', () => {
    expect(stickerUrlOf('https://media1.giphy.com/media/abc123/giphy.gif')).toBe(
      'https://media1.giphy.com/media/abc123/giphy.gif',
    )
    expect(stickerUrlOf('  https://media.giphy.com/media/xyz/giphy.gif?cid=1&ct=s  ')).toBe(
      'https://media.giphy.com/media/xyz/giphy.gif?cid=1&ct=s',
    )
  })

  it('is null when there is surrounding text (a real message, not a sticker)', () => {
    expect(stickerUrlOf('look https://media.giphy.com/media/abc/giphy.gif')).toBeNull()
  })

  it('is null for non-GIPHY URLs and plain text', () => {
    expect(stickerUrlOf('https://example.com/cat.gif')).toBeNull()
    expect(stickerUrlOf('hello there')).toBeNull()
  })
})
