import { type Post } from '@/data/feed'

/** A real, deep-linkable URL for a post (resolves via the /p/:id route). Includes the
 *  deploy base (BASE_URL is '/' in dev, '/Project_A/' on GitHub Pages). */
export function postUrl(post: Post): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}p/${post.id}`
}

export type ShareResult = 'shared' | 'copied' | 'unavailable'

/** Copy a post's link to the clipboard. */
export async function copyPostLink(post: Post): Promise<ShareResult> {
  try {
    await navigator.clipboard.writeText(postUrl(post))
    return 'copied'
  } catch {
    return 'unavailable'
  }
}

/**
 * Share a post via the Web Share API (the native share sheet where supported,
 * e.g. most mobile browsers), falling back to copying its link to the clipboard.
 */
export async function sharePost(post: Post): Promise<ShareResult> {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Soul',
        text: `${post.author.name} (@${post.author.handle}) on Soul`,
        url: postUrl(post),
      })
      return 'shared'
    } catch (err) {
      // User dismissed the native sheet — treat as handled, don't also copy.
      if (err instanceof DOMException && err.name === 'AbortError') return 'shared'
      // Any other failure falls through to the clipboard fallback.
    }
  }
  return copyPostLink(post)
}
