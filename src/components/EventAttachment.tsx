import { Calendar, Check, MapPin } from 'lucide-react'
import { useEvent, useRsvp, type RsvpStatus } from '@/lib/events'
import { cn } from '@/lib/cn'

const RSVPS: { key: RsvpStatus; label: string }[] = [
  { key: 'going', label: 'Going' },
  { key: 'maybe', label: 'Maybe' },
  { key: 'no', label: "Can't" },
]

/** An event card: title/date/location + Going/Maybe/Can't RSVP buttons with live counts. */
export function EventAttachment({ eventId }: { eventId: string }) {
  const { data: ev, isLoading } = useEvent(eventId)
  const rsvp = useRsvp(eventId)
  if (isLoading || !ev) return <div className="h-32 w-72 max-w-full animate-pulse rounded-2xl bg-white/5" />
  const when = new Date(ev.startsAt).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  return (
    <div className="w-72 max-w-full overflow-hidden rounded-2xl bg-black/20 ring-1 ring-white/10">
      <div className="flex items-start gap-2.5 p-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/15">
          <Calendar className="h-5 w-5 text-rose-400" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-white">{ev.title}</p>
          <p className="mt-0.5 text-xs text-white/70">{when}</p>
          {ev.location && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-white/55">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{ev.location}</span>
            </p>
          )}
        </div>
      </div>
      {ev.description && <p className="px-3 pb-2.5 text-xs leading-relaxed text-white/70">{ev.description}</p>}
      <div className="grid grid-cols-3 gap-px border-t border-white/10 bg-white/10">
        {RSVPS.map((r) => {
          const mine = ev.myRsvp === r.key
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => rsvp.mutate(r.key)}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 text-xs transition',
                mine ? 'bg-aurora text-white' : 'bg-black/20 text-white/70 hover:bg-white/[0.06]',
              )}
            >
              <span className="flex items-center gap-1 font-medium">
                {mine && <Check className="h-3 w-3" />}
                {r.label}
              </span>
              <span className={cn('tabular-nums', mine ? 'text-white/80' : 'text-white/45')}>{ev.counts[r.key]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
