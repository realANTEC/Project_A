import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Search, TrendingUp } from 'lucide-react'
import { avatar, resolveAvatar, suggestions, trends } from '@/data/feed'
import { formatCount } from '@/lib/format'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useMyFollowing, useSuggestedProfiles, useToggleFollow } from '@/lib/profile'
import { useSearch } from '@/lib/search'
import { AboutModal } from './AboutModal'
import { Avatar } from './Avatar'
import { VerifiedBadge } from './VerifiedBadge'

/** Curated suggestions (local mode) — static, decorative Follow. */
function MockSuggestions() {
  return (
    <ul className="mt-4 space-y-4">
      {suggestions.map(({ user, reason }) => (
        <li key={user.handle} className="flex items-center gap-3">
          <Link to={`/u/${user.handle}`} className="shrink-0">
            <Avatar src={avatar(user.avatarId)} alt={user.name} size={40} ring="none" />
          </Link>
          <Link to={`/u/${user.handle}`} className="min-w-0 flex-1">
            <span className="flex items-center gap-1">
              <span className="truncate text-sm font-semibold text-white hover:underline">{user.handle}</span>
              {user.verified && <VerifiedBadge />}
            </span>
            <span className="block truncate text-xs text-white/55">{reason}</span>
          </Link>
          <button
            type="button"
            className="bg-aurora-soft shrink-0 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-lilac transition hover:bg-white/10"
          >
            Follow
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Real "who to follow" — recent profiles you don't follow yet, with a working Follow. */
function RealSuggestions() {
  const { data: people = [] } = useSuggestedProfiles()
  const { data: following = new Set<string>() } = useMyFollowing()
  const toggleFollow = useToggleFollow()
  const list = people.filter((u) => !following.has(u.id)).slice(0, 5)

  if (list.length === 0)
    return <p className="mt-4 text-xs text-white/55">No suggestions yet — invite a friend to Soul.</p>

  return (
    <ul className="mt-4 space-y-4">
      {list.map((u) => (
        <li key={u.id} className="flex items-center gap-3">
          <Link to={`/u/${u.handle}`} className="shrink-0">
            <Avatar src={resolveAvatar(u)} alt={u.name} size={40} ring="none" />
          </Link>
          <Link to={`/u/${u.handle}`} className="min-w-0 flex-1">
            <span className="flex items-center gap-1">
              <span className="truncate text-sm font-semibold text-white hover:underline">{u.handle}</span>
              {u.verified && <VerifiedBadge />}
            </span>
            <span className="block truncate text-xs text-white/55">{u.name}</span>
          </Link>
          <button
            type="button"
            onClick={() => toggleFollow.mutate({ profileId: u.id, following: false })}
            disabled={toggleFollow.isPending}
            className="bg-aurora-soft shrink-0 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-lilac transition hover:bg-white/10 disabled:opacity-50"
          >
            Follow
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Right rail — search, people suggestions, trends, and footer. */
export function RightRail() {
  const { openSearch } = useSearch()
  const [aboutOpen, setAboutOpen] = useState(false)
  return (
    <div className="flex flex-col gap-5 py-6 pl-2">
      {/* Search */}
      <button
        type="button"
        onClick={() => openSearch()}
        className="glass-inset flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-left text-sm text-white/55 transition hover:text-white/70"
      >
        <Search className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1">Search Soul</span>
        <kbd className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/50">⌘K</kbd>
      </button>

      {/* Suggestions */}
      <section className="glass edge-light rounded-4xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Suggested for you</h2>
          <button
            type="button"
            onClick={() => openSearch()}
            className="text-xs font-medium text-lilac transition hover:text-white"
          >
            See all
          </button>
        </div>
        {isSupabaseConfigured ? <RealSuggestions /> : <MockSuggestions />}
      </section>

      {/* Trends */}
      <section className="glass edge-light rounded-4xl p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <TrendingUp className="h-4 w-4 text-cyan" />
          Trending now
        </h2>
        <ul className="-mx-2 mt-2">
          {trends.map((t) => (
            <li key={t.topic}>
              <button
                type="button"
                onClick={() => openSearch(t.topic.replace(/^#/, ''))}
                className="flex w-full flex-col gap-0.5 rounded-xl px-2 py-2 text-left transition hover:bg-white/[0.05]"
              >
                <span className="text-[11px] text-white/55">{t.category}</span>
                <span className="text-sm font-semibold text-white">{t.topic}</span>
                <span className="text-[11px] text-white/55">{formatCount(t.posts)} posts</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Footer */}
      <footer className="px-2 text-[11px] leading-relaxed text-white/55">
        <p className="flex flex-wrap gap-x-2.5 gap-y-1">
          {['About', 'Help', 'Privacy', 'Terms', 'Careers', 'API'].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setAboutOpen(true)}
              className="transition hover:text-white"
            >
              {l}
            </button>
          ))}
        </p>
        <p className="mt-2.5">© 2026 Soul — made with light.</p>
      </footer>

      {/* Portaled to <body>: this right-rail <aside> is display:none below xl, and a
          position:fixed child of a display:none ancestor doesn't render — so the modal
          must escape the aside to be visible. */}
      {createPortal(<AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />, document.body)}
    </div>
  )
}
