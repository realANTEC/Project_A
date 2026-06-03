/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { useLocation, useNavigate, type Location } from 'react-router-dom'
import type { Post } from '@/data/feed'
import { PostDetailModal } from '@/components/PostDetailModal'

type PostModalCtx = {
  activePost: Post | null
  /** `sourceEl` is the clicked tile/photo — used to morph the lightbox out of it. */
  openPost: (post: Post, sourceEl?: HTMLElement | null) => void
  closePost: () => void
}

const Ctx = createContext<PostModalCtx | null>(null)

type ViewTransition = { finished: Promise<void> }
type DocumentWithVT = Document & { startViewTransition?: (cb: () => void) => ViewTransition }

/** Native View Transitions API support (Chromium, Safari ≥18). */
export const supportsViewTransitions =
  typeof document !== 'undefined' && typeof (document as DocumentWithVT).startViewTransition === 'function'

/** The single view-transition-name shared between the clicked image and the lightbox image. */
const MORPH_NAME = 'aurora-post-media'

/** Honours both the OS setting and the in-app Settings → Reduce motion toggle. */
export function prefersReducedMotion(): boolean {
  if (typeof document === 'undefined') return false
  if (document.documentElement.classList.contains('reduce-motion')) return true
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * Cross-browser fallback for the shared-element morph: a motion `layoutId` used
 * only when the native View Transitions API is unavailable (e.g. Firefox) and
 * motion is allowed. Apply the same id to a source image and the lightbox image.
 */
export function fallbackLayoutId(postId: string): string | undefined {
  return !supportsViewTransitions && !prefersReducedMotion() ? `aurora-post-${postId}` : undefined
}

/** The view-transition-name the lightbox image carries while open (VT browsers only). */
export const morphName = MORPH_NAME

export function usePostModal(): PostModalCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePostModal must be used within <PostModalProvider>')
  return ctx
}

/** Shape of the history-state we stash when opening a post as a modal route. */
type ModalRouteState = { background?: Location } | null

/**
 * Provides the immersive post-detail lightbox to the whole app.
 *
 * The lightbox is a *modal route*: opening a post pushes `/p/:id` (stashing the
 * current feed location as `background`, so App can keep the feed mounted
 * underneath via `<Routes location={background ?? location}>`). The modal itself
 * stays driven by `activePost` state — the route change and the state change are
 * committed together inside one `flushSync` so the View-Transition morph (which
 * needs the lightbox image present in the "after" snapshot) is preserved exactly.
 */
export function PostModalProvider({ children }: { children: ReactNode }) {
  const [activePost, setActivePost] = useState<Post | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  // A render-free handle on the latest location, so the open/close handlers stay
  // referentially stable (no re-render of every feed card on each navigation).
  const locationRef = useRef(location)
  useEffect(() => {
    locationRef.current = location
  }, [location])
  // Posts opened this session, so a Back/Forward to a `/p/:id` already visited
  // can re-show the modal instantly (no fetch, no morph) without bloating history.
  const cacheRef = useRef<Map<string, Post>>(new Map())

  const openPost = useCallback(
    (post: Post, sourceEl?: HTMLElement | null) => {
      cacheRef.current.set(post.id, post)
      const loc = locationRef.current
      const background = (loc.state as ModalRouteState)?.background ?? loc
      const go = () => navigate(`/p/${post.id}`, { state: { background } })

      const startVT = (document as DocumentWithVT).startViewTransition
      if (supportsViewTransitions && startVT && !prefersReducedMotion()) {
        // Tag only the clicked image so the lightbox image can grow out of it.
        const img = sourceEl?.querySelector('img') ?? null
        if (img) img.style.viewTransitionName = MORPH_NAME
        startVT.call(document, () => {
          // Commit the route change and the lightbox in one synchronous pass so the
          // "after" snapshot already holds the lightbox image. (The feed stays put
          // under `background`, so this navigate is visually inert.)
          flushSync(() => {
            go()
            setActivePost(post)
          })
          // The lightbox image now owns the name; release it from the source so the
          // new snapshot has a single holder.
          if (img) img.style.viewTransitionName = ''
        })
      } else {
        go()
        setActivePost(post)
      }
    },
    [navigate],
  )

  // Closing reverses the open push, so the X button, Esc, backdrop and the
  // browser Back button all land on the same history entry (the feed).
  const closePost = useCallback(() => {
    if ((locationRef.current.state as ModalRouteState)?.background) navigate(-1)
    else setActivePost(null)
  }, [navigate])

  // Keep the lightbox in lockstep with the URL: close it when the URL leaves the
  // post (Back / profile navigation), and re-show it on a Forward/Back that
  // returns to a still-cached `/p/:id`.
  useEffect(() => {
    const match = location.pathname.match(/^\/p\/([^/]+)$/)
    const modalId = match && (location.state as ModalRouteState)?.background ? match[1] : null
    if (modalId) {
      if (activePost?.id !== modalId) {
        const cached = cacheRef.current.get(modalId)
        if (cached) setActivePost(cached)
      }
    } else if (activePost) {
      setActivePost(null)
    }
  }, [location, activePost])

  return (
    <Ctx.Provider value={{ activePost, openPost, closePost }}>
      {children}
      <PostDetailModal />
    </Ctx.Provider>
  )
}
