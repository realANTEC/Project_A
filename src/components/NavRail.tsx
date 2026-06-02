import {
  Bell,
  Bookmark,
  Compass,
  Home,
  type LucideIcon,
  MessageSquare,
  Plus,
  Settings,
  User,
} from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { avatar, currentUser } from '@/data/feed'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'
import { useCompose } from '@/lib/compose'
import { Avatar } from './Avatar'
import { Brand } from './Brand'

type Item = { label: string; icon: LucideIcon; to?: string; badge?: number }

const ITEMS: Item[] = [
  { label: 'Home', icon: Home, to: '/' },
  { label: 'Explore', icon: Compass, to: '/explore' },
  { label: 'Notifications', icon: Bell, to: '/notifications', badge: 3 },
  { label: 'Messages', icon: MessageSquare, to: '/messages', badge: 1 },
  { label: 'Saved', icon: Bookmark, to: '/saved' },
  { label: 'Profile', icon: User, to: `/u/${currentUser.handle}` },
]

function Row({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon
  return (
    <span
      className={cn(
        'group relative flex items-center gap-3.5 rounded-2xl px-3.5 py-2.5 text-[0.95rem] font-medium transition',
        active ? 'bg-white/[0.06] text-white' : 'text-white/65 hover:bg-white/[0.04] hover:text-white',
      )}
    >
      {active && (
        <span className="bg-aurora absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full" />
      )}
      <span className="relative grid place-items-center">
        <Icon
          className="h-[22px] w-[22px] transition-transform group-hover:scale-110"
          strokeWidth={active ? 2.3 : 1.9}
        />
        {item.badge && (
          <span className="bg-aurora absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white">
            {item.badge}
          </span>
        )}
      </span>
      <span>{item.label}</span>
    </span>
  )
}

/** Left navigation rail — brand, primary nav, create CTA, account chip. */
export function NavRail() {
  const { openCompose } = useCompose()
  const { profile } = useAuth()
  const myHandle = profile?.username ?? currentUser.handle
  const myName = profile?.name ?? 'You'
  const myAvatar =
    profile?.avatar_url ??
    (profile
      ? `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(profile.id)}`
      : avatar(currentUser.avatarId))
  // Point the Profile link at the signed-in user's real @handle (mock fallback in local mode).
  const items = ITEMS.map((it) => (it.label === 'Profile' ? { ...it, to: `/u/${myHandle}` } : it))

  return (
    <nav className="flex h-full flex-col gap-2 py-6 pr-2">
      <Link to="/" className="w-fit rounded-xl px-3.5 pb-4">
        <Brand />
      </Link>

      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.label}>
            {item.to ? (
              <NavLink to={item.to} end={item.to === '/'} className="block">
                {({ isActive }) => <Row item={item} active={isActive} />}
              </NavLink>
            ) : (
              <button type="button" className="block w-full text-left">
                <Row item={item} active={false} />
              </button>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={openCompose}
        className="bg-aurora animate-gradient mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-glow-violet)] transition hover:scale-[1.02] active:scale-95"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
        Create
      </button>

      <div className="glass-inset mt-auto flex items-center gap-2 rounded-2xl p-2.5">
        <Link to={`/u/${myHandle}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar src={myAvatar} alt={myName} size={38} online />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{myName}</p>
            <p className="truncate text-xs text-white/55">@{myHandle}</p>
          </div>
        </Link>
        <Link
          to="/settings"
          aria-label="Settings"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </nav>
  )
}
