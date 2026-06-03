/**
 * Compute dimensions that fit within `maxDim` on the longest side.
 * Never upscales: images already within `maxDim` are returned unchanged.
 */
export function fitWithin(
  width: number,
  height: number,
  maxDim: number,
): { width: number; height: number; scaled: boolean } {
  const longest = Math.max(width, height)
  if (longest <= maxDim || longest === 0) return { width, height, scaled: false }
  const scale = maxDim / longest
  return { width: Math.round(width * scale), height: Math.round(height * scale), scaled: true }
}

export type DownscaleOptions = {
  /** Cap for the longest side, in px (default 1600). */
  maxDim?: number
  /** Output quality 0..1 for lossy encoders (default 0.82). */
  quality?: number
  /** Output MIME type (default image/jpeg). */
  mimeType?: string
}

/**
 * Downscale + re-encode an image blob before upload, to shrink large camera
 * photos (a multi-MB upload becomes a few hundred KB). Caps the longest side at
 * `maxDim` and re-encodes (JPEG by default).
 *
 * Safe by construction: never upscales, never throws, and returns the ORIGINAL
 * blob unchanged when it can't help — non-images, vector/animated formats
 * (SVG/GIF), a missing canvas (SSR / tests), or a re-encode that isn't smaller.
 */
export async function downscaleImage(blob: Blob, options: DownscaleOptions = {}): Promise<Blob> {
  const { maxDim = 1600, quality = 0.82, mimeType = 'image/jpeg' } = options
  if (typeof document === 'undefined') return blob
  if (!blob.type.startsWith('image/')) return blob
  // Vector / animated formats must not be rasterised to a single frame.
  if (blob.type === 'image/svg+xml' || blob.type === 'image/gif') return blob

  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    const { width, height, scaled } = fitWithin(img.naturalWidth, img.naturalHeight, maxDim)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx || width === 0 || height === 0) return blob
    ctx.drawImage(img, 0, 0, width, height)
    const out = await canvasToBlob(canvas, mimeType, quality)
    if (!out) return blob
    // Re-encoding an already-small image can grow it — keep whichever is smaller.
    return !scaled && out.size >= blob.size ? blob : out
  } catch {
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string, timeoutMs = 15000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const timer = setTimeout(() => reject(new Error('image load timeout')), timeoutMs)
    img.onload = () => {
      clearTimeout(timer)
      resolve(img)
    }
    img.onerror = () => {
      clearTimeout(timer)
      reject(new Error('image load failed'))
    }
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality))
}
