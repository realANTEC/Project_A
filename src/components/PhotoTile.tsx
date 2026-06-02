import { useState } from 'react'
import { motion } from 'motion/react'
import { Heart, MessageCircle } from 'lucide-react'
import { type Post } from '@/data/feed'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/cn'
import { fallbackLayoutId } from '@/lib/post-modal'

/** Square grid tile (profile + saved) with a hover stats overlay. */
export function PhotoTile({
  post,
  index,
  onOpen,
}: {
  post: Post
  index: number
  onOpen: (el?: HTMLElement | null) => void
}) {
  const [loaded, setLoaded] = useState(false)
  return (
    <motion.button
      type="button"
      onClick={(e) => onOpen(e.currentTarget)}
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.03, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-white/10 sm:rounded-2xl"
    >
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(135deg, ${post.tint[0]}, ${post.tint[1]})` }}
      />
      <motion.img
        layoutId={fallbackLayoutId(post.id)}
        src={post.image}
        alt={`Post by ${post.author.name}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.06]',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div className="absolute inset-0 flex items-center justify-center gap-5 bg-black/45 opacity-0 backdrop-blur-[1px] transition duration-300 group-hover:opacity-100">
        <span className="flex items-center gap-1.5 text-sm font-bold text-white">
          <Heart className="h-[18px] w-[18px]" fill="currentColor" /> {formatCount(post.likes)}
        </span>
        <span className="flex items-center gap-1.5 text-sm font-bold text-white">
          <MessageCircle className="h-[18px] w-[18px]" fill="currentColor" />{' '}
          {formatCount(post.commentsCount)}
        </span>
      </div>
    </motion.button>
  )
}
