import { type ReactNode, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { Bookmark, Heart, MapPin, MessageCircle, Send, Smile, X } from 'lucide-react'
import { resolveAvatar, type Post } from '@/data/feed'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/cn'
import { fallbackLayoutId, morphName, supportsViewTransitions, usePostModal } from '@/lib/post-modal'
import { type ThreadComment, usePostComments, usePostInteractions } from '@/lib/interactions'
import { sharePost } from '@/lib/share'
import { useToast } from '@/lib/toast'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { Avatar } from './Avatar'
import { VerifiedBadge } from './VerifiedBadge'
import { PostMenu } from './PostMenu'
import { EmojiPicker } from './EmojiPicker'
import { EmojiText } from './EmojiText'
import { Collapse } from './Collapse'
import { useSharePost } from './SharePostModal'

const SPRING = { type: 'spring', stiffness: 600, damping: 16 } as const

function PaneAction({
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
        'flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors',
        active ? activeClass : 'text-white/75 hover:text-white',
      )}
    >
      {children}
    </motion.button>
  )
}

/** A single comment row; `isReply` shrinks it for the nested thread. */
function CommentItem({
  comment,
  isReply = false,
  onReply,
  liked = false,
  onToggleLike,
}: {
  comment: ThreadComment
  isReply?: boolean
  onReply: () => void
  liked?: boolean
  onToggleLike?: () => void
}) {
  const pending = comment.key.startsWith('temp-')
  return (
    <div className="flex gap-3">
      <Avatar src={resolveAvatar(comment.user)} alt={comment.user.name} size={isReply ? 26 : 32} />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-white/85">
          <span className="font-semibold text-white">{comment.user.handle}</span>{' '}
          <EmojiText text={comment.text} />
        </p>
        <div className="mt-0.5 flex items-center gap-3 text-[11px] text-white/55">
          <span>{formatCount(comment.likes)} likes</span>
          {!pending && (
            <button type="button" onClick={onReply} className="font-semibold transition hover:text-white">
              Reply
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={pending ? undefined : onToggleLike}
        disabled={pending}
        aria-label="Like comment"
        aria-pressed={liked}
        className={cn(
          'mt-1 shrink-0 transition disabled:opacity-40',
          liked ? 'text-rose-400' : 'text-white/55 hover:text-rose-400',
        )}
      >
        <Heart className="h-3.5 w-3.5" fill={liked ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}

/** The two-pane content; keyed by post id so its state resets per post. */
export function PostDetailContent({ post, onAfterDelete }: { post: Post; onAfterDelete?: () => void }) {
  const navigate = useNavigate()
  const { liked, saved, likeCount: likes, toggleLike, toggleSave } = usePostInteractions(post)
  const { thread, addComment, likedComments, toggleCommentLike } = usePostComments(post)
  const { toast } = useToast()
  const { canShare, openShare, shareModal } = useSharePost(post)
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<{ key: string; handle: string } | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [emojiOpen, setEmojiOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const emojiWrapRef = useRef<HTMLDivElement>(null)

  // Insert an emoji at the caret (or the end), then restore focus + caret.
  function insertEmoji(emoji: string) {
    const el = inputRef.current
    const start = el?.selectionStart ?? draft.length
    const end = el?.selectionEnd ?? draft.length
    setDraft((d) => d.slice(0, start) + emoji + d.slice(end))
    requestAnimationFrame(() => {
      const node = inputRef.current
      if (node) {
        const pos = start + emoji.length
        node.focus()
        node.setSelectionRange(pos, pos)
      }
    })
  }

  // Close the emoji picker on an outside click or Escape. The Escape handler runs in
  // the capture phase and stops propagation so it closes the picker, not the lightbox.
  useEffect(() => {
    if (!emojiOpen) return
    const onDown = (e: MouseEvent) => {
      if (emojiWrapRef.current && !emojiWrapRef.current.contains(e.target as Node)) setEmojiOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        setEmojiOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [emojiOpen])

  function startReply(rootKey: string, handle: string) {
    setReplyTo({ key: rootKey, handle })
    setExpanded((s) => new Set(s).add(rootKey)) // reveal the thread you're replying into
    inputRef.current?.focus()
  }
  function toggleExpand(key: string) {
    setExpanded((s) => {
      const next = new Set(s)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function goToProfile() {
    // Navigating away from `/p/:id` lets the post-modal effect close the lightbox.
    navigate(`/u/${post.author.handle}`)
  }
  async function handleShare() {
    const result = await sharePost(post)
    if (result === 'copied') toast('Link copied')
    else if (result === 'unavailable') toast('Couldn’t share this post')
  }
  // The comment icon focuses the composer (Instagram-style) — it sits just below.
  function focusComposer() {
    inputRef.current?.focus()
  }

  return (
    <>
      {/* media */}
      <div
        className="relative flex items-center justify-center md:w-[56%]"
        style={{ background: `linear-gradient(135deg, ${post.tint[0]}, ${post.tint[1]})` }}
      >
        <motion.img
          layoutId={fallbackLayoutId(post.id)}
          style={{ viewTransitionName: supportsViewTransitions ? morphName : undefined }}
          src={post.image}
          alt={`Post by ${post.author.name}`}
          className="max-h-[44dvh] w-full object-cover md:max-h-[88dvh] md:object-contain"
        />
      </div>

      {/* details */}
      <div className="flex min-h-0 flex-1 flex-col md:w-[44%]">
        <header className="flex items-center gap-3 border-b border-white/[0.07] py-4 pl-5 pr-14">
          <button type="button" onClick={goToProfile} className="shrink-0">
            <Avatar src={resolveAvatar(post.author)} alt={post.author.name} size={40} ring="none" />
          </button>
          <button type="button" onClick={goToProfile} className="min-w-0 flex-1 text-left">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-white">{post.author.name}</span>
              {post.author.verified && <VerifiedBadge />}
            </span>
            {post.location && (
              <span className="flex items-center gap-1 text-xs text-white/55">
                <MapPin className="h-3 w-3" /> {post.location}
              </span>
            )}
          </button>
          <PostMenu post={post} onAfterDelete={onAfterDelete} className="shrink-0" />
        </header>

        {/* scrollable thread */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* caption as first entry */}
          <div className="flex gap-3">
            <Avatar src={resolveAvatar(post.author)} alt={post.author.name} size={32} />
            <p className="text-sm leading-relaxed text-white/85">
              <span className="font-semibold text-white">{post.author.handle}</span>{' '}
              <EmojiText text={post.caption} />
              {post.tags.length > 0 && (
                <span className="ml-1 font-medium text-lilac">{post.tags.map((t) => `#${t}`).join(' ')}</span>
              )}
            </p>
          </div>
          {thread.map((root) => (
            <div key={root.key} className="space-y-3">
              <CommentItem
                comment={root}
                onReply={() => startReply(root.key, root.user.handle)}
                liked={likedComments.has(root.key)}
                onToggleLike={() => toggleCommentLike(root.key, likedComments.has(root.key))}
              />
              {root.replies.length > 0 && (
                <div className="ml-11 border-l border-white/[0.07] pl-4">
                  <Collapse open={expanded.has(root.key)}>
                    <div className="space-y-3 pb-3">
                      {root.replies.map((r) => (
                        <CommentItem
                          key={r.key}
                          comment={r}
                          isReply
                          onReply={() => startReply(root.key, r.user.handle)}
                          liked={likedComments.has(r.key)}
                          onToggleLike={() => toggleCommentLike(r.key, likedComments.has(r.key))}
                        />
                      ))}
                    </div>
                  </Collapse>
                  <button
                    type="button"
                    onClick={() => toggleExpand(root.key)}
                    className="text-[11px] font-semibold text-white/55 transition hover:text-white"
                  >
                    {expanded.has(root.key)
                      ? 'Hide replies'
                      : `View ${root.replies.length} ${root.replies.length === 1 ? 'reply' : 'replies'}`}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* actions */}
        <div className="border-t border-white/[0.07] px-4 pb-3 pt-2.5">
          <div className="flex items-center gap-0.5">
            <PaneAction onClick={toggleLike} active={liked} activeClass="text-rose-400" label="Like">
              <motion.span
                key={liked ? 'on' : 'off'}
                initial={{ scale: 0.55 }}
                animate={{ scale: 1 }}
                transition={SPRING}
              >
                <Heart
                  className="h-[26px] w-[26px]"
                  fill={liked ? 'currentColor' : 'none'}
                  strokeWidth={1.75}
                />
              </motion.span>
            </PaneAction>
            <PaneAction label="Comment" onClick={focusComposer}>
              <MessageCircle className="h-[25px] w-[25px]" strokeWidth={1.75} />
            </PaneAction>
            <PaneAction label="Share" onClick={canShare ? openShare : handleShare}>
              <Send className="h-[23px] w-[23px]" strokeWidth={1.75} />
            </PaneAction>
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
          <p className="px-2 text-sm font-semibold text-white">{formatCount(likes)} likes</p>
          <p className="px-2 text-[11px] uppercase tracking-wide text-white/55">{post.time} ago</p>
        </div>

        {/* add comment / reply */}
        <div className="border-t border-white/[0.07]">
          <Collapse open={!!replyTo}>
            <div className="flex items-center justify-between px-5 pt-2 text-[11px] text-white/55">
              <span>
                Replying to <span className="font-semibold text-white/80">@{replyTo?.handle}</span>
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                aria-label="Cancel reply"
                className="rounded-full p-1 transition hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </Collapse>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const t = draft.trim()
              if (!t) return
              addComment(t, replyTo?.key ?? null)
              setDraft('')
              setReplyTo(null)
            }}
            className="flex items-center gap-3 px-5 py-3"
          >
            <div ref={emojiWrapRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setEmojiOpen((o) => !o)}
                aria-label="Add emoji"
                aria-expanded={emojiOpen}
                className="grid place-items-center rounded-full text-white/55 transition hover:text-white"
              >
                <Smile className="h-5 w-5" />
              </button>
              {emojiOpen && (
                <div className="absolute bottom-full left-0 z-20 mb-2">
                  <EmojiPicker onPick={insertEmoji} />
                </div>
              )}
            </div>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/55 focus:outline-none"
              placeholder={replyTo ? `Reply to @${replyTo.handle}…` : 'Add a comment…'}
              aria-label={replyTo ? `Reply to ${replyTo.handle}` : 'Add a comment'}
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="text-sm font-semibold text-lilac transition hover:text-white disabled:opacity-40"
            >
              {replyTo ? 'Reply' : 'Post'}
            </button>
          </form>
        </div>
      </div>
      {shareModal}
    </>
  )
}

/** Immersive glass lightbox overlay, driven by the post-modal context. */
export function PostDetailModal() {
  const { activePost, closePost } = usePostModal()
  const trapRef = useFocusTrap<HTMLDivElement>(!!activePost)

  useEffect(() => {
    if (!activePost) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePost()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [activePost, closePost])

  return (
    <AnimatePresence>
      {activePost && (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center p-3 sm:p-6"
          // With the View-Transitions morph, the overlay must already be at full opacity when
          // the VT captures the "after" snapshot — otherwise the named lightbox image (inside
          // this subtree) is snapshotted near-invisible and the morph flies to nothing. So skip
          // the enter fade under VT (the VT drives the visuals); keep it for the non-VT fallback.
          initial={supportsViewTransitions ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-lg"
            onClick={closePost}
            aria-hidden="true"
          />
          <motion.div
            key={activePost.id}
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Post by ${activePost.author.name}`}
            // See the overlay note: under VT the dialog must be opaque at snapshot time so the
            // named image inside it is captured visible. Fade only on the non-VT fallback path.
            initial={supportsViewTransitions ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="glass edge-light relative z-10 flex max-h-[90dvh] w-full max-w-[1040px] flex-col overflow-hidden rounded-4xl md:flex-row"
          >
            <PostDetailContent key={activePost.id} post={activePost} onAfterDelete={closePost} />
            <button
              type="button"
              onClick={closePost}
              aria-label="Close"
              className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/30 text-white/80 backdrop-blur-md transition hover:bg-black/50 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
