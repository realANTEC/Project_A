/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

const PresenceCtx = createContext<Set<string>>(new Set())

/** The set of user ids currently connected (app-wide). */
export function useOnline(): Set<string> {
  return useContext(PresenceCtx)
}

/**
 * Tracks the signed-in user on a global Realtime presence channel and exposes the
 * set of online user ids app-wide — so online dots stay accurate on every screen,
 * not just while the Messages page is mounted.
 */
export function PresenceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const myId = session?.user.id
  const [online, setOnline] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (!supabase || !myId) return
    const client = supabase
    const channel = client.channel('aurora-presence', { config: { presence: { key: myId } } })
    channel
      .on('presence', { event: 'sync' }, () => setOnline(new Set(Object.keys(channel.presenceState()))))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void channel.track({ online_at: new Date().toISOString() })
      })
    return () => {
      void client.removeChannel(channel)
    }
  }, [myId])

  return <PresenceCtx.Provider value={online}>{children}</PresenceCtx.Provider>
}
