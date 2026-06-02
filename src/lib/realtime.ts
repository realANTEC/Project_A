import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from './auth'
import type { Post } from '@/data/feed'

/**
 * Subscribes to Supabase Realtime so other users' posts/likes/comments update
 * the feed live. Our own changes are skipped — optimistic mutations already
 * applied them (and would otherwise double-count).
 */
export function useFeedRealtime() {
  const qc = useQueryClient()
  const { session } = useAuth()

  useEffect(() => {
    if (!supabase || !session) return
    const client = supabase
    const myId = session.user.id

    const patch = (postId: string, fn: (p: Post) => Post) => {
      const apply = (arr?: Post[]) => arr?.map((p) => (p.id === postId ? fn(p) : p))
      qc.setQueryData<Post[]>(['feed'], (old) => apply(old) ?? old)
      qc.setQueryData<Post[]>(['saved-posts'], (old) => apply(old) ?? old)
    }

    const channel = client
      .channel('aurora-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const row = payload.new as { author_id?: string }
        if (row?.author_id === myId) return
        void qc.invalidateQueries({ queryKey: ['feed'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, (payload) => {
        const row = (payload.new ?? payload.old) as { user_id?: string; post_id?: string } | null
        if (!row?.post_id || row.user_id === myId) return
        const delta = payload.eventType === 'INSERT' ? 1 : -1
        patch(row.post_id, (p) => ({ ...p, likes: Math.max(0, p.likes + delta) }))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (payload) => {
        const row = payload.new as { author_id?: string; post_id?: string }
        if (!row?.post_id || row.author_id === myId) return
        patch(row.post_id, (p) => ({ ...p, commentsCount: p.commentsCount + 1 }))
        void qc.invalidateQueries({ queryKey: ['comments', row.post_id] })
      })
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [qc, session])
}
