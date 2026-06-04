import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import type { User } from '@/data/feed'
import { CallProvider, useCall, type CallCtx } from './calls'

// CallProvider is tightly coupled to auth / toast / supabase / WebRTC / media — none of
// which exist in happy-dom — so we stub the whole stack to exercise the ring-timeout and
// disconnect-grace TIMER logic (the part that can't be reached in the single-browser preview).

vi.mock('./auth', () => ({
  useAuth: () => ({
    session: { user: { id: 'me' } },
    profile: { name: 'Me', username: 'me', verified: false },
  }),
}))

const toast = vi.fn()
vi.mock('./toast', () => ({ useToast: () => ({ toast }) }))

const channelStub = {
  on() {
    return channelStub
  },
  subscribe(cb?: (s: string) => void) {
    cb?.('SUBSCRIBED')
    return channelStub
  },
  send: vi.fn(() => Promise.resolve()),
}
vi.mock('./supabase', () => ({
  supabase: { channel: vi.fn(() => channelStub), removeChannel: vi.fn() },
  isSupabaseConfigured: true,
}))

// A capturable fake RTCPeerConnection so a test can drive connectionState transitions.
const peers: FakePC[] = []
class FakePC {
  connectionState = 'new'
  onicecandidate: ((e: unknown) => void) | null = null
  ontrack: ((e: unknown) => void) | null = null
  onconnectionstatechange: (() => void) | null = null
  constructor() {
    peers.push(this)
  }
  addTrack() {}
  async createOffer() {
    return { type: 'offer', sdp: 's' }
  }
  async createAnswer() {
    return { type: 'answer', sdp: 's' }
  }
  async setLocalDescription() {}
  async setRemoteDescription() {}
  async addIceCandidate() {}
  getSenders() {
    return []
  }
  close() {
    this.connectionState = 'closed'
  }
  /** Simulate an ICE connection-state change (what onconnectionstatechange reacts to). */
  emitState(s: string) {
    this.connectionState = s
    this.onconnectionstatechange?.()
  }
}

const track = { stop: vi.fn(), enabled: true }
const stream = {
  getTracks: () => [track],
  getAudioTracks: () => [track],
  getVideoTracks: () => [track],
}

const PEER: User = { name: 'Peer', handle: 'peer', avatarId: 0 }
let api: CallCtx | null = null
function Capture() {
  const c = useCall()
  // Capture in an effect (not during render) so we can drive the provider from the test.
  useEffect(() => {
    api = c
  })
  return null
}

beforeEach(() => {
  vi.useFakeTimers()
  peers.length = 0
  toast.mockClear()
  const g = globalThis as Record<string, unknown>
  g.RTCPeerConnection = FakePC
  g.RTCSessionDescription = class {
    constructor(public d: unknown) {}
  }
  g.RTCIceCandidate = class {
    constructor(public c: unknown) {}
  }
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    configurable: true,
  })
})

afterEach(() => {
  vi.useRealTimers()
})

// Flush the async getMedia → createPeer → createOffer chain (microtasks) under fake timers.
async function settle() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('CallProvider — call lifecycle timers', () => {
  it('ends an unanswered outgoing call after the ring timeout, with a “No answer” toast', async () => {
    render(
      <CallProvider>
        <Capture />
      </CallProvider>,
    )
    await act(async () => {
      api!.startCall('peer', PEER, 'audio')
    })
    await settle()
    expect(api!.status).toBe('outgoing')

    await act(async () => {
      vi.advanceTimersByTime(35_000)
    })
    expect(toast).toHaveBeenCalledWith('No answer')
    expect(api!.status).toBe('idle')
  })

  it('drops a call that stays disconnected past the grace window', async () => {
    render(
      <CallProvider>
        <Capture />
      </CallProvider>,
    )
    await act(async () => {
      api!.startCall('peer', PEER, 'video')
    })
    await settle()
    expect(peers).toHaveLength(1)

    await act(async () => {
      peers[0].emitState('disconnected')
    })
    // Grace window: a transient disconnect must NOT tear the call down immediately
    // (the pre-fix behavior ended it the instant the state hit 'disconnected').
    expect(api!.status).not.toBe('idle')
    await act(async () => {
      vi.advanceTimersByTime(8_000)
    })
    expect(api!.status).toBe('idle')
  })

  it('keeps a call that recovers (disconnected → connected) within the grace window', async () => {
    render(
      <CallProvider>
        <Capture />
      </CallProvider>,
    )
    await act(async () => {
      api!.startCall('peer', PEER, 'video')
    })
    await settle()

    await act(async () => {
      peers[0].emitState('disconnected')
    })
    await act(async () => {
      peers[0].emitState('connected') // recovers — should cancel the pending teardown
    })
    await act(async () => {
      vi.advanceTimersByTime(8_000)
    })
    expect(api!.status).not.toBe('idle')
  })
})
