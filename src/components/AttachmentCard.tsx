import { type Attachment } from '@/lib/attachments'
import { ImageAttachment } from './ImageAttachment'
import { DocumentAttachment } from './DocumentAttachment'
import { VoiceAttachment } from './VoiceAttachment'
import { LocationAttachment } from './LocationAttachment'
import { ContactAttachment } from './ContactAttachment'
import { PollAttachment } from './PollAttachment'
import { EventAttachment } from './EventAttachment'

/** Renders a message's rich attachment as the right card. */
export function AttachmentCard({ attachment, fromMe }: { attachment: Attachment; fromMe?: boolean }) {
  switch (attachment.type) {
    case 'image':
      return <ImageAttachment url={attachment.url} />
    case 'document':
      return <DocumentAttachment url={attachment.url} name={attachment.name} size={attachment.size} />
    case 'voice':
      return <VoiceAttachment url={attachment.url} durationMs={attachment.durationMs} fromMe={fromMe} />
    case 'location':
      return <LocationAttachment lat={attachment.lat} lng={attachment.lng} label={attachment.label} />
    case 'contact':
      return (
        <ContactAttachment name={attachment.name} handle={attachment.handle} avatar={attachment.avatar} />
      )
    case 'poll':
      return <PollAttachment pollId={attachment.id} />
    case 'event':
      return <EventAttachment eventId={attachment.id} />
    default:
      return null
  }
}
