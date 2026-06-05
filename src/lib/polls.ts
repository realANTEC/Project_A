import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from './auth'

export type PollData = {
  id: string
  question: string
  options: string[]
  allowMultiple: boolean
  createdBy: string
  /** Vote count per option index. */
  tallies: number[]
  /** Option indices the signed-in user has voted for. */
  myVotes: Set<number>
  /** Total vote rows (selections). */
  totalVotes: number
}

type PollRow = { id: string; question: string; options: string[]; allow_multiple: boolean; created_by: string }
type VoteRow = { user_id: string; option_index: number }

/** A poll + its live vote tallies (realtime on poll_votes, scoped to this poll). */
export function usePoll(pollId: string) {
  const qc = useQueryClient()
  const { session } = useAuth()
  const myId = session?.user.id
  const query = useQuery({
    queryKey: ['poll', pollId],
    enabled: !!supabase && !!pollId,
    queryFn: async (): Promise<PollData> => {
      if (!supabase) throw new Error('Not configured')
      const pollRes = await supabase
        .from('polls')
        .select('id, question, options, allow_multiple, created_by')
        .eq('id', pollId)
        .single()
      if (pollRes.error) throw pollRes.error
      const votesRes = await supabase.from('poll_votes').select('user_id, option_index').eq('poll_id', pollId)
      if (votesRes.error) throw votesRes.error
      const p = pollRes.data as PollRow
      const votes = (votesRes.data ?? []) as VoteRow[]
      const tallies = p.options.map((_, i) => votes.filter((v) => v.option_index === i).length)
      const myVotes = new Set(votes.filter((v) => v.user_id === myId).map((v) => v.option_index))
      return {
        id: p.id,
        question: p.question,
        options: p.options,
        allowMultiple: p.allow_multiple,
        createdBy: p.created_by,
        tallies,
        myVotes,
        totalVotes: votes.length,
      }
    },
  })

  useEffect(() => {
    if (!supabase || !pollId) return
    const client = supabase
    const channel = client
      .channel(`poll-votes:${pollId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_votes', filter: `poll_id=eq.${pollId}` },
        () => void qc.invalidateQueries({ queryKey: ['poll', pollId] }),
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [pollId, qc])

  return query
}

/** Create a poll row; returns its id (the caller then sends the poll as a message). */
export function useCreatePoll() {
  const { session } = useAuth()
  return useMutation({
    mutationFn: async ({
      conversationId,
      question,
      options,
      allowMultiple,
    }: {
      conversationId: string
      question: string
      options: string[]
      allowMultiple: boolean
    }): Promise<string> => {
      if (!supabase || !session) throw new Error('Not signed in')
      const id = crypto.randomUUID()
      const { error } = await supabase.from('polls').insert({
        id,
        conversation_id: conversationId,
        created_by: session.user.id,
        question,
        options,
        allow_multiple: allowMultiple,
      })
      if (error) throw error
      return id
    },
  })
}

/** Cast / change / remove my vote — single-choice replaces, multi toggles. Optimistic. */
export function useVote(pollId: string) {
  const qc = useQueryClient()
  const { session } = useAuth()
  const key = ['poll', pollId]
  return useMutation({
    mutationFn: async ({ optionIndex, allowMultiple }: { optionIndex: number; allowMultiple: boolean }) => {
      if (!supabase || !session) throw new Error('Not signed in')
      const myId = session.user.id
      // onMutate already flipped the cache to the desired end state: if my vote now includes
      // this option I just added it (ensure it in the DB), otherwise I just removed it.
      const nowHas = qc.getQueryData<PollData>(key)?.myVotes.has(optionIndex)
      if (nowHas) {
        if (!allowMultiple) {
          const del = await supabase
            .from('poll_votes')
            .delete()
            .eq('poll_id', pollId)
            .eq('user_id', myId)
            .neq('option_index', optionIndex)
          if (del.error) throw del.error
        }
        const { error } = await supabase
          .from('poll_votes')
          .upsert({ poll_id: pollId, user_id: myId, option_index: optionIndex }, { onConflict: 'poll_id,user_id,option_index' })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('poll_votes')
          .delete()
          .eq('poll_id', pollId)
          .eq('user_id', myId)
          .eq('option_index', optionIndex)
        if (error) throw error
      }
    },
    onMutate: async ({ optionIndex, allowMultiple }) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<PollData>(key)
      qc.setQueryData<PollData>(key, (p) => {
        if (!p) return p
        const myVotes = new Set(p.myVotes)
        const tallies = [...p.tallies]
        if (myVotes.has(optionIndex)) {
          myVotes.delete(optionIndex)
          tallies[optionIndex] = Math.max(0, tallies[optionIndex] - 1)
        } else {
          if (!allowMultiple) {
            for (const j of myVotes) tallies[j] = Math.max(0, tallies[j] - 1)
            myVotes.clear()
          }
          myVotes.add(optionIndex)
          tallies[optionIndex] += 1
        }
        return { ...p, myVotes, tallies, totalVotes: tallies.reduce((a, b) => a + b, 0) }
      })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  })
}
