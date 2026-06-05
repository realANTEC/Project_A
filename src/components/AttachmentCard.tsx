import { type Attachment } from '@/lib/attachments'
import { ImageAttachment } from './ImageAttachment'
import { DocumentAttachment } from './DocumentAttachment'
import { LocationAttachment } from './LocationAttachment'
import { ContactAttachment } from './ContactAttachment'

/** Renders a message's rich attachment as the right card. (Poll/event land in later phases.) */
export function AttachmentCard({ attachment }: { attachment: Attachment }) {
  switch (attachment.type) {
    case 'image':
      return <ImageAttachment url={attachment.url} />
    case 'document':
      return <DocumentAttachment url={attachment.url} name={attachment.name} size={attachment.size} />
    case 'location':
      return <LocationAttachment lat={attachment.lat} lng={attachment.lng} label={attachment.label} />
    case 'contact':
      return <ContactAttachment name={attachment.name} handle={attachment.handle} avatar={attachment.avatar} />
    default:
      return null
  }
}
