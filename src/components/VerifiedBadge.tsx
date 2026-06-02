import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Small gradient verification badge. */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'bg-aurora inline-grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full shadow-[0_2px_8px_-2px_rgba(124,92,255,0.9)]',
        className,
      )}
      role="img"
      aria-label="Verified"
      title="Verified"
    >
      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
    </span>
  )
}
