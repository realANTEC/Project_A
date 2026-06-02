import { Bell, MessageSquare, Search } from 'lucide-react'
import { useSearch } from '@/lib/search'
import { Brand } from './Brand'

/** Compact sticky header shown only on small screens. */
export function MobileTopBar() {
  const { openSearch } = useSearch()
  return (
    <header className="glass edge-light sticky top-0 z-40 mb-4 flex items-center justify-between rounded-b-3xl px-4 py-3 lg:hidden">
      <Brand />
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={openSearch}
          aria-label="Search"
          className="grid h-10 w-10 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          <Search className="h-[22px] w-[22px]" strokeWidth={1.9} />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          <Bell className="h-[22px] w-[22px]" strokeWidth={1.9} />
          <span className="bg-aurora absolute right-2 top-2 h-2 w-2 rounded-full ring-2 ring-canvas" />
        </button>
        <button
          type="button"
          aria-label="Messages"
          className="grid h-10 w-10 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          <MessageSquare className="h-[22px] w-[22px]" strokeWidth={1.9} />
        </button>
      </div>
    </header>
  )
}
