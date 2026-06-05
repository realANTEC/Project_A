import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import {
  BarChart3,
  Calendar,
  Camera,
  FileText,
  Image as ImageIcon,
  MapPin,
  User as UserIcon,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'

export type AttachmentMenuProps = {
  onGallery?: () => void
  onCamera?: () => void
  onLocation?: () => void
  onContact?: () => void
  onDocument?: () => void
  onPoll?: () => void
  onEvent?: () => void
  onClose: () => void
}

type Item = { key: string; label: string; icon: LucideIcon; tint: string; onClick: () => void }

/** WhatsApp-style attachment sheet. Only renders the actions whose handlers are provided,
 *  so the menu grows phase by phase with no dead buttons. */
export function AttachmentMenu(props: AttachmentMenuProps) {
  const { onClose } = props
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

  const items: Item[] = []
  const add = (onClick: (() => void) | undefined, key: string, label: string, icon: LucideIcon, tint: string) => {
    if (onClick) items.push({ key, label, icon, tint, onClick })
  }
  add(props.onGallery, 'gallery', 'Gallery', ImageIcon, 'text-blue-400')
  add(props.onCamera, 'camera', 'Camera', Camera, 'text-pink-400')
  add(props.onLocation, 'location', 'Location', MapPin, 'text-emerald-400')
  add(props.onContact, 'contact', 'Contact', UserIcon, 'text-sky-400')
  add(props.onDocument, 'document', 'Document', FileText, 'text-violet-400')
  add(props.onPoll, 'poll', 'Poll', BarChart3, 'text-amber-400')
  add(props.onEvent, 'event', 'Event', Calendar, 'text-rose-400')

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end bg-black/30">
      <motion.div
        ref={sheetRef}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        role="menu"
        aria-label="Attachments"
        className="glass-strong edge-light w-full rounded-t-3xl px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <div className="mx-auto grid max-w-md grid-cols-4 gap-x-3 gap-y-5">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              onClick={() => {
                it.onClick()
                onClose()
              }}
              className="flex flex-col items-center gap-2"
            >
              <span
                className={cn(
                  'grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.06] ring-1 ring-white/10 transition hover:bg-white/[0.1]',
                  it.tint,
                )}
              >
                <it.icon className="h-6 w-6" strokeWidth={2} />
              </span>
              <span className="text-xs text-white/70">{it.label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
