import { Download, FileText } from 'lucide-react'
import { formatBytes } from '@/lib/attachments'

/** A chat document attachment: file icon + name + size, opens/downloads on tap. */
export function DocumentAttachment({ url, name, size }: { url: string; name: string; size?: number }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex w-60 items-center gap-3 rounded-2xl bg-black/20 p-3 ring-1 ring-white/10 transition hover:bg-black/30"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
        <FileText className="h-5 w-5 text-white/80" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-white">{name}</span>
        {size != null && <span className="block text-xs text-white/55">{formatBytes(size)}</span>}
      </span>
      <Download className="h-[18px] w-[18px] shrink-0 text-white/55" />
    </a>
  )
}
