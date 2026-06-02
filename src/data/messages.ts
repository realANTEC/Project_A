import { people, type User } from './feed'

export type ChatMessage = {
  id: string
  fromMe?: boolean
  text: string
  time: string
}

export type Conversation = {
  id: string
  user: User
  online?: boolean
  unread?: number
  preview: string
  time: string
  messages: ChatMessage[]
}

export const conversations: Conversation[] = [
  {
    id: 'c1',
    user: people.amara,
    online: true,
    unread: 2,
    preview: 'the golden hour set is ready 🧡',
    time: '2m',
    messages: [
      { id: 'm1', text: 'hey! did you get a chance to look at the proofs?', time: '9:41' },
      { id: 'm2', fromMe: true, text: 'just opened them — they are unreal 😍', time: '9:43' },
      { id: 'm3', fromMe: true, text: 'frame 12 might be the best portrait I have ever seen', time: '9:43' },
      { id: 'm4', text: 'stoppp 🥹 that means a lot coming from you', time: '9:44' },
      { id: 'm5', text: 'the golden hour set is ready 🧡', time: '9:44' },
    ],
  },
  {
    id: 'c2',
    user: people.kenji,
    online: true,
    preview: 'You: ND1000 + 2 min, like you said',
    time: '1h',
    messages: [
      { id: 'm1', text: 'how did you get the water that smooth in the Enoshima shot?', time: '8:02' },
      { id: 'm2', fromMe: true, text: 'ND1000 + 2 min, like you said 🙏', time: '8:15' },
      { id: 'm3', text: 'knew it. looks incredible', time: '8:16' },
    ],
  },
  {
    id: 'c3',
    user: people.yuki,
    preview: 'sharing a spot with you — DM only 🤫',
    time: '3h',
    messages: [
      { id: 'm1', text: 'found a tide pool that mirrors the whole sky', time: '6:30' },
      { id: 'm2', text: 'sharing a spot with you — DM only 🤫', time: '6:31' },
      { id: 'm3', fromMe: true, text: 'okay now I HAVE to come to Japan', time: '6:48' },
    ],
  },
  {
    id: 'c4',
    user: people.iris,
    unread: 1,
    preview: 'pink + cyan again? we are twins 🌸',
    time: '1d',
    messages: [
      { id: 'm1', fromMe: true, text: 'your color study broke my brain (in a good way)', time: 'Yesterday' },
      { id: 'm2', text: 'pink + cyan again? we are twins 🌸', time: 'Yesterday' },
    ],
  },
  {
    id: 'c5',
    user: people.noor,
    preview: 'You: frame 38 understood the assignment',
    time: '2d',
    messages: [
      { id: 'm1', text: 'one window, forty frames. sunday ritual 🍊', time: 'Mon' },
      { id: 'm2', fromMe: true, text: 'frame 38 understood the assignment', time: 'Mon' },
    ],
  },
]
