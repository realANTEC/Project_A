import { cn } from '@/lib/cn'

type Ring = 'none' | 'aurora' | 'seen'

type AvatarProps = {
  src: string
  alt: string
  /** Diameter of the photo in px (ring/gap adds ~8px around it). */
  size?: number
  ring?: Ring
  online?: boolean
  className?: string
}

/** Circular avatar with an optional conic "aurora" story ring + fallback tint. */
export function Avatar({ src, alt, size = 44, ring = 'none', online, className }: AvatarProps) {
  const img = (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      className="block h-full w-full select-none rounded-full object-cover"
      style={{ background: 'linear-gradient(135deg,#2a2342,#3b2a48)' }}
    />
  )

  const photo = (
    <span className="block overflow-hidden rounded-full" style={{ width: size, height: size }}>
      {img}
    </span>
  )

  const core =
    ring === 'none' ? (
      <span className={cn('inline-block', className)}>{photo}</span>
    ) : (
      <span
        className={cn(
          'inline-grid rounded-full p-[2px]',
          ring === 'aurora' ? 'ring-aurora' : 'bg-white/15',
          className,
        )}
      >
        <span className="inline-grid rounded-full bg-canvas p-[2px]">{photo}</span>
      </span>
    )

  if (!online) return core

  return (
    <span className="relative inline-block">
      {core}
      <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-canvas bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.6)]" />
    </span>
  )
}
