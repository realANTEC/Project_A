import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Heart, MessageCircle } from 'lucide-react'
import { explorePosts, type Post } from '@/data/feed'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/cn'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useFeedPosts } from '@/lib/posts'
import { fallbackLayoutId, usePostModal } from '@/lib/post-modal'
import { Page } from '@/components/Page'

const FILTERS = ['For you', 'Nature', 'Architecture', 'Portraits', 'Minimal', 'Color']

function ExploreTile({
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
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.025, 0.25), ease: [0.22, 1, 0.36, 1] }}
      className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl ring-1 ring-white/10"
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
          'relative z-10 block w-full object-cover transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.06]',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div className="absolute inset-0 z-20 flex items-center justify-center gap-6 bg-black/45 opacity-0 backdrop-blur-[1px] transition duration-300 group-hover:opacity-100">
        <span className="flex items-center gap-1.5 text-sm font-bold text-white">
          <Heart className="h-5 w-5" fill="currentColor" /> {formatCount(post.likes)}
        </span>
        <span className="flex items-center gap-1.5 text-sm font-bold text-white">
          <MessageCircle className="h-5 w-5" fill="currentColor" /> {formatCount(post.commentsCount)}
        </span>
      </div>
    </motion.button>
  )
}

export function ExplorePage() {
  const { openPost } = usePostModal()
  const [filter, setFilter] = useState(0)
  // Real DB posts layered over the curated mosaic (newest first), like the home feed.
  const { data: dbPosts = [] } = useFeedPosts()
  const posts = useMemo(
    () => (isSupabaseConfigured ? [...dbPosts, ...explorePosts] : explorePosts),
    [dbPosts],
  )

  return (
    <Page>
      {/* Sticky header + filter chips */}
      <div className="sticky top-0 z-30 -mx-3 mb-5 bg-gradient-to-b from-canvas via-canvas/85 to-transparent px-3 pb-3 pt-4 backdrop-blur-md lg:-mx-1 lg:px-1 lg:pt-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Explore</h1>
        <div className="no-scrollbar mask-fade-r mt-3 flex gap-2 overflow-x-auto">
          {FILTERS.map((f, i) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(i)}
              className={cn(
                'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition',
                i === filter
                  ? 'bg-aurora text-white shadow-[var(--shadow-glow-violet)]'
                  : 'glass-inset text-white/65 hover:text-white',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Masonry mosaic */}
      <div className="columns-2 gap-3 sm:columns-3">
        {posts.map((post, i) => (
          <ExploreTile key={post.id} post={post} index={i} onOpen={(el) => openPost(post, el)} />
        ))}
      </div>
    </Page>
  )
}
