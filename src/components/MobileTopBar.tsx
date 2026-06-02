import { Bell, MessageSquare, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSearch } from '@/lib/search'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useConversations } from '@/lib/messages'
import { useUnreadNotifications } from '@/lib/notifications'
import { Brand } from './Brand'

/** Compact sticky header shown only on small screens. */
export function MobileTopBar() {
  const { openSearch } = useSearch()
  const { data: conversations = [] } = useConversations()
  const unread = conversations.reduce((n, c) => n + c.unread, 0)
  const { data: notifUnread = 0 } = useUnreadNotifications()
  const showNotif = isSupabaseConfigured && notifUnread > 0
  const showMsg = isSupabaseConfigured && unread > 0

  return (
    <header className="glass edge-light sticky top-0 z-40 mb-4 flex items-center justify-between rounded-b-3xl px-4 py-3 lg:hidden">
      <Brand />
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => openSearch()}
          aria-label="Search"
          className="grid h-10 w-10 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          <Search className="h-[22px] w-[22px]" strokeWidth={1.9} />
        </button>
        <Link
          to="/notifications"
          aria-label={showNotif ? `Notifications, ${notifUnread} unread` : 'Notifications'}
          className="relative grid h-10 w-10 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          <Bell className="h-[22px] w-[22px]" strokeWidth={1.9} />
          {showNotif && (
            <span className="bg-aurora ring-canvas absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white ring-2">
              {notifUnread}
            </span>
          )}
        </Link>
        <Link
          to="/messages"
          aria-label={showMsg ? `Messages, ${unread} unread` : 'Messages'}
          className="relative grid h-10 w-10 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          <MessageSquare className="h-[22px] w-[22px]" strokeWidth={1.9} />
          {showMsg && (
            <span className="bg-aurora ring-canvas absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white ring-2">
              {unread}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
