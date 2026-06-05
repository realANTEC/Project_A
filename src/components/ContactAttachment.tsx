import { Link } from 'react-router-dom'
import { Avatar } from './Avatar'

/** A shared-contact card: a Soul member's avatar/name/handle + a link to their profile. */
export function ContactAttachment({ name, handle, avatar }: { name: string; handle: string; avatar?: string }) {
  return (
    <div className="w-60 overflow-hidden rounded-2xl bg-black/20 ring-1 ring-white/10">
      <div className="flex items-center gap-3 p-3">
        <Avatar src={avatar || ''} alt={name} size={44} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{name}</span>
          <span className="block truncate text-xs text-white/55">@{handle}</span>
        </span>
      </div>
      <Link
        to={`/u/${handle}`}
        className="block border-t border-white/10 py-2 text-center text-sm font-medium text-lilac transition hover:bg-white/5"
      >
        View profile
      </Link>
    </div>
  )
}
