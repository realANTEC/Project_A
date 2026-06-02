import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { useAuth } from './auth'
import { relativeTime } from './format'
import { authorToUser, type DbAuthor } from './posts'
import type { User } from '@/data/feed'

export type DbMessage = { id: string; fromMe: boolean; text: string; time: string; createdAt: string }
export type DbConversation = {
  id: string
  otherId: string
  user: User
  preview: string
  time: string
  lastAt: string
}
export type Profile = User & { id: string }

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

type MemberRow = { user_id: string; profile: DbAuthor | null }
type MsgRow = { id: string; body: string; sender_id: string; created_at: string }
type ConvRow = { id: string; created_at: string; members: MemberRow[]; messages: MsgRow[] }

/** Every conversation the signed-in user belongs to, most-recent activity first. */
export function useConversations() {
  const qc = useQueryClient()
  const { session } = useAuth()
  const myId = session?.user.id
  const query = useQuery({
    queryKey: ['conversations'],
    enabled: !!supabase && !!session,
    queryFn: async (): Promise<DbConversation[]> => {
      if (!supabase || !myId) return []
      // RLS scopes `conversations` to ones the user is a member of.
      const { data, error } = await supabase
        .from('conversations')
        .select(
          'id, created_at, members:conversation_members(user_id, profile:profiles(id,username,name,avatar_url,verified)), messages(id, body, sender_id, created_at)',
        )
      if (error) throw error
      const rows = (data ?? []) as unknown as ConvRow[]
      return rows
        .map((c): DbConversation => {
          const other = c.members.find((m) => m.user_id !== myId) ?? c.members[0]
          const msgs = [...(c.messages ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at))
          const last = msgs[msgs.length - 1]
          return {
            id: c.id,
            otherId: other?.user_id ?? '',
            user: authorToUser(other?.profile ?? null, other?.user_id ?? c.id),
            preview: last ? `${last.sender_id === myId ? 'You: ' : ''}${last.body}` : 'Say hello 👋',
            time: last ? relativeTime(last.created_at) : '',
            lastAt: last?.created_at ?? c.created_at,
          }
        })
        .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
    },
  })

  // Live inbox: when someone else's message lands in any conversation I'm in, the
  // list reorders + previews refresh live (no manual refetch / navigation). RLS scopes
  // realtime delivery to my conversations. Safe now that the open thread is pinned by
  // the URL (see MessagesPage) — reordering the list never switches the active thread.
  useEffect(() => {
    if (!supabase || !myId) return
    const client = supabase
    const channel = client
      .channel('aurora-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if ((payload.new as MsgRow).sender_id === myId) return // own sends already refresh via useSendMessage
        void qc.invalidateQueries({ queryKey: ['conversations'] })
      })
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [myId, qc])

  return query
}

/** Messages for one conversation (oldest first) + live INSERTs from the other person. */
export function useConversationMessages(conversationId: string | null) {
  const qc = useQueryClient()
  const { session } = useAuth()
  const myId = session?.user.id
  const query = useQuery({
    queryKey: ['messages', conversationId],
    enabled: !!supabase && !!conversationId,
    queryFn: async (): Promise<DbMessage[]> => {
      if (!supabase || !conversationId) return []
      const { data, error } = await supabase
        .from('messages')
        .select('id, body, sender_id, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []).map(
        (m): DbMessage => ({
          id: m.id,
          fromMe: m.sender_id === myId,
          text: m.body,
          time: clock(m.created_at),
          createdAt: m.created_at,
        }),
      )
    },
  })

  useEffect(() => {
    if (!supabase || !conversationId) return
    const client = supabase
    const channel = client
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as MsgRow
          if (m.sender_id === myId) return // our optimistic update already added it
          qc.setQueryData<DbMessage[]>(['messages', conversationId], (old) => {
            if (old?.some((x) => x.id === m.id)) return old
            return [
              ...(old ?? []),
              { id: m.id, fromMe: false, text: m.body, time: clock(m.created_at), createdAt: m.created_at },
            ]
          })
          void qc.invalidateQueries({ queryKey: ['conversations'] })
        },
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [conversationId, myId, qc])

  return query
}

/** Send a message into a conversation (optimistic append). */
export function useSendMessage() {
  const qc = useQueryClient()
  const { session } = useAuth()
  return useMutation({
    mutationFn: async ({ conversationId, body }: { conversationId: string; body: string }) => {
      if (!supabase || !session) throw new Error('Not signed in')
      const { error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: session.user.id, body })
      if (error) throw error
    },
    onMutate: async ({ conversationId, body }) => {
      const key = ['messages', conversationId]
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<DbMessage[]>(key)
      const now = new Date().toISOString()
      qc.setQueryData<DbMessage[]>(key, (old) => [
        ...(old ?? []),
        { id: `temp-${Date.now()}`, fromMe: true, text: body, time: clock(now), createdAt: now },
      ])
      return { prev, conversationId }
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(['messages', ctx.conversationId], ctx.prev)
    },
    onSettled: (_d, _e, vars) => {
      void qc.invalidateQueries({ queryKey: ['messages', vars.conversationId] })
      void qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

/** Real profiles you can start a conversation with (everyone but you). */
export function useProfiles() {
  const { session } = useAuth()
  const myId = session?.user.id
  return useQuery({
    queryKey: ['profiles', myId],
    enabled: !!supabase && !!session,
    queryFn: async (): Promise<Profile[]> => {
      if (!supabase || !myId) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, name, avatar_url, verified')
        .neq('id', myId)
        .limit(30)
      if (error) throw error
      return (data ?? []).map((p) => ({ ...authorToUser(p as DbAuthor, p.id), id: p.id }))
    },
  })
}

/** Find an existing 1:1 conversation with `otherId`, or create one. Returns its id. */
export function useStartConversation() {
  const qc = useQueryClient()
  const { session } = useAuth()
  return useMutation({
    mutationFn: async (otherId: string): Promise<string> => {
      if (!supabase || !session) throw new Error('Not signed in')
      const myId = session.user.id
      const mine = await supabase.from('conversation_members').select('conversation_id').eq('user_id', myId)
      if (mine.error) throw mine.error
      const myConvIds = (mine.data ?? []).map((r) => r.conversation_id)
      if (myConvIds.length) {
        const shared = await supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', otherId)
          .in('conversation_id', myConvIds)
          .limit(1)
        if (shared.error) throw shared.error
        if (shared.data?.length) return shared.data[0].conversation_id
      }
      // Generate the id client-side: under RLS, INSERT ... RETURNING on conversations
      // is forbidden until we're a member, so we can't SELECT the new row back (403).
      const convId = crypto.randomUUID()
      const { error: convErr } = await supabase.from('conversations').insert({ id: convId })
      if (convErr) throw convErr
      const { error: memErr } = await supabase.from('conversation_members').insert([
        { conversation_id: convId, user_id: myId },
        { conversation_id: convId, user_id: otherId },
      ])
      if (memErr) throw memErr
      return convId
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['conversations'] }),
  })
}

/** Per-conversation "typing…" indicator over Realtime broadcast. */
export function useTyping(conversationId: string | null) {
  const { session } = useAuth()
  const myId = session?.user.id
  const [theyTyping, setTheyTyping] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastSent = useRef(0)
  const clearTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!supabase || !conversationId || !myId) return
    const client = supabase
    const channel = client
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if ((payload as { userId?: string }).userId === myId) return
        setTheyTyping(true)
        if (clearTimer.current) window.clearTimeout(clearTimer.current)
        clearTimer.current = window.setTimeout(() => setTheyTyping(false), 2800)
      })
      .subscribe()
    channelRef.current = channel
    return () => {
      if (clearTimer.current) window.clearTimeout(clearTimer.current)
      setTheyTyping(false)
      channelRef.current = null
      void client.removeChannel(channel)
    }
  }, [conversationId, myId])

  const notifyTyping = useCallback(() => {
    const now = Date.now()
    if (now - lastSent.current < 1500) return // throttle broadcasts
    lastSent.current = now
    void channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: myId } })
  }, [myId])

  return { theyTyping, notifyTyping }
}
