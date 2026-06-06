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

/**
 * Group a posts pool into per-user story reels: a user's own posts become their
 * story frames (newest first, up to 3). People with no posts get NO reel — we
 * never invent an empty placeholder card.
 */
export function buildStoryReels(entries: { user: User }[], pool: Post[]): StoryReel[] {
  const reels: StoryReel[] = []
  for (const { user } of entries) {
    const own = pool.filter((p) => p.author.handle === user.handle).slice(0, 3)
    if (!own.length) continue
    reels.push({ user, frames: own.map((p) => ({ image: p.image, tint: p.tint })) })
  }
  return reels
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
