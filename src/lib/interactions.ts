import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from './auth'
import { displayLikes, useFeed } from './feed-store'
import { authorToUser, type DbAuthor, type DbPostRow, POST_SELECT, rowToPost } from './posts'
import type { Post, User } from '@/data/feed'

const MY_LIKES = ['my-likes'] as const
const MY_SAVES = ['my-saves'] as const
const SAVED_POSTS = ['saved-posts'] as const
const FEED = ['feed'] as const

/** Set of post ids the current user has liked. */
export function useMyLikes() {
  const { session } = useAuth()
  return useQuery({
    queryKey: MY_LIKES,
    enabled: !!supabase && !!session,
    queryFn: async () => {
      if (!supabase || !session) return new Set<string>()
      const { data, error } = await supabase.from('likes').select('post_id').eq('user_id', session.user.id)
      if (error) throw error
      return new Set<string>((data ?? []).map((r) => r.post_id))
    },
  })
}

/** Set of post ids the current user has saved. */
export function useMySaves() {
  const { session } = useAuth()
  return useQuery({
    queryKey: MY_SAVES,
    enabled: !!supabase && !!session,
    queryFn: async () => {
      if (!supabase || !session) return new Set<string>()
      const { data, error } = await supabase.from('saves').select('post_id').eq('user_id', session.user.id)
      if (error) throw error
      return new Set<string>((data ?? []).map((r) => r.post_id))
    },
  })
}

/** The current user's saved posts, hydrated to full Post objects. */
export function useSavedPosts() {
  const { session } = useAuth()
  return useQuery({
    queryKey: SAVED_POSTS,
    enabled: !!supabase && !!session,
    queryFn: async (): Promise<Post[]> => {
      if (!supabase || !session) return []
      const { data, error } = await supabase
        .from('saves')
        .select(`post:posts(${POST_SELECT})`)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows = (data ?? []) as unknown as { post: DbPostRow | null }[]
      return rows
        .map((r) => r.post)
        .filter((p): p is DbPostRow => Boolean(p))
        .map(rowToPost)
    },
  })
}

function useToggleLikeDb() {
  const qc = useQueryClient()
  const { session } = useAuth()
  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (!supabase || !session) throw new Error('Not signed in')
      const res = liked
        ? await supabase.from('likes').delete().eq('user_id', session.user.id).eq('post_id', postId)
        : await supabase.from('likes').insert({ user_id: session.user.id, post_id: postId })
      if (res.error) throw res.error
    },
    onMutate: async ({ postId, liked }) => {
      await qc.cancelQueries({ queryKey: MY_LIKES })
      const prevLikes = qc.getQueryData<Set<string>>(MY_LIKES)
      const prevFeed = qc.getQueryData<Post[]>(FEED)
      const prevSaved = qc.getQueryData<Post[]>(SAVED_POSTS)
      qc.setQueryData<Set<string>>(MY_LIKES, (old) => {
        const next = new Set(old ?? [])
        if (liked) next.delete(postId)
        else next.add(postId)
        return next
      })
      const bump = (arr?: Post[]) =>
        arr?.map((p) => (p.id === postId ? { ...p, likes: p.likes + (liked ? -1 : 1) } : p))
      qc.setQueryData<Post[]>(FEED, (old) => bump(old) ?? old)
      qc.setQueryData<Post[]>(SAVED_POSTS, (old) => bump(old) ?? old)
      return { prevLikes, prevFeed, prevSaved }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prevLikes) qc.setQueryData(MY_LIKES, ctx.prevLikes)
      if (ctx?.prevFeed) qc.setQueryData(FEED, ctx.prevFeed)
      if (ctx?.prevSaved) qc.setQueryData(SAVED_POSTS, ctx.prevSaved)
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: MY_LIKES }),
  })
}

function useToggleSaveDb() {
  const qc = useQueryClient()
  const { session } = useAuth()
  return useMutation({
    mutationFn: async ({ postId, saved }: { postId: string; saved: boolean }) => {
      if (!supabase || !session) throw new Error('Not signed in')
      const res = saved
        ? await supabase.from('saves').delete().eq('user_id', session.user.id).eq('post_id', postId)
        : await supabase.from('saves').insert({ user_id: session.user.id, post_id: postId })
      if (res.error) throw res.error
    },
    onMutate: async ({ postId, saved }) => {
      await qc.cancelQueries({ queryKey: MY_SAVES })
      const prevSaves = qc.getQueryData<Set<string>>(MY_SAVES)
      qc.setQueryData<Set<string>>(MY_SAVES, (old) => {
        const next = new Set(old ?? [])
        if (saved) next.delete(postId)
        else next.add(postId)
        return next
      })
      return { prevSaves }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prevSaves) qc.setQueryData(MY_SAVES, ctx.prevSaves)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: MY_SAVES })
      void qc.invalidateQueries({ queryKey: SAVED_POSTS })
    },
  })
}

export type PostInteractions = {
  liked: boolean
  saved: boolean
  likeCount: number
  commentCount: number
  toggleLike: () => void
  like: () => void
  toggleSave: () => void
}

/** Uniform like/save/comment state for a post — DB-backed for real posts, local for curated. */
export function usePostInteractions(post: Post): PostInteractions {
  const local = useFeed()
  const myLikes = useMyLikes()
  const mySaves = useMySaves()
  const toggleLikeDb = useToggleLikeDb()
  const toggleSaveDb = useToggleSaveDb()

  if (post.source === 'db') {
    const liked = myLikes.data?.has(post.id) ?? false
    const saved = mySaves.data?.has(post.id) ?? false
    return {
      liked,
      saved,
      likeCount: post.likes,
      commentCount: post.commentsCount,
      toggleLike: () => toggleLikeDb.mutate({ postId: post.id, liked }),
      like: () => {
        if (!liked) toggleLikeDb.mutate({ postId: post.id, liked: false })
      },
      toggleSave: () => toggleSaveDb.mutate({ postId: post.id, saved }),
    }
  }

  const liked = !!local.liked[post.id]
  const saved = !!local.saved[post.id]
  return {
    liked,
    saved,
    likeCount: displayLikes(post, liked),
    commentCount: post.commentsCount + (local.comments[post.id]?.length ?? 0),
    toggleLike: () => local.toggleLike(post.id),
    like: () => local.like(post.id),
    toggleSave: () => local.toggleSave(post.id),
  }
}

export type ThreadComment = {
  key: string
  user: User
  text: string
  likes: number
  replies: ThreadComment[]
}

/** Flat DB comment row (author embedded) incl. parent linkage for threading. */
type CommentRow = { id: string; body: string; parent_id: string | null; author: DbAuthor | null }

/** Build a 2-level thread (roots + their replies) from flat, time-ordered rows. */
function buildThread(rows: CommentRow[]): ThreadComment[] {
  const node = (r: CommentRow): ThreadComment => ({
    key: r.id,
    user: authorToUser(r.author, r.id),
    text: r.body,
    likes: 0,
    replies: [],
  })
  const byId = new Map(rows.map((r) => [r.id, r]))
  // Climb parent links to the thread root, so replies-to-replies flatten one level.
  const rootIdOf = (r: CommentRow): string => {
    let cur = r
    const seen = new Set<string>()
    while (cur.parent_id && byId.has(cur.parent_id) && !seen.has(cur.id)) {
      seen.add(cur.id)
      cur = byId.get(cur.parent_id)!
    }
    return cur.id
  }
  const roots: ThreadComment[] = []
  const index = new Map<string, ThreadComment>()
  for (const r of rows) {
    if (r.parent_id) continue
    const c = node(r)
    roots.push(c)
    index.set(r.id, c)
  }
  for (const r of rows) {
    if (!r.parent_id) continue
    const root = index.get(rootIdOf(r))
    const reply = node(r)
    if (root) root.replies.push(reply)
    else {
      // Orphan (root missing) — surface as its own root rather than drop it.
      roots.push(reply)
      index.set(r.id, reply)
    }
  }
  return roots
}

/** Insert a comment into a nested thread — a new root, or a reply under `parentKey`. */
function insertInThread(
  thread: ThreadComment[],
  comment: ThreadComment,
  parentKey?: string | null,
): ThreadComment[] {
  if (!parentKey) return [...thread, comment]
  return thread.map((root) =>
    root.key === parentKey ? { ...root, replies: [...root.replies, comment] } : root,
  )
}

/** Comments for a real (DB) post, with author profiles, oldest first. */
export function useComments(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['comments', postId],
    enabled: enabled && !!supabase,
    queryFn: async (): Promise<ThreadComment[]> => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('comments')
        .select(
          'id, body, parent_id, created_at, author:profiles!comments_author_id_fkey(id,username,name,avatar_url,verified)',
        )
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return buildThread((data ?? []) as unknown as CommentRow[])
    },
  })
}

function useAddCommentDb() {
  const qc = useQueryClient()
  const { session, profile } = useAuth()
  return useMutation({
    mutationFn: async ({
      postId,
      body,
      parentId,
    }: {
      postId: string
      body: string
      parentId?: string | null
    }) => {
      if (!supabase || !session) throw new Error('Not signed in')
      const { error } = await supabase
        .from('comments')
        .insert({ post_id: postId, author_id: session.user.id, body, parent_id: parentId ?? null })
      if (error) throw error
    },
    onMutate: async ({ postId, body, parentId }) => {
      const key = ['comments', postId]
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<ThreadComment[]>(key)
      const prevFeed = qc.getQueryData<Post[]>(FEED)
      const me: User = {
        name: profile?.name ?? 'You',
        handle: profile?.username ?? 'you',
        avatarId: 12,
        verified: profile?.verified ?? false,
        avatarUrl:
          profile?.avatar_url ??
          `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(session?.user.id ?? 'you')}`,
      }
      const optimistic: ThreadComment = {
        key: `temp-${Date.now()}`,
        user: me,
        text: body,
        likes: 0,
        replies: [],
      }
      qc.setQueryData<ThreadComment[]>(key, (old) => insertInThread(old ?? [], optimistic, parentId))
      qc.setQueryData<Post[]>(
        FEED,
        (old) => old?.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p)) ?? old,
      )
      return { prev, prevFeed, postId }
    },
    onError: (_e, _v, ctx) => {
      if (!ctx) return
      qc.setQueryData(['comments', ctx.postId], ctx.prev)
      if (ctx.prevFeed) qc.setQueryData(FEED, ctx.prevFeed)
    },
    onSettled: (_d, _e, vars) => void qc.invalidateQueries({ queryKey: ['comments', vars.postId] }),
  })
}

/** Uniform comment thread + add — DB-backed for real posts, local for curated. */
export function usePostComments(post: Post): {
  thread: ThreadComment[]
  addComment: (text: string, parentKey?: string | null) => void
} {
  const local = useFeed()
  const isDb = post.source === 'db'
  const dbComments = useComments(post.id, isDb)
  const addCommentDb = useAddCommentDb()

  if (isDb) {
    return {
      thread: dbComments.data ?? [],
      addComment: (text, parentKey) => {
        const t = text.trim()
        if (t) addCommentDb.mutate({ postId: post.id, body: t, parentId: parentKey ?? null })
      },
    }
  }

  // Curated/local post: seed comments are roots; viewer comments nest by parentKey.
  const node = (key: string, user: User, text: string, likes: number): ThreadComment => ({
    key,
    user,
    text,
    likes,
    replies: [],
  })
  const roots: ThreadComment[] = [
    ...post.topComments.map((c, i) => node(`top-${i}`, c.user, c.text, c.likes)),
    ...(post.likedBy.length
      ? [
          node('x1', post.likedBy[0], 'the light here is unreal 🤍', 12),
          node('x2', post.likedBy[1] ?? post.author, 'instant save. teach a workshop!', 7),
        ]
      : []),
  ]
  const index = new Map(roots.map((r) => [r.key, r]))
  const localList = local.comments[post.id] ?? []
  for (let i = 0; i < localList.length; i++) {
    const c = localList[i]
    const key = c.key ?? `loc-${i}`
    const reply = node(key, c.user, c.text, c.likes)
    const parent = c.parentKey ? index.get(c.parentKey) : undefined
    if (parent) parent.replies.push(reply)
    else {
      roots.push(reply)
      index.set(key, reply)
    }
  }
  return {
    thread: roots,
    addComment: (text, parentKey) => local.addComment(post.id, text, parentKey ?? null),
  }
}
