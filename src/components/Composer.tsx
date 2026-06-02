import { Image as ImageIcon } from 'lucide-react'
import { avatar, currentUser } from '@/data/feed'
import { useCompose } from '@/lib/compose'
import { Avatar } from './Avatar'

/** Feed-top teaser that opens the full create-post flow. */
export function Composer() {
  const { openCompose } = useCompose()

  return (
    <section className="glass edge-light rounded-4xl p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <Avatar src={avatar(currentUser.avatarId)} alt="You" size={42} />
        <button
          type="button"
          onClick={openCompose}
          className="glass-inset flex-1 rounded-2xl px-4 py-3 text-left text-sm text-white/55 transition hover:text-white/70"
        >
          Share something beautiful…
        </button>
        <button
          type="button"
          onClick={openCompose}
          aria-label="Add a photo"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lilac transition hover:bg-white/10"
        >
          <ImageIcon className="h-5 w-5" />
        </button>
      </div>
    </section>
  )
}
