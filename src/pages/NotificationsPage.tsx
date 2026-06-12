import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AtSign, Bell, Heart, MessageCircle, UserPlus } from 'lucide-react'
import { avatar, resolveAvatar } from '@/data/feed'
import { type Notification, notifications, type NotifType } from '@/data/notifications'
import { cn } from '@/lib/cn'
import { isSupabaseConfigured } from '@/lib/supabase'
import { type AppNotification, useMarkNotificationsRead, useNotifications } from '@/lib/notifications'
import { useMyFollowing, useToggleFollow } from '@/lib/profile'
import { Page } from '@/components/Page'
import { Avatar } from '@/components/Avatar'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

const ICON: Record<NotifType, typeof Heart> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  mention: AtSign,
}
const ICON_BG: Record<NotifType, string> = {
  like: 'bg-rose-500',
  comment: 'bg-sky-500',
  follow: 'bg-aurora',
  mention: 'bg-violet-500',
}

function PageHeader() {
  return (
    <div className="sticky top-16 z-30 mb-2 bg-gradient-to-b from-canvas via-canvas/85 to-transparent px-2 pb-3 pt-4 backdrop-blur-md lg:top-0 lg:pt-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-white">Notifications</h1>
    </div>
  )
}

/* ---- real, Postgres-backed notifications -------------------------------- */

const REAL_TEXT: Record<AppNotification['type'], string> = {
  follow: 'started following you',
  like: 'liked your post',
  comment: 'commented on your post',
}

function RealRow({
  n,
  following,
  onToggleFollow,
}: {
  n: AppNotification
  following: boolean
  onToggleFollow: () => void
}) {
  const navigate = useNavigate()
  const Icon = ICON[n.type]
  return (
    <li className={cn('flex items-center gap-3 px-4 py-3 transition', n.read ? '' : 'bg-white/[0.035]')}>
      <button
        type="button"
        onClick={() => navigate(`/u/${n.actor.handle}`)}
        className="relative shrink-0"
        aria-label={n.actor.name}
      >
        <Avatar src={resolveAvatar(n.actor)} alt={n.actor.name} size={46} />
        <span
          className={cn(
            'absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full ring-2 ring-canvas',
            ICON_BG[n.type],
          )}
        >
          <Icon
            className="h-3 w-3 text-white"
            fill={n.type === 'like' ? 'currentColor' : 'none'}
            strokeWidth={2.5}
          />
        </span>
      </button>

      <button
        type="button"
        onClick={() => navigate(`/u/${n.actor.handle}`)}
        className="min-w-0 flex-1 text-left"
      >
        <p className="text-sm leading-snug text-white/80">
          <span className="font-semibold text-white">{n.actor.handle}</span> {REAL_TEXT[n.type]}
          <span className="ml-1 whitespace-nowrap text-white/55">· {n.time}</span>
        </p>
      </button>

      {n.type === 'follow' ? (
        <button
          type="button"
          onClick={onToggleFollow}
          className={cn(
            'shrink-0 rounded-xl px-4 py-1.5 text-xs font-semibold transition',
            following
              ? 'glass-inset text-white'
              : 'bg-aurora text-white shadow-[var(--shadow-glow-violet)] hover:scale-[1.03]',
          )}
        >
          {following ? 'Following' : 'Follow'}
        </button>
      ) : n.thumb ? (
        <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10">
          <img src={n.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
        </span>
      ) : null}
    </li>
  )
}

function RealNotifications() {
  const { data: notifs = [], isLoading, isError, refetch } = useNotifications()
  const { mutate: markRead } = useMarkNotificationsRead()
  const { data: following = new Set<string>() } = useMyFollowing()
  const toggleFollow = useToggleFollow()

  // Visiting the page marks everything read (clears the nav bell badge).
  useEffect(() => {
    markRead()
  }, [markRead])

  return (
    <Page className="mx-auto max-w-[640px]">
      <PageHeader />
      {isLoading ? (
        <div className="grid place-items-center py-20" aria-label="Loading" role="status">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
        </div>
      ) : isError ? (
        <ErrorState title="Couldn’t load notifications" onRetry={() => refetch()} />
      ) : notifs.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Follows, likes, and comments will show up here."
          action={{ label: 'Find people to follow', to: '/explore' }}
        />
      ) : (
        <ul className="glass edge-light divide-y divide-white/[0.05] overflow-hidden rounded-3xl">
          {notifs.map((n) => (
            <RealRow
              key={n.id}
              n={n}
              following={following.has(n.actorId)}
              onToggleFollow={() =>
                toggleFollow.mutate({ profileId: n.actorId, following: following.has(n.actorId) })
              }
            />
          ))}
        </ul>
      )}
    </Page>
  )
}

/* ---- mock notifications (local mode) ------------------------------------ */

function MockRow({ n }: { n: Notification }) {
  const Icon = ICON[n.type]
  const [following, setFollowing] = useState(false)
  const lead = n.users[0]

  return (
    <li className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03]">
      <div className="relative shrink-0">
        <Avatar src={avatar(lead.avatarId)} alt={lead.name} size={46} />
        <span
          className={cn(
            'absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full ring-2 ring-canvas',
            ICON_BG[n.type],
          )}
        >
          <Icon
            className="h-3 w-3 text-white"
            fill={n.type === 'like' ? 'currentColor' : 'none'}
            strokeWidth={2.5}
          />
        </span>
      </div>

      <p className="min-w-0 flex-1 text-sm leading-snug text-white/80">
        <span className="font-semibold text-white">{lead.handle}</span>{' '}
        {n.type === 'follow' ? 'started following you' : n.text}
        <span className="ml-1 whitespace-nowrap text-white/55">· {n.time}</span>
      </p>

      {n.type === 'follow' ? (
        <button
          type="button"
          onClick={() => setFollowing((f) => !f)}
          className={cn(
            'shrink-0 rounded-xl px-4 py-1.5 text-xs font-semibold transition',
            following
              ? 'glass-inset text-white'
              : 'bg-aurora text-white shadow-[var(--shadow-glow-violet)] hover:scale-[1.03]',
          )}
        >
          {following ? 'Following' : 'Follow'}
        </button>
      ) : n.thumb ? (
        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
          <span
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${n.thumbTint?.[0]}, ${n.thumbTint?.[1]})` }}
          />
          <img src={n.thumb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        </span>
      ) : null}
    </li>
  )
}

function MockSection({ title, items }: { title: string; items: Notification[] }) {
  return (
    <section className="mb-4">
      <h2 className="px-3 pb-1.5 pt-2 text-xs font-semibold uppercase tracking-wide text-white/55">
        {title}
      </h2>
      <ul className="glass edge-light divide-y divide-white/[0.05] overflow-hidden rounded-3xl">
        {items.map((n) => (
          <MockRow key={n.id} n={n} />
        ))}
      </ul>
    </section>
  )
}

function MockNotifications() {
  const [tab, setTab] = useState<'all' | 'mentions'>('all')
  const items = tab === 'all' ? notifications : notifications.filter((n) => n.type === 'mention')
  const today = items.filter((n) => n.group === 'today')
  const week = items.filter((n) => n.group === 'week')

  return (
    <Page className="mx-auto max-w-[640px]">
      <div className="sticky top-16 z-30 mb-2 bg-gradient-to-b from-canvas via-canvas/85 to-transparent px-2 pb-3 pt-4 backdrop-blur-md lg:top-0 lg:pt-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Notifications</h1>
        <div className="glass-inset mt-3 inline-flex rounded-full p-1">
          {(['all', 'mentions'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium capitalize transition',
                tab === t
                  ? 'bg-aurora text-white shadow-[var(--shadow-glow-violet)]'
                  : 'text-white/55 hover:text-white',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {today.length > 0 && <MockSection title="Today" items={today} />}
      {week.length > 0 && <MockSection title="This week" items={week} />}
      {items.length === 0 && (
        <EmptyState icon={Bell} title="You're all caught up" description="New activity will show up here." />
      )}
    </Page>
  )
}

export function NotificationsPage() {
  return isSupabaseConfigured ? <RealNotifications /> : <MockNotifications />
}
