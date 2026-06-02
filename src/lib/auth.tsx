/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'
import type { ProfileRow } from './database.types'

type Result = { error?: string; needsConfirmation?: boolean }

type AuthCtx = {
  /** True once the initial session check has resolved. */
  ready: boolean
  session: Session | null
  profile: ProfileRow | null
  signInWithPassword: (email: string, password: string) => Promise<Result>
  signUp: (email: string, password: string, username: string) => Promise<Result>
  signInAsGuest: () => Promise<Result>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // When Supabase isn't configured we're immediately "ready" in local mode.
  const [ready, setReady] = useState(!isSupabaseConfigured)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data ?? null)
  }, [])

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session) void loadProfile(data.session.user.id)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (next) void loadProfile(next.user.id)
      else setProfile(null)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signInWithPassword = useCallback(async (email: string, password: string): Promise<Result> => {
    if (!supabase) return { error: 'Supabase is not configured.' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? { error: error.message } : {}
  }, [])

  const signUp = useCallback(async (email: string, password: string, username: string): Promise<Result> => {
    if (!supabase) return { error: 'Supabase is not configured.' }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, name: username } },
    })
    if (error) return { error: error.message }
    return { needsConfirmation: !data.session }
  }, [])

  const signInAsGuest = useCallback(async (): Promise<Result> => {
    if (!supabase) return { error: 'Supabase is not configured.' }
    const { error } = await supabase.auth.signInAnonymously()
    return error ? { error: error.message } : {}
  }, [])

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
  }, [])

  const refreshProfile = useCallback(async () => {
    if (session) await loadProfile(session.user.id)
  }, [session, loadProfile])

  return (
    <Ctx.Provider
      value={{ ready, session, profile, signInWithPassword, signUp, signInAsGuest, signOut, refreshProfile }}
    >
      {children}
    </Ctx.Provider>
  )
}
