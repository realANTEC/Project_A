import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy } from 'lucide-react'
import { MESSAGE_REACTIONS, type DbMessage } from '@/lib/messages'
import { cn } from '@/lib/cn'
import { EmojiPicker } from './EmojiPicker'

export type MessageActionsMenuProps = {
  message: DbMessage
  /** My current reaction emoji on this message, if any (highlights it in the bar). */
  myReaction?: string
  /** Bounding rect of the message bubble — the menu anchors to it. */
  anchorRect: DOMRect
  onReact: (emoji: string) => void
  onCopy: () => void
  onClose: () => void
}

/**
 * IG/Messenger-style message action popover: a reaction bar (the 6 quick reactions
 * + a "+" for any emoji) above a small action menu. Portaled to <body> and clamped
 * to the viewport so it can sit over the chat without being clipped.
 */
export function MessageActionsMenu({
  message,
  myReaction,
  anchorRect,
  onReact,
  onCopy,
  onClose,
}: MessageActionsMenuProps) {
  const popRef = useRef<HTMLDivElement>(null)
  const [showPicker, setShowPicker] = useState(false)

  // Position imperatively (a DOM write in the effect — NOT setState, which would trip
  // react-hooks/set-state-in-effect): measure the popover, place it above the bubble
  // (flip below when there's no room), clamp to the viewport, then reveal it.
  // Re-runs when the picker toggles since that changes the popover's size.
  useLayoutEffect(() => {
    const el = popRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const m = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = message.fromMe ? anchorRect.right - r.width : anchorRect.left
    left = Math.max(m, Math.min(left, vw - r.width - m))
    let top = anchorRect.top - r.height - m
    if (top < m) top = anchorRect.bottom + m
    top = Math.max(m, Math.min(top, vh - r.height - m))
    el.style.left = `${left}px`
    el.style.top = `${top}px`
    el.style.visibility = 'visible'
  }, [anchorRect, message.fromMe, showPicker])

  // Close on outside press (pointerdown covers mouse + touch) and Escape.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) onClose()
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

  const react = (emoji: string) => {
    onReact(emoji)
    onClose()
  }

  return createPortal(
    <div
      ref={popRef}
      role="menu"
      aria-label="Message actions"
      className="fixed z-[60] flex w-max max-w-[264px] flex-col gap-2"
      style={{ top: 0, left: 0, visibility: 'hidden' }}
    >
      {/* Quick-reaction bar */}
      <div className="glass edge-light flex items-center gap-0.5 self-start rounded-full px-1.5 py-1">
        {MESSAGE_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-label={`React ${emoji}`}
            aria-pressed={myReaction === emoji}
            onClick={() => react(emoji)}
            className={cn(
              'grid h-9 w-9 place-items-center rounded-full text-xl leading-none transition hover:scale-125',
              myReaction === emoji && 'bg-white/15',
            )}
          >
            {emoji}
          </button>
        ))}
        <button
          type="button"
          aria-label="React with another emoji"
          onClick={() => setShowPicker((v) => !v)}
          className={cn(
            'grid h-9 w-9 place-items-center rounded-full text-lg font-semibold text-white/70 transition hover:bg-white/10 hover:text-white',
            showPicker && 'bg-white/10 text-white',
          )}
        >
          +
        </button>
      </div>

      {showPicker && <EmojiPicker onPick={(emoji) => react(emoji)} />}

      {/* Action list (grows as later phases add Reply / Pin / Delete / Unsend) */}
      <div className="glass edge-light flex flex-col rounded-2xl p-1.5 text-sm">
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onCopy()
            onClose()
          }}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left font-medium text-white/85 transition hover:bg-white/[0.06]"
        >
          <Copy className="h-[18px] w-[18px] text-white/70" />
          Copy
        </button>
      </div>
    </div>,
    document.body,
  )
}
