import { describe, expect, it } from 'vitest'
import { displayLikes } from './feed-store'
import type { Post } from '@/data/feed'

const post = (likes: number, likedByYou: boolean) => ({ likes, likedByYou }) as unknown as Post

describe('displayLikes', () => {
  it('adds the viewer when liking a post they had not liked', () => {
    expect(displayLikes(post(100, false), true)).toBe(101)
  })
  it('keeps the count when the like matches the initial state', () => {
    expect(displayLikes(post(100, true), true)).toBe(100)
  })
  it('subtracts when un-liking a post that was initially liked', () => {
    expect(displayLikes(post(100, true), false)).toBe(99)
  })
  it('leaves an un-liked post unchanged', () => {
    expect(displayLikes(post(100, false), false)).toBe(100)
  })
})
