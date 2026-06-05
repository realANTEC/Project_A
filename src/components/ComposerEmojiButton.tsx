import { useEffect, useRef, useState } from 'react'
import { Smile } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EmojiPicker } from './EmojiPicker'

/**
 * Composer emoji button: opens the EmojiPicker in a popover above the button and inserts
 * picked emoji via `onPick` (the composer splices it at the caret). Stays open for
 * multi-pick; closes on outside press or Escape.
 */
export function ComposerEmojiButton({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Emoji"
        className={cn(
          'grid h-10 w-10 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white',
          open && 'bg-white/10 text-white',
        )}
      >
        <Smile className="h-[22px] w-[22px]" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2">
          <EmojiPicker onPick={onPick} />
        </div>
      )}
    </div>
  )
}
