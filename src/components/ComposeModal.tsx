import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, ImagePlus, MapPin, Sparkles, X } from 'lucide-react'
import { type Aspect, avatar, currentUser, explorePosts, type Post } from '@/data/feed'
import { useCompose } from '@/lib/compose'
import { useFeed } from '@/lib/feed-store'
import { useCreatePost } from '@/lib/posts'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { Avatar } from './Avatar'

type Pick = { image: string; tint: [string, string]; aspect: Aspect }

const GALLERY: Pick[] = explorePosts
  .slice(0, 12)
  .map((p) => ({ image: p.image, tint: p.tint, aspect: p.aspect }))

// Curated caption ideas — a tasteful starting point the user can edit (no AI involved).
const CAPTION_IDEAS = [
  'Chasing the light until it chased me back.',
  'Some mornings just ask to be kept.',
  'Found this between two ordinary moments.',
  'The quiet kind of gold.',
  'Stood still long enough for the world to show off.',
  'A small study in shadow and patience.',
  'Everything softens at this hour.',
  'Proof I was here, and it was beautiful.',
  'Color did all the talking today.',
  'One frame, forty tries, zero regrets.',
]
function suggestCaption(current: string): string {
  const pool = CAPTION_IDEAS.filter((c) => c !== current.trim())
  return pool[Math.floor(Math.random() * pool.length)] ?? CAPTION_IDEAS[0]
}

function ComposeBody({ onClose }: { onClose: () => void }) {
  const { addPost } = useFeed()
  const createPost = useCreatePost()
  const navigate = useNavigate()
  const [picked, setPicked] = useState<Pick | null>(null)
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const probe = new Image()
      probe.onload = () => {
        const r = probe.naturalWidth / probe.naturalHeight
        const aspect: Aspect = r > 1.2 ? 'landscape' : r < 0.85 ? 'portrait' : 'square'
        setPicked({ image: dataUrl, tint: ['#241a36', '#0f2a3a'], aspect })
      }
      probe.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  function share() {
    if (!picked) return
    const text = caption.trim() || 'Untitled ✦'
    const place = location.trim() || undefined

    if (isSupabaseConfigured) {
      createPost.mutate({
        image: picked.image,
        aspect: picked.aspect,
        tint: picked.tint,
        caption: text,
        location: place,
      })
    } else {
      const post: Post = {
        id: `new-${Date.now()}`,
        author: currentUser,
        image: picked.image,
        aspect: picked.aspect,
        tint: picked.tint,
        location: place,
        caption: text,
        tags: [],
        likes: 0,
        commentsCount: 0,
        time: 'now',
        likedByYou: false,
        saved: false,
        topComments: [],
        likedBy: [],
      }
      addPost(post)
    }
    onClose()
    navigate('/')
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
        {picked ? (
          <button
            type="button"
            onClick={() => setPicked(null)}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-sm text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        ) : (
          <span className="w-16" />
        )}
        <h2 className="font-display text-sm font-semibold text-white">
          {picked ? 'New post' : 'Choose a photo'}
        </h2>
        {picked ? (
          <button
            type="button"
            onClick={share}
            className="rounded-full px-2 py-1 text-sm font-semibold text-lilac transition hover:text-white"
          >
            Share
          </button>
        ) : (
          <span className="w-16" />
        )}
      </header>

      {!picked ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="glass-inset flex aspect-square flex-col items-center justify-center gap-2 rounded-xl text-white/55 transition hover:text-white"
            >
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <ImagePlus className="h-7 w-7" strokeWidth={1.6} />
              <span className="text-xs font-medium">Upload</span>
            </button>
            {GALLERY.map((g, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPicked(g)}
                className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-white/10"
              >
                <div
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(135deg, ${g.tint[0]}, ${g.tint[1]})` }}
                />
                <img
                  src={g.image}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-black/30 opacity-0 transition group-hover:opacity-100" />
                <span className="bg-aurora absolute right-2 top-2 grid h-6 w-6 scale-0 place-items-center rounded-full text-white transition group-hover:scale-100">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div
            className="flex items-center justify-center md:w-[52%]"
            style={{ background: `linear-gradient(135deg, ${picked.tint[0]}, ${picked.tint[1]})` }}
          >
            <img
              src={picked.image}
              alt="Selected"
              className="max-h-[36dvh] w-full object-cover md:max-h-[78dvh] md:object-contain"
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 p-5 md:w-[48%]">
            <div className="flex items-center gap-3">
              <Avatar src={avatar(currentUser.avatarId)} alt="You" size={36} />
              <span className="text-sm font-semibold text-white">{currentUser.handle}</span>
            </div>

            <textarea
              autoFocus
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              placeholder="Write a caption…"
              className="w-full resize-none bg-transparent text-sm leading-relaxed text-white placeholder:text-white/55 focus:outline-none"
            />

            <button
              type="button"
              onClick={() => setCaption(suggestCaption(caption))}
              className="flex w-fit items-center gap-2 rounded-full bg-aurora-soft px-3 py-1.5 text-xs font-medium text-lilac ring-1 ring-white/10 transition hover:bg-white/10"
            >
              <Sparkles className="h-3.5 w-3.5" /> Suggest a caption
            </button>

            <label className="glass-inset flex items-center gap-2.5 rounded-2xl px-4 py-3">
              <MapPin className="h-4 w-4 shrink-0 text-white/55" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add location"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/55 focus:outline-none"
              />
            </label>

            <button
              type="button"
              onClick={share}
              className="bg-aurora animate-gradient mt-auto w-full rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-glow-violet)] transition hover:scale-[1.02] active:scale-95"
            >
              Share post
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/** Glass create-post overlay — opened from any "Create" affordance. */
export function ComposeModal() {
  const { open, closeCompose } = useCompose()
  const trapRef = useFocusTrap<HTMLDivElement>(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCompose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, closeCompose])

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
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-xl"
            onClick={closeCompose}
            aria-hidden="true"
          />
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label="Create a post"
            initial={{ scale: 0.94, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="glass edge-light relative z-10 flex max-h-[90dvh] w-full max-w-[860px] flex-col overflow-hidden rounded-4xl"
          >
            <ComposeBody onClose={closeCompose} />
            <button
              type="button"
              onClick={closeCompose}
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
