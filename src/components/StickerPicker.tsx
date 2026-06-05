import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { fetchStickers } from '@/lib/giphy'

/** GIPHY sticker picker panel — trending by default, debounced search. */
export function StickerPicker({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const timer = useRef<number | null>(null)

  // Debounce in the event handler (not an effect) so we don't trip react-hooks/set-state-in-effect.
  const onChange = (v: string) => {
    setInput(v)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setQuery(v), 350)
  }

  const { data: stickers = [], isLoading, isError } = useQuery({
    queryKey: ['giphy', query],
    queryFn: () => fetchStickers(query),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="glass-strong edge-light mx-2 mb-1 flex h-60 flex-col gap-2 rounded-2xl p-2">
      <div className="flex items-center gap-2">
        <div className="glass-inset flex min-w-0 flex-1 items-center gap-2 rounded-full px-3 py-1.5">
          <Search className="h-4 w-4 shrink-0 text-white/55" />
          <input
            value={input}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search GIPHY stickers"
            aria-label="Search stickers"
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/55 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close stickers"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <p className="py-8 text-center text-sm text-white/55">Loading…</p>}
        {isError && <p className="py-8 text-center text-sm text-white/55">Couldn’t load stickers.</p>}
        {!isLoading && !isError && stickers.length === 0 && (
          <p className="py-8 text-center text-sm text-white/55">No stickers found.</p>
        )}
        <div className="grid grid-cols-4 gap-1.5">
          {stickers.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s.url)}
              aria-label={s.title}
              className="aspect-square overflow-hidden rounded-lg bg-white/[0.04] transition hover:bg-white/10"
            >
              <img src={s.preview} alt={s.title} loading="lazy" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-[10px] uppercase tracking-wide text-white/40">Powered by GIPHY</p>
    </div>
  )
}
