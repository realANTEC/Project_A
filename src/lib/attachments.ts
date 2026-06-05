import { supabase } from './supabase'
import { downscaleImage } from './image'

/**
 * A rich message attachment. The "static" kinds (image/document/location/contact) are stored
 * inline on `messages.attachment` (jsonb); poll/event reference their own tables (live state).
 */
export type Attachment =
  | { type: 'image'; url: string }
  | { type: 'document'; url: string; name: string; size?: number; mime?: string }
  | { type: 'voice'; url: string; durationMs: number; mime?: string }
  | { type: 'location'; lat: number; lng: number; label?: string }
  | { type: 'contact'; userId: string; name: string; handle: string; avatar?: string }
  | { type: 'poll'; id: string }
  | { type: 'event'; id: string }

export type AttachmentType = Attachment['type']

/** Short, WhatsApp-style inbox-preview label for an attachment. */
export function attachmentPreview(a: Attachment): string {
  switch (a.type) {
    case 'image':
      return '📷 Photo'
    case 'document':
      return `📄 ${a.name}`
    case 'voice':
      return '🎤 Voice message'
    case 'location':
      return '📍 Location'
    case 'contact':
      return `👤 ${a.name}`
    case 'poll':
      return '📊 Poll'
    case 'event':
      return '📅 Event'
  }
}

/** Clock-style m:ss from a millisecond duration (for voice notes). */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Human-readable file size (e.g. "2.4 MB"). */
export function formatBytes(n?: number): string {
  if (!n && n !== 0) return ''
  if (n < 1024) return `${n} B`
  const kb = n / 1024
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}

async function uploadToMedia(blob: Blob, userId: string, ext: string): Promise<string> {
  if (!supabase) throw new Error('Not configured')
  const rand = Math.floor(performance.now() % 1e6).toString(36)
  const path = `${userId}/chat/${rand}-${blob.size}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, blob, {
    contentType: blob.type || 'application/octet-stream',
    upsert: false,
  })
  if (error) throw error
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}

/** Upload an image File for a chat (downscaled first) → an image attachment. */
export async function uploadImageAttachment(file: File, userId: string): Promise<Attachment> {
  const blob = await downscaleImage(file, { maxDim: 1600 })
  const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
  const url = await uploadToMedia(blob, userId, ext)
  return { type: 'image', url }
}

/** Upload any File for a chat (no downscale) → a document attachment. */
export async function uploadDocumentAttachment(file: File, userId: string): Promise<Attachment> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const url = await uploadToMedia(file, userId, ext || 'bin')
  return { type: 'document', url, name: file.name, size: file.size, mime: file.type }
}

/** Upload a recorded voice note blob → a voice attachment (carries its duration). */
export async function uploadVoiceAttachment(
  blob: Blob,
  durationMs: number,
  userId: string,
): Promise<Attachment> {
  const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
  const url = await uploadToMedia(blob, userId, ext)
  return { type: 'voice', url, durationMs: Math.round(durationMs), mime: blob.type || undefined }
}
