import { useCallback, useState } from 'react'

// "Delete for you" hides a message on THIS device only (like Instagram), so it's a
// local per-user set rather than a DB mutation.
const KEY = 'aurora:hidden-messages'

function read(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

export function useHiddenMessages() {
  const [hidden, setHidden] = useState<Set<string>>(read)
  const hide = useCallback((id: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      next.add(id)
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]))
      } catch {
        /* ignore quota / private-mode errors */
      }
      return next
    })
  }, [])
  return { hidden, hide }
}
