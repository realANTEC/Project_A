import { describe, expect, it } from 'vitest'
import { posts, stories } from '@/data/feed'
import { buildStoryReels, flattenReels, type StoryReel } from './stories'

describe('buildStoryReels', () => {
  const reels = buildStoryReels(stories, posts)

  it('builds a reel only for story entries that have posts', () => {
    const withPosts = stories.filter((s) => posts.some((p) => p.author.handle === s.user.handle))
    expect(reels).toHaveLength(withPosts.length)
    expect(reels.length).toBeLessThan(stories.length) // some curated people have no posts
  })

  it("uses a person's own posts as story frames (every frame has an image)", () => {
    const mara = reels.find((r) => r.user.handle === 'maralin')
    expect(mara?.frames[0].image).toBeTruthy()
    expect(reels.every((r) => r.frames.length > 0 && r.frames.every((f) => f.image))).toBe(true)
  })

  it('omits people with no posts entirely (no empty placeholder reel)', () => {
    expect(reels.find((r) => r.user.handle === 'sofiam')).toBeUndefined()
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
