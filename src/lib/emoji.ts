// "Jumbo emoji": a short emoji-only message renders big with no bubble (IG/WhatsApp style).
const JUMBO_MAX = 3

type SegmenterCtor = new (
  locale?: string,
  opts?: { granularity: 'grapheme' },
) => { segment: (s: string) => Iterable<{ segment: string }> }

function graphemesOf(text: string): string[] {
  // Intl.Segmenter treats ZWJ / skin-tone / flag emoji as a single grapheme.
  const Seg = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter
  if (Seg) return Array.from(new Seg(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment)
  return Array.from(text)
}

/** Count of emoji if `text` is ONLY emoji (spaces allowed between); 0 if any non-emoji content. */
export function emojiOnlyCount(text: string): number {
  const t = text.trim()
  if (!t) return 0
  let count = 0
  for (const g of graphemesOf(t)) {
    if (/^\s+$/.test(g)) continue
    if (!/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g)) return 0
    count += 1
  }
  return count
}

/** True for a short emoji-only message that should render large with no bubble. */
export function isJumboEmoji(text: string): boolean {
  const n = emojiOnlyCount(text)
  return n >= 1 && n <= JUMBO_MAX
}

/** The individual emoji in an emoji-only message (whitespace dropped). */
export function emojiGraphemes(text: string): string[] {
  return graphemesOf(text.trim()).filter((g) => !/^\s+$/.test(g))
}

/** A run of plain text, or one emoji grapheme — for rendering inline animated emoji in text. */
export type EmojiSegment = { text: string } | { emoji: string }

/**
 * Split text into consecutive runs of plain text and individual emoji graphemes, so a chat
 * message can render its inline emoji as animated assets while keeping the words as text.
 */
export function splitEmoji(text: string): EmojiSegment[] {
  const out: EmojiSegment[] = []
  let buf = ''
  for (const g of graphemesOf(text)) {
    if (/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g)) {
      if (buf) {
        out.push({ text: buf })
        buf = ''
      }
      out.push({ emoji: g })
    } else {
      buf += g
    }
  }
  if (buf) out.push({ text: buf })
  return out
}

/**
 * Google Noto animated-emoji WebP URL for one emoji grapheme (the codepoints joined by `_`,
 * lowercase hex). Free / OFL+Apache, served by codepoint — no bundling. 404s for unsupported
 * emoji, so callers fall back to the static glyph on the image's error event.
 */
export function notoEmojiUrl(emoji: string): string {
  const cp = Array.from(emoji, (c) => c.codePointAt(0)!.toString(16)).join('_')
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/512.webp`
}

/**
 * Static (non-animated) Noto emoji SVG — the SAME design as the animated asset, served as a
 * flat SVG, for dense grids like the emoji picker where 48 looping WebPs lag the page. The
 * static SVG lives at the same per-codepoint path as the animated WebP. 404-safe.
 */
export function notoStaticUrl(emoji: string): string {
  const cp = Array.from(emoji, (c) => c.codePointAt(0)!.toString(16)).join('_')
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/emoji.svg`
}
