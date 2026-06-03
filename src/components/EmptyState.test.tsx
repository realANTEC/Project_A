import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(
      <MemoryRouter>
        <EmptyState icon={Bell} title="No notifications yet" description="They will show up here." />
      </MemoryRouter>,
    )
    expect(screen.getByText('No notifications yet')).toBeInTheDocument()
    expect(screen.getByText('They will show up here.')).toBeInTheDocument()
  })

  it('renders a link CTA when given `to`', () => {
    render(
      <MemoryRouter>
        <EmptyState icon={Bell} title="Empty" action={{ label: 'Explore', to: '/explore' }} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute('href', '/explore')
  })

  it('renders a button CTA that fires onClick', async () => {
    const onClick = vi.fn()
    render(
      <MemoryRouter>
        <EmptyState icon={Bell} title="Empty" action={{ label: 'Create', onClick }} />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
