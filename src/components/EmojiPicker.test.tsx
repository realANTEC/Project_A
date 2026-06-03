import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmojiPicker } from './EmojiPicker'

describe('EmojiPicker', () => {
  it('renders a grid of emoji buttons', () => {
    render(<EmojiPicker onPick={() => {}} />)
    expect(screen.getByRole('menu', { name: 'Emoji picker' })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(48)
  })

  it('reports the clicked emoji via onPick', async () => {
    const onPick = vi.fn()
    render(<EmojiPicker onPick={onPick} />)
    await userEvent.click(screen.getAllByRole('button')[0])
    expect(onPick).toHaveBeenCalledTimes(1)
    expect(onPick.mock.calls[0][0]).toBeTruthy()
  })
})
