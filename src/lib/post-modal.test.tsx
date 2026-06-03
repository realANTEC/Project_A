import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { PostModalProvider, usePostModal } from './post-modal'
import { posts } from '@/data/feed'

// The lightbox view (PostDetailModal) pulls in the Feed/Auth/Query/Toast providers.
// These tests only exercise the modal-as-route logic in PostModalProvider, so the
// view is stubbed out. happy-dom has no View Transitions API, so openPost naturally
// takes the non-VT path (navigate + setActivePost) — exactly the routing under test.
vi.mock('@/components/PostDetailModal', () => ({ PostDetailModal: () => null }))

const seed = posts[0] // curated post, id 'p1'

/** Surfaces the routing-relevant state and a few navigation triggers. */
function Harness() {
  const { activePost, openPost, closePost } = usePostModal()
  const location = useLocation()
  const navigate = useNavigate()
  const hasBackground = !!(location.state as { background?: unknown } | null)?.background
  return (
    <div>
      <span data-testid="path">{location.pathname}</span>
      <span data-testid="active">{activePost?.id ?? 'none'}</span>
      <span data-testid="bg">{hasBackground ? 'bg' : 'no-bg'}</span>
      <button onClick={() => openPost(seed)}>open</button>
      <button onClick={() => closePost()}>close</button>
      <button onClick={() => navigate('/u/maralin')}>goprofile</button>
      <button onClick={() => navigate(-1)}>back</button>
      <button onClick={() => navigate(1)}>forward</button>
    </div>
  )
}

function setup(initialPath = '/') {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <PostModalProvider>
        <Harness />
      </PostModalProvider>
    </MemoryRouter>,
  )
  return {
    path: () => screen.getByTestId('path').textContent,
    active: () => screen.getByTestId('active').textContent,
    bg: () => screen.getByTestId('bg').textContent,
    click: (name: string) => userEvent.click(screen.getByRole('button', { name })),
  }
}

describe('PostModalProvider (modal-as-route)', () => {
  it('opening a post pushes /p/:id and stashes the feed as background', async () => {
    const app = setup()
    expect(app.path()).toBe('/')
    expect(app.active()).toBe('none')

    await app.click('open')

    expect(app.path()).toBe('/p/p1')
    expect(app.active()).toBe('p1')
    expect(app.bg()).toBe('bg')
  })

  it('closePost reverses the push (back to the feed) and clears the lightbox', async () => {
    const app = setup()
    await app.click('open')
    expect(app.path()).toBe('/p/p1')

    await app.click('close')

    expect(app.path()).toBe('/')
    expect(app.active()).toBe('none')
  })

  it('navigating away from the post (e.g. to a profile) closes the lightbox', async () => {
    const app = setup()
    await app.click('open')
    expect(app.active()).toBe('p1')

    await app.click('goprofile')

    expect(app.path()).toBe('/u/maralin')
    expect(app.active()).toBe('none')
  })

  it('Back closes the lightbox and Forward re-opens it from the in-session cache', async () => {
    const app = setup()
    await app.click('open')
    expect(app.active()).toBe('p1')

    await app.click('back')
    expect(app.path()).toBe('/')
    expect(app.active()).toBe('none')

    await app.click('forward')
    expect(app.path()).toBe('/p/p1')
    expect(app.active()).toBe('p1')
  })

  it('a fresh /p/:id with no background does not open the lightbox', async () => {
    // Deep-link / reload entry: no `background` in history state, so the provider
    // shows nothing here — App renders the full-page PostDetailPage instead.
    const app = setup('/p/p1')
    expect(app.path()).toBe('/p/p1')
    expect(app.active()).toBe('none')
  })
})
