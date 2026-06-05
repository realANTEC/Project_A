import { type ReactNode } from 'react'
import { splitEmoji } from '@/lib/emoji'
import { StaticEmoji } from './StaticEmoji'

/**
 * Render user text with its emoji as clean static Noto emoji inline — for comments, captions,
 * and the inline parts of chat messages. Static on purpose (only solo "jumbo" emoji and
 * reactions animate), so lists of text stay light. See {@link StaticEmoji}.
 */
export function EmojiText({ text }: { text: string }) {
  const parts: ReactNode[] = splitEmoji(text).map((seg, i) =>
    'emoji' in seg ? <StaticEmoji key={i} emoji={seg.emoji} className="align-[-0.15em]" /> : seg.text,
  )
  return <>{parts}</>
}
