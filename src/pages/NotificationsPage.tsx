import { useState } from 'react'
import { AtSign, Heart, MessageCircle, UserPlus } from 'lucide-react'
import { avatar } from '@/data/feed'
import { type Notification, notifications, type NotifType } from '@/data/notifications'
import { cn } from '@/lib/cn'
import { Page } from '@/components/Page'
import { Avatar } from '@/components/Avatar'

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

function Row({ n }: { n: Notification }) {
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

function Section({ title, items }: { title: string; items: Notification[] }) {
  return (
    <section className="mb-4">
      <h2 className="px-3 pb-1.5 pt-2 text-xs font-semibold uppercase tracking-wide text-white/55">
        {title}
      </h2>
      <ul className="glass edge-light divide-y divide-white/[0.05] overflow-hidden rounded-3xl">
        {items.map((n) => (
          <Row key={n.id} n={n} />
        ))}
      </ul>
    </section>
  )
}

export function NotificationsPage() {
  const [tab, setTab] = useState<'all' | 'mentions'>('all')
  const items = tab === 'all' ? notifications : notifications.filter((n) => n.type === 'mention')
  const today = items.filter((n) => n.group === 'today')
  const week = items.filter((n) => n.group === 'week')

  return (
    <Page className="mx-auto max-w-[640px]">
      <div className="sticky top-0 z-30 -mx-3 mb-2 bg-gradient-to-b from-canvas via-canvas/85 to-transparent px-3 pb-3 pt-4 backdrop-blur-md lg:-mx-1 lg:px-1 lg:pt-6">
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

      {today.length > 0 && <Section title="Today" items={today} />}
      {week.length > 0 && <Section title="This week" items={week} />}
      {items.length === 0 && <p className="py-20 text-center text-sm text-white/55">Nothing here yet.</p>}
    </Page>
  )
}
