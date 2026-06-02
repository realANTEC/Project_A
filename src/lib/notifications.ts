import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from './auth'
import { relativeTime } from './format'
import { authorToUser, type DbAuthor } from './posts'
import type { User } from '@/data/feed'

export type NotifKind = 'follow' | 'like' | 'comment'

export type AppNotification = {
  id: string
  type: NotifKind
  read: boolean
  time: string
  actor: User
  actorId: string
  postId: string | null
  thumb?: string
}

const NOTIFS = ['notifications'] as const
const NOTIFS_UNREAD = ['notifications-unread'] as const

/**
 * Best-effort: create a notification for `recipientId` from the current user (the actor).
 * Fire-and-forget — never blocks or fails the underlying follow/like/comment action.
 */
export async function notify(input: {
  recipientId?: string | null
  type: NotifKind
  postId?: string | null
  commentId?: string | null
}) {
  try {
    if (!supabase || !input.recipientId) return
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const actorId = session?.user.id
    if (!actorId || actorId === input.recipientId) return // never notify yourself
    await supabase.from('notifications').insert({
      user_id: input.recipientId,
      actor_id: actorId,
      type: input.type,
      post_id: input.postId ?? null,
      comment_id: input.commentId ?? null,
    })
  } catch {
    // notifications are best-effort
  }
}

type RawNotif = {
  id: string
  type: NotifKind
  read: boolean
  created_at: string
  post_id: string | null
  actor: DbAuthor | null
  post: { image_url: string } | null
}

/** The signed-in user's notifications (newest first), with actor profiles + post thumbs. */
export function useNotifications() {
  const { session } = useAuth()
  return useQuery({
    queryKey: NOTIFS,
    enabled: !!supabase && !!session,
    queryFn: async (): Promise<AppNotification[]> => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('notifications')
        .select(
          'id, type, read, created_at, post_id, actor:profiles!actor_id(id,username,name,avatar_url,verified), post:posts!post_id(image_url)',
        )
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return ((data ?? []) as unknown as RawNotif[]).map((n) => ({
        id: n.id,
        type: n.type,
        read: n.read,
        time: relativeTime(n.created_at),
        actor: authorToUser(n.actor, n.actor?.id ?? n.id),
        actorId: n.actor?.id ?? '',
        postId: n.post_id,
        thumb: n.post?.image_url ?? undefined,
      }))
    },
  })
}

/** Count of unread notifications (for the nav bell badge). */
export function useUnreadNotifications() {
  const { session } = useAuth()
  return useQuery({
    queryKey: NOTIFS_UNREAD,
    enabled: !!supabase && !!session,
    queryFn: async (): Promise<number> => {
      if (!supabase) return 0
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)
      if (error) throw error
      return count ?? 0
    },
  })
}

/** Mark all of my notifications read. */
export function useMarkNotificationsRead() {
  const qc = useQueryClient()
  const { session } = useAuth()
  return useMutation({
    mutationFn: async () => {
      if (!supabase || !session) return
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', session.user.id)
        .eq('read', false)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NOTIFS })
      void qc.invalidateQueries({ queryKey: NOTIFS_UNREAD })
    },
  })
}

/** App-wide: refresh notifications when a new one lands for me. Call once (AppShell). */
export function useNotificationsRealtime() {
  const qc = useQueryClient()
  const { session } = useAuth()
  const myId = session?.user.id
  useEffect(() => {
    if (!supabase || !myId) return
    const client = supabase
    const channel = client
      .channel('aurora-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${myId}` },
        () => {
          void qc.invalidateQueries({ queryKey: NOTIFS })
          void qc.invalidateQueries({ queryKey: NOTIFS_UNREAD })
        },
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [myId, qc])
}
