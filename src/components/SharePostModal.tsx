/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { type Post, resolveAvatar } from '@/data/feed'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useProfiles, useSendMessage, useStartConversation } from '@/lib/messages'
import { postUrl } from '@/lib/share'
import { useToast } from '@/lib/toast'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { Avatar } from './Avatar'
import { VerifiedBadge } from './VerifiedBadge'

/**
 * Pick a person to send a post to — finds (or starts) a 1:1 chat and posts the link,
 * which renders as a tappable post card on the other side. No copy/paste needed.
 */
export function SharePostModal({ post, open, onClose }: { post: Post; open: boolean; onClose: () => void }) {
  const { data: people = [], isLoading } = useProfiles()
  const startConversation = useStartConversation()
  const sendMessage = useSendMessage()
  const { toast } = useToast()
  const trapRef = useFocusTrap<HTMLDivElement>(open)
  const busy = startConversation.isPending || sendMessage.isPending

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  function share(personId: string, name: string) {
    if (busy) return
    startConversation.mutate(personId, {
      onSuccess: (conversationId) =>
        sendMessage.mutate(
          { conversationId, body: postUrl(post) },
          {
            onSuccess: () => {
              toast(`Sent to ${name}`)
              onClose()
            },
            onError: () => toast('Couldn’t send the post'),
          },
        ),
      onError: () => toast('Couldn’t send the post'),
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-xl"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label="Share to chat"
            initial={{ scale: 0.95, y: 14, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="glass edge-light relative z-10 flex max-h-[80dvh] w-full max-w-sm flex-col overflow-hidden rounded-4xl"
          >
            <header className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
              <h2 className="font-display text-sm font-semibold text-white">Share to chat</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {isLoading && <p className="px-3 py-6 text-sm text-white/55">Loading people…</p>}
              {!isLoading && people.length === 0 && (
                <p className="px-3 py-10 text-center text-sm text-white/55">No one else has signed in yet.</p>
              )}
              {people.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={busy}
                  onClick={() => share(p.id, p.name)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-white/[0.05] disabled:opacity-50"
                >
                  <Avatar src={resolveAvatar(p)} alt={p.name} size={44} ring="aurora" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-white">{p.name}</span>
                      {p.verified && <VerifiedBadge />}
                    </span>
                    <span className="block truncate text-xs text-white/55">@{p.handle}</span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Wires a post's Share affordance to the share-to-chat sheet. Returns whether chat-share
 * is available (real messaging + signed in), an opener, and the portaled modal to render.
 * Falls back to nothing when unavailable, so callers can use the OS share sheet instead.
 */
export function useSharePost(post: Post) {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const canShare = isSupabaseConfigured && !!session
  const shareModal = canShare
    ? createPortal(<SharePostModal post={post} open={open} onClose={() => setOpen(false)} />, document.body)
    : null
  return { canShare, openShare: () => setOpen(true), shareModal }
}
