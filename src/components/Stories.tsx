import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { avatar, currentUser, posts, stories } from '@/data/feed'
import { useCompose } from '@/lib/compose'
import { useAuth } from '@/lib/auth'
import { useFollowList } from '@/lib/profile'
import { buildStoryReels } from '@/lib/stories'
import { cn } from '@/lib/cn'
import { Avatar } from './Avatar'
import { StoryViewer } from './StoryViewer'

/** Horizontally scrolling story rail with conic rings and a "Your story" add. */
export function Stories({ following = false }: { following?: boolean }) {
  const { openCompose } = useCompose()
  const { session } = useAuth()
  const myId = session?.user.id
  const [openAt, setOpenAt] = useState<number | null>(null)
  // On the "Following" tab, show only stories from people the signed-in user actually follows
  // (matched by handle against their real follow list); "For you" shows the full curated rail.
  const followList = useFollowList(myId, 'following', following && !!myId)
  const followedHandles = useMemo(
    () => new Set((followList.data ?? []).map((u) => u.handle)),
    [followList.data],
  )
  const shown = useMemo(
    () => (following ? stories.filter((s) => followedHandles.has(s.user.handle)) : stories),
    [following, followedHandles],
  )
  // Each person's own posts become their story frames (placeholder when they have none).
  const reels = useMemo(() => buildStoryReels(shown, posts), [shown])
  const scrollRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  // Track whether the rail can scroll in either direction so the desktop arrows only show when
  // there's somewhere to go. (setState lives in the scroll/observer callbacks, not the effect body.)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () =>
      setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update) // fires once on observe → sets the initial state
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  const scrollByDir = (dir: 1 | -1) =>
    scrollRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' })

  const arrowClass =
    'absolute top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-canvas/85 text-white opacity-0 ring-1 ring-white/15 shadow-lg backdrop-blur transition hover:bg-canvas group-hover/rail:opacity-100 md:grid'

  return (
    <section aria-label="Stories" className="glass edge-light group/rail relative rounded-4xl">
      <div ref={scrollRef} className="no-scrollbar mask-fade-r flex gap-4 overflow-x-auto px-4 py-4">
        {/* Your story → opens the create flow */}
        <button
          type="button"
          onClick={openCompose}
          aria-label="Add to your story"
          className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5"
        >
          <span className="relative">
            <Avatar
              src={avatar(currentUser.avatarId)}
              alt="Your story"
              size={56}
              ring="seen"
              className="transition-transform group-hover:scale-105"
            />
            <span className="bg-aurora absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-canvas">
              <Plus className="h-3 w-3 text-white" strokeWidth={3} />
            </span>
          </span>
          <span className="max-w-full truncate text-[11px] text-white/55">Your story</span>
        </button>

        {shown.map((s, i) => (
          <motion.button
            type="button"
            key={s.user.handle}
            onClick={() => setOpenAt(i)}
            aria-label={`View ${s.user.name}'s story`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -3 }}
            className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5"
          >
            <span className="relative">
              <Avatar
                src={avatar(s.user.avatarId)}
                alt={s.user.name}
                size={56}
                ring={s.seen ? 'seen' : 'aurora'}
                className="transition-transform group-hover:scale-105"
              />
            </span>
            <span className="max-w-full truncate text-[11px] text-white/55">{s.user.handle}</span>
          </motion.button>
        ))}
      </div>

      {/* Desktop scroll arrows — shown on hover, only when there's room to scroll that way. */}
      {edges.left && (
        <button
          type="button"
          onClick={() => scrollByDir(-1)}
          aria-label="Scroll stories left"
          className={cn(arrowClass, 'left-1.5')}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {edges.right && (
        <button
          type="button"
          onClick={() => scrollByDir(1)}
          aria-label="Scroll stories right"
          className={cn(arrowClass, 'right-1.5')}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Portaled to <body> so the fixed overlay escapes this glass (backdrop-filtered) section. */}
      {createPortal(
        <AnimatePresence>
          {openAt !== null && (
            <StoryViewer key={openAt} reels={reels} startIndex={openAt} onClose={() => setOpenAt(null)} />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </section>
  )
}
