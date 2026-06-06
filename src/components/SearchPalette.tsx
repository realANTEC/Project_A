import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { Hash, Search as SearchIcon, TrendingUp } from 'lucide-react'
import { explorePosts, people, posts, type Post, resolveAvatar, trends, type User } from '@/data/feed'
import { cn } from '@/lib/cn'
import { useSearch } from '@/lib/search'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useProfileSearch } from '@/lib/profile'
import { usePostModal } from '@/lib/post-modal'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { Avatar } from './Avatar'
import { VerifiedBadge } from './VerifiedBadge'

type Result =
  | { kind: 'person'; user: User }
  | { kind: 'tag'; tag: string; meta: string }
  | { kind: 'post'; post: Post }

const ALL_PEOPLE = Object.values(people).filter((u) => u.handle !== 'you')
const POST_POOL = [...posts, ...explorePosts]

function buildResults(q: string): Result[] {
  const query = q.trim().toLowerCase()
  if (!query) {
    return [
      ...ALL_PEOPLE.slice(0, 3).map((user): Result => ({ kind: 'person', user })),
      ...trends.slice(0, 3).map((t): Result => ({ kind: 'tag', tag: t.topic, meta: t.category })),
    ]
  }
  const ppl = ALL_PEOPLE.filter(
    (u) => u.name.toLowerCase().includes(query) || u.handle.toLowerCase().includes(query),
  )
    .slice(0, 4)
    .map((user): Result => ({ kind: 'person', user }))
  const tgs = trends
    .filter((t) => t.topic.toLowerCase().includes(query) || t.category.toLowerCase().includes(query))
    .slice(0, 3)
    .map((t): Result => ({ kind: 'tag', tag: t.topic, meta: t.category }))
  const pst = POST_POOL.filter(
    (p) =>
      p.caption.toLowerCase().includes(query) ||
      p.location?.toLowerCase().includes(query) ||
      p.tags.some((tag) => tag.includes(query)),
  )
    .slice(0, 4)
    .map((post): Result => ({ kind: 'post', post }))
  return [...ppl, ...tgs, ...pst]
}

export function SearchPalette({ seed = '' }: { seed?: string }) {
  const { open, closeSearch } = useSearch()
  const { openPost } = usePostModal()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [wasOpen, setWasOpen] = useState(open)
  const [debouncedQ, setDebouncedQ] = useState('')
  const trapRef = useFocusTrap<HTMLDivElement>(open)
  // Real profile matches from Postgres (debounced); replaces the mock people while configured.
  const realPeople = useProfileSearch(open ? debouncedQ : '')
  const results = useMemo(() => {
    const base = buildResults(q)
    if (!isSupabaseConfigured || !q.trim()) return base
    const realPpl = (realPeople.data ?? []).map((user): Result => ({ kind: 'person', user }))
    return [...realPpl, ...base.filter((r) => r.kind !== 'person')]
  }, [q, realPeople.data])

  // Seed query/selection when the palette opens (adjust-during-render, not an effect).
  // `seed` is '' for ⌘K and the typed-in case, or a topic/highlight when opened from a chip.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setQ(seed)
      setActive(0)
      setDebouncedQ(seed)
    }
  }

  // Debounce the query that hits the network.
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q), 200)
    return () => window.clearTimeout(id)
  }, [q])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, closeSearch])

  function activate(r: Result) {
    closeSearch()
    if (r.kind === 'person') navigate(`/u/${r.user.handle}`)
    else if (r.kind === 'tag') navigate('/explore')
    else openPost(r.post)
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      activate(results[active])
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-lg"
            onClick={closeSearch}
            aria-hidden="true"
          />
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            initial={{ scale: 0.96, y: -12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, y: -8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="glass edge-light relative z-10 flex max-h-[70vh] w-full max-w-[600px] flex-col overflow-hidden rounded-4xl"
          >
            <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
              <SearchIcon className="h-5 w-5 shrink-0 text-white/55" />
              <input
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setActive(0)
                }}
                onKeyDown={onKeyDown}
                placeholder="Search people, tags, places…"
                aria-label="Search"
                className="w-full bg-transparent text-base text-white placeholder:text-white/55 focus:outline-none"
              />
              <kbd className="hidden rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/50 sm:block">
                ESC
              </kbd>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {!q && (
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-white/55">
                  Suggested
                </p>
              )}
              {results.length === 0 ? (
                <p className="px-3 py-12 text-center text-sm text-white/55">No results for “{q}”.</p>
              ) : (
                results.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => activate(r)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition',
                      active === i ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]',
                    )}
                  >
                    {r.kind === 'person' && (
                      <>
                        <Avatar src={resolveAvatar(r.user)} alt={r.user.name} size={40} ring="none" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-white">{r.user.name}</span>
                            {r.user.verified && <VerifiedBadge />}
                          </span>
                          <span className="block truncate text-xs text-white/55">@{r.user.handle}</span>
                        </span>
                        <span className="text-[11px] text-white/55">Profile</span>
                      </>
                    )}
                    {r.kind === 'tag' && (
                      <>
                        <span className="bg-aurora-soft grid h-10 w-10 shrink-0 place-items-center rounded-full ring-1 ring-white/10">
                          <Hash className="h-5 w-5 text-lilac" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-white">{r.tag}</span>
                          <span className="block truncate text-xs text-white/55">{r.meta}</span>
                        </span>
                        <TrendingUp className="h-4 w-4 text-white/55" />
                      </>
                    )}
                    {r.kind === 'post' && (
                      <>
                        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
                          <span
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(135deg, ${r.post.tint[0]}, ${r.post.tint[1]})`,
                            }}
                          />
                          <img
                            src={r.post.image}
                            alt=""
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-white/85">{r.post.caption}</span>
                          <span className="block truncate text-xs text-white/55">
                            @{r.post.author.handle}
                            {r.post.location ? ` · ${r.post.location}` : ''}
                          </span>
                        </span>
                        <span className="text-[11px] text-white/55">Post</span>
                      </>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
