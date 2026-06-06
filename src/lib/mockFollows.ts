import { useCallback, useState } from 'react'

// Curated/showcase personas (maralin, kenji.frames, …) are not real accounts, so following one is
// a local visual response persisted on THIS device — not a real follow-graph edge. Keeping it in
// localStorage (rather than ephemeral useState) means it survives remounts, navigation, and
// reloads, so the button does not reset when the app re-renders.
const KEY = 'aurora:mock-follows'

function read(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

/** Local, persisted follow state for a curated/mock profile, keyed by handle. */
export function useMockFollow(handle: string) {
  const [set, setSet] = useState<Set<string>>(read)
  const following = set.has(handle)
  const toggle = useCallback(() => {
    setSet((prev) => {
      const next = new Set(prev)
      if (next.has(handle)) next.delete(handle)
      else next.add(handle)
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]))
      } catch {
        /* ignore quota / private-mode errors */
      }
      return next
    })
  }, [handle])
  return { following, toggle }
}
