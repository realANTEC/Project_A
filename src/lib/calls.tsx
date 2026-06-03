/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { type RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { useAuth } from './auth'
import { useToast } from './toast'
import { CallOverlay } from '@/components/CallOverlay'
import type { User } from '@/data/feed'

export type CallType = 'audio' | 'video'
export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connected'

export type ActiveCall = {
  callId: string
  peerId: string
  peerUser: User
  type: CallType
  isCaller: boolean
}

type TurnEnv = { turnUrl?: string; turnUser?: string; turnCred?: string }

/**
 * RTCConfiguration ICE servers: a public STUN server always, plus a TURN relay when
 * configured (VITE_TURN_URL/USERNAME/CREDENTIAL). TURN is required for calls between
 * users on restrictive/asymmetric NATs; with STUN only, connections succeed on
 * permissive or same networks but can fail otherwise.
 */
export function buildIceServers(env: TurnEnv = {}): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]
  if (env.turnUrl) servers.push({ urls: env.turnUrl, username: env.turnUser, credential: env.turnCred })
  return servers
}

function envIceServers(): RTCIceServer[] {
  return buildIceServers({
    turnUrl: import.meta.env.VITE_TURN_URL as string | undefined,
    turnUser: import.meta.env.VITE_TURN_USERNAME as string | undefined,
    turnCred: import.meta.env.VITE_TURN_CREDENTIAL as string | undefined,
  })
}

type Signal = {
  callId: string
  from: string
  fromUser?: User
  callType?: CallType
  kind: 'offer' | 'answer' | 'ice' | 'decline' | 'cancel' | 'hangup'
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

/** One-off broadcast to a peer's signaling channel (used outside the active-call channel). */
function signalOnce(peerId: string, payload: Signal) {
  if (!supabase) return
  const client = supabase
  const ch = client.channel(`calls:${peerId}`, { config: { broadcast: { self: false } } })
  ch.subscribe((s) => {
    if (s === 'SUBSCRIBED') {
      void ch.send({ type: 'broadcast', event: 'signal', payload })
      void client.removeChannel(ch)
    }
  })
}

export type CallCtx = {
  status: CallStatus
  call: ActiveCall | null
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  muted: boolean
  cameraOff: boolean
  startCall: (peerId: string, peerUser: User, type: CallType) => void
  acceptCall: () => void
  declineCall: () => void
  hangup: () => void
  toggleMute: () => void
  toggleCamera: () => void
}

const Ctx = createContext<CallCtx | null>(null)

export function useCall(): CallCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCall must be used within <CallProvider>')
  return ctx
}

/**
 * Real 1:1 WebRTC audio/video calling. Signaling rides Supabase Realtime broadcast:
 * each user listens on `calls:<theirId>` and sends to `calls:<peerId>`. Mounted once
 * (AppShell) so an incoming call rings on any route. The peer connection + media need
 * granted camera/mic, and a TURN server for cross-network reliability.
 */
export function CallProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth()
  const { toast } = useToast()
  const myId = session?.user.id ?? null

  const [status, setStatus] = useState<CallStatus>('idle')
  const [call, setCall] = useState<ActiveCall | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const sendChannelRef = useRef<RealtimeChannel | null>(null)
  const sendReadyRef = useRef(false)
  const sendQueueRef = useRef<Signal[]>([])
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([])
  const offerRef = useRef<RTCSessionDescriptionInit | null>(null)
  const callRef = useRef<ActiveCall | null>(null)
  const statusRef = useRef<CallStatus>(status)
  useEffect(() => {
    callRef.current = call
  }, [call])
  useEffect(() => {
    statusRef.current = status
  }, [status])

  // Cached channel to the current peer, with a queue so signals sent before the
  // channel finishes subscribing aren't dropped (ICE candidates fire early).
  const openSendChannel = useCallback((peerId: string) => {
    if (!supabase) return
    const ch = supabase.channel(`calls:${peerId}`, { config: { broadcast: { self: false } } })
    sendChannelRef.current = ch
    sendReadyRef.current = false
    ch.subscribe((s) => {
      if (s === 'SUBSCRIBED') {
        sendReadyRef.current = true
        for (const sig of sendQueueRef.current.splice(0))
          void ch.send({ type: 'broadcast', event: 'signal', payload: sig })
      }
    })
  }, [])

  const send = useCallback(
    (sig: Omit<Signal, 'from'>) => {
      if (!myId) return
      const full: Signal = { ...sig, from: myId }
      if (sendChannelRef.current && sendReadyRef.current) {
        void sendChannelRef.current.send({ type: 'broadcast', event: 'signal', payload: full })
      } else {
        sendQueueRef.current.push(full)
      }
    },
    [myId],
  )

  const teardown = useCallback(() => {
    pcRef.current?.getSenders().forEach((s) => s.track?.stop())
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    if (sendChannelRef.current && supabase) void supabase.removeChannel(sendChannelRef.current)
    sendChannelRef.current = null
    sendReadyRef.current = false
    sendQueueRef.current = []
    pendingIceRef.current = []
    offerRef.current = null
    setLocalStream(null)
    setRemoteStream(null)
    setMuted(false)
    setCameraOff(false)
    setCall(null)
    setStatus('idle')
  }, [])

  const flushIce = useCallback(() => {
    const pc = pcRef.current
    if (!pc?.remoteDescription) return
    for (const c of pendingIceRef.current.splice(0)) void pc.addIceCandidate(new RTCIceCandidate(c))
  }, [])

  const createPeer = useCallback(
    (type: CallType) => {
      const pc = new RTCPeerConnection({ iceServers: envIceServers() })
      pc.onicecandidate = (e) => {
        const c = callRef.current
        if (e.candidate && c) send({ kind: 'ice', callId: c.callId, candidate: e.candidate.toJSON() })
      }
      pc.ontrack = (e) => setRemoteStream(e.streams[0] ?? null)
      pc.onconnectionstatechange = () => {
        if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) teardown()
      }
      pcRef.current = pc
      void type
      return pc
    },
    [send, teardown],
  )

  const getMedia = useCallback(async (type: CallType) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
    localStreamRef.current = stream
    setLocalStream(stream)
    return stream
  }, [])

  const selfUser = useCallback(
    (): User => ({
      name: profile?.name ?? 'You',
      handle: profile?.username ?? 'you',
      avatarId: 0,
      verified: profile?.verified ?? false,
      avatarUrl:
        profile?.avatar_url ??
        `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(myId ?? 'you')}`,
    }),
    [profile, myId],
  )

  const startCall = useCallback(
    (peerId: string, peerUser: User, type: CallType) => {
      if (!myId || callRef.current) return
      const callId = crypto.randomUUID()
      setCall({ callId, peerId, peerUser, type, isCaller: true })
      setStatus('outgoing')
      openSendChannel(peerId)
      ;(async () => {
        try {
          const stream = await getMedia(type)
          const pc = createPeer(type)
          stream.getTracks().forEach((t) => pc.addTrack(t, stream))
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          send({ kind: 'offer', callId, callType: type, fromUser: selfUser(), sdp: offer })
        } catch {
          toast('Could not access your camera or microphone.')
          teardown()
        }
      })()
    },
    [myId, openSendChannel, getMedia, createPeer, send, selfUser, teardown, toast],
  )

  const acceptCall = useCallback(() => {
    const active = callRef.current
    const offer = offerRef.current
    if (!active || !offer) return
    setStatus('connected')
    ;(async () => {
      try {
        const stream = await getMedia(active.type)
        const pc = createPeer(active.type)
        stream.getTracks().forEach((t) => pc.addTrack(t, stream))
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        flushIce()
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        send({ kind: 'answer', callId: active.callId, sdp: answer })
      } catch {
        toast('Could not access your camera or microphone.')
        send({ kind: 'hangup', callId: active.callId })
        teardown()
      }
    })()
  }, [getMedia, createPeer, flushIce, send, teardown, toast])

  const declineCall = useCallback(() => {
    const active = callRef.current
    if (active) send({ kind: 'decline', callId: active.callId })
    teardown()
  }, [send, teardown])

  const hangup = useCallback(() => {
    const active = callRef.current
    if (active) {
      const kind = active.isCaller && statusRef.current === 'outgoing' ? 'cancel' : 'hangup'
      send({ kind, callId: active.callId })
    }
    teardown()
  }, [send, teardown])

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    setMuted((m) => {
      stream.getAudioTracks().forEach((t) => (t.enabled = m))
      return !m
    })
  }, [])

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    setCameraOff((c) => {
      stream.getVideoTracks().forEach((t) => (t.enabled = c))
      return !c
    })
  }, [])

  // Inbound signaling on my own channel, app-wide (so a call rings on any route).
  useEffect(() => {
    if (!supabase || !myId) return
    const client = supabase
    const channel = client
      .channel(`calls:${myId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        const sig = payload as Signal
        const active = callRef.current
        if (sig.kind === 'offer') {
          if (active) {
            signalOnce(sig.from, { kind: 'decline', callId: sig.callId, from: myId })
            return
          }
          offerRef.current = sig.sdp ?? null
          openSendChannel(sig.from)
          setCall({
            callId: sig.callId,
            peerId: sig.from,
            peerUser: sig.fromUser ?? { name: 'Someone', handle: 'someone', avatarId: 0 },
            type: sig.callType ?? 'video',
            isCaller: false,
          })
          setStatus('incoming')
          return
        }
        if (!active || sig.callId !== active.callId) return
        if (sig.kind === 'answer' && sig.sdp) {
          const sdp = sig.sdp
          void (async () => {
            await pcRef.current?.setRemoteDescription(new RTCSessionDescription(sdp))
            flushIce()
            setStatus('connected')
          })()
        } else if (sig.kind === 'ice' && sig.candidate) {
          if (pcRef.current?.remoteDescription)
            void pcRef.current.addIceCandidate(new RTCIceCandidate(sig.candidate))
          else pendingIceRef.current.push(sig.candidate)
        } else if (sig.kind === 'decline' || sig.kind === 'cancel' || sig.kind === 'hangup') {
          teardown()
        }
      })
      .subscribe()
    return () => {
      void client.removeChannel(channel)
      teardown() // end any active call when the session ends or the provider unmounts
    }
  }, [myId, openSendChannel, flushIce, teardown])

  const value: CallCtx = {
    status,
    call,
    localStream,
    remoteStream,
    muted,
    cameraOff,
    startCall,
    acceptCall,
    declineCall,
    hangup,
    toggleMute,
    toggleCamera,
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      <CallOverlay />
    </Ctx.Provider>
  )
}
