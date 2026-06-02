import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from './auth'
import { relativeTime } from './format'
import { type Aspect, type Post, type User } from '@/data/feed'

const FEED_KEY = ['feed'] as const

export type DbAuthor = {
  id: string
  username: string
  name: string
  avatar_url: string | null
  verified: boolean
}

export type DbPostRow = {
  id: string
  author_id: string
  image_url: string
  aspect: Aspect
  tint: string[]
  location: string | null
  caption: string
  tags: string[]
  created_at: string
  author: DbAuthor | null
  likes: { count: number }[]
  comments: { count: number }[]
}

/** Embedded select string for a post with author + counts (reused by feed & saved). */
export const POST_SELECT =
  '*, author:profiles!posts_author_id_fkey(id,username,name,avatar_url,verified), likes(count), comments(count)'

export function authorToUser(a: DbAuthor | null, fallbackId: string): User {
  const handle = a?.username ?? 'someone'
  return {
    name: a?.name ?? 'Someone',
    handle,
    avatarId: 0,
    verified: a?.verified ?? false,
    avatarUrl:
      a?.avatar_url ??
      `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(a?.id ?? fallbackId)}`,
  }
}

export function rowToPost(r: DbPostRow): Post {
  const tint = (Array.isArray(r.tint) && r.tint.length === 2 ? r.tint : ['#7c5cff', '#45e6d8']) as [
    string,
    string,
  ]
  return {
    id: r.id,
    author: authorToUser(r.author, r.author_id),
    image: r.image_url,
    aspect: r.aspect,
    tint,
    location: r.location ?? undefined,
    caption: r.caption,
    tags: r.tags ?? [],
    likes: r.likes?.[0]?.count ?? 0,
    commentsCount: r.comments?.[0]?.count ?? 0,
    time: relativeTime(r.created_at),
    likedByYou: false,
    saved: false,
    topComments: [],
    likedBy: [],
    source: 'db',
  }
}

/** Live feed of real posts from Postgres (newest first). Empty when unconfigured. */
export function useFeedPosts() {
  return useQuery({
    queryKey: FEED_KEY,
    enabled: !!supabase,
    queryFn: async (): Promise<Post[]> => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('posts')
        .select(POST_SELECT)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data as unknown as DbPostRow[]).map(rowToPost)
    },
  })
}

export type NewPost = {
  image: string
  aspect: Aspect
  tint: [string, string]
  caption: string
  location?: string
  tags?: string[]
}

/** Create a post: uploads a data-URL image to Storage, inserts the row, optimistically prepends. */
export function useCreatePost() {
  const qc = useQueryClient()
  const { session, profile } = useAuth()

  return useMutation({
    mutationFn: async (input: NewPost) => {
      if (!supabase || !session) throw new Error('Not signed in')
      let imageUrl = input.image
      if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
        const blob = await (await fetch(imageUrl)).blob()
        const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
        const path = `${session.user.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('media')
          .upload(path, blob, { contentType: blob.type, upsert: false })
        if (upErr) throw upErr
        imageUrl = supabase.storage.from('media').getPublicUrl(path).data.publicUrl
      }
      const { error } = await supabase.from('posts').insert({
        author_id: session.user.id,
        image_url: imageUrl,
        aspect: input.aspect,
        tint: input.tint,
        caption: input.caption,
        location: input.location ?? null,
        tags: input.tags ?? [],
      })
      if (error) throw error
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: FEED_KEY })
      const previous = qc.getQueryData<Post[]>(FEED_KEY)
      const me: User = {
        name: profile?.name ?? 'You',
        handle: profile?.username ?? 'you',
        avatarId: 12,
        verified: profile?.verified ?? false,
        avatarUrl:
          profile?.avatar_url ??
          `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(session?.user.id ?? 'you')}`,
      }
      const optimistic: Post = {
        id: `temp-${Date.now()}`,
        author: me,
        image: input.image,
        aspect: input.aspect,
        tint: input.tint,
        location: input.location,
        caption: input.caption,
        tags: input.tags ?? [],
        likes: 0,
        commentsCount: 0,
        time: 'now',
        topComments: [],
        likedBy: [],
      }
      qc.setQueryData<Post[]>(FEED_KEY, (old) => [optimistic, ...(old ?? [])])
      return { previous }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(FEED_KEY, ctx.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: FEED_KEY })
    },
  })
}
