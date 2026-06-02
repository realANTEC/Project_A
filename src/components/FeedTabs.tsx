import { useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'

const TABS = ['For you', 'Following'] as const

/** Segmented control with an aurora pill that slides between options. */
export function FeedTabs() {
  const [active, setActive] = useState(0)

  return (
    <div role="tablist" aria-label="Feed" className="glass-inset inline-flex rounded-full p-1">
      {TABS.map((t, i) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={active === i}
          onClick={() => setActive(i)}
          className="relative rounded-full px-5 py-1.5 text-sm font-medium"
        >
          {active === i && (
            <motion.span
              layoutId="feed-tab"
              className="bg-aurora absolute inset-0 rounded-full shadow-[var(--shadow-glow-violet)]"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <span className={cn('relative', active === i ? 'text-white' : 'text-white/55')}>{t}</span>
        </button>
      ))}
    </div>
  )
}
