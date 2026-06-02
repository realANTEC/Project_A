import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, Info, Pencil, Phone, Search, Send, Video, X } from 'lucide-react'
import { avatar, resolveAvatar } from '@/data/feed'
import { conversations as mockConversations } from '@/data/messages'
import { isSupabaseConfigured } from '@/lib/supabase'
import {
  type DbConversation,
  useConversationMessages,
  useConversations,
  useProfiles,
  useSendMessage,
  useStartConversation,
  useTyping,
} from '@/lib/messages'
import { useOnline } from '@/lib/presence'
import { cn } from '@/lib/cn'
import { Page } from '@/components/Page'
import { Avatar } from '@/components/Avatar'
import { VerifiedBadge } from '@/components/VerifiedBadge'

export function MessagesPage() {
  return isSupabaseConfigured ? <RealMessages /> : <MockMessages />
}

/* ============================================================================
   Real, Postgres-backed messaging
   ========================================================================== */

function TypingDot({ delay = 0 }: { delay?: number }) {
  return (
    <motion.span
      className="h-1.5 w-1.5 rounded-full bg-white/60"
      animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
      transition={{ duration: 0.9, repeat: Infinity, delay }}
    />
  )
}

function Thread({
  conversation,
  online,
  onBack,
}: {
  conversation: DbConversation
  online: boolean
  onBack: () => void
}) {
  const { data: messages = [] } = useConversationMessages(conversation.id)
  const send = useSendMessage()
  const { theyTyping, notifyTyping } = useTyping(conversation.id)
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, theyTyping])

  function submit(e: FormEvent) {
    e.preventDefault()
    const t = draft.trim()
    if (!t) return
    send.mutate({ conversationId: conversation.id, body: t })
    setDraft('')
  }

  return (
    <div className="flex w-full flex-col md:flex-1">
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar src={resolveAvatar(conversation.user)} alt={conversation.user.name} size={40} online={online} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-white">{conversation.user.name}</span>
            {conversation.user.verified && <VerifiedBadge />}
          </div>
          <span className="text-xs text-white/55">
            {theyTyping ? 'typing…' : online ? 'Active now' : `@${conversation.user.handle}`}
          </span>
        </div>
        {[Phone, Video, Info].map((Icon, i) => (
          <button
            key={i}
            type="button"
            aria-label="Call options"
            className="grid h-9 w-9 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <Icon className="h-[18px] w-[18px]" />
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-white/55">
            No messages yet — say hello to {conversation.user.name.split(' ')[0]}.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn('flex', m.fromMe ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[75%] px-4 py-2.5 text-sm leading-relaxed',
                m.fromMe
                  ? 'bg-aurora rounded-2xl rounded-br-md text-white'
                  : 'glass-inset rounded-2xl rounded-bl-md text-white/90',
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {theyTyping && (
          <div className="flex justify-start">
            <div className="glass-inset flex items-center gap-1 rounded-2xl rounded-bl-md px-4 py-3.5">
              <TypingDot />
              <TypingDot delay={0.15} />
              <TypingDot delay={0.3} />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/[0.07] p-3">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            notifyTyping()
          }}
          placeholder="Message…"
          aria-label="Message"
          className="glass-inset min-w-0 flex-1 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/55 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Send"
          className="bg-aurora grid h-10 w-10 shrink-0 place-items-center rounded-full text-white shadow-[var(--shadow-glow-violet)] transition active:scale-95 disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  )
}

function NewConversation({
  onPick,
  onClose,
}: {
  onPick: (conversationId: string) => void
  onClose: () => void
}) {
  const { data: profiles = [], isLoading } = useProfiles()
  const start = useStartConversation()

  return (
    <div className="flex w-full flex-col md:flex-1">
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel"
          className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="font-display text-sm font-semibold text-white">New message</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading && <p className="px-3 py-6 text-sm text-white/55">Loading people…</p>}
        {!isLoading && profiles.length === 0 && (
          <p className="px-3 py-10 text-center text-sm text-white/55">
            No one else has signed in yet. Open Aurora in another browser to chat.
          </p>
        )}
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={start.isPending}
            onClick={() => start.mutate(p.id, { onSuccess: onPick })}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-white/[0.05] disabled:opacity-50"
          >
            <Avatar src={resolveAvatar(p)} alt={p.name} size={44} ring="aurora" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-white">{p.name}</span>
                {p.verified && <VerifiedBadge />}
              </span>
              <span className="block truncate text-xs text-white/55">@{p.handle}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function RealMessages() {
  const { data: conversations = [], isLoading } = useConversations()
  const online = useOnline()
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const [composing, setComposing] = useState(false)

  // Selection lives in the URL (/messages/:conversationId), so it survives query
  // refetches, remounts (route changes, StrictMode), and never silently follows
  // list reordering the way a `?? conversations[0]` fallback would.
  const active = conversations.find((c) => c.id === conversationId) ?? null
  const select = (id: string) => navigate(`/messages/${id}`)

  // On desktop, open the most-recent conversation by default when none is selected.
  // Mobile starts on the list. Pinned via the URL, so a later reorder won't move it.
  // useLayoutEffect (pre-paint) so the default thread shows without a one-frame flash
  // of the empty state.
  useLayoutEffect(() => {
    if (isLoading || conversationId || composing) return
    if (conversations[0] && window.matchMedia('(min-width: 768px)').matches) {
      navigate(`/messages/${conversations[0].id}`, { replace: true })
    }
  }, [isLoading, conversationId, composing, conversations, navigate])

  return (
    <Page>
      <div className="glass edge-light mt-2 flex h-[calc(100dvh-10.5rem)] overflow-hidden rounded-4xl lg:mt-6 lg:h-[calc(100dvh-4rem)]">
        {/* Conversation list */}
        <div
          className={cn(
            'w-full flex-col border-r border-white/[0.07] md:flex md:w-[320px] md:shrink-0',
            active || composing ? 'hidden md:flex' : 'flex',
          )}
        >
          <div className="flex items-center justify-between border-b border-white/[0.07] p-4">
            <h1 className="font-display text-lg font-bold text-white">Messages</h1>
            <button
              type="button"
              onClick={() => setComposing(true)}
              aria-label="New message"
              className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <Pencil className="h-[18px] w-[18px]" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading && <p className="px-4 py-6 text-sm text-white/55">Loading…</p>}
            {!isLoading && conversations.length === 0 && (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-white/55">No conversations yet.</p>
                <button
                  type="button"
                  onClick={() => setComposing(true)}
                  className="mt-2 text-sm font-semibold text-lilac transition hover:text-white"
                >
                  Start one →
                </button>
              </div>
            )}
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => select(c.id)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition',
                  c.id === active?.id ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]',
                )}
              >
                <Avatar
                  src={resolveAvatar(c.user)}
                  alt={c.user.name}
                  size={48}
                  online={online.has(c.otherId)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-white">{c.user.name}</span>
                    <span className="shrink-0 text-[11px] text-white/55">{c.time}</span>
                  </div>
                  <p className="truncate text-xs text-white/55">{c.preview}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right pane: compose picker, active thread, or empty state */}
        {composing ? (
          <NewConversation
            onClose={() => setComposing(false)}
            onPick={(convId) => {
              setComposing(false)
              select(convId)
            }}
          />
        ) : active ? (
          <Thread
            key={active.id}
            conversation={active}
            online={online.has(active.otherId)}
            onBack={() => navigate('/messages')}
          />
        ) : (
          <div className="hidden flex-1 place-items-center md:grid">
            <p className="text-sm text-white/55">Select a conversation, or start a new one.</p>
          </div>
        )}
      </div>
    </Page>
  )
}

/* ============================================================================
   Mock messaging (local mode, when Supabase isn't configured)
   ========================================================================== */

function MockMessages() {
  const [activeId, setActiveId] = useState(mockConversations[0].id)
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false)
  const active = mockConversations.find((c) => c.id === activeId) ?? mockConversations[0]

  return (
    <Page>
      <div className="glass edge-light mt-2 flex h-[calc(100dvh-10.5rem)] overflow-hidden rounded-4xl lg:mt-6 lg:h-[calc(100dvh-4rem)]">
        {/* Conversation list */}
        <div
          className={cn(
            'w-full flex-col border-r border-white/[0.07] md:flex md:w-[320px] md:shrink-0',
            mobileThreadOpen ? 'hidden' : 'flex',
          )}
        >
          <div className="border-b border-white/[0.07] p-4">
            <h1 className="font-display text-lg font-bold text-white">Messages</h1>
            <div className="glass-inset mt-3 flex items-center gap-2 rounded-xl px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-white/55" />
              <input
                placeholder="Search"
                aria-label="Search messages"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/55 focus:outline-none"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {mockConversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveId(c.id)
                  setMobileThreadOpen(true)
                }}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition',
                  c.id === activeId ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]',
                )}
              >
                <Avatar
                  src={avatar(c.user.avatarId)}
                  alt={c.user.name}
                  size={48}
                  online={c.online}
                  ring={c.unread ? 'aurora' : 'none'}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-white">{c.user.name}</span>
                    <span className="shrink-0 text-[11px] text-white/55">{c.time}</span>
                  </div>
                  <p className={cn('truncate text-xs', c.unread ? 'font-semibold text-white/85' : 'text-white/55')}>
                    {c.preview}
                  </p>
                </div>
                {c.unread ? (
                  <span className="bg-aurora grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1 text-[10px] font-bold text-white">
                    {c.unread}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Active thread */}
        <div className={cn('w-full flex-col md:flex md:flex-1', mobileThreadOpen ? 'flex' : 'hidden')}>
          <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
            <button
              type="button"
              onClick={() => setMobileThreadOpen(false)}
              aria-label="Back"
              className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Avatar src={avatar(active.user.avatarId)} alt={active.user.name} size={40} online={active.online} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-white">{active.user.name}</span>
                {active.user.verified && <VerifiedBadge />}
              </div>
              <span className="text-xs text-white/55">
                {active.online ? 'Active now' : `@${active.user.handle}`}
              </span>
            </div>
            {[Phone, Video, Info].map((Icon, i) => (
              <button
                key={i}
                type="button"
                aria-label="Call options"
                className="grid h-9 w-9 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <Icon className="h-[18px] w-[18px]" />
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
            {active.messages.map((m) => (
              <div key={m.id} className={cn('flex', m.fromMe ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[75%] px-4 py-2.5 text-sm leading-relaxed',
                    m.fromMe
                      ? 'bg-aurora rounded-2xl rounded-br-md text-white'
                      : 'glass-inset rounded-2xl rounded-bl-md text-white/90',
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-white/[0.07] p-3">
            <input
              placeholder="Message…"
              aria-label="Message"
              className="glass-inset min-w-0 flex-1 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/55 focus:outline-none"
            />
            <button
              type="button"
              aria-label="Send"
              className="bg-aurora grid h-10 w-10 shrink-0 place-items-center rounded-full text-white shadow-[var(--shadow-glow-violet)] transition active:scale-95"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </Page>
  )
}
