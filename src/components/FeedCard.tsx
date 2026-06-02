import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { Bookmark, Heart, MapPin, MessageCircle, MoreHorizontal, Send, Smile } from 'lucide-react'
import { avatar, resolveAvatar, type Post } from '@/data/feed'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/cn'
import { usePostModal } from '@/lib/post-modal'
import { usePostInteractions } from '@/lib/interactions'
import { Avatar } from './Avatar'
import { VerifiedBadge } from './VerifiedBadge'
import { PostMedia } from './PostMedia'

const SPRING = { type: 'spring', stiffness: 600, damping: 16 } as const

function ActionButton({
  children,
  onClick,
  active,
  activeClass,
  label,
}: {
  children: ReactNode
  onClick?: () => void
  active?: boolean
  activeClass?: string
  label: string
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.84 }}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors',
        active ? activeClass : 'text-white/75 hover:text-white',
      )}
    >
      {children}
    </motion.button>
  )
}

export function FeedCard({ post, index = 0 }: { post: Post; index?: number }) {
  const { openPost } = usePostModal()
  const {
    liked,
    saved,
    likeCount: likes,
    commentCount,
    toggleLike,
    like,
    toggleSave,
  } = usePostInteractions(post)

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: Math.min(index * 0.06, 0.3) }}
      className="glass edge-light glass-interactive overflow-hidden rounded-4xl"
    >
      {/* header */}
      <header className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
        <Link to={`/u/${post.author.handle}`} className="shrink-0">
          <Avatar src={resolveAvatar(post.author)} alt={post.author.name} size={42} ring="aurora" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              to={`/u/${post.author.handle}`}
              className="truncate text-sm font-semibold text-white hover:underline"
            >
              {post.author.name}
            </Link>
            {post.author.verified && <VerifiedBadge />}
          </div>
          <div className="flex items-center gap-1 text-xs text-white/55">
            <span className="truncate">@{post.author.handle}</span>
            {post.location && (
              <>
                <span aria-hidden>·</span>
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{post.location}</span>
              </>
            )}
          </div>
        </div>
        <span className="shrink-0 text-xs text-white/55">{post.time}</span>
        <button
          type="button"
          aria-label="More options"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>

      {/* media */}
      <div className="px-1.5">
        <div className="overflow-hidden rounded-3xl ring-1 ring-white/10">
          <PostMedia
            postId={post.id}
            image={post.image}
            aspect={post.aspect}
            tint={post.tint}
            alt={`Post by ${post.author.name}`}
            onDoubleTapLike={like}
            onOpen={(el) => openPost(post, el)}
          />
        </div>
      </div>

      {/* actions */}
      <div className="flex items-center gap-0.5 px-3 pt-3 sm:px-4">
        <ActionButton onClick={toggleLike} active={liked} activeClass="text-rose-400" label="Like">
          <motion.span
            key={liked ? 'on' : 'off'}
            initial={{ scale: 0.55 }}
            animate={{ scale: 1 }}
            transition={SPRING}
            className="grid place-items-center"
          >
            <Heart className="h-[26px] w-[26px]" fill={liked ? 'currentColor' : 'none'} strokeWidth={1.75} />
          </motion.span>
          <span className="text-sm font-medium tabular-nums">{formatCount(likes)}</span>
        </ActionButton>

        <ActionButton label="Comment" onClick={() => openPost(post)}>
          <MessageCircle className="h-[25px] w-[25px]" strokeWidth={1.75} />
          <span className="text-sm font-medium tabular-nums">{formatCount(commentCount)}</span>
        </ActionButton>

        <ActionButton label="Share">
          <Send className="h-[23px] w-[23px]" strokeWidth={1.75} />
        </ActionButton>

        <button
          type="button"
          onClick={toggleSave}
          aria-label="Save"
          aria-pressed={saved}
          className={cn(
            'ml-auto grid h-10 w-10 place-items-center rounded-full transition hover:bg-white/10',
            saved ? 'text-amber-300' : 'text-white/75 hover:text-white',
          )}
        >
          <motion.span
            key={saved ? 'on' : 'off'}
            initial={{ scale: 0.55 }}
            animate={{ scale: 1 }}
            transition={SPRING}
          >
            <Bookmark
              className="h-[25px] w-[25px]"
              fill={saved ? 'currentColor' : 'none'}
              strokeWidth={1.75}
            />
          </motion.span>
        </button>
      </div>

      {/* liked by */}
      <div className="flex items-center gap-2 px-4 pt-2.5 sm:px-5">
        {post.likedBy.length > 0 ? (
          <>
            <div className="flex -space-x-2">
              {post.likedBy.slice(0, 3).map((user) => (
                <img
                  key={user.handle}
                  src={avatar(user.avatarId)}
                  alt={user.name}
                  loading="lazy"
                  className="h-5 w-5 rounded-full object-cover ring-2 ring-canvas"
                />
              ))}
            </div>
            <p className="text-xs text-white/55">
              Liked by <span className="font-semibold text-white/85">{post.likedBy[0].handle}</span> and{' '}
              <span className="font-semibold text-white/85">{formatCount(likes)} others</span>
            </p>
          </>
        ) : (
          <p className="text-xs text-white/55">
            {likes > 0 ? `${formatCount(likes)} likes` : 'Be the first to like this'}
          </p>
        )}
      </div>

      {/* caption */}
      <div className="px-4 pt-2 sm:px-5">
        <p className="text-[0.9rem] leading-relaxed text-white/85">
          <span className="font-semibold text-white">{post.author.handle}</span> {post.caption}
        </p>
        {post.tags.length > 0 && (
          <p className="mt-1.5 flex flex-wrap gap-x-2 text-[0.9rem] font-medium text-lilac">
            {post.tags.map((t) => (
              <span key={t} className="cursor-pointer transition hover:text-pink">
                #{t}
              </span>
            ))}
          </p>
        )}
      </div>

      {/* comments */}
      <div className="px-4 pt-3 sm:px-5">
        <button
          type="button"
          onClick={() => openPost(post)}
          className="text-sm text-white/55 transition hover:text-white/70"
        >
          View all {formatCount(commentCount)} comments
        </button>
        <ul className="mt-1.5 space-y-1">
          {post.topComments.map((c, i) => (
            <li key={i} className="text-sm text-white/80">
              <span className="font-semibold text-white">{c.user.handle}</span> {c.text}
            </li>
          ))}
        </ul>
      </div>

      {/* add comment → opens the lightbox to comment */}
      <button
        type="button"
        onClick={() => openPost(post)}
        aria-label={`Comment on ${post.author.name}'s post`}
        className="mt-3 flex w-full items-center gap-3 border-t border-white/[0.06] px-4 py-3 text-left transition hover:bg-white/[0.02] sm:px-5"
      >
        <Smile className="h-5 w-5 shrink-0 text-white/55" />
        <span className="flex-1 text-sm text-white/55">Add a comment…</span>
        <span className="text-sm font-semibold text-lilac">Post</span>
      </button>
    </motion.article>
  )
}
