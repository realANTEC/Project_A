import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Brand } from './Brand'

describe('Brand', () => {
  it('renders the wordmark', () => {
    render(<Brand />)
    expect(screen.getByText('Aurora')).toBeInTheDocument()
  })
  it('hides the wordmark when compact', () => {
    render(<Brand compact />)
    expect(screen.queryByText('Aurora')).not.toBeInTheDocument()
  })
})
