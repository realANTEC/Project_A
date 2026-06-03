import { describe, expect, it } from 'vitest'
import { posts, stories } from '@/data/feed'
import { buildStoryReels, flattenReels, type StoryReel } from './stories'

describe('buildStoryReels', () => {
  const reels = buildStoryReels(stories, posts)

  it('builds one reel per story entry', () => {
    expect(reels).toHaveLength(stories.length)
  })

  it("uses a person's own posts as story frames", () => {
    const mara = reels.find((r) => r.user.handle === 'maralin')
    expect(mara?.frames[0].image).toBeTruthy()
  })

  it('falls back to a single placeholder frame for people with no posts', () => {
    const sofia = reels.find((r) => r.user.handle === 'sofiam')
    expect(sofia?.frames).toHaveLength(1)
    expect(sofia?.frames[0].image).toBeUndefined()
  })
})

describe('flattenReels', () => {
  it('flattens reels into one indexed sequence with reel/frame metadata', () => {
    const reels: StoryReel[] = [
      {
        user: { name: 'A', handle: 'a', avatarId: 1 },
        frames: [{ tint: ['#000', '#111'] }, { tint: ['#000', '#111'] }],
      },
      { user: { name: 'B', handle: 'b', avatarId: 2 }, frames: [{ tint: ['#000', '#111'] }] },
    ]
    const flat = flattenReels(reels)
    expect(flat).toHaveLength(3)
    expect(flat[0]).toMatchObject({ reelIndex: 0, frameIndex: 0, framesInReel: 2 })
    expect(flat[2]).toMatchObject({ reelIndex: 1, frameIndex: 0, framesInReel: 1 })
  })
})
