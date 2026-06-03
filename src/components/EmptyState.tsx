import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

type EmptyAction = { label: string; to?: string; onClick?: () => void }

/**
 * The app's canonical empty state — an icon in a glass ring, a title, an
 * optional hint, and an optional call-to-action. Keeps every "nothing here yet"
 * surface (Saved, Notifications, an empty profile) on one consistent look.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: EmptyAction
  className?: string
}) {
  const ctaClass =
    'bg-aurora mt-1 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-glow-violet)] transition hover:scale-[1.03]'
  return (
    <div className={cn('grid place-items-center gap-3 py-20 text-center', className)}>
      <span className="grid h-16 w-16 place-items-center rounded-full bg-white/[0.05] ring-1 ring-white/10">
        <Icon className="h-7 w-7 text-white/55" strokeWidth={1.6} />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-white/80">{title}</p>
        {description && <p className="mx-auto max-w-xs text-sm text-white/55">{description}</p>}
      </div>
      {action &&
        (action.to ? (
          <Link to={action.to} className={ctaClass}>
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className={ctaClass}>
            {action.label}
          </button>
        ))}
    </div>
  )
}
