import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { emojiGraphemes, emojiOnlyCount } from '@/lib/emoji'
import { stickerUrlOf } from '@/lib/giphy'
import { usePostById } from '@/lib/posts'
import { usePostModal } from '@/lib/post-modal'
import { AnimatedEmoji } from './AnimatedEmoji'

// Fresh regex per call (a shared /g regex carries lastIndex state between uses).
const urlRe = () => /(https?:\/\/[^\s]+)/g

/** The Soul post id in a `…/p/:id` link, or null. */
function postIdOf(url: string): string | null {
  return url.match(/^https?:\/\/[^/]+\/p\/([\w-]+)/)?.[1] ?? null
}

/** Render text with clickable links; in-app links (same origin) use the router (no reload). */
function Linkified({ text, linkClass }: { text: string; linkClass: string }) {
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  for (const match of text.matchAll(urlRe())) {
    const url = match[0]
    const start = match.index ?? 0
    if (start > last) out.push(text.slice(last, start))
    if (url.startsWith(window.location.origin)) {
      out.push(
        <Link key={i++} to={url.slice(window.location.origin.length) || '/'} className={linkClass}>
          {url}
        </Link>,
      )
    } else {
      out.push(
        <a key={i++} href={url} target="_blank" rel="noreferrer" className={linkClass}>
          {url}
        </a>,
      )
    }
    last = start + url.length
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}

/** A compact, tappable preview of a shared Soul post. */
function SharedPostCard({ postId }: { postId: string }) {
  const { data: post, isLoading } = usePostById(postId)
  const { openPost } = usePostModal()
  if (isLoading) return <div className="mt-1 h-14 w-full animate-pulse rounded-xl bg-white/5" />
  if (!post) return null
  return (
    <button
      type="button"
      onClick={() => openPost(post)}
      className="mt-1 flex w-full items-center gap-2.5 overflow-hidden rounded-xl bg-black/25 p-1.5 text-left ring-1 ring-white/10 transition hover:bg-black/35"
    >
      <span
        className="h-11 w-11 shrink-0 overflow-hidden rounded-lg"
        style={{ background: `linear-gradient(135deg, ${post.tint[0]}, ${post.tint[1]})` }}
      >
        <img src={post.image} alt="" className="h-full w-full object-cover" />
      </span>
      <span className="min-w-0 flex-1 pr-1">
        <span className="block truncate text-xs font-semibold text-white">@{post.author.handle}</span>
        <span className="block truncate text-xs text-white/70">{post.caption || 'View post'}</span>
      </span>
    </button>
  )
}

/** Chat message content: long links wrap, URLs are clickable, and a shared Soul post
 *  renders as a preview card (its bare /p/:id link is replaced by the card). */
export function MessageBody({ text, fromMe }: { text: string; fromMe: boolean }) {
  const reduceMotion = useReducedMotion()
  // A message that is just a GIPHY sticker URL renders as the sticker image.
  const sticker = stickerUrlOf(text)
  if (sticker) return <img src={sticker} alt="Sticker" loading="lazy" className="max-h-40 w-auto max-w-full" />

  // A short emoji-only message renders large with no bubble. Each emoji is Google's looping
  // animated WebP (falls back to the glyph on 404) and pops in — unless reduced motion, where
  // it stays the static glyph.
  const emoji = emojiOnlyCount(text)
  if (emoji >= 1 && emoji <= 3) {
    const size = emoji === 1 ? 'text-6xl' : emoji === 2 ? 'text-5xl' : 'text-4xl'
    if (reduceMotion) return <span className={cn('inline-block leading-none', size)}>{text.trim()}</span>
    return (
      <motion.span
        className={cn('inline-flex items-center gap-1 leading-none', size)}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 16 }}
      >
        {emojiGraphemes(text).map((g, i) => (
          <AnimatedEmoji key={i} emoji={g} />
        ))}
      </motion.span>
    )
  }

  const urls = [...text.matchAll(urlRe())].map((m) => m[0])
  const postUrl = urls.find((u) => postIdOf(u) !== null) ?? null
  const postId = postUrl ? postIdOf(postUrl) : null
  // The shared post renders as a card below, so drop its bare link from the inline text.
  const inline = (postUrl ? text.split(postUrl).join(' ') : text).replace(/\s{2,}/g, ' ').trim()
  const linkClass = cn(
    'font-medium underline underline-offset-2 break-all',
    fromMe ? 'text-white hover:text-white/80' : 'text-lilac hover:text-white',
  )
  return (
    <>
      {inline && <Linkified text={inline} linkClass={linkClass} />}
      {postId && <SharedPostCard postId={postId} />}
    </>
  )
}
