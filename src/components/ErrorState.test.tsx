import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorState, RetryBanner } from './ErrorState'

describe('ErrorState', () => {
  it('renders the title and description', () => {
    render(<ErrorState title="Couldn’t load" description="Check your connection." />)
    expect(screen.getByText('Couldn’t load')).toBeInTheDocument()
    expect(screen.getByText('Check your connection.')).toBeInTheDocument()
  })

  it('fires onRetry when the retry button is clicked', async () => {
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('omits the retry button when no onRetry is given', () => {
    render(<ErrorState />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('RetryBanner', () => {
  it('shows the message and fires onRetry', async () => {
    const onRetry = vi.fn()
    render(<RetryBanner message="Couldn’t load the latest posts." onRetry={onRetry} />)
    expect(screen.getByText('Couldn’t load the latest posts.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
