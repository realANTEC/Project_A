import { useCallback, useEffect, useRef, useState } from 'react'

export interface VoiceRecording {
  blob: Blob
  durationMs: number
  mime: string
}

export type RecorderStatus = 'idle' | 'recording' | 'paused'

/** Pick a MediaRecorder mime the browser supports (opus/webm where possible, mp4 on Safari). */
function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

/**
 * Clean-voice capture: engage the browser's audio DSP — noise suppression (kills steady
 * background noise like fans/hiss), echo cancellation, and auto gain (levels the voice) — and
 * capture mono so the signal is focused on speech. Each flag is best-effort; the browser applies
 * what the device supports and ignores the rest, and start() falls back to a plain mic on error.
 */
const VOICE_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
}

// Also request `voiceIsolation` — the newer, most aggressive (OS/ML) noise-removal mode — where
// the browser supports it. Best-effort: it rides a spread (not the typed literal above) because
// the property isn't in every TS lib.dom version, and devices without it simply ignore it.
const RICH_VOICE_CONSTRAINTS = { ...VOICE_CONSTRAINTS, voiceIsolation: true }

// Opus at 64 kbps mono is near-transparent for speech while keeping voice notes small.
const VOICE_BITRATE = 64000

/**
 * Voice-note recorder with pause/resume. Exposes a live `status`, an accumulating amplitude
 * history (`levels`) for the waveform, the elapsed `durationMs` (paused time excluded), and a
 * `getPreviewBlob` for playing back what's been recorded so far while paused. start/pause/resume/
 * stop/cancel are event handlers, so their setState/ref writes are allowed; the mic is always
 * released on teardown.
 */
export function useVoiceRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [durationMs, setDurationMs] = useState(0)
  const [levels, setLevels] = useState<number[]>([])

  const recRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const tickRef = useRef<number | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const accumRef = useRef(0) // ms recorded across completed segments (excludes paused gaps)
  const segStartRef = useRef(0) // performance.now() at the start of the current segment
  const levelsRef = useRef<number[]>([])

  const clearTick = () => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }

  const cleanup = useCallback(() => {
    clearTick()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {})
      ctxRef.current = null
    }
    analyserRef.current = null
    dataRef.current = null
    recRef.current = null
  }, [])

  // Sample the elapsed time + current amplitude (called on an interval while recording).
  const sampleTick = useCallback(() => {
    setDurationMs(accumRef.current + (performance.now() - segStartRef.current))
    const an = analyserRef.current
    const data = dataRef.current
    if (an && data) {
      an.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const x = (data[i] - 128) / 128
        sum += x * x
      }
      const lvl = Math.min(1, Math.sqrt(sum / data.length) * 3.2)
      const next = [...levelsRef.current, lvl]
      if (next.length > 800) next.shift()
      levelsRef.current = next
      setLevels(next)
    }
  }, [])

  const start = useCallback(async (): Promise<boolean> => {
    if (recRef.current) return true
    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: RICH_VOICE_CONSTRAINTS })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true }) // device rejected the constraints
      }
      streamRef.current = stream
      const mime = pickMime()
      const options: MediaRecorderOptions = { audioBitsPerSecond: VOICE_BITRATE }
      if (mime) options.mimeType = mime
      const rec = new MediaRecorder(stream, options)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data)
      }
      rec.start()
      recRef.current = rec
      accumRef.current = 0
      segStartRef.current = performance.now()
      levelsRef.current = []
      setDurationMs(0)
      setLevels([])
      setStatus('recording')
      try {
        const ctx = new AudioContext()
        ctxRef.current = ctx
        const src = ctx.createMediaStreamSource(stream)
        const an = ctx.createAnalyser()
        an.fftSize = 256
        src.connect(an)
        analyserRef.current = an
        dataRef.current = new Uint8Array(an.frequencyBinCount)
      } catch {
        analyserRef.current = null
      }
      tickRef.current = window.setInterval(sampleTick, 90)
      return true
    } catch {
      cleanup()
      setStatus('idle')
      return false
    }
  }, [cleanup, sampleTick])

  const pause = useCallback(() => {
    const rec = recRef.current
    if (!rec || rec.state !== 'recording') return
    accumRef.current += performance.now() - segStartRef.current
    clearTick()
    setDurationMs(accumRef.current)
    rec.pause()
    rec.requestData() // flush chunks so far so getPreviewBlob can play the recording-so-far
    setStatus('paused')
  }, [])

  const resume = useCallback(() => {
    const rec = recRef.current
    if (!rec || rec.state !== 'paused') return
    segStartRef.current = performance.now()
    rec.resume()
    tickRef.current = window.setInterval(sampleTick, 90)
    setStatus('recording')
  }, [sampleTick])

  // Build a blob of everything recorded so far (for the paused preview).
  const getPreviewBlob = useCallback((): Blob => {
    const mime = recRef.current?.mimeType || 'audio/webm'
    return new Blob(chunksRef.current, { type: mime })
  }, [])

  const stop = useCallback(async (): Promise<VoiceRecording | null> => {
    const rec = recRef.current
    if (!rec) {
      cleanup()
      setStatus('idle')
      return null
    }
    const total = accumRef.current + (rec.state === 'recording' ? performance.now() - segStartRef.current : 0)
    const mime = rec.mimeType || 'audio/webm'
    clearTick()
    const blob = await new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: mime }))
      if (rec.state !== 'inactive') rec.stop()
      else resolve(new Blob(chunksRef.current, { type: mime }))
    })
    cleanup()
    setStatus('idle')
    setLevels([])
    return { blob, durationMs: total, mime }
  }, [cleanup])

  const cancel = useCallback(() => {
    const rec = recRef.current
    if (rec) {
      rec.ondataavailable = null
      rec.onstop = null
      if (rec.state !== 'inactive') {
        try {
          rec.stop()
        } catch {
          // already stopped
        }
      }
    }
    chunksRef.current = []
    cleanup()
    setStatus('idle')
    setDurationMs(0)
    setLevels([])
  }, [cleanup])

  // Release the mic if the thread unmounts mid-recording.
  useEffect(() => cleanup, [cleanup])

  return { status, durationMs, levels, start, pause, resume, cancel, stop, getPreviewBlob }
}
