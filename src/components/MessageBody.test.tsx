import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MessageBody } from './MessageBody'

const mockPost = {
  id: 'p1',
  author: { name: 'Mara', handle: 'maralin', avatarId: 0 },
  image: 'http://img/x.jpg',
  tint: ['#000', '#111'],
  caption: 'a lovely shot',
}

vi.mock('@/lib/posts', () => ({
  usePostById: (id: string) => ({ data: id === 'p1' ? mockPost : null, isLoading: false }),
}))
vi.mock('@/lib/post-modal', () => ({ usePostModal: () => ({ openPost: vi.fn() }) }))

function renderBody(text: string, fromMe = false) {
  return render(
    <MemoryRouter>
      <MessageBody text={text} fromMe={fromMe} />
    </MemoryRouter>,
  )
}

describe('MessageBody', () => {
  it('renders an external URL as a new-tab link', () => {
    renderBody('check https://example.com/page out')
    const link = screen.getByRole('link', { name: 'https://example.com/page' })
    expect(link).toHaveAttribute('href', 'https://example.com/page')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('replaces a shared Soul post link with a preview card', () => {
    const url = `${window.location.origin}/p/p1`
    renderBody(`maralin on Soul ${url}`)
    // the image-forward post card renders as a tappable card showing the author handle…
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByText('@maralin')).toBeInTheDocument()
    // …and the bare post URL is gone from the inline text.
    expect(screen.queryByText(url)).toBeNull()
  })
})
