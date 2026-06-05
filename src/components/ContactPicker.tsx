import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { X } from 'lucide-react'
import { useProfiles } from '@/lib/messages'
import { resolveAvatar } from '@/data/feed'
import { type Attachment } from '@/lib/attachments'
import { Avatar } from './Avatar'
import { VerifiedBadge } from './VerifiedBadge'

/** A people picker for sharing a Soul member's profile as a contact attachment. */
export function ContactPicker({ onPick, onClose }: { onPick: (a: Attachment) => void; onClose: () => void }) {
  const { data: profiles = [] } = useProfiles()
  const sheetRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end bg-black/40 sm:items-center sm:justify-center">
      <motion.div
        ref={sheetRef}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        role="dialog"
        aria-label="Share a contact"
        className="glass-strong edge-light flex max-h-[70dvh] w-full flex-col rounded-t-3xl sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-sm font-semibold text-white">Share a contact</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {profiles.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-white/55">No members to share yet.</p>
          )}
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onPick({ type: 'contact', userId: p.id, name: p.name, handle: p.handle, avatar: resolveAvatar(p) })
                onClose()
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
            >
              <Avatar src={resolveAvatar(p)} alt={p.name} size={40} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-white">{p.name}</span>
                  {p.verified && <VerifiedBadge />}
                </span>
                <span className="block truncate text-xs text-white/55">@{p.handle}</span>
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
