import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { ComposeModal } from '@/components/ComposeModal'

type ComposeCtx = {
  open: boolean
  openCompose: () => void
  closeCompose: () => void
}

const Ctx = createContext<ComposeCtx | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useCompose(): ComposeCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCompose must be used within <ComposeProvider>')
  return ctx
}

/** Provides the create-post flow to the whole app. */
export function ComposeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const openCompose = useCallback(() => setOpen(true), [])
  const closeCompose = useCallback(() => setOpen(false), [])
  return (
    <Ctx.Provider value={{ open, openCompose, closeCompose }}>
      {children}
      <ComposeModal />
    </Ctx.Provider>
  )
}
