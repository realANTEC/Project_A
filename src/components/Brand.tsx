import { useId } from 'react'
import { cn } from '@/lib/cn'

/** The Soul wordmark — a luminous gradient orb (a light held in glass) beside the type. */
export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  const raw = useId()
  const gid = `soul-orb-${raw.replace(/:/g, '')}`
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0" aria-hidden="true">
        <defs>
          <radialGradient id={gid} cx="38%" cy="30%" r="78%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="20%" stopColor="#dccdff" />
            <stop offset="52%" stopColor="#8b6cff" />
            <stop offset="80%" stopColor="#ff6ab5" />
            <stop offset="100%" stopColor="#45e6d8" />
          </radialGradient>
        </defs>
        {/* faint outer aura */}
        <circle cx="32" cy="32" r="21" fill="none" stroke={`url(#${gid})`} strokeOpacity="0.3" strokeWidth="1" />
        {/* the orb */}
        <circle cx="32" cy="32" r="16.5" fill={`url(#${gid})`} />
        <circle cx="32" cy="32" r="16.5" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="1" />
        {/* inner spark — the light within */}
        <circle cx="26" cy="26" r="3.9" fill="#fff" fillOpacity="0.9" />
      </svg>
      {!compact && (
        <span className="text-aurora animate-gradient font-display text-[1.35rem] font-bold leading-none tracking-tight">
          Soul
        </span>
      )}
    </div>
  )
}
