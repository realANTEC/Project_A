import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ImagePlus, X } from 'lucide-react'
import { useUpdateProfile } from '@/lib/profile'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { Avatar } from './Avatar'

export type EditProfileInitial = { name: string; bio: string; website: string; avatarUrl: string }

/** Glass modal to edit your own profile (avatar / name / bio / website). */
export function EditProfileModal({
  open,
  initial,
  onClose,
}: {
  open: boolean
  initial: EditProfileInitial
  onClose: () => void
}) {
  const trapRef = useFocusTrap<HTMLDivElement>(open)
  const update = useUpdateProfile()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(initial.name)
  const [bio, setBio] = useState(initial.bio)
  const [website, setWebsite] = useState(initial.website)
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)

  // Reset fields to the latest values each time the modal (re)opens — render-time
  // reset (not an effect) to avoid a setState-in-effect flash.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setName(initial.name)
      setBio(initial.bio)
      setWebsite(initial.website)
      setAvatarDataUrl(null)
    }
  }

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

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatarDataUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    update.mutate({ name, bio, website, avatarDataUrl }, { onSuccess: onClose })
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
            aria-label="Edit profile"
            initial={{ scale: 0.94, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="glass edge-light relative z-10 flex w-full max-w-[460px] flex-col overflow-hidden rounded-4xl"
          >
            <header className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
              <h2 className="font-display text-sm font-semibold text-white">Edit profile</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={submit} className="flex flex-col gap-4 p-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar src={avatarDataUrl ?? initial.avatarUrl} alt="" size={72} ring="none" />
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="glass-inset flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                  >
                    <ImagePlus className="h-4 w-4" /> Change photo
                  </button>
                  {avatarDataUrl && <span className="pl-1 text-[11px] text-white/55">New photo selected</span>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-white/55">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  placeholder="Your name"
                  className="glass-inset rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/55 focus:outline-none focus:ring-1 focus:ring-white/25"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-white/55">Bio</span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={160}
                  placeholder="Tell people about yourself"
                  className="glass-inset resize-none rounded-2xl px-4 py-2.5 text-sm leading-relaxed text-white placeholder:text-white/55 focus:outline-none focus:ring-1 focus:ring-white/25"
                />
                <span className="self-end text-[11px] tabular-nums text-white/40">{bio.length}/160</span>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-white/55">Website</span>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  maxLength={100}
                  inputMode="url"
                  placeholder="yoursite.com"
                  className="glass-inset rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/55 focus:outline-none focus:ring-1 focus:ring-white/25"
                />
              </label>

              {update.isError && (
                <p className="text-xs text-pink" role="alert">
                  Couldn’t save — please try again.
                </p>
              )}

              <button
                type="submit"
                disabled={update.isPending}
                className="bg-aurora animate-gradient mt-1 w-full rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-glow-violet)] transition hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              >
                {update.isPending ? 'Saving…' : 'Save'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
