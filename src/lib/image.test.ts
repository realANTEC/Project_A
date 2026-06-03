import { describe, expect, it } from 'vitest'
import { downscaleImage, fitWithin } from './image'

describe('fitWithin', () => {
  it('caps the longest side and preserves aspect ratio (landscape)', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200, scaled: true })
  })
  it('caps the longest side (portrait)', () => {
    expect(fitWithin(2000, 4000, 1600)).toEqual({ width: 800, height: 1600, scaled: true })
  })
  it('never upscales images already within the cap', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600, scaled: false })
  })
  it('treats exactly-at-cap as not scaled', () => {
    expect(fitWithin(1600, 900, 1600)).toEqual({ width: 1600, height: 900, scaled: false })
  })
  it('handles zero dimensions without dividing', () => {
    expect(fitWithin(0, 0, 1600)).toEqual({ width: 0, height: 0, scaled: false })
  })
})

describe('downscaleImage (graceful pass-through)', () => {
  it('returns non-image blobs unchanged', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' })
    expect(await downscaleImage(blob)).toBe(blob)
  })
  it('does not rasterise SVGs', async () => {
    const blob = new Blob(['<svg/>'], { type: 'image/svg+xml' })
    expect(await downscaleImage(blob)).toBe(blob)
  })
  it('does not rasterise GIFs', async () => {
    const blob = new Blob([new Uint8Array([0x47, 0x49, 0x46])], { type: 'image/gif' })
    expect(await downscaleImage(blob)).toBe(blob)
  })
})
