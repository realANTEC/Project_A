import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link2, MoreHorizontal, Send, Trash2 } from 'lucide-react'
import { type Post } from '@/data/feed'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'
import { useDeletePost } from '@/lib/posts'
import { copyPostLink, sharePost } from '@/lib/share'
import { useToast } from '@/lib/toast'

/** Post overflow (⋯) menu — Copy link / Share / Delete (own posts). Shared by the feed card + lightbox. */
export function PostMenu({
  post,
  onAfterDelete,
  className,
}: {
  post: Post
  /** Called after a successful delete (e.g. to close the lightbox or leave the post page). */
  onAfterDelete?: () => void
  className?: string
}) {
  const { toast } = useToast()
  const { session } = useAuth()
  const deletePost = useDeletePost()
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isOwn = post.source === 'db' && !!session && post.authorId === session.user.id

  // Close on outside click / Escape (robust across the card + the overflow-hidden lightbox).
  useEffect(() => {
    if (!open) return
    function dismiss() {
      setOpen(false)
      setConfirmDelete(false)
    }
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) dismiss()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function handleShare() {
    setOpen(false)
    const result = await sharePost(post)
    if (result === 'copied') toast('Link copied')
    else if (result === 'unavailable') toast('Couldn’t share this post')
  }
  async function handleCopyLink() {
    setOpen(false)
    const result = await copyPostLink(post)
    toast(result === 'copied' ? 'Link copied' : 'Couldn’t copy link')
  }
  function handleDelete() {
    setOpen(false)
    setConfirmDelete(false)
    deletePost.mutate(post.id, {
      onSuccess: () => {
        toast('Post deleted')
        onAfterDelete?.()
      },
      onError: () => toast('Couldn’t delete post'),
    })
  }

  const item =
    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition'

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        aria-label="More options"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o)
          setConfirmDelete(false)
        }}
        className="grid h-8 w-8 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.14 }}
            className="glass edge-light absolute right-0 top-9 z-50 w-44 rounded-2xl p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
          >
            {confirmDelete ? (
              <div className="px-1.5 py-1">
                <p className="px-1.5 pb-2 pt-1 text-sm text-white/85">Delete this post?</p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 rounded-xl px-3 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/[0.08]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deletePost.isPending}
                    className="flex-1 rounded-xl bg-rose-500/90 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
                  >
                    {deletePost.isPending ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={cn(item, 'text-white/85 hover:bg-white/[0.08]')}
                >
                  <Link2 className="h-4 w-4 text-white/60" /> Copy link
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className={cn(item, 'text-white/85 hover:bg-white/[0.08]')}
                >
                  <Send className="h-4 w-4 text-white/60" /> Share
                </button>
                {isOwn && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className={cn(item, 'text-rose-400 hover:bg-rose-500/10')}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
