import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ExternalLink, Sparkles, X } from 'lucide-react'
import { useFocusTrap } from '@/lib/useFocusTrap'

const REPO_URL = 'https://github.com/realANTEC/Project_A'

/** Truthful "About Soul" dialog — the real destination behind the footer links. */
export function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const trapRef = useFocusTrap<HTMLDivElement>(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-xl" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label="About Soul"
            initial={{ scale: 0.94, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="glass edge-light relative z-10 flex w-full max-w-[440px] flex-col overflow-hidden rounded-4xl"
          >
            <header className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
              <h2 className="font-display flex items-center gap-2 text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4 text-lilac" /> About Soul
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex flex-col gap-4 p-5">
              <p className="text-sm leading-relaxed text-white/80">
                Soul is a design-led, visual-first social app — a portfolio demo exploring a luminous
                “aurora glass” aesthetic, built on React, Vite, TypeScript, Tailwind, and a real Supabase
                backend.
              </p>
              <p className="text-sm leading-relaxed text-white/55">
                It’s a personal showcase, not a commercial service — so there’s no real Terms, Privacy, or
                Careers page behind it. The full source, including everything you’re looking at, lives on
                GitHub.
              </p>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="glass-inset flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                <ExternalLink className="h-4 w-4" /> View source on GitHub
              </a>
              <p className="text-center text-[11px] text-white/40">© 2026 Soul — made with light.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
