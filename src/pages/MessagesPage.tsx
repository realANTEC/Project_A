import {
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowLeft,
  Check,
  Info,
  Mic,
  Pencil,
  Phone,
  Pin,
  Plus,
  Search,
  Send,
  SmilePlus,
  Sticker,
  Video,
  X,
} from 'lucide-react'
import { avatar, resolveAvatar } from '@/data/feed'
import { conversations as mockConversations } from '@/data/messages'
import { isSupabaseConfigured } from '@/lib/supabase'
import {
  type DbConversation,
  type DbMessage,
  groupReactions,
  useConversationMessages,
  useConversations,
  useEditMessage,
  useMarkRead,
  usePins,
  useProfiles,
  useSendMessage,
  useStartConversation,
  useToggleReaction,
  useTogglePin,
  useTyping,
  useUnsendMessage,
} from '@/lib/messages'
import { useHiddenMessages } from '@/lib/hiddenMessages'
import {
  type Attachment,
  attachmentPreview,
  uploadDocumentAttachment,
  uploadImageAttachment,
  uploadVoiceAttachment,
} from '@/lib/attachments'
import { useVoiceRecorder } from '@/lib/useVoiceRecorder'
import { useCreatePoll } from '@/lib/polls'
import { useCreateEvent } from '@/lib/events'
import { isJumboEmoji } from '@/lib/emoji'
import { isGiphyConfigured, stickerUrlOf } from '@/lib/giphy'
import { useOnline } from '@/lib/presence'
import { useCall } from '@/lib/calls'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/cn'
import { Page } from '@/components/Page'
import { AnimatedEmoji } from '@/components/AnimatedEmoji'
import { EmojiText } from '@/components/EmojiText'
import { Avatar } from '@/components/Avatar'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { MessageBody } from '@/components/MessageBody'
import { sharedPostIdOf } from '@/lib/postLinks'
import { MessageActionsMenu } from '@/components/MessageActionsMenu'
import { AttachmentMenu } from '@/components/AttachmentMenu'
import { AttachmentCard } from '@/components/AttachmentCard'
import { VoiceRecorderBar } from '@/components/VoiceRecorderBar'
import { ContactPicker } from '@/components/ContactPicker'
import { PollComposer } from '@/components/PollComposer'
import { EventComposer } from '@/components/EventComposer'
import { StickerPicker } from '@/components/StickerPicker'
import { ComposerEmojiButton } from '@/components/ComposerEmojiButton'

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

/** One chat message: optional quoted reply + bubble + reaction pills. Openable via the
    hover button / long-press / right-click. */
function MessageRow({
  message,
  myId,
  peerName,
  highlighted,
  onOpenMenu,
  onJump,
}: {
  message: DbMessage
  myId?: string
  peerName: string
  highlighted: boolean
  onOpenMenu: (messageId: string, rect: DOMRect) => void
  onJump: (messageId: string) => void
}) {
  const bubbleRef = useRef<HTMLDivElement>(null)
  const pressTimer = useRef<number | null>(null)
  const pressStart = useRef<{ x: number; y: number } | null>(null)

  const open = () => {
    if (bubbleRef.current) onOpenMenu(message.id, bubbleRef.current.getBoundingClientRect())
  }
  const cancelPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current)
    pressTimer.current = null
  }
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return // ignore right/middle press; right-click is handled by onContextMenu
    pressStart.current = { x: e.clientX, y: e.clientY }
    pressTimer.current = window.setTimeout(open, 450)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (
      pressStart.current &&
      Math.hypot(e.clientX - pressStart.current.x, e.clientY - pressStart.current.y) > 10
    )
      cancelPress()
  }

  const reactions = groupReactions(message.reactions, myId)
  const att = message.attachment
  const isSticker = !!stickerUrlOf(message.text)
  const bareBubble = isSticker || isJumboEmoji(message.text) || !!att
  // A shared post renders a big image-forward card — give it the wider bubble like attachments.
  const isSharedPost = !att && !!sharedPostIdOf(message.text)
  // Reaction pill tuck. It sits in the message's bottom-right corner so it reads as attached to
  // that message (not a separate one). When an "Edited" tag occupies that corner, pull up less; a
  // bare jumbo-emoji bubble has no bottom padding, so it gets a small positive gap instead.
  const pillMargin = message.editedAt ? (bareBubble ? 'mt-1.5' : '-mt-1') : '-mt-3'

  return (
    <div
      id={`msg-${message.id}`}
      className={cn(
        'group/msg flex scroll-mt-6 rounded-2xl transition-colors duration-500',
        message.fromMe ? 'justify-end' : 'justify-start',
        highlighted && 'bg-white/[0.07]',
      )}
    >
      <div className={cn('relative', att || isSharedPost ? 'max-w-[85%]' : 'max-w-[75%]')}>
        <div
          ref={bubbleRef}
          onContextMenu={(e) => {
            e.preventDefault()
            open()
          }}
          onPointerDown={onPointerDown}
          onPointerUp={cancelPress}
          onPointerMove={onPointerMove}
          onPointerCancel={cancelPress}
          className={cn(
            'select-none break-words leading-relaxed',
            bareBubble
              ? 'rounded-2xl' // sticker or jumbo emoji shows on its own — no bubble bg or padding
              : cn(
                  'px-4 py-2.5 text-sm',
                  message.fromMe
                    ? 'bg-aurora rounded-2xl rounded-br-md text-white'
                    : 'glass-inset rounded-2xl rounded-bl-md text-white/90',
                ),
          )}
        >
          {message.parent && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onJump(message.parent!.id)
              }}
              className="mb-1.5 flex w-full flex-col items-start gap-0.5 rounded-lg border-l-2 border-white/40 bg-black/15 px-2 py-1 text-left"
            >
              <span className="text-[11px] font-semibold text-white/80">
                {message.parent.fromMe ? 'You' : peerName}
              </span>
              <span className="line-clamp-1 text-[11px] text-white/60">{message.parent.text}</span>
            </button>
          )}
          {att ? (
            <AttachmentCard attachment={att} fromMe={message.fromMe} />
          ) : (
            <>
              <MessageBody text={message.text} fromMe={message.fromMe} />
              {/* Show "Edited" even when the result is a bare jumbo emoji (Edit is hidden on
                  stickers, so a bare bubble carrying editedAt is always an emoji-only edit). */}
              {message.editedAt && (
                <span
                  title={`Edited ${new Date(message.editedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`}
                  className={cn(
                    'mt-0.5 block text-[10px] leading-none',
                    bareBubble && 'px-1',
                    message.fromMe ? 'text-right text-white/60' : 'text-white/45',
                  )}
                >
                  Edited
                </span>
              )}
            </>
          )}
        </div>

        {/* Desktop hover trigger (long-press / right-click also open the menu). */}
        <button
          type="button"
          aria-label="Message actions"
          onClick={open}
          className={cn(
            'absolute top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-white/50 opacity-0 transition hover:bg-white/10 hover:text-white focus-visible:opacity-100 group-hover/msg:opacity-100',
            message.fromMe ? '-left-9' : '-right-9',
          )}
        >
          <SmilePlus className="h-[18px] w-[18px]" />
        </button>

        {/* Reaction pills tuck under the bubble's bottom corner. In-flow (not absolute) so
            they reserve real vertical space and never overlap the message below. */}
        {reactions.length > 0 && (
          <div
            className={cn(
              'relative z-10 flex',
              pillMargin,
              message.fromMe ? 'justify-end pr-2' : 'justify-start pl-2',
            )}
          >
            <button
              type="button"
              onClick={open}
              aria-label="Reactions"
              className="glass-medium flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs leading-none"
            >
              {reactions.map((r) => (
                <AnimatedEmoji
                  key={r.emoji}
                  emoji={r.emoji}
                  className={cn('text-sm', r.mine && 'drop-shadow-[0_0_5px_rgba(190,150,255,0.9)]')}
                />
              ))}
              {message.reactions.length > 1 && (
                <span className="ml-0.5 font-semibold text-white/70">{message.reactions.length}</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
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
  const recorder = useVoiceRecorder()
  const createPoll = useCreatePoll()
  const createEvent = useCreateEvent()
  const { theyTyping, notifyTyping } = useTyping(conversation.id)
  const { mutate: markRead } = useMarkRead()
  const { startCall } = useCall()
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const toggleReaction = useToggleReaction(conversation.id)
  const unsend = useUnsendMessage(conversation.id)
  const editMessage = useEditMessage(conversation.id)
  const togglePin = useTogglePin(conversation.id)
  const { data: pins = [] } = usePins(conversation.id)
  const { hidden, hide } = useHiddenMessages()
  const { toast } = useToast()
  const { session } = useAuth()
  const myId = session?.user.id
  const [menu, setMenu] = useState<{ id: string; rect: DOMRect } | null>(null)
  const menuMessage = menu ? (messages.find((m) => m.id === menu.id) ?? null) : null
  const [replyTo, setReplyTo] = useState<DbMessage | null>(null)
  const [editing, setEditing] = useState<DbMessage | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [showStickers, setShowStickers] = useState(false)
  const [showAttach, setShowAttach] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showPoll, setShowPoll] = useState(false)
  const [showEvent, setShowEvent] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const documentInput = useRef<HTMLInputElement>(null)

  // Upload a picked file to Storage, then send it as an attachment message.
  async function onPickFile(file: File | undefined, kind: 'image' | 'document') {
    if (!file || !myId) return
    toast('Uploading…')
    try {
      const att =
        kind === 'document'
          ? await uploadDocumentAttachment(file, myId)
          : await uploadImageAttachment(file, myId)
      send.mutate({ conversationId: conversation.id, body: attachmentPreview(att), attachment: att })
    } catch {
      toast('Couldn’t send attachment')
    }
  }

  // Start a voice note (asks for mic permission). Toasts if mic access is denied/unavailable.
  async function startRecording() {
    const ok = await recorder.start()
    if (!ok) toast('Microphone access is needed for voice messages')
  }

  // Stop, upload the audio to Storage, and send it as a voice attachment.
  async function sendRecording() {
    const rec = await recorder.stop()
    if (!rec || !myId) return
    if (rec.durationMs < 800) {
      toast('Hold a moment longer for a voice message')
      return
    }
    toast('Sending voice message…')
    try {
      const att = await uploadVoiceAttachment(rec.blob, rec.durationMs, myId)
      send.mutate({ conversationId: conversation.id, body: attachmentPreview(att), attachment: att })
    } catch {
      toast('Couldn’t send voice message')
    }
  }

  // Share the device's current location via the Geolocation API.
  function shareLocation() {
    if (!navigator.geolocation) {
      toast('Location not available')
      return
    }
    toast('Getting location…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const att: Attachment = { type: 'location', lat: pos.coords.latitude, lng: pos.coords.longitude }
        send.mutate({ conversationId: conversation.id, body: attachmentPreview(att), attachment: att })
      },
      () => toast('Couldn’t get location'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  // Scroll to a quoted message and flash it (event-driven setState; not an effect).
  const jumpTo = (id: string) => {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    setHighlightId(id)
    window.setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1600)
  }

  // Insert an emoji from the composer picker at the caret (keeps focus + caret position).
  const insertEmoji = (emoji: string) => {
    const el = inputRef.current
    const start = el?.selectionStart ?? draft.length
    const end = el?.selectionEnd ?? draft.length
    setDraft(draft.slice(0, start) + emoji + draft.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      const pos = start + emoji.length
      el?.setSelectionRange(pos, pos)
    })
  }

  // "Delete for you" hides locally; pinned bar shows the conversation's pinned messages.
  const visible = messages.filter((m) => !hidden.has(m.id))
  // Resolve pins from `visible`, not `messages`, so a message you deleted-for-you doesn't
  // reappear in YOUR pinned banner (even if the other person pinned it).
  const pinnedMessages = pins.map((id) => visible.find((m) => m.id === id)).filter((m): m is DbMessage => !!m)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, theyTyping])

  // Mark this conversation read when opened and when new messages arrive while it's open.
  useEffect(() => {
    markRead(conversation.id)
  }, [conversation.id, messages.length, markRead])

  function submit(e: FormEvent) {
    e.preventDefault()
    const t = draft.trim()
    if (!t) return
    if (editing) {
      if (t !== editing.text) editMessage.mutate({ messageId: editing.id, body: t })
      setEditing(null)
      setDraft('')
      return
    }
    send.mutate({ conversationId: conversation.id, body: t, replyTo: replyTo?.id ?? null })
    setDraft('')
    setReplyTo(null)
  }

  return (
    <div className="flex w-full min-w-0 flex-col md:flex-1">
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar
          src={resolveAvatar(conversation.user)}
          alt={conversation.user.name}
          size={40}
          online={online}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-white">{conversation.user.name}</span>
            {conversation.user.verified && <VerifiedBadge />}
          </div>
          <span className="text-xs text-white/55">
            {theyTyping ? 'typing…' : online ? 'Active now' : `@${conversation.user.handle}`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => startCall(conversation.otherId, conversation.user, 'audio')}
          aria-label="Voice call"
          className="grid h-9 w-9 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <Phone className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => startCall(conversation.otherId, conversation.user, 'video')}
          aria-label="Video call"
          className="grid h-9 w-9 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <Video className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => navigate(`/u/${conversation.user.handle}`)}
          aria-label="View profile"
          className="grid h-9 w-9 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <Info className="h-[18px] w-[18px]" />
        </button>
      </div>

      {pinnedMessages.length > 0 && (
        <div className="flex flex-col gap-1 border-b border-white/[0.07] px-4 py-2">
          {pinnedMessages.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => jumpTo(m.id)}
              className="flex items-center gap-2 text-left"
            >
              <Pin className="h-3.5 w-3.5 shrink-0 text-lilac" />
              <span className="truncate text-xs text-white/65">
                <span className="font-semibold text-white/85">
                  {m.fromMe ? 'You' : conversation.user.name.split(' ')[0]}:
                </span>{' '}
                {m.text}
              </span>
            </button>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {visible.length === 0 && (
          <p className="py-10 text-center text-sm text-white/55">
            No messages yet — say hello to {conversation.user.name.split(' ')[0]}.
          </p>
        )}
        {visible.map((m) => (
          <MessageRow
            key={m.id}
            message={m}
            myId={myId}
            peerName={conversation.user.name.split(' ')[0]}
            highlighted={highlightId === m.id}
            onOpenMenu={(id, rect) => setMenu({ id, rect })}
            onJump={jumpTo}
          />
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

      {showStickers && isGiphyConfigured && (
        <StickerPicker
          onPick={(url) => {
            send.mutate({ conversationId: conversation.id, body: url })
            setShowStickers(false)
            if (editing) {
              setEditing(null)
              setDraft('')
            }
            setReplyTo(null)
          }}
          onClose={() => setShowStickers(false)}
        />
      )}

      {showAttach && (
        <AttachmentMenu
          onClose={() => setShowAttach(false)}
          onGallery={() => galleryInput.current?.click()}
          onCamera={() => cameraInput.current?.click()}
          onLocation={shareLocation}
          onContact={() => setShowContact(true)}
          onDocument={() => documentInput.current?.click()}
          onPoll={() => setShowPoll(true)}
          onEvent={() => setShowEvent(true)}
        />
      )}
      {showContact && (
        <ContactPicker
          onClose={() => setShowContact(false)}
          onPick={(att) =>
            send.mutate({ conversationId: conversation.id, body: attachmentPreview(att), attachment: att })
          }
        />
      )}
      {showPoll && (
        <PollComposer
          onClose={() => setShowPoll(false)}
          onCreate={async ({ question, options, allowMultiple }) => {
            setShowPoll(false)
            try {
              const pollId = await createPoll.mutateAsync({
                conversationId: conversation.id,
                question,
                options,
                allowMultiple,
              })
              send.mutate({
                conversationId: conversation.id,
                body: `📊 ${question}`,
                attachment: { type: 'poll', id: pollId },
              })
            } catch {
              toast('Couldn’t create poll')
            }
          }}
        />
      )}
      {showEvent && (
        <EventComposer
          onClose={() => setShowEvent(false)}
          onCreate={async ({ title, description, location, startsAt }) => {
            setShowEvent(false)
            try {
              const eventId = await createEvent.mutateAsync({
                conversationId: conversation.id,
                title,
                description,
                location,
                startsAt,
              })
              send.mutate({
                conversationId: conversation.id,
                body: `📅 ${title}`,
                attachment: { type: 'event', id: eventId },
              })
            } catch {
              toast('Couldn’t create event')
            }
          }}
        />
      )}

      {(editing || replyTo) && (
        <div className="flex items-center gap-2 border-t border-white/[0.07] px-4 pb-1 pt-2.5">
          <div className="min-w-0 flex-1 rounded-lg border-l-2 border-white/30 bg-white/[0.04] px-2.5 py-1.5">
            <p className="text-xs font-semibold text-lilac">
              {editing
                ? 'Editing message'
                : `Replying to ${replyTo!.fromMe ? 'yourself' : conversation.user.name.split(' ')[0]}`}
            </p>
            <p className="truncate text-xs text-white/60">{editing ? editing.text : replyTo!.text}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (editing) {
                setEditing(null)
                setDraft('')
              } else setReplyTo(null)
            }}
            aria-label={editing ? 'Cancel edit' : 'Cancel reply'}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {recorder.status !== 'idle' ? (
        <div className={cn('px-4 py-3', !replyTo && !editing && 'border-t border-white/[0.07]')}>
          <VoiceRecorderBar
            status={recorder.status}
            durationMs={recorder.durationMs}
            levels={recorder.levels}
            getPreviewBlob={recorder.getPreviewBlob}
            onPause={recorder.pause}
            onResume={recorder.resume}
            onCancel={recorder.cancel}
            onSend={sendRecording}
          />
        </div>
      ) : (
        <form
          onSubmit={submit}
          className={cn(
            'flex items-center gap-2 px-4 py-3',
            !replyTo && !editing && 'border-t border-white/[0.07]',
          )}
        >
          <button
            type="button"
            onClick={() => setShowAttach(true)}
            aria-label="Attach"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-[22px] w-[22px]" />
          </button>
          <input
            ref={galleryInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              onPickFile(e.target.files?.[0], 'image')
              e.target.value = ''
            }}
          />
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              onPickFile(e.target.files?.[0], 'image')
              e.target.value = ''
            }}
          />
          <input
            ref={documentInput}
            type="file"
            hidden
            onChange={(e) => {
              onPickFile(e.target.files?.[0], 'document')
              e.target.value = ''
            }}
          />
          {isGiphyConfigured && (
            <button
              type="button"
              onClick={() => setShowStickers((v) => !v)}
              aria-label="Stickers"
              className={cn(
                'grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white',
                showStickers && 'bg-white/10 text-white',
              )}
            >
              <Sticker className="h-[22px] w-[22px]" />
            </button>
          )}
          <ComposerEmojiButton onPick={insertEmoji} />
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              if (!editing) notifyTyping()
            }}
            placeholder={editing ? 'Edit message…' : 'Message…'}
            aria-label={editing ? 'Edit message' : 'Message'}
            className="glass-inset min-w-0 flex-1 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/55 focus:outline-none"
          />
          {draft.trim() || editing ? (
            <button
              type="submit"
              disabled={!draft.trim() || (!!editing && draft.trim() === editing.text)}
              aria-label={editing ? 'Save edit' : 'Send'}
              className="bg-aurora grid h-10 w-10 shrink-0 place-items-center rounded-full text-white shadow-[var(--shadow-glow-violet)] transition active:scale-95 disabled:opacity-40"
            >
              {editing ? <Check className="h-5 w-5" /> : <Send className="h-5 w-5" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              aria-label="Record voice message"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <Mic className="h-[22px] w-[22px]" />
            </button>
          )}
        </form>
      )}

      {menu && menuMessage && (
        <MessageActionsMenu
          message={menuMessage}
          myReaction={menuMessage.reactions.find((r) => r.userId === myId)?.emoji}
          anchorRect={menu.rect}
          onReact={(emoji) => toggleReaction.mutate({ messageId: menuMessage.id, emoji })}
          onReply={() => {
            setEditing(null)
            setReplyTo(menuMessage)
            requestAnimationFrame(() => inputRef.current?.focus())
          }}
          onEdit={
            menuMessage.fromMe &&
            !menuMessage.id.startsWith('temp-') &&
            !stickerUrlOf(menuMessage.text) &&
            !menuMessage.attachment
              ? () => {
                  setReplyTo(null)
                  setShowStickers(false)
                  setEditing(menuMessage)
                  setDraft(menuMessage.text)
                  requestAnimationFrame(() => inputRef.current?.focus())
                }
              : undefined
          }
          onCopy={() => {
            navigator.clipboard?.writeText(menuMessage.text).then(
              () => toast('Copied'),
              () => toast('Couldn’t copy'),
            )
          }}
          onTogglePin={
            menuMessage.id.startsWith('temp-')
              ? undefined
              : () => togglePin.mutate({ messageId: menuMessage.id, pinned: pins.includes(menuMessage.id) })
          }
          isPinned={pins.includes(menuMessage.id)}
          onDeleteForYou={() => {
            hide(menuMessage.id)
            toast('Removed for you')
          }}
          onUnsend={
            menuMessage.fromMe && !menuMessage.id.startsWith('temp-')
              ? () => {
                  unsend.mutate(menuMessage.id)
                  toast('Unsent')
                }
              : undefined
          }
          onClose={() => setMenu(null)}
        />
      )}
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
    <div className="flex w-full min-w-0 flex-col md:flex-1">
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
            No one else has signed in yet. Open Soul in another browser to chat.
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
  const { data: conversations = [], isLoading, isError, refetch } = useConversations()
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

  // The thread card fills the viewport between the mobile chrome; its height must
  // subtract ALL of that chrome or the page document-scrolls — which slides the
  // thread header up under the sticky MobileTopBar and the composer under the
  // fixed MobileTabBar. Chrome = top bar h-16 + mb-4 (5rem) + this card's mt-2
  // (0.5rem) + the shell's pb-28 tab-bar clearance (7rem) = 12.5rem. On lg there
  // is no mobile chrome (rails instead), so it subtracts only its own offset.
  return (
    <Page>
      <div className="glass edge-light mt-2 flex h-[calc(100dvh-12.5rem)] overflow-hidden rounded-4xl lg:mt-6 lg:h-[calc(100dvh-4rem)]">
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
            {!isLoading && isError && (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-white/55">Couldn’t load your messages.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-2 text-sm font-semibold text-lilac transition hover:text-white"
                >
                  Try again
                </button>
              </div>
            )}
            {!isLoading && !isError && conversations.length === 0 && (
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
                  <p
                    className={cn(
                      'truncate text-xs',
                      c.unread > 0 ? 'font-semibold text-white/85' : 'text-white/55',
                    )}
                  >
                    <EmojiText text={c.preview} />
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="bg-aurora grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1 text-[10px] font-bold text-white">
                    {c.unread}
                  </span>
                )}
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
      <div className="glass edge-light mt-2 flex h-[calc(100dvh-12.5rem)] overflow-hidden rounded-4xl lg:mt-6 lg:h-[calc(100dvh-4rem)]">
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
                  <p
                    className={cn(
                      'truncate text-xs',
                      c.unread ? 'font-semibold text-white/85' : 'text-white/55',
                    )}
                  >
                    <EmojiText text={c.preview} />
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
        <div
          className={cn('w-full min-w-0 flex-col md:flex md:flex-1', mobileThreadOpen ? 'flex' : 'hidden')}
        >
          <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
            <button
              type="button"
              onClick={() => setMobileThreadOpen(false)}
              aria-label="Back"
              className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Avatar
              src={avatar(active.user.avatarId)}
              alt={active.user.name}
              size={40}
              online={active.online}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-white">{active.user.name}</span>
                {active.user.verified && <VerifiedBadge />}
              </div>
              <span className="text-xs text-white/55">
                {active.online ? 'Active now' : `@${active.user.handle}`}
              </span>
            </div>
            {/* Calls require the real Supabase signaling backend — omitted in local/mock mode. */}
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

          <div className="flex items-center gap-2 border-t border-white/[0.07] px-4 py-3">
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
