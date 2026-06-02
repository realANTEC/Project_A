import { posts as seedPosts } from '@/data/feed'
import { useFeed } from '@/lib/feed-store'
import { useFeedPosts } from '@/lib/posts'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Page } from '@/components/Page'
import { Stories } from '@/components/Stories'
import { Composer } from '@/components/Composer'
import { FeedTabs } from '@/components/FeedTabs'
import { FeedCard } from '@/components/FeedCard'
import { RightRail } from '@/components/RightRail'

export function HomePage() {
  const { posts: localPosts } = useFeed()
  const { data: dbPosts } = useFeedPosts()
  const feed = isSupabaseConfigured ? [...(dbPosts ?? []), ...seedPosts] : localPosts
  return (
    <Page className="flex justify-center gap-7">
      <main className="w-full max-w-[600px]">
        {/* Sticky frosted feed tabs */}
        <div className="sticky top-0 z-30 -mx-3 mb-4 flex justify-center bg-gradient-to-b from-canvas via-canvas/85 to-transparent px-3 py-3 backdrop-blur-md lg:-mx-1 lg:px-1 lg:pt-6">
          <FeedTabs />
        </div>

        <div className="flex flex-col gap-5">
          <Stories />
          <Composer />
          {feed.map((post, i) => (
            <FeedCard key={post.id} post={post} index={i} />
          ))}
          <p className="py-8 text-center text-xs tracking-wide text-white/55">
            You&rsquo;re all caught up&nbsp;&nbsp;✦
          </p>
        </div>
      </main>

      <aside className="no-scrollbar sticky top-0 hidden h-dvh w-[330px] shrink-0 overflow-y-auto xl:block">
        <RightRail />
      </aside>
    </Page>
  )
}
