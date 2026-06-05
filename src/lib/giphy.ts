// GIPHY stickers for chat. The key is a client-side beta key (rate-limited); when it's
// absent the sticker button is hidden and the app behaves as before.
const KEY = import.meta.env.VITE_GIPHY_API_KEY as string | undefined
const BASE = 'https://api.giphy.com/v1/stickers'

export const isGiphyConfigured = !!KEY

export type Sticker = {
  id: string
  /** The sticker GIF that gets sent + rendered in the bubble. */
  url: string
  /** A smaller rendition for the picker grid. */
  preview: string
  title: string
}

type GiphyImage = { url?: string }
type GiphyItem = {
  id: string
  title?: string
  images?: { fixed_height?: GiphyImage; fixed_height_small?: GiphyImage; original?: GiphyImage }
}

function toStickers(items: GiphyItem[]): Sticker[] {
  return items
    .map((g) => {
      const full = g.images?.fixed_height?.url ?? g.images?.original?.url
      return {
        id: g.id,
        url: full ?? '',
        preview: g.images?.fixed_height_small?.url ?? full ?? '',
        title: g.title ?? 'Sticker',
      }
    })
    .filter((s) => s.url)
}

/** Trending stickers (empty query) or a search, rating-G. Throws on a failed request. */
export async function fetchStickers(query: string): Promise<Sticker[]> {
  if (!KEY) return []
  const q = query.trim()
  const url = q
    ? `${BASE}/search?api_key=${KEY}&q=${encodeURIComponent(q)}&limit=24&rating=g`
    : `${BASE}/trending?api_key=${KEY}&limit=24&rating=g`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GIPHY ${res.status}`)
  const json = (await res.json()) as { data?: GiphyItem[] }
  return toStickers(json.data ?? [])
}

/**
 * If a chat message is JUST a GIPHY sticker URL, return it (so the bubble renders the
 * sticker image instead of a link). A message with any other text is not a sticker.
 */
export function stickerUrlOf(text: string): string | null {
  const t = text.trim()
  if (/\s/.test(t)) return null
  return /^https?:\/\/\S*\.giphy\.com\/media\/\S+/.test(t) ? t : null
}
