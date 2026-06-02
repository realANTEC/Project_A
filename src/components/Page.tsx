import { motion } from 'motion/react'
import type { ReactNode } from 'react'

/**
 * Page-enter wrapper. Animates opacity ONLY (no transform) so it never becomes
 * a containing block — keeping `position: sticky` headers/rails working.
 */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
