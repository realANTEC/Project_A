import { describe, expect, it } from 'vitest'
import { buildIceServers } from './calls'

describe('buildIceServers', () => {
  it('always includes a public STUN server', () => {
    const servers = buildIceServers()
    expect(servers).toHaveLength(1)
    expect(String(servers[0].urls)).toContain('stun:')
  })

  it('adds a TURN relay with credentials when configured', () => {
    const servers = buildIceServers({ turnUrl: 'turn:turn.example.com', turnUser: 'u', turnCred: 'p' })
    expect(servers).toHaveLength(2)
    expect(servers[1]).toEqual({ urls: 'turn:turn.example.com', username: 'u', credential: 'p' })
  })

  it('omits TURN when no url is provided', () => {
    expect(buildIceServers({ turnUser: 'u', turnCred: 'p' })).toHaveLength(1)
  })
})
