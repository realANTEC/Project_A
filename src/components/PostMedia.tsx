import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/cn'
import { fallbackLayoutId } from '@/lib/post-modal'
import type { Aspect } from '@/data/feed'

const ASPECT: Record<Aspect, string> = {
  portrait: 'aspect-[4/5]',
  square: 'aspect-square',
  landscape: 'aspect-[3/2]',
}

type Props = {
  postId: string
  image: string
  aspect: Aspect
  tint: [string, string]
  alt: string
  onDoubleTapLike: () => void
  /** Receives the media element so the lightbox can morph out of it. */
  onOpen?: (el?: HTMLElement | null) => void
}

/**
 * The photo itself: a gradient placeholder that the real image fades over,
 * a subtle hover zoom, a legibility scrim, and a double-tap heart burst.
 */
export function PostMedia({ postId, image, aspect, tint, alt, onDoubleTapLike, onOpen }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [bursts, setBursts] = useState<number[]>([])
  const burstId = useRef(0)
  const lastTap = useRef(0)
  const singleTap = useRef<number | null>(null)
  const mediaRef = useRef<HTMLDivElement>(null)

  function burst() {
    const id = burstId.current++
    setBursts((b) => [...b, id])
    window.setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 850)
  }

  function handleTap() {
    const now = Date.now()
    if (now - lastTap.current < 280) {
      // Double tap → like (and cancel the pending "open").
      if (singleTap.current) {
        window.clearTimeout(singleTap.current)
        singleTap.current = null
      }
      burst()
      onDoubleTapLike()
      lastTap.current = 0
    } else {
      lastTap.current = now
      // Single tap → open detail, unless a second tap arrives first.
      if (onOpen) {
        singleTap.current = window.setTimeout(() => {
          onOpen(mediaRef.current)
          singleTap.current = null
        }, 280)
      }
    }
  }

  return (
    <div
      ref={mediaRef}
      className={cn(
        'group relative w-full cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac',
        ASPECT[aspect],
      )}
      onClick={handleTap}
      role="button"
      tabIndex={0}
      aria-label={`Open ${alt}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen?.(mediaRef.current)
        }
      }}
    >
      {/* gradient placeholder beneath the photo */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(135deg, ${tint[0]}, ${tint[1]})` }}
      />
      <motion.img
        layoutId={fallbackLayoutId(postId)}
        src={image}
        alt={alt}
        loading="lazy"
        draggable={false}
        onLoad={() => setLoaded(true)}
        className={cn(
          'absolute inset-0 h-full w-full select-none object-cover transition-[opacity,transform] duration-[800ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.04]',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* legibility scrim */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/35 to-transparent" />

      {/* double-tap heart bursts */}
      <AnimatePresence>
        {bursts.map((id) => (
          <motion.div
            key={id}
            className="pointer-events-none absolute inset-0 grid place-items-center"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 1.15, 1], opacity: [0, 1, 1] }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <Heart
              className="h-24 w-24 text-white drop-shadow-[0_8px_34px_rgba(255,90,170,0.7)]"
              fill="currentColor"
              strokeWidth={1}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
