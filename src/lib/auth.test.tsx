import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './auth'
import { supabase } from './supabase'

// A configured-but-fake Supabase client so AuthProvider runs its initial session check.
vi.mock('./supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}))

const getSession = supabase!.auth.getSession as ReturnType<typeof vi.fn>

function Probe() {
  const { ready } = useAuth()
  return <span data-testid="status">{ready ? 'ready' : 'loading'}</span>
}

describe('AuthProvider readiness', () => {
  it('becomes ready when the initial session check resolves', async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
  })

  it('becomes ready even if the initial session check rejects (no splash hang)', async () => {
    // Without the .catch/.finally guard, a rejected getSession leaves `ready` false forever.
    getSession.mockRejectedValueOnce(new Error('network down'))
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
  })
})
