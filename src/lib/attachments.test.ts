import { describe, expect, it } from 'vitest'
import { attachmentPreview, formatBytes } from './attachments'

describe('attachmentPreview', () => {
  it('labels each attachment type', () => {
    expect(attachmentPreview({ type: 'image', url: 'x' })).toBe('📷 Photo')
    expect(attachmentPreview({ type: 'document', url: 'x', name: 'cv.pdf' })).toBe('📄 cv.pdf')
    expect(attachmentPreview({ type: 'location', lat: 1, lng: 2 })).toBe('📍 Location')
    expect(attachmentPreview({ type: 'contact', userId: 'u', name: 'Bob', handle: 'bob' })).toBe('👤 Bob')
    expect(attachmentPreview({ type: 'poll', id: 'p' })).toBe('📊 Poll')
    expect(attachmentPreview({ type: 'event', id: 'e' })).toBe('📅 Event')
  })
})

describe('formatBytes', () => {
  it('formats sizes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatBytes(undefined)).toBe('')
  })
})
