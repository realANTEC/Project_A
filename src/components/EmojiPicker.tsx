import { StaticEmoji } from './StaticEmoji'

// A small curated set — enough to be useful without pulling in a heavy emoji library.
const EMOJIS = [
  '😀',
  '😄',
  '😁',
  '😊',
  '😍',
  '🥰',
  '😘',
  '😎',
  '🤩',
  '🥳',
  '😇',
  '🙂',
  '😉',
  '😌',
  '😋',
  '🤔',
  '🤗',
  '😅',
  '😂',
  '🤣',
  '🥲',
  '😭',
  '😮',
  '🥹',
  '👍',
  '👏',
  '🙌',
  '🙏',
  '👀',
  '💪',
  '🤝',
  '👋',
  '❤️',
  '🧡',
  '💛',
  '💚',
  '💙',
  '💜',
  '🤍',
  '🔥',
  '✨',
  '💫',
  '⭐',
  '🌟',
  '💯',
  '🎉',
  '🌈',
  '📸',
]

/** A compact glass emoji grid. Purely presentational — the caller owns open/close. */
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div
      role="menu"
      aria-label="Emoji picker"
      className="glass edge-light grid w-64 grid-cols-8 gap-0.5 rounded-2xl p-2"
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onPick(emoji)}
          className="grid h-7 w-7 place-items-center rounded-lg text-lg leading-none transition hover:bg-white/10"
        >
          <StaticEmoji emoji={emoji} />
        </button>
      ))}
    </div>
  )
}
