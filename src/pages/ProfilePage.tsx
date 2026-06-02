import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Bookmark, Camera, Grid3x3, Heart, Link2, Sparkles, Tag } from 'lucide-react'
import { avatar, currentUser, getProfile } from '@/data/feed'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/cn'
import { usePostModal } from '@/lib/post-modal'
import { Page } from '@/components/Page'
import { Avatar } from '@/components/Avatar'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { PhotoTile } from '@/components/PhotoTile'

const HIGHLIGHTS = [
  { label: 'Travel', icon: Sparkles },
  { label: 'Film', icon: Camera },
  { label: 'Prints', icon: Bookmark },
  { label: 'BTS', icon: Heart },
]

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="text-center sm:text-left">
      <span className="text-base font-bold text-white tabular-nums">{formatCount(n)}</span>{' '}
      <span className="text-sm text-white/55">{label}</span>
    </div>
  )
}

export function ProfilePage() {
  const { handle } = useParams()
  const profile = getProfile(handle ?? currentUser.handle)
  const { openPost } = usePostModal()
  const [tab, setTab] = useState<'posts' | 'tagged'>('posts')
  const isYou = profile.user.handle === currentUser.handle

  return (
    <Page className="mx-auto max-w-[935px]">
      {/* Header */}
      <header className="glass edge-light mt-2 rounded-4xl p-6 sm:p-8 lg:mt-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-10">
          <Avatar
            src={avatar(profile.user.avatarId)}
            alt={profile.user.name}
            size={104}
            ring="aurora"
            className="shrink-0"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
              <h1 className="flex items-center gap-2 text-xl font-semibold text-white">
                {profile.user.name}
                {profile.user.verified && <VerifiedBadge className="h-[18px] w-[18px]" />}
              </h1>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={cn(
                    'rounded-xl px-5 py-2 text-sm font-semibold transition',
                    isYou
                      ? 'glass-inset text-white hover:bg-white/[0.08]'
                      : 'bg-aurora text-white shadow-[var(--shadow-glow-violet)] hover:scale-[1.03]',
                  )}
                >
                  {isYou ? 'Edit profile' : 'Follow'}
                </button>
                {!isYou && (
                  <button
                    type="button"
                    className="glass-inset rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                  >
                    Message
                  </button>
                )}
              </div>
            </div>

            <p className="mt-1 text-center text-sm text-white/55 sm:text-left">@{profile.user.handle}</p>

            <div className="mt-4 flex justify-center gap-8 sm:justify-start">
              <Stat n={profile.stats.posts} label="posts" />
              <Stat n={profile.stats.followers} label="followers" />
              <Stat n={profile.stats.following} label="following" />
            </div>

            <p className="mt-4 whitespace-pre-line text-center text-sm leading-relaxed text-white/80 sm:text-left">
              {profile.bio}
            </p>
            {profile.website && (
              <a
                href={`https://${profile.website}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-lilac transition hover:text-white"
              >
                <Link2 className="h-3.5 w-3.5" />
                {profile.website}
              </a>
            )}
          </div>
        </div>

        {/* Highlights */}
        <div className="no-scrollbar mask-fade-r mt-7 flex gap-5 overflow-x-auto">
          {HIGHLIGHTS.map(({ label, icon: Icon }) => (
            <button key={label} type="button" className="group flex shrink-0 flex-col items-center gap-1.5">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-white/[0.05] ring-1 ring-white/10 transition group-hover:ring-white/25">
                <Icon className="h-6 w-6 text-white/70" strokeWidth={1.6} />
              </span>
              <span className="text-[11px] text-white/55">{label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Tabs */}
      <div className="mt-6 flex justify-center gap-10 border-b border-white/[0.07]">
        {(['posts', 'tagged'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'flex items-center gap-2 border-t-2 px-2 pb-3 text-[13px] font-semibold uppercase tracking-wide transition',
              tab === t ? 'border-white text-white' : 'border-transparent text-white/55 hover:text-white/70',
            )}
          >
            {t === 'posts' ? <Grid3x3 className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
            {t}
          </button>
        ))}
      </div>

      {/* Grid */}
      {tab === 'posts' ? (
        <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-3">
          {profile.grid.map((post, i) => (
            <PhotoTile key={`${post.id}-${i}`} post={post} index={i} onOpen={(el) => openPost(post, el)} />
          ))}
        </div>
      ) : (
        <div className="grid place-items-center gap-3 py-20 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-white/[0.05] ring-1 ring-white/10">
            <Tag className="h-7 w-7 text-white/55" />
          </span>
          <p className="text-sm text-white/55">No tagged photos yet.</p>
        </div>
      )}
    </Page>
  )
}
