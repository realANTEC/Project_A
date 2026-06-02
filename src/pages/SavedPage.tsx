import { useMemo } from 'react'
import { Bookmark } from 'lucide-react'
import { explorePosts, type Post } from '@/data/feed'
import { useFeed } from '@/lib/feed-store'
import { useSavedPosts } from '@/lib/interactions'
import { isSupabaseConfigured } from '@/lib/supabase'
import { usePostModal } from '@/lib/post-modal'
import { Page } from '@/components/Page'
import { PhotoTile } from '@/components/PhotoTile'

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
      ) : (
        <div className="grid place-items-center gap-3 py-24 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-white/[0.05] ring-1 ring-white/10">
            <Bookmark className="h-7 w-7 text-white/55" />
          </span>
          <p className="text-sm text-white/55">Bookmark posts and they&rsquo;ll appear here.</p>
          <p className="flex items-center gap-1 text-xs text-white/55">
            Tap the <Bookmark className="h-3 w-3" /> on any post to save it.
          </p>
        </div>
      )}
    </Page>
  )
}
