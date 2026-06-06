import { useCallback, useState } from 'react'

// Bump the version suffix to reset everyone's viewed state (old key is abandoned → all unviewed again).
const KEY = 'aurora:viewed-stories:v2'

function read(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

/**
 * Tracks which story reels (keyed by author handle) the signed-in user has already
 * viewed, so the rail can drop the aurora glow ring once a story has been seen
 * (Instagram-style). Local + persisted across reloads — no backend, matching the
 * curated/decorative stories feature.
 */
export function useStoryViews() {
  const [viewed, setViewed] = useState<Set<string>>(read)
  const markViewed = useCallback((handle: string) => {
    setViewed((prev) => {
      if (prev.has(handle)) return prev
      const next = new Set(prev).add(handle)
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]))
      } catch {
        // ignore storage quota / availability errors
      }
      return next
    })
  }, [])
  return { viewed, markViewed }
}
