import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { X } from 'lucide-react'

export type NewEvent = { title: string; description: string; location: string; startsAt: string }

/** A modal to create an event: title + date/time (required) + optional location + description. */
export function EventComposer({ onCreate, onClose }: { onCreate: (e: NewEvent) => void; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
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

  const valid = title.trim().length > 0 && when.length > 0
  const field = 'glass-inset w-full rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/55 focus:outline-none'

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end bg-black/40 sm:items-center sm:justify-center">
      <motion.div
        ref={sheetRef}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        role="dialog"
        aria-label="Create an event"
        className="glass-strong edge-light flex max-h-[85dvh] w-full flex-col rounded-t-3xl sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-sm font-semibold text-white">Create an event</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event name"
            aria-label="Event name"
            maxLength={200}
            className={field}
          />
          <label className="block">
            <span className="mb-1.5 block px-1 text-xs font-medium text-white/55">When</span>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              aria-label="When"
              className={`${field} [color-scheme:dark]`}
            />
          </label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional)"
            aria-label="Location"
            maxLength={200}
            className={field}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            aria-label="Description"
            rows={2}
            maxLength={500}
            className={`${field} resize-none`}
          />
        </div>
        <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            disabled={!valid}
            onClick={() =>
              onCreate({
                title: title.trim(),
                description: description.trim(),
                location: location.trim(),
                startsAt: new Date(when).toISOString(),
              })
            }
            className="bg-aurora w-full rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-glow-violet)] transition active:scale-[0.99] disabled:opacity-40"
          >
            Create event
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
