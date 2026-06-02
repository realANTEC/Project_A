import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeedTabs } from './FeedTabs'

describe('FeedTabs', () => {
  it('defaults to "For you" and switches selection on click', async () => {
    render(<FeedTabs />)
    const forYou = screen.getByRole('tab', { name: 'For you' })
    const following = screen.getByRole('tab', { name: 'Following' })

    expect(forYou).toHaveAttribute('aria-selected', 'true')
    expect(following).toHaveAttribute('aria-selected', 'false')

    await userEvent.click(following)

    expect(following).toHaveAttribute('aria-selected', 'true')
    expect(forYou).toHaveAttribute('aria-selected', 'false')
  })
})
