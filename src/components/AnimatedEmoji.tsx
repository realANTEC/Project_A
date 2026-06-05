import { useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'
import { notoEmojiUrl } from '@/lib/emoji'

/**
 * One emoji rendered as Google's looping animated WebP (Noto), sized to the parent font
 * (h/w 1em). Falls back to the plain emoji glyph if that emoji has no animated asset (404)
 * or when the user prefers reduced motion (no looping animation then).
 */
export function AnimatedEmoji({ emoji, className }: { emoji: string; className?: string }) {
  const reduceMotion = useReducedMotion()
  const [failed, setFailed] = useState(false)
  if (failed || reduceMotion) return <span className={className}>{emoji}</span>
  return (
    <img
      src={notoEmojiUrl(emoji)}
      alt={emoji}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('inline-block h-[1em] w-[1em] align-middle', className)}
    />
  )
}
