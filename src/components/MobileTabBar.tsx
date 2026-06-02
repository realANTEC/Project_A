import { Compass, Heart, Home, type LucideIcon, Plus } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { avatar, currentUser } from '@/data/feed'
import { cn } from '@/lib/cn'
import { useCompose } from '@/lib/compose'
import { Avatar } from './Avatar'

function NavTab({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      aria-label={label}
      className={({ isActive }) =>
        cn(
          'grid h-11 w-11 place-items-center rounded-2xl transition',
          isActive ? 'text-white' : 'text-white/55 hover:text-white',
        )
      }
    >
      {({ isActive }) => <Icon className="h-[25px] w-[25px]" strokeWidth={isActive ? 2.3 : 1.9} />}
    </NavLink>
  )
}

/** Floating glass tab bar for small screens. */
export function MobileTabBar() {
  const { openCompose } = useCompose()
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="glass edge-light mx-3 mb-3 flex items-center justify-around rounded-3xl px-3 py-2">
        <NavTab to="/" icon={Home} label="Home" />
        <NavTab to="/explore" icon={Compass} label="Explore" />
        <button
          type="button"
          onClick={openCompose}
          aria-label="Create"
          className="bg-aurora animate-gradient grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-[var(--shadow-glow-violet)] transition active:scale-95"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </button>
        <NavTab to="/notifications" icon={Heart} label="Notifications" />
        <NavLink
          to={`/u/${currentUser.handle}`}
          aria-label="Profile"
          className="grid h-11 w-11 place-items-center"
        >
          <Avatar src={avatar(currentUser.avatarId)} alt="You" size={28} ring="aurora" />
        </NavLink>
      </div>
    </nav>
  )
}
