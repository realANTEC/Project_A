import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { X } from 'lucide-react'
import { resolveAvatar } from '@/data/feed'
import { flattenReels, type StoryReel } from '@/lib/stories'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { Avatar } from './Avatar'

const FRAME_MS = 4500

/** Full-screen tap-through story viewer: progress bars, auto-advance, keyboard + tap nav. */
export function StoryViewer({
  reels,
  startIndex,
  onClose,
  onViewed,
}: {
  reels: StoryReel[]
  startIndex: number
  onClose: () => void
  /** Called with a reel's author handle as it is shown, so the rail can mark it seen. */
  onViewed?: (handle: string) => void
}) {
  const flat = useMemo(() => flattenReels(reels), [reels])
  const startPos = useMemo(() => {
    const i = flat.findIndex((f) => f.reelIndex === startIndex)
    return i === -1 ? 0 : i
  }, [flat, startIndex])
  const [pos, setPos] = useState(startPos)
  const trapRef = useFocusTrap<HTMLDivElement>(true)
  const navigate = useNavigate()
  const current = flat[pos] ?? flat[0]
  const currentHandle = current.reel.user.handle

  // Mark each reel viewed as it is shown (open + every advance), so the rail drops its glow ring.
  useEffect(() => {
    onViewed?.(currentHandle)
  }, [onViewed, currentHandle])

  // Auto-advance; close after the final frame of the final reel.
  useEffect(() => {
    const id = setTimeout(() => {
      if (pos < flat.length - 1) setPos(pos + 1)
      else onClose()
    }, FRAME_MS)
    return () => clearTimeout(id)
  }, [pos, flat.length, onClose])

  // Keyboard nav + scroll lock.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') setPos((p) => (p < flat.length - 1 ? p + 1 : p))
      else if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 1))
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [flat.length, onClose])

  const advance = () => (pos < flat.length - 1 ? setPos(pos + 1) : onClose())
  const rewind = () => setPos((p) => Math.max(0, p - 1))

  const { reel, frame } = current
  const gradient = `linear-gradient(135deg, ${frame.tint[0]}, ${frame.tint[1]})`

  return (
    <motion.div
      className="fixed inset-0 z-[70] grid place-items-center p-3 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" onClick={onClose} aria-hidden="true" />
      <motion.div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${reel.user.name}'s story`}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="bg-canvas relative z-10 aspect-[9/16] h-[88dvh] max-w-[94vw] overflow-hidden rounded-3xl shadow-2xl"
      >
        {/* media */}
        {frame.image ? (
          <img
            key={pos}
            src={frame.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ background: gradient }}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center" style={{ background: gradient }}>
            <Avatar src={resolveAvatar(reel.user)} alt={reel.user.name} size={104} ring="none" />
          </div>
        )}

        {/* top scrim: progress bars + header */}
        <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/55 to-transparent p-3 pb-10">
          <div className="flex gap-1">
            {Array.from({ length: current.framesInReel }).map((_, i) => (
              <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                <motion.div
                  className="h-full w-full origin-left bg-white"
                  initial={{ scaleX: i < current.frameIndex ? 1 : 0 }}
                  animate={{ scaleX: i <= current.frameIndex ? 1 : 0 }}
                  transition={{ duration: i === current.frameIndex ? FRAME_MS / 1000 : 0, ease: 'linear' }}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate(`/u/${reel.user.handle}`)
              }}
              aria-label={`View ${reel.user.name}'s profile`}
              className="flex items-center gap-2.5 rounded-full transition hover:opacity-80"
            >
              <Avatar src={resolveAvatar(reel.user)} alt={reel.user.name} size={32} />
              <span className="text-sm font-semibold text-white drop-shadow">{reel.user.handle}</span>
            </button>
            <span className="text-xs text-white/70">now</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close stories"
              className="ml-auto grid h-8 w-8 place-items-center rounded-full text-white/90 transition hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* tap zones: left third = back, right two-thirds = forward */}
        <button
          type="button"
          aria-label="Previous"
          onClick={rewind}
          className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-default focus:outline-none"
        />
        <button
          type="button"
          aria-label="Next"
          onClick={advance}
          className="absolute inset-y-0 right-0 z-10 w-2/3 cursor-default focus:outline-none"
        />
      </motion.div>
    </motion.div>
  )
}
