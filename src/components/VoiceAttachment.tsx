/* eslint-disable jsx-a11y/media-has-caption */
import { useMemo, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDuration } from '@/lib/attachments'

/** Deterministic per-url bar heights (0.15..1) so each note has a stable, distinct waveform. */
function pseudoWaveform(seed: string, count: number): number[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) >>> 0
    out.push(0.15 + ((h % 1000) / 1000) * 0.85)
  }
  return out
}

/** A voice-note player: play/pause, a tappable waveform with played progress, and the time. */
export function VoiceAttachment({
  url,
  durationMs,
  fromMe,
}: {
  url: string
  durationMs: number
  fromMe?: boolean
}) {
  const [playing, setPlaying] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const bars = useMemo(() => pseudoWaveform(url, 24), [url])
  const total = durationMs || 0
  const progress = total ? Math.min(1, elapsedMs / total) : 0

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) a.play().catch(() => {})
    else a.pause()
  }

  return (
    <div
      className={cn(
        'flex w-64 max-w-full items-center gap-3 rounded-2xl px-3 py-2.5',
        fromMe ? 'bg-aurora' : 'glass-inset',
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
      </button>
      <div className="flex h-8 min-w-0 flex-1 items-center gap-[3px] overflow-hidden" aria-hidden="true">
        {bars.map((h, i) => (
          <span
            key={i}
            className={cn(
              'w-[3px] shrink-0 rounded-full',
              i / bars.length < progress ? 'bg-white' : 'bg-white/35',
            )}
            style={{ height: `${Math.round(6 + h * 22)}px` }}
          />
        ))}
      </div>
      <span className="shrink-0 text-[11px] tabular-nums text-white/70">
        {formatDuration(elapsedMs > 0 ? elapsedMs : total)}
      </span>
      <audio
        ref={audioRef}
        src={url}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setElapsedMs(0)
        }}
        onTimeUpdate={(e) => setElapsedMs(e.currentTarget.currentTime * 1000)}
      />
    </div>
  )
}
