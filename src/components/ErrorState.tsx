import { RotateCw, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Shown when a read query fails — distinguishes "couldn't load" from a genuinely
 * empty result (which uses <EmptyState>). Mirrors the EmptyState look, with a Retry.
 */
export function ErrorState({
  title = 'Couldn’t load this',
  description = 'Something went wrong. Check your connection and try again.',
  onRetry,
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div role="alert" className={cn('grid place-items-center gap-3 py-20 text-center', className)}>
      <span className="grid h-16 w-16 place-items-center rounded-full bg-white/[0.05] ring-1 ring-white/10">
        <TriangleAlert className="h-7 w-7 text-white/55" strokeWidth={1.6} />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-white/80">{title}</p>
        <p className="mx-auto max-w-xs text-sm text-white/55">{description}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/[0.1]"
        >
          <RotateCw className="h-4 w-4" /> Try again
        </button>
      )}
    </div>
  )
}

/**
 * A non-intrusive inline banner for a *soft* failure where fallback content still
 * shows below (e.g. the feed degrading to curated posts when the DB load fails) —
 * a full <ErrorState> would wrongly hide that content.
 */
export function RetryBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm text-white/70 ring-1 ring-white/10"
    >
      <TriangleAlert className="h-4 w-4 shrink-0 text-amber-300/80" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-lilac transition hover:text-white"
      >
        <RotateCw className="h-3.5 w-3.5" /> Retry
      </button>
    </div>
  )
}
