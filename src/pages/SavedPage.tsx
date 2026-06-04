import { useMemo } from 'react'
import { Bookmark } from 'lucide-react'
import { explorePosts, type Post } from '@/data/feed'
import { useFeed } from '@/lib/feed-store'
import { useSavedPosts } from '@/lib/interactions'
import { isSupabaseConfigured } from '@/lib/supabase'
import { usePostModal } from '@/lib/post-modal'
import { Page } from '@/components/Page'
import { PhotoTile } from '@/components/PhotoTile'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

export function SavedPage() {
  const { posts, saved } = useFeed()
  const dbSaved = useSavedPosts()
  const { openPost } = usePostModal()

  const localSavedPosts = useMemo(() => {
    const pool = new Map<string, Post>()
    for (const p of [...posts, ...explorePosts]) if (!pool.has(p.id)) pool.set(p.id, p)
    return Object.keys(saved)
      .filter((id) => saved[id] && pool.has(id))
      .map((id) => pool.get(id)!)
  }, [posts, saved])

  const savedPosts = isSupabaseConfigured ? [...(dbSaved.data ?? []), ...localSavedPosts] : localSavedPosts

  return (
    <Page className="mx-auto max-w-[935px]">
      <div className="sticky top-0 z-30 -mx-3 mb-5 bg-gradient-to-b from-canvas via-canvas/85 to-transparent px-3 pb-3 pt-4 backdrop-blur-md lg:-mx-1 lg:px-1 lg:pt-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Saved</h1>
        <p className="mt-0.5 text-sm text-white/55">
          {savedPosts.length} {savedPosts.length === 1 ? 'post' : 'posts'} you bookmarked
        </p>
      </div>

      {savedPosts.length > 0 ? (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
          {savedPosts.map((post, i) => (
            <PhotoTile key={`${post.id}-${i}`} post={post} index={i} onOpen={(el) => openPost(post, el)} />
          ))}
        </div>
      ) : dbSaved.isError ? (
        <ErrorState title="Couldn’t load your saved posts" onRetry={() => dbSaved.refetch()} />
      ) : (
        <EmptyState
          icon={Bookmark}
          title="No saved posts yet"
          description="Tap the bookmark on any post to save it for later."
          action={{ label: 'Explore posts', to: '/explore' }}
        />
      )}
    </Page>
  )
}
