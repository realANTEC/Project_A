import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { useAuth } from './auth'
import { relativeTime } from './format'
import { authorToUser, type DbAuthor } from './posts'
import { type Attachment, attachmentPreview } from './attachments'
import type { User } from '@/data/feed'

export type MsgReaction = { userId: string; emoji: string }
export type DbMessage = {
  id: string
  fromMe: boolean
  text: string
  time: string
  createdAt: string
  /** When this message was last edited (null = never edited). */
  editedAt: string | null
  reactions: MsgReaction[]
  /** The message this one replies to (quoted), resolved via the query embed. */
  parent: { id: string; text: string; fromMe: boolean } | null
  /** A rich attachment (image, document, location, contact, poll, event), or null. */
  attachment: Attachment | null
}

/** The reaction palette shown in the message action bar (matches the IG/Messenger set). */
export const MESSAGE_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'] as const
export type DbConversation = {
  id: string
  otherId: string
  user: User
  preview: string
  time: string
  lastAt: string
  unread: number
}
export type Profile = User & { id: string }

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

type MemberRow = { user_id: string; last_read_at: string | null; profile: DbAuthor | null }
type MsgRow = {
  id: string
  body: string
  sender_id: string
  created_at: string
  reply_to?: string | null
  edited_at?: string | null
  attachment?: Attachment | null
}
type ConvRow = { id: string; created_at: string; members: MemberRow[]; messages: MsgRow[] }
type ReactionRow = { user_id: string; emoji: string }
type ParentRow = { id: string; body: string; sender_id: string }
type MsgRowWithReactions = MsgRow & {
  message_reactions?: ReactionRow[] | null
  parent?: ParentRow | null
}

function toDbMessage(m: MsgRowWithReactions, myId?: string): DbMessage {
  return {
    id: m.id,
    fromMe: m.sender_id === myId,
    text: m.body,
    time: clock(m.created_at),
    createdAt: m.created_at,
    editedAt: m.edited_at ?? null,
    reactions: (m.message_reactions ?? []).map((r) => ({ userId: r.user_id, emoji: r.emoji })),
    parent: m.parent ? { id: m.parent.id, text: m.parent.body, fromMe: m.parent.sender_id === myId } : null,
    attachment: m.attachment ?? null,
  }
}

/** Collapse a message's reactions into one entry per emoji with a count + whether I reacted. */
export function groupReactions(reactions: MsgReaction[], myId?: string) {
  const map = new Map<string, { count: number; mine: boolean }>()
  for (const r of reactions) {
    const cur = map.get(r.emoji) ?? { count: 0, mine: false }
    cur.count += 1
    if (r.userId === myId) cur.mine = true
    map.set(r.emoji, cur)
  }
  return [...map.entries()].map(([emoji, v]) => ({ emoji, ...v }))
}

/** Every conversation the signed-in user belongs to, most-recent activity first. */
export function useConversations() {
  const { session } = useAuth()
  const myId = session?.user.id
  return useQuery({
    queryKey: ['conversations'],
    enabled: !!supabase && !!session,
    queryFn: async (): Promise<DbConversation[]> => {
      if (!supabase || !myId) return []
      // RLS scopes `conversations` to ones the user is a member of.
      const { data, error } = await supabase
        .from('conversations')
        .select(
          'id, created_at, members:conversation_members(user_id, last_read_at, profile:profiles(id,username,name,avatar_url,verified)), messages(id, body, sender_id, created_at, attachment)',
        )
      if (error) throw error
      const rows = (data ?? []) as unknown as ConvRow[]
      return rows
        .map((c): DbConversation => {
          const other = c.members.find((m) => m.user_id !== myId) ?? c.members[0]
          const msgs = [...(c.messages ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at))
          const last = msgs[msgs.length - 1]
          // Unread = messages from the other person newer than my last_read_at.
          const lastRead = c.members.find((m) => m.user_id === myId)?.last_read_at
          const unread = msgs.filter(
            (m) => m.sender_id !== myId && (!lastRead || m.created_at > lastRead),
          ).length
          return {
            id: c.id,
            otherId: other?.user_id ?? '',
            user: authorToUser(other?.profile ?? null, other?.user_id ?? c.id),
            preview: last
              ? `${last.sender_id === myId ? 'You: ' : ''}${last.attachment ? attachmentPreview(last.attachment) : last.body}`
              : 'Say hello 👋',
            time: last ? relativeTime(last.created_at) : '',
            lastAt: last?.created_at ?? c.created_at,
            unread,
          }
        })
        .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
    },
  })
}

/**
 * App-wide live inbox: refreshes `['conversations']` whenever someone else messages me, so
 * the conversation list AND the nav unread badge stay live on every route. Call ONCE
 * (in AppShell). RLS scopes realtime delivery to my conversations; the open thread is
 * URL-pinned (see MessagesPage) so a reorder never switches it.
 */
export function useInboxRealtime() {
  const qc = useQueryClient()
  const { session } = useAuth()
  const myId = session?.user.id
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
}

/** Mark a conversation read for the signed-in user (advances their last_read_at). */
export function useMarkRead() {
  const qc = useQueryClient()
  const { session } = useAuth()
  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!supabase || !session) return
      const { error } = await supabase
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', session.user.id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['conversations'] }),
  })
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
        .select(
          'id, body, sender_id, created_at, reply_to, edited_at, attachment, parent:reply_to(id, body, sender_id), message_reactions(user_id, emoji)',
        )
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (error) throw error
      const rows = (data ?? []) as unknown as MsgRowWithReactions[]
      return rows.map((m) => toDbMessage(m, myId))
    },
  })

  useEffect(() => {
    if (!supabase || !conversationId) return
    const client = supabase
    const channel = client
      .channel(`messages:${conversationId}`)
      // ONE binding for the messages table: INSERT (new messages) + DELETE (unsends).
      // IMPORTANT: keep this a single `event: '*'` binding — two postgres_changes bindings on
      // the SAME table (e.g. a separate INSERT and DELETE) silently break realtime delivery
      // for the whole channel (the receiver stops getting any messages).
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            // An unsent message (deleted for everyone) → drop it from the open thread.
            // replica identity full makes the DELETE payload carry the row id + conversation_id.
            const old = payload.old as { id?: string }
            if (!old?.id) return
            qc.setQueryData<DbMessage[]>(['messages', conversationId], (cur) =>
              (cur ?? []).filter((m) => m.id !== old.id),
            )
            void qc.invalidateQueries({ queryKey: ['conversations'] })
            return
          }
          if (payload.eventType === 'UPDATE') {
            // An edited message → patch its body + editedAt in place (keep reactions/parent).
            // replica identity full makes the UPDATE payload carry the full new row. Idempotent
            // for my own edit (the optimistic patch already set the same values).
            const m = payload.new as MsgRow
            qc.setQueryData<DbMessage[]>(['messages', conversationId], (cur) =>
              (cur ?? []).map((x) => (x.id === m.id ? { ...x, text: m.body, editedAt: m.edited_at ?? null } : x)),
            )
            void qc.invalidateQueries({ queryKey: ['conversations'] })
            return
          }
          if (payload.eventType !== 'INSERT') return
          const m = payload.new as MsgRow
          if (m.sender_id === myId) return // our optimistic update already added it
          qc.setQueryData<DbMessage[]>(['messages', conversationId], (old) => {
            if (old?.some((x) => x.id === m.id)) return old
            const parent = m.reply_to ? old?.find((x) => x.id === m.reply_to) : undefined
            return [
              ...(old ?? []),
              {
                id: m.id,
                fromMe: false,
                text: m.body,
                time: clock(m.created_at),
                createdAt: m.created_at,
                editedAt: m.edited_at ?? null,
                attachment: m.attachment ?? null,
                reactions: [],
                parent: parent ? { id: parent.id, text: parent.text, fromMe: parent.fromMe } : null,
              },
            ]
          })
          // A reply's quoted parent isn't in the realtime payload — refetch so the query's
          // embed fills it in (also recovers a parent this client didn't have cached).
          if (m.reply_to) void qc.invalidateQueries({ queryKey: ['messages', conversationId] })
          void qc.invalidateQueries({ queryKey: ['conversations'] })
        },
      )
      // A reaction changed in one of my conversations (realtime delivery is RLS-scoped to
      // them). Refetch the OPEN thread so its reaction pills update live. Unconditional on
      // purpose: the reacted message may not be in this client's cache yet (the message-INSERT
      // and reaction events race), so guarding on "is it in the cache" intermittently dropped
      // the update. An extra refetch of just the open conversation is cheap and correct.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => {
        void qc.invalidateQueries({ queryKey: ['messages', conversationId] })
      })
      // Pins ride the SAME channel (a separate per-thread pins channel was one channel too
      // many and starved realtime delivery in the browser). Different table → safe to stack.
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_pins', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          // Patch the pins cache directly (no refetch round-trip) so a pin/unpin reflects
          // promptly on the OTHER client. The DELETE (unpin) needs `replica identity full` on
          // message_pins (set in schema.sql) so the event passes the conversation_id filter + RLS.
          // Read `old` on DELETE — `new` is an empty (but truthy) object there, so `new ?? old`
          // would wrongly pick it and lose message_id.
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as { message_id?: string }
          const mid = row?.message_id
          if (!mid) return
          qc.setQueryData<string[]>(['pins', conversationId], (old) => {
            const cur = old ?? []
            if (payload.eventType === 'DELETE') return cur.filter((id) => id !== mid)
            return cur.includes(mid) ? cur : [...cur, mid]
          })
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
    mutationFn: async ({
      conversationId,
      body,
      replyTo,
      attachment,
    }: {
      conversationId: string
      body: string
      replyTo?: string | null
      attachment?: Attachment | null
    }) => {
      if (!supabase || !session) throw new Error('Not signed in')
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        body,
        reply_to: replyTo ?? null,
        attachment: attachment ?? null,
      })
      if (error) throw error
    },
    onMutate: async ({ conversationId, body, replyTo, attachment }) => {
      const key = ['messages', conversationId]
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<DbMessage[]>(key)
      const now = new Date().toISOString()
      const parent = replyTo ? prev?.find((x) => x.id === replyTo) : undefined
      qc.setQueryData<DbMessage[]>(key, (old) => [
        ...(old ?? []),
        {
          id: `temp-${Date.now()}`,
          fromMe: true,
          text: body,
          time: clock(now),
          createdAt: now,
          editedAt: null,
          attachment: attachment ?? null,
          reactions: [],
          parent: parent ? { id: parent.id, text: parent.text, fromMe: parent.fromMe } : null,
        },
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

/** Edit a message's body — own messages only, via the messages_update_own policy. Optimistic. */
export function useEditMessage(conversationId: string | null) {
  const qc = useQueryClient()
  const { session } = useAuth()
  const key = ['messages', conversationId]
  return useMutation({
    mutationFn: async ({ messageId, body }: { messageId: string; body: string }) => {
      if (!supabase || !session) throw new Error('Not signed in')
      const { error } = await supabase
        .from('messages')
        .update({ body, edited_at: new Date().toISOString() })
        .eq('id', messageId)
      if (error) throw error
    },
    onMutate: async ({ messageId, body }) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<DbMessage[]>(key)
      const now = new Date().toISOString()
      qc.setQueryData<DbMessage[]>(key, (old) =>
        (old ?? []).map((m) => (m.id === messageId ? { ...m, text: body, editedAt: now } : m)),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key })
      void qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

/**
 * Add / change / remove MY reaction on a message — one reaction per user per message
 * (re-tapping the same emoji removes it; tapping a different one replaces it). Optimistic.
 */
export function useToggleReaction(conversationId: string | null) {
  const qc = useQueryClient()
  const { session } = useAuth()
  const key = ['messages', conversationId]
  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!supabase || !session) throw new Error('Not signed in')
      const myId = session.user.id
      // onMutate has already applied the optimistic toggle, so the cache now reflects the
      // desired end state: if my reaction is this emoji I just added/changed it (upsert),
      // otherwise I just removed it (delete).
      const mineAfter = qc
        .getQueryData<DbMessage[]>(key)
        ?.find((m) => m.id === messageId)
        ?.reactions.find((r) => r.userId === myId)?.emoji
      if (mineAfter === emoji) {
        const { error } = await supabase
          .from('message_reactions')
          .upsert({ message_id: messageId, user_id: myId, emoji }, { onConflict: 'message_id,user_id' })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', myId)
        if (error) throw error
      }
    },
    onMutate: async ({ messageId, emoji }) => {
      if (!session) return
      const myId = session.user.id
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<DbMessage[]>(key)
      qc.setQueryData<DbMessage[]>(key, (old) =>
        (old ?? []).map((m) => {
          if (m.id !== messageId) return m
          const mineNow = m.reactions.find((r) => r.userId === myId)?.emoji
          const others = m.reactions.filter((r) => r.userId !== myId)
          return { ...m, reactions: mineNow === emoji ? others : [...others, { userId: myId, emoji }] }
        }),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  })
}

/** Unsend (delete for everyone) — own messages only, via the messages_delete_own policy. */
export function useUnsendMessage(conversationId: string | null) {
  const qc = useQueryClient()
  const { session } = useAuth()
  const key = ['messages', conversationId]
  return useMutation({
    mutationFn: async (messageId: string) => {
      if (!supabase || !session) throw new Error('Not signed in')
      const { error } = await supabase.from('messages').delete().eq('id', messageId)
      if (error) throw error
    },
    onMutate: async (messageId) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<DbMessage[]>(key)
      qc.setQueryData<DbMessage[]>(key, (old) => (old ?? []).filter((m) => m.id !== messageId))
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key })
      void qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

/** Pinned message ids for a conversation (+ live updates as anyone pins/unpins). */
export function usePins(conversationId: string | null) {
  // Pin realtime is handled on the shared messages channel (see useConversationMessages),
  // so this is just the query.
  return useQuery({
    queryKey: ['pins', conversationId],
    enabled: !!supabase && !!conversationId,
    queryFn: async (): Promise<string[]> => {
      if (!supabase || !conversationId) return []
      const { data, error } = await supabase
        .from('message_pins')
        .select('message_id')
        .eq('conversation_id', conversationId)
      if (error) throw error
      return (data ?? []).map((p) => p.message_id)
    },
  })
}

/** Pin / unpin a message (any member; optimistic). */
export function useTogglePin(conversationId: string | null) {
  const qc = useQueryClient()
  const { session } = useAuth()
  const key = ['pins', conversationId]
  return useMutation({
    mutationFn: async ({ messageId, pinned }: { messageId: string; pinned: boolean }) => {
      if (!supabase || !session || !conversationId) throw new Error('Not signed in')
      if (pinned) {
        const { error } = await supabase.from('message_pins').delete().eq('message_id', messageId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('message_pins')
          .insert({ message_id: messageId, conversation_id: conversationId, pinned_by: session.user.id })
        if (error) throw error
      }
    },
    onMutate: async ({ messageId, pinned }) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<string[]>(key)
      qc.setQueryData<string[]>(key, (old) =>
        pinned ? (old ?? []).filter((id) => id !== messageId) : [...(old ?? []), messageId],
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
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
