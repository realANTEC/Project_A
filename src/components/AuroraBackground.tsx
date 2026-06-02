/**
 * AuroraBackground
 * The living canvas every glass surface floats on: a near-black field lit by
 * slow-drifting aurora light, finished with a vignette and a layer of film
 * grain so the gradients never band. Purely decorative — hidden from a11y tree.
 */

type Blob = {
  color: string
  size: string
  top?: string
  left?: string
  right?: string
  bottom?: string
  animation: string
  opacity: number
}

const BLOBS: Blob[] = [
  {
    color: 'var(--color-iris)',
    size: '46vw',
    top: '-10vh',
    left: '-8vw',
    animation: 'drift-a 26s var(--ease-out-soft) infinite',
    opacity: 0.46,
  },
  {
    color: 'var(--color-pink)',
    size: '42vw',
    top: '-6vh',
    right: '-10vw',
    animation: 'drift-b 31s var(--ease-out-soft) infinite',
    opacity: 0.42,
  },
  {
    color: 'var(--color-cyan)',
    size: '50vw',
    bottom: '-22vh',
    left: '18vw',
    animation: 'drift-c 35s var(--ease-out-soft) infinite',
    opacity: 0.36,
  },
  {
    color: 'var(--color-amber)',
    size: '28vw',
    top: '28vh',
    left: '40vw',
    animation: 'drift-a 29s var(--ease-out-soft) infinite reverse',
    opacity: 0.23,
  },
]

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

export function AuroraBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-canvas">
      {/* Deep base wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, rgba(124,92,255,0.12), transparent 60%), radial-gradient(90% 70% at 85% 110%, rgba(69,230,216,0.10), transparent 55%)',
        }}
      />

      {/* Drifting aurora light */}
      {BLOBS.map((b, i) => (
        <div
          key={i}
          className="aurora-blob"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            right: b.right,
            bottom: b.bottom,
            opacity: b.opacity,
            animation: b.animation,
            background: `radial-gradient(circle at 50% 50%, ${b.color}, transparent 68%)`,
          }}
        />
      ))}

      {/* Vignette to focus the center */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(120% 100% at 50% 35%, transparent 55%, rgba(2,2,7,0.55) 100%)',
        }}
      />

      {/* Film grain */}
      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-soft-light"
        style={{ backgroundImage: GRAIN, backgroundSize: '180px 180px' }}
      />
    </div>
  )
}
