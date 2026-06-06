import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/**
 * Smoothly expands/collapses its children (height + fade) when `open` flips,
 * instead of snapping them in and out. Use for discrete, user-triggered reveals —
 * a replies thread, a pinned bar, an inline chip. A height-auto reveal is a
 * one-shot on user action (not a per-frame animation), and reduce-motion is
 * honored globally (the CSS override zeroes the duration).
 *
 * Children mount only while open (plus the brief exit), so the content passed in
 * must be safe to render whenever `open` is true. For data that can be null when
 * closed, guard the access (e.g. `value?.field`) since React still builds the
 * children element each render.
 */
export function Collapse({
  open,
  children,
  className,
}: {
  open: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          style={{ overflow: 'hidden' }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
