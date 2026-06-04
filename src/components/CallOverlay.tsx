/* eslint-disable jsx-a11y/media-has-caption */ // live call media has no captions track
import { type ReactNode, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react'
import { resolveAvatar } from '@/data/feed'
import { cn } from '@/lib/cn'
import { useCall } from '@/lib/calls'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { Avatar } from './Avatar'

/** Binds a MediaStream to a <video> element's srcObject. */
function useVideoStream(stream: MediaStream | null) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream
  }, [stream])
  return ref
}

function RoundButton({
  onClick,
  className,
  label,
  children,
}: {
  onClick: () => void
  className: string
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'grid h-14 w-14 place-items-center rounded-full text-white shadow-lg transition active:scale-95',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** App-wide call surface: incoming ring, outgoing "calling", and the in-call view. */
export function CallOverlay() {
  const {
    status,
    call,
    localStream,
    remoteStream,
    muted,
    cameraOff,
    acceptCall,
    declineCall,
    hangup,
    toggleMute,
    toggleCamera,
  } = useCall()
  const remoteRef = useVideoStream(remoteStream)
  const localRef = useVideoStream(localStream)
  // Move focus into the call surface and trap Tab while it's up — so an incoming
  // ring lands on Accept/Decline and keyboard users can't wander behind it.
  const dialogRef = useFocusTrap<HTMLDivElement>(status !== 'idle' && !!call)

  const inCall = status === 'connected'

  return (
    <AnimatePresence>
      {status !== 'idle' && call && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={inCall ? `Call with ${call.peerUser.name}` : `${status} call`}
          className="fixed inset-0 z-[80] grid place-items-center bg-black/85 p-4 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {inCall ? (
            <div className="bg-canvas relative h-full w-full max-w-[1100px] overflow-hidden rounded-4xl">
              {/* remote media (a hidden <video> still plays audio for audio calls) */}
              <video
                ref={remoteRef}
                autoPlay
                playsInline
                className={cn(
                  'absolute inset-0 h-full w-full bg-black object-cover',
                  call.type === 'audio' && 'hidden',
                )}
              />
              {call.type === 'audio' && (
                <div className="absolute inset-0 grid place-items-center gap-4">
                  <Avatar
                    src={resolveAvatar(call.peerUser)}
                    alt={call.peerUser.name}
                    size={120}
                    ring="aurora"
                  />
                  <p className="text-lg font-semibold text-white">{call.peerUser.name}</p>
                </div>
              )}

              {/* local preview */}
              {call.type === 'video' && (
                <video
                  ref={localRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute bottom-24 right-4 h-44 w-32 rounded-2xl object-cover shadow-xl ring-2 ring-white/20"
                />
              )}

              <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/50 to-transparent p-5 text-center">
                <p className="text-base font-semibold text-white drop-shadow">{call.peerUser.name}</p>
              </div>

              {/* controls */}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-4 bg-gradient-to-t from-black/55 to-transparent p-6">
                <RoundButton
                  onClick={toggleMute}
                  label={muted ? 'Unmute' : 'Mute'}
                  className={muted ? 'bg-white/90 text-black' : 'bg-white/15'}
                >
                  {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </RoundButton>
                {call.type === 'video' && (
                  <RoundButton
                    onClick={toggleCamera}
                    label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
                    className={cameraOff ? 'bg-white/90 text-black' : 'bg-white/15'}
                  >
                    {cameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                  </RoundButton>
                )}
                <RoundButton onClick={hangup} label="End call" className="bg-rose-500 hover:bg-rose-600">
                  <PhoneOff className="h-6 w-6" />
                </RoundButton>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="glass edge-light grid w-full max-w-sm place-items-center gap-5 rounded-4xl p-8 text-center"
            >
              <Avatar
                src={resolveAvatar(call.peerUser)}
                alt={call.peerUser.name}
                size={104}
                ring="aurora"
                className="animate-pulse"
              />
              <div>
                <p className="text-lg font-semibold text-white">{call.peerUser.name}</p>
                <p className="mt-0.5 text-sm capitalize text-white/60">
                  {status === 'incoming' ? `Incoming ${call.type} call…` : 'Calling…'}
                </p>
              </div>
              <div className="mt-1 flex gap-5">
                {status === 'incoming' ? (
                  <>
                    <RoundButton
                      onClick={declineCall}
                      label="Decline"
                      className="bg-rose-500 hover:bg-rose-600"
                    >
                      <PhoneOff className="h-6 w-6" />
                    </RoundButton>
                    <RoundButton
                      onClick={acceptCall}
                      label="Accept"
                      className="bg-emerald-500 hover:bg-emerald-600"
                    >
                      <Phone className="h-6 w-6" />
                    </RoundButton>
                  </>
                ) : (
                  <RoundButton onClick={hangup} label="Cancel" className="bg-rose-500 hover:bg-rose-600">
                    <PhoneOff className="h-6 w-6" />
                  </RoundButton>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
