import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { type Comment, currentUser, posts as seedPosts, type Post } from '@/data/feed'

type Flags = Record<string, boolean>
/** A locally-authored comment. `parentKey` set ⇒ it's a reply to that comment's thread. */
type StoredComment = Comment & { key?: string; parentKey?: string | null }

type FeedCtx = {
  posts: Post[]
  addPost: (post: Post) => void
  liked: Flags
  saved: Flags
  /** Toggle like (heart button). */
  toggleLike: (id: string) => void
  /** Ensure liked (double-tap — never un-likes). */
  like: (id: string) => void
  /** Toggle bookmark. */
  toggleSave: (id: string) => void
  /** Viewer-authored comments, keyed by post id. */
  comments: Record<string, StoredComment[]>
  addComment: (postId: string, text: string, parentKey?: string | null) => void
}

const Ctx = createContext<FeedCtx | null>(null)

const LIKED_KEY = 'aurora:liked'
const SAVED_KEY = 'aurora:saved'
const COMMENTS_KEY = 'aurora:comments'

function loadFlags(key: string, seed: () => Flags): Flags {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as Flags
  } catch {
    /* ignore */
  }
  return seed()
}

function persist(key: string, value: Flags) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota / private mode — non-fatal */
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFeed(): FeedCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useFeed must be used within <FeedProvider>')
  return ctx
}

/** Holds the live feed plus persisted like/save state. */
export function FeedProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>(seedPosts)
  const [liked, setLiked] = useState<Flags>(() =>
    loadFlags(LIKED_KEY, () => {
      const init: Flags = {}
      seedPosts.forEach((p) => p.likedByYou && (init[p.id] = true))
      return init
    }),
  )
  const [saved, setSaved] = useState<Flags>(() =>
    loadFlags(SAVED_KEY, () => {
      const init: Flags = {}
      seedPosts.forEach((p) => p.saved && (init[p.id] = true))
      return init
    }),
  )

  const [comments, setComments] = useState<Record<string, StoredComment[]>>(() => {
    try {
      const raw = localStorage.getItem(COMMENTS_KEY)
      if (raw) return JSON.parse(raw) as Record<string, StoredComment[]>
    } catch {
      /* ignore */
    }
    return {}
  })

  useEffect(() => persist(LIKED_KEY, liked), [liked])
  useEffect(() => persist(SAVED_KEY, saved), [saved])
  useEffect(() => {
    try {
      localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments))
    } catch {
      /* ignore */
    }
  }, [comments])

  const addPost = useCallback((post: Post) => setPosts((prev) => [post, ...prev]), [])
  const addComment = useCallback((postId: string, text: string, parentKey?: string | null) => {
    const t = text.trim()
    if (!t) return
    setComments((prev) => ({
      ...prev,
      [postId]: [
        ...(prev[postId] ?? []),
        { user: currentUser, text: t, likes: 0, key: crypto.randomUUID(), parentKey: parentKey ?? null },
      ],
    }))
  }, [])
  const toggleLike = useCallback((id: string) => setLiked((prev) => ({ ...prev, [id]: !prev[id] })), [])
  const like = useCallback(
    (id: string) => setLiked((prev) => (prev[id] ? prev : { ...prev, [id]: true })),
    [],
  )
  const toggleSave = useCallback((id: string) => setSaved((prev) => ({ ...prev, [id]: !prev[id] })), [])

  return (
    <Ctx.Provider
      value={{ posts, addPost, liked, saved, toggleLike, like, toggleSave, comments, addComment }}
    >
      {children}
    </Ctx.Provider>
  )
}

/** Display like count = base, adjusted for the viewer's current like state. */
// eslint-disable-next-line react-refresh/only-export-components
export function displayLikes(post: Post, isLiked: boolean): number {
  return post.likes + (isLiked ? 1 : 0) - (post.likedByYou ? 1 : 0)
}
