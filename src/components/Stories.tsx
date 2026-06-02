import { motion } from 'motion/react'
import { Plus } from 'lucide-react'
import { avatar, currentUser, stories } from '@/data/feed'
import { Avatar } from './Avatar'

/** Horizontally scrolling story rail with conic rings and a "Your story" add. */
export function Stories() {
  return (
    <section aria-label="Stories" className="glass edge-light rounded-4xl">
      <div className="no-scrollbar mask-fade-r flex gap-4 overflow-x-auto px-4 py-4">
        {/* Your story */}
        <button type="button" className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5">
          <span className="relative">
            <Avatar
              src={avatar(currentUser.avatarId)}
              alt="Your story"
              size={56}
              ring="seen"
              className="transition-transform group-hover:scale-105"
            />
            <span className="bg-aurora absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-canvas">
              <Plus className="h-3 w-3 text-white" strokeWidth={3} />
            </span>
          </span>
          <span className="max-w-full truncate text-[11px] text-white/55">Your story</span>
        </button>

        {stories.map((s, i) => (
          <motion.button
            type="button"
            key={s.user.handle}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -3 }}
            className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5"
          >
            <span className="relative">
              <Avatar
                src={avatar(s.user.avatarId)}
                alt={s.user.name}
                size={56}
                ring={s.seen ? 'seen' : 'aurora'}
                className="transition-transform group-hover:scale-105"
              />
              {s.live && (
                <span className="bg-aurora absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-canvas px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white">
                  Live
                </span>
              )}
            </span>
            <span className="max-w-full truncate text-[11px] text-white/55">{s.user.handle}</span>
          </motion.button>
        ))}
      </div>
    </section>
  )
}
