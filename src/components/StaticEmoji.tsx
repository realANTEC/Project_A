import { useState } from 'react'
import { cn } from '@/lib/cn'
import { notoStaticUrl } from '@/lib/emoji'

/**
 * One emoji as a static Noto SVG (crisp, no animation) — the same design family as
 * {@link AnimatedEmoji}, for dense grids like the emoji picker where animating many at once
 * would lag the page. Falls back to the plain glyph if the asset is missing (404).
 */
export function StaticEmoji({ emoji, className }: { emoji: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className={className}>{emoji}</span>
  return (
    <img
      src={notoStaticUrl(emoji)}
      alt={emoji}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('inline-block h-[1em] w-[1em] align-middle', className)}
    />
  )
}
