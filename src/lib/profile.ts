import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from './auth'
import { authorToUser, type DbAuthor, type DbPostRow, POST_SELECT, rowToPost } from './posts'
import { notify } from './notifications'
import type { Post, User } from '@/data/feed'

/** A real, Postgres-backed profile (the @handle resolved to a row). */
export type DbProfile = {
  id: string
  user: User
  bio: string | null
  website: string | null
}

type ProfileSelectRow = {
  id: string
  username: string
  name: string
  avatar_url: string | null
  bio: string | null
  website: string | null
  verified: boolean
}

/** Look up a real profile by its @handle (username). null when not found / unconfigured. */
export function useProfileByHandle(handle: string | undefined) {
  return useQuery({
    queryKey: ['profile', handle],
    enabled: !!supabase && !!handle,
    queryFn: async (): Promise<DbProfile | null> => {
      if (!supabase || !handle) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, name, avatar_url, bio, website, verified')
        .eq('username', handle)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      const r = data as ProfileSelectRow
      return {
        id: r.id,
        user: authorToUser(
          { id: r.id, username: r.username, name: r.name, avatar_url: r.avatar_url, verified: r.verified },
          r.id,
        ),
        bio: r.bio,
        website: r.website,
      }
    },
  })
}

/** Search real profiles by name or @handle (excludes yourself). Empty when query is blank. */
export function useProfileSearch(query: string) {
  const { session } = useAuth()
  const myId = session?.user.id
  // Strip characters that would break PostgREST's or()/ilike filter syntax.
  const safe = query.trim().replace(/[%,()*\\]/g, ' ').trim()
  return useQuery({
    queryKey: ['profile-search', safe],
    enabled: !!supabase && safe.length >= 1,
    queryFn: async (): Promise<FollowUser[]> => {
      if (!supabase || !safe) return []
      const base = supabase
        .from('profiles')
        .select('id, username, name, avatar_url, verified')
        .or(`username.ilike.%${safe}%,name.ilike.%${safe}%`)
        .limit(6)
      const { data, error } = await (myId ? base.neq('id', myId) : base)
      if (error) throw error
      return (data ?? []).map((p) => ({ ...authorToUser(p as DbAuthor, p.id), id: p.id }))
    },
  })
}

/** A profile's own posts (newest first) as full Post objects (source: 'db'). */
export function useUserPosts(profileId: string | undefined) {
  return useQuery({
    queryKey: ['user-posts', profileId],
    enabled: !!supabase && !!profileId,
    queryFn: async (): Promise<Post[]> => {
      if (!supabase || !profileId) return []
      const { data, error } = await supabase
        .from('posts')
        .select(POST_SELECT)
        .eq('author_id', profileId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as unknown as DbPostRow[]).map(rowToPost)
    },
  })
}

export type FollowStats = { followers: number; following: number }

/** Follower + following counts for a profile (head-only count queries), kept live. */
export function useFollowStats(profileId: string | undefined) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['follow-stats', profileId],
    enabled: !!supabase && !!profileId,
    queryFn: async (): Promise<FollowStats> => {
      if (!supabase || !profileId) return { followers: 0, following: 0 }
      const [followers, following] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileId),
      ])
      if (followers.error) throw followers.error
      if (following.error) throw following.error
      return { followers: followers.count ?? 0, following: following.count ?? 0 }
    },
  })

  // Live counts: `follows` is in the realtime publication, so refresh when this profile
  // gains/loses a follower (following_id) or follows/unfollows someone (follower_id).
  useEffect(() => {
    if (!supabase || !profileId) return
    const client = supabase
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: ['follow-stats', profileId] })
      void qc.invalidateQueries({ queryKey: ['follow-list', profileId] })
    }
    const channel = client
      .channel(`follow-stats:${profileId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows', filter: `following_id=eq.${profileId}` },
        refresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows', filter: `follower_id=eq.${profileId}` },
        refresh,
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [profileId, qc])

  return query
}

export type FollowUser = User & { id: string }

/** The people who follow `profileId` ('followers') or whom they follow ('following'). */
export function useFollowList(
  profileId: string | undefined,
  kind: 'followers' | 'following',
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['follow-list', profileId, kind],
    enabled: enabled && !!supabase && !!profileId,
    queryFn: async (): Promise<FollowUser[]> => {
      if (!supabase || !profileId) return []
      // followers: rows where following_id = me → embed the FOLLOWER (follower_id).
      // following: rows where follower_id = me → embed the FOLLOWED user (following_id).
      const matchCol = kind === 'followers' ? 'following_id' : 'follower_id'
      const embedCol = kind === 'followers' ? 'follower_id' : 'following_id'
      const { data, error } = await supabase
        .from('follows')
        .select(`p:profiles!${embedCol}(id,username,name,avatar_url,verified)`)
        .eq(matchCol, profileId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return ((data ?? []) as unknown as { p: DbAuthor | null }[])
        .map((r) => r.p)
        .filter((p): p is DbAuthor => Boolean(p))
        .map((p) => ({ ...authorToUser(p, p.id), id: p.id }))
    },
  })
}

/** Whether the signed-in user follows `profileId` (disabled for your own profile). */
export function useIsFollowing(profileId: string | undefined) {
  const { session } = useAuth()
  const myId = session?.user.id
  return useQuery({
    queryKey: ['is-following', myId, profileId],
    enabled: !!supabase && !!myId && !!profileId && profileId !== myId,
    queryFn: async (): Promise<boolean> => {
      if (!supabase || !myId || !profileId) return false
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', myId)
        .eq('following_id', profileId)
        .maybeSingle()
      if (error) throw error
      return !!data
    },
  })
}

export type ProfileEdits = {
  name: string
  bio: string
  website: string
  /** A newly-picked avatar as a data: URL — uploaded to Storage on save. */
  avatarDataUrl?: string | null
}

/** Update your own profile (name / bio / website / avatar). Refreshes auth profile + page query. */
export function useUpdateProfile() {
  const qc = useQueryClient()
  const { session, profile, refreshProfile } = useAuth()
  return useMutation({
    mutationFn: async (edits: ProfileEdits) => {
      if (!supabase || !session) throw new Error('Not signed in')
      const update: { name: string; bio: string | null; website: string | null; avatar_url?: string } = {
        name: edits.name.trim() || 'New user',
        bio: edits.bio.trim() || null,
        // Store a bare domain; the UI prepends https:// when linking.
        website: edits.website.trim().replace(/^https?:\/\//i, '') || null,
      }
      // Upload a newly-picked avatar to the 'media' bucket and point avatar_url at it.
      if (edits.avatarDataUrl?.startsWith('data:')) {
        const blob = await (await fetch(edits.avatarDataUrl)).blob()
        const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
        const path = `${session.user.id}/avatar-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('media')
          .upload(path, blob, { contentType: blob.type, upsert: false })
        if (upErr) throw upErr
        update.avatar_url = supabase.storage.from('media').getPublicUrl(path).data.publicUrl
      }
      const { error } = await supabase.from('profiles').update(update).eq('id', session.user.id)
      if (error) throw error
    },
    onSuccess: async () => {
      await refreshProfile()
      if (profile?.username) void qc.invalidateQueries({ queryKey: ['profile', profile.username] })
    },
  })
}

/** The set of user ids the signed-in user currently follows. */
export function useMyFollowing() {
  const { session } = useAuth()
  const myId = session?.user.id
  return useQuery({
    queryKey: ['my-following', myId],
    enabled: !!supabase && !!myId,
    queryFn: async (): Promise<Set<string>> => {
      if (!supabase || !myId) return new Set()
      const { data, error } = await supabase.from('follows').select('following_id').eq('follower_id', myId)
      if (error) throw error
      return new Set((data ?? []).map((r) => r.following_id))
    },
  })
}

/** Suggested people to follow — recent real profiles (excludes you; filter already-followed in UI). */
export function useSuggestedProfiles(limit = 8) {
  const { session } = useAuth()
  const myId = session?.user.id
  return useQuery({
    queryKey: ['suggested-profiles', myId],
    enabled: !!supabase && !!session,
    queryFn: async (): Promise<FollowUser[]> => {
      if (!supabase || !myId) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, name, avatar_url, verified')
        .neq('id', myId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []).map((p) => ({ ...authorToUser(p as DbAuthor, p.id), id: p.id }))
    },
  })
}

/** Follow / unfollow a profile — optimistic on both the follow flag and follower count. */
export function useToggleFollow() {
  const qc = useQueryClient()
  const { session } = useAuth()
  const myId = session?.user.id
  return useMutation({
    mutationFn: async ({ profileId, following }: { profileId: string; following: boolean }) => {
      if (!supabase || !session) throw new Error('Not signed in')
      const res = following
        ? await supabase
            .from('follows')
            .delete()
            .eq('follower_id', session.user.id)
            .eq('following_id', profileId)
        : await supabase.from('follows').insert({ follower_id: session.user.id, following_id: profileId })
      if (res.error) throw res.error
      if (!following) void notify({ recipientId: profileId, type: 'follow' })
    },
    onMutate: async ({ profileId, following }) => {
      const followingKey = ['is-following', myId, profileId]
      const statsKey = ['follow-stats', profileId]
      await qc.cancelQueries({ queryKey: followingKey })
      await qc.cancelQueries({ queryKey: statsKey })
      const prevFollowing = qc.getQueryData<boolean>(followingKey)
      const prevStats = qc.getQueryData<FollowStats>(statsKey)
      qc.setQueryData<boolean>(followingKey, !following)
      qc.setQueryData<FollowStats>(statsKey, (s) =>
        s ? { ...s, followers: Math.max(0, s.followers + (following ? -1 : 1)) } : s,
      )
      return { prevFollowing, prevStats, followingKey, statsKey }
    },
    onError: (_e, _v, ctx) => {
      if (!ctx) return
      qc.setQueryData(ctx.followingKey, ctx.prevFollowing)
      qc.setQueryData(ctx.statsKey, ctx.prevStats)
    },
    onSettled: (_d, _e, { profileId }) => {
      void qc.invalidateQueries({ queryKey: ['is-following', myId, profileId] })
      void qc.invalidateQueries({ queryKey: ['follow-stats', profileId] })
      void qc.invalidateQueries({ queryKey: ['follow-list'] })
      void qc.invalidateQueries({ queryKey: ['my-following', myId] })
    },
  })
}
