import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { SearchPalette } from '@/components/SearchPalette'

type SearchCtx = {
  open: boolean
  /** Open the palette, optionally seeded with a starting query (e.g. a trend or highlight). */
  openSearch: (query?: string) => void
  closeSearch: () => void
}

const Ctx = createContext<SearchCtx | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useSearch(): SearchCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSearch must be used within <SearchProvider>')
  return ctx
}

/** Command-palette search, also bound to ⌘K / Ctrl-K globally. */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [seed, setSeed] = useState('')
  const openSearch = useCallback((query = '') => {
    setSeed(query)
    setOpen(true)
  }, [])
  const closeSearch = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSeed('') // keyboard shortcut always opens a blank palette
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Ctx.Provider value={{ open, openSearch, closeSearch }}>
      {children}
      <SearchPalette seed={seed} />
    </Ctx.Provider>
  )
}
