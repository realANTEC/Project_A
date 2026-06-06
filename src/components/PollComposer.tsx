import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/cn'

export type NewPoll = { question: string; options: string[]; allowMultiple: boolean }

/** A modal to create a poll: question + 2–12 options + an optional multi-answer toggle. */
export function PollComposer({ onCreate, onClose }: { onCreate: (p: NewPoll) => void; onClose: () => void }) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [allowMultiple, setAllowMultiple] = useState(false)
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

  const cleanOptions = options.map((o) => o.trim()).filter(Boolean)
  const valid = question.trim().length > 0 && cleanOptions.length >= 2

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end bg-black/40 sm:items-center sm:justify-center">
      <motion.div
        ref={sheetRef}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        role="dialog"
        aria-label="Create a poll"
        className="glass-strong edge-light flex max-h-[80dvh] w-full flex-col rounded-t-3xl sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-sm font-semibold text-white">Create a poll</h2>
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
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question…"
            aria-label="Question"
            maxLength={300}
            className="glass-inset w-full rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/55 focus:outline-none"
          />
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={opt}
                  onChange={(e) => setOptions((o) => o.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={`Option ${i + 1}`}
                  aria-label={`Option ${i + 1}`}
                  maxLength={120}
                  className="glass-inset min-w-0 flex-1 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/55 focus:outline-none"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setOptions((o) => o.filter((_, j) => j !== i))}
                    aria-label={`Remove option ${i + 1}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 12 && (
            <button
              type="button"
              onClick={() => setOptions((o) => [...o, ''])}
              className="flex items-center gap-1.5 px-1 text-sm font-medium text-lilac transition hover:text-white"
            >
              <Plus className="h-4 w-4" /> Add option
            </button>
          )}
          <button
            type="button"
            onClick={() => setAllowMultiple((v) => !v)}
            role="switch"
            aria-checked={allowMultiple}
            className="flex w-full items-center justify-between rounded-2xl px-1 py-1.5 text-sm text-white/85"
          >
            Allow multiple answers
            <span
              className={cn(
                'relative h-6 w-10 rounded-full transition',
                allowMultiple ? 'bg-aurora' : 'bg-white/15',
              )}
            >
              <span
                className={cn(
                  // GPU-composited slide (translate, not `left`) so the knob can't trigger layout.
                  'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 ease-out',
                  allowMultiple ? 'translate-x-4' : 'translate-x-0',
                )}
              />
            </span>
          </button>
        </div>
        <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            disabled={!valid}
            onClick={() => onCreate({ question: question.trim(), options: cleanOptions, allowMultiple })}
            className="bg-aurora w-full rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-glow-violet)] transition active:scale-[0.99] disabled:opacity-40"
          >
            Create poll
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
