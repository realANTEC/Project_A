import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { resolveAvatar } from '@/data/feed'
import { useFollowList } from '@/lib/profile'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { Avatar } from './Avatar'
import { VerifiedBadge } from './VerifiedBadge'

/** Glass modal listing a profile's followers or following, each a link to that profile. */
export function FollowListModal({
  open,
  kind,
  profileId,
  onClose,
}: {
  open: boolean
  kind: 'followers' | 'following'
  profileId: string
  onClose: () => void
}) {
  const trapRef = useFocusTrap<HTMLDivElement>(open)
  const navigate = useNavigate()
  const { data: users = [], isLoading } = useFollowList(profileId, kind, open)

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

  function go(handle: string) {
    onClose()
    navigate(`/u/${handle}`)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-xl" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label={kind === 'followers' ? 'Followers' : 'Following'}
            initial={{ scale: 0.94, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="glass edge-light relative z-10 flex max-h-[80dvh] w-full max-w-[420px] flex-col overflow-hidden rounded-4xl"
          >
            <header className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
              <h2 className="font-display text-sm font-semibold capitalize text-white">{kind}</h2>
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
              {isLoading && <p className="px-3 py-6 text-sm text-white/55">Loading…</p>}
              {!isLoading && users.length === 0 && (
                <p className="px-3 py-10 text-center text-sm text-white/55">
                  {kind === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                </p>
              )}
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => go(u.handle)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-white/[0.05]"
                >
                  <Avatar src={resolveAvatar(u)} alt={u.name} size={44} ring="aurora" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-white">{u.name}</span>
                      {u.verified && <VerifiedBadge />}
                    </span>
                    <span className="block truncate text-xs text-white/55">@{u.handle}</span>
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
