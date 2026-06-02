import { cn } from '@/lib/cn'

/** The Aurora wordmark — a glowing gradient orb beside luminous type. */
export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-[13px]">
        <span className="bg-aurora animate-gradient absolute inset-0" />
        <span className="absolute inset-0 rounded-[13px] ring-1 ring-inset ring-white/25" />
        <span className="relative h-[15px] w-[15px] rounded-full bg-white/90 shadow-[0_0_12px_3px_rgba(255,255,255,0.45)]" />
      </span>
      {!compact && (
        <span className="text-aurora animate-gradient font-display text-[1.35rem] font-bold leading-none tracking-tight">
          Aurora
        </span>
      )}
    </div>
  )
}
