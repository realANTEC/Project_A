import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bookmark, Camera, Grid3x3, Heart, Link2, Settings, Sparkles, Tag } from 'lucide-react'
import { currentUser, getProfile, resolveAvatar, type Post, type User } from '@/data/feed'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/cn'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import {
  type DbProfile,
  useFollowStats,
  useIsFollowing,
  useProfileByHandle,
  useToggleFollow,
  useUserPosts,
} from '@/lib/profile'
import { useStartConversation } from '@/lib/messages'
import { usePostModal } from '@/lib/post-modal'
import { useSearch } from '@/lib/search'
import { useCompose } from '@/lib/compose'
import { useToast } from '@/lib/toast'
import { useMockFollow } from '@/lib/mockFollows'
import { EmojiText } from '@/components/EmojiText'
import { Page } from '@/components/Page'
import { Avatar } from '@/components/Avatar'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { PhotoTile } from '@/components/PhotoTile'
import { EditProfileModal } from '@/components/EditProfileModal'
import { FollowListModal } from '@/components/FollowListModal'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

const HIGHLIGHTS = [
  { label: 'Travel', icon: Sparkles },
  { label: 'Film', icon: Camera },
  { label: 'Prints', icon: Bookmark },
  { label: 'BTS', icon: Heart },
]

function Stat({ n, label, onClick }: { n: number; label: string; onClick?: () => void }) {
  const inner = (
    <>
      <span className="text-base font-bold text-white tabular-nums">{formatCount(n)}</span>{' '}
      <span className="text-sm text-white/55">{label}</span>
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} className="text-center transition hover:opacity-80 sm:text-left">
      {inner}
    </button>
  ) : (
    <div className="text-center sm:text-left">{inner}</div>
  )
}

function Spinner() {
  return (
    <div className="grid place-items-center py-20" aria-label="Loading" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
    </div>
  )
}

type ProfileViewProps = {
  user: User
  bio?: string | null
  website?: string | null
  stats: { posts: number; followers: number; following: number }
  grid: Post[]
  gridLoading?: boolean
  gridError?: boolean
  onRetryGrid?: () => void
  isYou: boolean
  isFollowing?: boolean
  onToggleFollow?: () => void
  onMessage?: () => void
  onEditProfile?: () => void
  onFollowers?: () => void
  onFollowing?: () => void
  actionsBusy?: boolean
}

/** Shared profile presentation — fed by either real DB data or curated mock data. */
function ProfileView({
  user,
  bio,
  website,
  stats,
  grid,
  gridLoading,
  gridError,
  onRetryGrid,
  isYou,
  isFollowing,
  onToggleFollow,
  onMessage,
  onEditProfile,
  onFollowers,
  onFollowing,
  actionsBusy,
}: ProfileViewProps) {
  const { openPost } = usePostModal()
  const { openSearch } = useSearch()
  const { openCompose } = useCompose()
  const [tab, setTab] = useState<'posts' | 'tagged'>('posts')

  return (
    <Page className="mx-auto max-w-[935px]">
      {/* Header */}
      <header className="glass edge-light mt-2 rounded-4xl p-6 sm:p-8 lg:mt-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-10">
          <Avatar src={resolveAvatar(user)} alt={user.name} size={104} ring="none" className="shrink-0" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
              <h1 className="flex items-center gap-2 text-xl font-semibold text-white">
                {user.name}
                {user.verified && <VerifiedBadge className="h-[18px] w-[18px]" />}
              </h1>
              <div className="flex gap-2">
                {isYou ? (
                  <>
                    <button
                      type="button"
                      onClick={onEditProfile}
                      className="glass-inset rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                    >
                      Edit profile
                    </button>
                    <Link
                      to="/settings"
                      aria-label="Settings"
                      className="glass-inset grid place-items-center rounded-xl px-3 py-2 text-white/75 transition hover:bg-white/[0.08] hover:text-white"
                    >
                      <Settings className="h-[18px] w-[18px]" />
                    </Link>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={onToggleFollow}
                      disabled={actionsBusy}
                      className={cn(
                        'rounded-xl px-5 py-2 text-sm font-semibold transition disabled:opacity-60',
                        isFollowing
                          ? 'glass-inset text-white hover:bg-white/[0.08]'
                          : 'bg-aurora text-white shadow-[var(--shadow-glow-violet)] hover:scale-[1.03]',
                      )}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <button
                      type="button"
                      onClick={onMessage}
                      disabled={actionsBusy}
                      className="glass-inset rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:opacity-60"
                    >
                      Message
                    </button>
                  </>
                )}
              </div>
            </div>

            <p className="mt-1 text-center text-sm text-white/55 sm:text-left">@{user.handle}</p>

            <div className="mt-4 flex justify-center gap-8 sm:justify-start">
              <Stat n={stats.posts} label="posts" />
              <Stat n={stats.followers} label="followers" onClick={onFollowers} />
              <Stat n={stats.following} label="following" onClick={onFollowing} />
            </div>

            {bio && (
              <p className="mt-4 whitespace-pre-line text-center text-sm leading-relaxed text-white/80 sm:text-left">
                <EmojiText text={bio} />
              </p>
            )}
            {website && (
              <a
                href={`https://${website}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-lilac transition hover:text-white"
              >
                <Link2 className="h-3.5 w-3.5" />
                {website}
              </a>
            )}
          </div>
        </div>

        {/* Highlights — a plain wrapping row; no overflow/scroll box (which clipped the ring on the
            edge circles) and no right-edge mask fade. Wraps on very narrow screens instead. */}
        <div className="mt-7 flex flex-wrap gap-5">
          {HIGHLIGHTS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => openSearch(label)}
              className="group flex shrink-0 flex-col items-center gap-1.5"
            >
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
        gridLoading ? (
          <Spinner />
        ) : gridError ? (
          <ErrorState title="Couldn’t load posts" onRetry={onRetryGrid} />
        ) : grid.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="No posts yet"
            description={isYou ? 'Share your first photo to start your feed.' : undefined}
            action={isYou ? { label: 'Share your first post', onClick: openCompose } : undefined}
          />
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-3">
            {grid.map((post, i) => (
              <PhotoTile key={`${post.id}-${i}`} post={post} index={i} onOpen={(el) => openPost(post, el)} />
            ))}
          </div>
        )
      ) : (
        <EmptyState icon={Tag} title="No tagged photos yet" />
      )}
    </Page>
  )
}

/** Real, Postgres-backed profile (posts grid, follow counts, follow/message). */
function RealProfile({ profile }: { profile: DbProfile }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const isYou = session?.user.id === profile.id
  const posts = useUserPosts(profile.id)
  const stats = useFollowStats(profile.id)
  const following = useIsFollowing(profile.id)
  const toggleFollow = useToggleFollow()
  const startConversation = useStartConversation()
  const [editing, setEditing] = useState(false)
  const [list, setList] = useState<'followers' | 'following' | null>(null)
  const isFollowing = following.data ?? false
  const realPosts = posts.data ?? []
  // Showcase personas (maralin, etc.) are real accounts with no real posts yet — fall back to their
  // curated grid so the profile stays rich. getProfile() echoes the handle back only for a known
  // persona (it defaults to Mara for anything else), which is how we detect one.
  const curated =
    realPosts.length === 0 && !isYou && getProfile(profile.user.handle).user.handle === profile.user.handle
      ? getProfile(profile.user.handle)
      : null

  return (
    <>
      <ProfileView
        user={profile.user}
        bio={profile.bio}
        website={profile.website}
        stats={{
          posts: curated ? curated.grid.length : realPosts.length,
          followers: stats.data?.followers ?? 0,
          following: stats.data?.following ?? 0,
        }}
        grid={curated ? curated.grid : realPosts}
        gridLoading={curated ? false : posts.isLoading}
        gridError={curated ? false : posts.isError}
        onRetryGrid={() => posts.refetch()}
        isYou={isYou}
        isFollowing={isFollowing}
        onToggleFollow={() => toggleFollow.mutate({ profileId: profile.id, following: isFollowing })}
        onMessage={() =>
          startConversation.mutate(profile.id, { onSuccess: (convId) => navigate(`/messages/${convId}`) })
        }
        onEditProfile={() => setEditing(true)}
        onFollowers={() => setList('followers')}
        onFollowing={() => setList('following')}
        actionsBusy={toggleFollow.isPending || startConversation.isPending}
      />
      {isYou && (
        <EditProfileModal
          open={editing}
          initial={{
            name: profile.user.name,
            bio: profile.bio ?? '',
            website: profile.website ?? '',
            avatarUrl: resolveAvatar(profile.user),
          }}
          onClose={() => setEditing(false)}
        />
      )}
      <FollowListModal
        open={list !== null}
        kind={list ?? 'followers'}
        profileId={profile.id}
        onClose={() => setList(null)}
      />
    </>
  )
}

/** Curated / local-mode profile from mock data. */
function MockProfile({ handle }: { handle: string }) {
  const profile = getProfile(handle)
  const { toast } = useToast()
  // Curated personas aren't real accounts, so Follow is a local visual response persisted on this
  // device (so it survives remounts/reloads); Message explains rather than opening a dead thread.
  const { following, toggle } = useMockFollow(profile.user.handle)
  const isYou = profile.user.handle === currentUser.handle
  return (
    <ProfileView
      user={profile.user}
      bio={profile.bio}
      website={profile.website}
      stats={{ ...profile.stats, followers: profile.stats.followers + (following ? 1 : 0) }}
      grid={profile.grid}
      isYou={isYou}
      isFollowing={following}
      onToggleFollow={toggle}
      onMessage={() =>
        toast(`${profile.user.name} is a showcase profile — messaging works with real members`)
      }
    />
  )
}

/** Resolve the @handle to a real DB profile, falling back to curated mock data. */
function ResolvedProfile({ handle }: { handle: string }) {
  const { data: profile, isLoading, isError, refetch } = useProfileByHandle(handle)
  if (isLoading)
    return (
      <Page className="mx-auto max-w-[935px]">
        <div className="glass edge-light mt-2 rounded-4xl p-10 lg:mt-6">
          <Spinner />
        </div>
      </Page>
    )
  // A real load failure — distinct from "not found" (which falls back to the curated persona).
  if (isError)
    return (
      <Page className="mx-auto max-w-[935px]">
        <div className="glass edge-light mt-2 rounded-4xl p-10 lg:mt-6">
          <ErrorState title="Couldn’t load this profile" onRetry={() => refetch()} />
        </div>
      </Page>
    )
  return profile ? <RealProfile profile={profile} /> : <MockProfile handle={handle} />
}

export function ProfilePage() {
  const { handle } = useParams()
  const h = handle ?? currentUser.handle
  return isSupabaseConfigured ? <ResolvedProfile handle={h} /> : <MockProfile handle={h} />
}
