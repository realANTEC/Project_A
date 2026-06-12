import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { resolveAvatar } from '@/data/feed'
import { emojiGraphemes, emojiOnlyCount } from '@/lib/emoji'
import { stickerUrlOf } from '@/lib/giphy'
import { usePostById } from '@/lib/posts'
import { usePostModal } from '@/lib/post-modal'
import { postIdOf, urlRe } from '@/lib/postLinks'
import { AnimatedEmoji } from './AnimatedEmoji'
import { EmojiText } from './EmojiText'

/** Render text with clickable links + inline (static) emoji; in-app links (same origin)
 *  use the router (no reload). Emoji rendering lives in EmojiText (shared with comments). */
function Linkified({ text, linkClass }: { text: string; linkClass: string }) {
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  // App links include the deploy base (BASE_URL) — the router's `to` is base-relative,
  // so strip origin + base, not just origin.
  const appRoot = window.location.origin + import.meta.env.BASE_URL
  for (const match of text.matchAll(urlRe())) {
    const url = match[0]
    const start = match.index ?? 0
    if (start > last) out.push(<EmojiText key={`t${i}`} text={text.slice(last, start)} />)
    if (`${url}/`.startsWith(appRoot)) {
      const to = url.length > appRoot.length ? `/${url.slice(appRoot.length)}` : '/'
      out.push(
        <Link key={`l${i++}`} to={to} className={linkClass}>
          {url}
        </Link>,
      )
    } else {
      out.push(
        <a key={`l${i++}`} href={url} target="_blank" rel="noreferrer" className={linkClass}>
          {url}
        </a>,
      )
    }
    last = start + url.length
  }
  if (last < text.length) out.push(<EmojiText key={`t${i}`} text={text.slice(last)} />)
  return <>{out}</>
}

/** An Instagram-style preview of a shared Soul post: a self-contained card with an author header
 *  row, the square photo, and a one-line caption underneath. MessageRow drops the bubble chrome
 *  around it (bareBubble), so the card reads as its own message like an IG DM share. */
function SharedPostCard({ postId }: { postId: string }) {
  const { data: post, isLoading } = usePostById(postId)
  const { openPost } = usePostModal()
  if (isLoading)
    return <div className="mt-1 aspect-[3/4] w-[300px] max-w-full animate-pulse rounded-2xl bg-white/5" />
  if (!post) return null
  return (
    <button
      type="button"
      onClick={() => openPost(post)}
      className="glass-inset mt-1 block w-[300px] max-w-full overflow-hidden rounded-2xl text-left ring-1 ring-white/10 transition hover:ring-white/25"
    >
      <span className="flex items-center gap-2.5 px-3 py-2.5">
        <img src={resolveAvatar(post.author)} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white">
          @{post.author.handle}
        </span>
      </span>
      <span
        className="block aspect-square w-full overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${post.tint[0]}, ${post.tint[1]})` }}
      >
        <img src={post.image} alt="" className="h-full w-full object-cover" />
      </span>
      {post.caption && (
        // truncate (nowrap), NOT line-clamp-1: the clamp only clips at the padding edge, so the
        // start of line 2 leaks through the bottom padding.
        <span className="block truncate px-3 py-2.5 text-[13px] text-white/70">
          <span className="font-semibold text-white">@{post.author.handle}</span>{' '}
          <EmojiText text={post.caption} />
        </span>
      )}
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
      {inline &&
        (postId ? (
          // With a card below, MessageRow drops the bubble chrome (bareBubble) — so bubble the
          // accompanying text itself, IG-style: a normal text bubble stacked above the card.
          <span
            className={cn(
              'block w-fit max-w-full rounded-2xl px-4 py-2.5 text-sm',
              fromMe ? 'bg-aurora ml-auto rounded-br-md text-white' : 'glass-inset rounded-bl-md text-white/90',
            )}
          >
            <Linkified text={inline} linkClass={linkClass} />
          </span>
        ) : (
          <Linkified text={inline} linkClass={linkClass} />
        ))}
      {postId && <SharedPostCard postId={postId} />}
    </>
  )
}
