import { Link } from 'react-router-dom'
import { Search, TrendingUp } from 'lucide-react'
import { avatar, suggestions, trends } from '@/data/feed'
import { formatCount } from '@/lib/format'
import { useSearch } from '@/lib/search'
import { Avatar } from './Avatar'
import { VerifiedBadge } from './VerifiedBadge'

/** Right rail — search, people suggestions, trends, and footer. */
export function RightRail() {
  const { openSearch } = useSearch()
  return (
    <div className="flex flex-col gap-5 py-6 pl-2">
      {/* Search */}
      <button
        type="button"
        onClick={openSearch}
        className="glass-inset flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-left text-sm text-white/55 transition hover:text-white/70"
      >
        <Search className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1">Search Aurora</span>
        <kbd className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/50">⌘K</kbd>
      </button>

      {/* Suggestions */}
      <section className="glass edge-light rounded-4xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Suggested for you</h2>
          <button type="button" className="text-xs font-medium text-lilac transition hover:text-white">
            See all
          </button>
        </div>
        <ul className="mt-4 space-y-4">
          {suggestions.map(({ user, reason }) => (
            <li key={user.handle} className="flex items-center gap-3">
              <Link to={`/u/${user.handle}`} className="shrink-0">
                <Avatar src={avatar(user.avatarId)} alt={user.name} size={40} ring="aurora" />
              </Link>
              <Link to={`/u/${user.handle}`} className="min-w-0 flex-1">
                <span className="flex items-center gap-1">
                  <span className="truncate text-sm font-semibold text-white hover:underline">
                    {user.handle}
                  </span>
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
            <button key={l} type="button" className="transition hover:text-white">
              {l}
            </button>
          ))}
        </p>
        <p className="mt-2.5">© 2026 Aurora — made with light.</p>
      </footer>
    </div>
  )
}
