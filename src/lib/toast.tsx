import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type ToastCtx = { toast: (message: string) => void }
const Ctx = createContext<ToastCtx | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

/** App-wide transient toast — a glass pill at the bottom-center. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<{ id: number; message: string } | null>(null)
  const idRef = useRef(0)
  const toast = useCallback((message: string) => {
    const id = (idRef.current += 1)
    setCurrent({ id, message })
    window.setTimeout(() => setCurrent((cur) => (cur?.id === id ? null : cur)), 2200)
  }, [])

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="glass edge-light fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_30px_rgba(0,0,0,0.5)] lg:bottom-8"
          >
            {current.message}
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  )
}
