import { useState } from 'react'
import { Users } from 'lucide-react'
import { posts as seedPosts } from '@/data/feed'
import { useFeed } from '@/lib/feed-store'
import { useFeedPosts } from '@/lib/posts'
import { useMyFollowing } from '@/lib/profile'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Page } from '@/components/Page'
import { Stories } from '@/components/Stories'
import { Composer } from '@/components/Composer'
import { FeedTabs } from '@/components/FeedTabs'
import { FeedCard } from '@/components/FeedCard'
import { RightRail } from '@/components/RightRail'
import { EmptyState } from '@/components/EmptyState'
import { RetryBanner } from '@/components/ErrorState'

export function HomePage() {
  const [tab, setTab] = useState(0) // 0 = For you, 1 = Following
  const { posts: localPosts } = useFeed()
  const feedQuery = useFeedPosts()
  const dbPosts = feedQuery.data
  const { data: following } = useMyFollowing()
  const baseFeed = isSupabaseConfigured ? [...(dbPosts ?? []), ...seedPosts] : localPosts
  const onFollowing = tab === 1
  // "Following" = real posts authored by people you follow (curated seed isn't a real follow).
  const feed = onFollowing
    ? baseFeed.filter((p) => p.source === 'db' && p.authorId && following?.has(p.authorId))
    : baseFeed

  return (
    <Page className="flex justify-center gap-7">
      <main className="w-full max-w-[600px]">
        {/* Sticky frosted feed tabs */}
        <div className="sticky top-16 z-30 lg:top-0 -mx-3 mb-4 flex justify-center bg-gradient-to-b from-canvas via-canvas/85 to-transparent px-3 py-3 backdrop-blur-md lg:-mx-1 lg:px-1 lg:pt-6">
          <FeedTabs value={tab} onChange={setTab} />
        </div>

        <div className="flex flex-col gap-5">
          <Stories />
          <Composer />
          {isSupabaseConfigured && feedQuery.isError && (
            <RetryBanner message="Couldn’t load the latest posts." onRetry={() => feedQuery.refetch()} />
          )}
          {onFollowing && feed.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No posts from people you follow yet"
              description="When you follow people, their latest posts show up here."
              action={{ label: 'Find people to follow', to: '/explore' }}
            />
          ) : (
            <>
              {feed.map((post, i) => (
                <FeedCard key={post.id} post={post} index={i} />
              ))}
              <p className="py-8 text-center text-xs tracking-wide text-white/55">
                You&rsquo;re all caught up&nbsp;&nbsp;✦
              </p>
            </>
          )}
        </div>
      </main>

      <aside className="no-scrollbar sticky top-0 hidden h-dvh w-[330px] shrink-0 overflow-y-auto xl:block">
        <RightRail />
      </aside>
    </Page>
  )
}
