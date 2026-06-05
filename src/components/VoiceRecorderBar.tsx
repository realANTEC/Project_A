import { useEffect, useRef, useState } from 'react'
import { Mic, Pause, Play, Send, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDuration } from '@/lib/attachments'
import type { RecorderStatus } from '@/lib/useVoiceRecorder'

const BARS = 48

/** Most recent `n` levels, left-padded with zeros — a scrolling window for the live waveform. */
function windowLevels(levels: number[], n: number): number[] {
  const tail = levels.slice(-n)
  return tail.length < n ? [...Array(n - tail.length).fill(0), ...tail] : tail
}

/** Downsample the whole history to `n` peak bars — the full recording, for the paused preview. */
function downsample(levels: number[], n: number): number[] {
  if (levels.length <= n) return windowLevels(levels, n)
  const out: number[] = []
  const bucket = levels.length / n
  for (let i = 0; i < n; i++) {
    let max = 0
    for (let j = Math.floor(i * bucket); j < Math.floor((i + 1) * bucket); j++) max = Math.max(max, levels[j])
    out.push(max)
  }
  return out
}

/**
 * The composer in recording mode (WhatsApp-style): a live amplitude waveform + timer on top, and
 * trash / Pause·Resume / send below. While paused you can play back what's recorded so far.
 */
export function VoiceRecorderBar({
  status,
  durationMs,
  levels,
  getPreviewBlob,
  onPause,
  onResume,
  onCancel,
  onSend,
}: {
  status: RecorderStatus
  durationMs: number
  levels: number[]
  getPreviewBlob: () => Blob
  onPause: () => void
  onResume: () => void
  onCancel: () => void
  onSend: () => void
}) {
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [previewFraction, setPreviewFraction] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)

  // Drop the preview audio on unmount (no setState in this cleanup).
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  const releasePreview = () => {
    audioRef.current?.pause()
    audioRef.current = null
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    setPreviewPlaying(false)
    setPreviewFraction(0)
  }

  const togglePreview = () => {
    let a = audioRef.current
    if (!a) {
      const url = URL.createObjectURL(getPreviewBlob())
      urlRef.current = url
      const audio = new Audio(url)
      audio.onended = () => {
        setPreviewPlaying(false)
        setPreviewFraction(0)
      }
      audio.ontimeupdate = () => {
        const dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : durationMs / 1000
        setPreviewFraction(dur ? Math.min(1, audio.currentTime / dur) : 0)
      }
      audioRef.current = audio
      a = audio
    }
    if (a.paused) {
      a.play().catch(() => {})
      setPreviewPlaying(true)
    } else {
      a.pause()
      setPreviewPlaying(false)
    }
  }

  // Resume/cancel/send all leave the paused-preview state — release the preview audio first.
  const handleResume = () => {
    releasePreview()
    onResume()
  }
  const handleCancel = () => {
    releasePreview()
    onCancel()
  }
  const handleSend = () => {
    releasePreview()
    onSend()
  }

  const recording = status === 'recording'
  const bars = recording ? windowLevels(levels, BARS) : downsample(levels, BARS)
  const playedBars = Math.round(previewFraction * bars.length)

  return (
    <div className="flex flex-1 flex-col gap-2.5">
      {/* Waveform + timer */}
      <div className="flex h-9 items-center gap-3 px-1">
        {status === 'paused' && (
          <button
            type="button"
            onClick={togglePreview}
            aria-label={previewPlaying ? 'Pause preview' : 'Play preview'}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white transition hover:bg-white/10"
          >
            {previewPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-[1px]" />}
          </button>
        )}
        {recording && (
          <span className="w-10 shrink-0 text-sm tabular-nums text-white/80">
            {formatDuration(durationMs)}
          </span>
        )}
        <div className="flex h-8 min-w-0 flex-1 items-center gap-px overflow-hidden">
          {bars.map((h, i) => (
            <span
              key={i}
              className={cn(
                'min-w-[2px] flex-1 rounded-full',
                status === 'paused' && i < playedBars ? 'bg-white' : 'bg-white/45',
              )}
              style={{ height: `${Math.round(3 + h * 26)}px` }}
            />
          ))}
        </div>
        {status === 'paused' && (
          <span className="w-10 shrink-0 text-right text-sm tabular-nums text-white/80">
            {formatDuration(durationMs)}
          </span>
        )}
      </div>

      {/* Trash / Pause·Resume / Send */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCancel}
          aria-label="Cancel recording"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-500/15 text-rose-300 transition hover:bg-rose-500/25"
        >
          <Trash2 className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={recording ? onPause : handleResume}
          className={cn(
            'flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition',
            recording ? 'bg-white/10 hover:bg-white/15' : 'bg-rose-500/25 hover:bg-rose-500/35',
          )}
        >
          {recording ? (
            <>
              <Pause className="h-5 w-5" />
              Pause
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              Resume
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleSend}
          aria-label="Send voice message"
          className="bg-aurora grid h-11 w-11 shrink-0 place-items-center rounded-full text-white shadow-[var(--shadow-glow-violet)] transition active:scale-95"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
