import { BarChart3, Check } from 'lucide-react'
import { usePoll, useVote } from '@/lib/polls'
import { cn } from '@/lib/cn'

/** A poll card: question + tap-to-vote options with live tallies + fill bars. */
export function PollAttachment({ pollId }: { pollId: string }) {
  const { data: poll, isLoading } = usePoll(pollId)
  const vote = useVote(pollId)
  if (isLoading || !poll) return <div className="h-32 w-72 max-w-full animate-pulse rounded-2xl bg-white/5" />
  const total = poll.totalVotes
  return (
    <div className="w-72 max-w-full rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
      <div className="mb-2.5 flex items-start gap-2">
        <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <span className="text-sm font-semibold leading-snug text-white">{poll.question}</span>
      </div>
      <div className="space-y-1.5">
        {poll.options.map((opt, i) => {
          const pct = total ? Math.round((poll.tallies[i] / total) * 100) : 0
          const mine = poll.myVotes.has(i)
          return (
            <button
              key={i}
              type="button"
              onClick={() => vote.mutate({ optionIndex: i, allowMultiple: poll.allowMultiple })}
              className={cn(
                'relative block w-full overflow-hidden rounded-xl text-left ring-1 transition',
                mine ? 'ring-lilac/60' : 'ring-white/10 hover:ring-white/25',
              )}
            >
              <span
                className={cn(
                  // Fill via GPU scaleX (origin-left) instead of animating `width`.
                  'absolute inset-y-0 left-0 w-full origin-left transition-[transform,background-color] duration-500',
                  mine ? 'bg-lilac/25' : 'bg-white/[0.08]',
                )}
                style={{ transform: `scaleX(${pct / 100})` }}
              />
              <span className="relative flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-1.5">
                  {mine && <Check className="h-3.5 w-3.5 shrink-0 text-lilac" />}
                  <span className="truncate text-white/90">{opt}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-white/60">{pct}%</span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-white/55">
        {total} {total === 1 ? 'vote' : 'votes'}
        {poll.allowMultiple ? ' · Multiple answers' : ''}
      </p>
    </div>
  )
}
