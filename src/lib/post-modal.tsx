/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
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
  typeof document !== 'undefined' &&
  typeof (document as DocumentWithVT).startViewTransition === 'function'

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

/** Provides the immersive post-detail lightbox to the whole app. */
export function PostModalProvider({ children }: { children: ReactNode }) {
  const [activePost, setActivePost] = useState<Post | null>(null)

  const openPost = useCallback((post: Post, sourceEl?: HTMLElement | null) => {
    const startVT = (document as DocumentWithVT).startViewTransition
    if (supportsViewTransitions && startVT && !prefersReducedMotion()) {
      // Tag only the clicked image so the lightbox image can grow out of it.
      const img = sourceEl?.querySelector('img') ?? null
      if (img) img.style.viewTransitionName = MORPH_NAME
      startVT.call(document, () => {
        flushSync(() => setActivePost(post))
        // The lightbox image now owns the name; release it from the source so the
        // new snapshot has a single holder.
        if (img) img.style.viewTransitionName = ''
      })
    } else {
      setActivePost(post)
    }
  }, [])

  const closePost = useCallback(() => setActivePost(null), [])

  return (
    <Ctx.Provider value={{ activePost, openPost, closePost }}>
      {children}
      <PostDetailModal />
    </Ctx.Provider>
  )
}
