import { type Post } from '@/data/feed'

/**
 * A real, resolvable link for a post. Posts have no dedicated route (the
 * detail view is a modal), so we link to the author's profile — the closest
 * honest destination, rather than a deep link that wouldn't open.
 */
export function postUrl(post: Post): string {
  return `${window.location.origin}/u/${post.author.handle}`
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
