import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/** A chat image attachment: a capped thumbnail that opens full-screen on tap. */
export function ImageAttachment({ url }: { url: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block overflow-hidden rounded-2xl">
        <img src={url} alt="Attachment" loading="lazy" className="max-h-72 w-full max-w-[260px] object-cover" />
      </button>
      {open &&
        createPortal(
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[80] grid cursor-zoom-out place-items-center bg-black/85 p-4"
          >
            <img src={url} alt="Attachment" className="max-h-[90dvh] max-w-full rounded-lg object-contain" />
            <span
              aria-hidden
              className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white"
            >
              <X className="h-5 w-5" />
            </span>
          </button>,
          document.body,
        )}
    </>
  )
}
