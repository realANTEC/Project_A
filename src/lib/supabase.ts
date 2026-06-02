import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True once VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set in .env.local. */
export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * The typed Supabase client — or `null` until configured, so the app degrades
 * gracefully to local/mock mode instead of crashing.
 */
export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
