import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from './auth'

export type RsvpStatus = 'going' | 'maybe' | 'no'
export type EventData = {
  id: string
  title: string
  description: string | null
  location: string | null
  startsAt: string
  createdBy: string
  myRsvp: RsvpStatus | null
  counts: Record<RsvpStatus, number>
}

type EventRow = {
  id: string
  title: string
  description: string | null
  location: string | null
  starts_at: string
  created_by: string
}
type RsvpRow = { user_id: string; status: RsvpStatus }

/** An event + its RSVP counts + my RSVP (realtime on event_rsvps, scoped to this event). */
export function useEvent(eventId: string) {
  const qc = useQueryClient()
  const { session } = useAuth()
  const myId = session?.user.id
  const query = useQuery({
    queryKey: ['event', eventId],
    enabled: !!supabase && !!eventId,
    queryFn: async (): Promise<EventData> => {
      if (!supabase) throw new Error('Not configured')
      const evRes = await supabase
        .from('events')
        .select('id, title, description, location, starts_at, created_by')
        .eq('id', eventId)
        .single()
      if (evRes.error) throw evRes.error
      const rsvpRes = await supabase.from('event_rsvps').select('user_id, status').eq('event_id', eventId)
      if (rsvpRes.error) throw rsvpRes.error
      const e = evRes.data as EventRow
      const rsvps = (rsvpRes.data ?? []) as RsvpRow[]
      const counts: Record<RsvpStatus, number> = { going: 0, maybe: 0, no: 0 }
      for (const r of rsvps) counts[r.status] = (counts[r.status] ?? 0) + 1
      const myRsvp = rsvps.find((r) => r.user_id === myId)?.status ?? null
      return {
        id: e.id,
        title: e.title,
        description: e.description,
        location: e.location,
        startsAt: e.starts_at,
        createdBy: e.created_by,
        myRsvp,
        counts,
      }
    },
  })

  useEffect(() => {
    if (!supabase || !eventId) return
    const client = supabase
    const channel = client
      .channel(`event-rsvps:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_rsvps', filter: `event_id=eq.${eventId}` },
        () => void qc.invalidateQueries({ queryKey: ['event', eventId] }),
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [eventId, qc])

  return query
}

/** Create an event row; returns its id (the caller then sends the event as a message). */
export function useCreateEvent() {
  const { session } = useAuth()
  return useMutation({
    mutationFn: async ({
      conversationId,
      title,
      description,
      location,
      startsAt,
    }: {
      conversationId: string
      title: string
      description?: string
      location?: string
      startsAt: string
    }): Promise<string> => {
      if (!supabase || !session) throw new Error('Not signed in')
      const id = crypto.randomUUID()
      const { error } = await supabase.from('events').insert({
        id,
        conversation_id: conversationId,
        created_by: session.user.id,
        title,
        description: description || null,
        location: location || null,
        starts_at: startsAt,
      })
      if (error) throw error
      return id
    },
  })
}

/** Set / change / clear my RSVP (tapping the current one clears it). Optimistic. */
export function useRsvp(eventId: string) {
  const qc = useQueryClient()
  const { session } = useAuth()
  const key = ['event', eventId]
  return useMutation({
    mutationFn: async (_status: RsvpStatus) => {
      if (!supabase || !session) throw new Error('Not signed in')
      const myId = session.user.id
      // onMutate set the desired end state: if my RSVP is now null I cleared it, else upsert it.
      const myRsvp = qc.getQueryData<EventData>(key)?.myRsvp
      if (myRsvp == null) {
        const { error } = await supabase.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', myId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('event_rsvps')
          .upsert({ event_id: eventId, user_id: myId, status: myRsvp }, { onConflict: 'event_id,user_id' })
        if (error) throw error
      }
    },
    onMutate: async (status) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<EventData>(key)
      qc.setQueryData<EventData>(key, (e) => {
        if (!e) return e
        const counts = { ...e.counts }
        if (e.myRsvp) counts[e.myRsvp] = Math.max(0, counts[e.myRsvp] - 1)
        const newRsvp = e.myRsvp === status ? null : status
        if (newRsvp) counts[newRsvp] += 1
        return { ...e, myRsvp: newRsvp, counts }
      })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  })
}
