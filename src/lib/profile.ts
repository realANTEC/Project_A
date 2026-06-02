import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from './auth'
import { authorToUser, type DbPostRow, POST_SELECT, rowToPost } from './posts'
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

/** Follower + following counts for a profile (head-only count queries). */
export function useFollowStats(profileId: string | undefined) {
  return useQuery({
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
    },
  })
}
