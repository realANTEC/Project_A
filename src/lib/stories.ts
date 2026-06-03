import type { Post, User } from '@/data/feed'

export type StoryFrame = { image?: string; tint: [string, string] }
export type StoryReel = { user: User; frames: StoryFrame[] }
export type FlatFrame = {
  reelIndex: number
  frameIndex: number
  framesInReel: number
  reel: StoryReel
  frame: StoryFrame
}

const PLACEHOLDER_TINT: [string, string] = ['#241a36', '#0f2a3a']

/**
 * Group a posts pool into per-user story reels: a user's own posts become their
 * story frames (newest first, up to 3). Users with no posts get a single
 * avatar-on-gradient placeholder frame — honest content, no invented backend.
 */
export function buildStoryReels(entries: { user: User }[], pool: Post[]): StoryReel[] {
  return entries.map(({ user }) => {
    const own = pool.filter((p) => p.author.handle === user.handle).slice(0, 3)
    const frames: StoryFrame[] = own.length
      ? own.map((p) => ({ image: p.image, tint: p.tint }))
      : [{ tint: PLACEHOLDER_TINT }]
    return { user, frames }
  })
}

/** Flatten reels into one sequence so the viewer can tap through with a single index. */
export function flattenReels(reels: StoryReel[]): FlatFrame[] {
  const out: FlatFrame[] = []
  reels.forEach((reel, reelIndex) =>
    reel.frames.forEach((frame, frameIndex) =>
      out.push({ reelIndex, frameIndex, framesInReel: reel.frames.length, reel, frame }),
    ),
  )
  return out
}
