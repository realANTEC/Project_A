import { people, photo, type User } from './feed'

export type NotifType = 'like' | 'follow' | 'comment' | 'mention'

export type Notification = {
  id: string
  type: NotifType
  users: User[]
  text?: string
  time: string
  thumb?: string
  thumbTint?: [string, string]
  group: 'today' | 'week'
}

const thumb = (id: string) => photo(id, 'square')

export const notifications: Notification[] = [
  {
    id: 'n1',
    type: 'like',
    users: [people.kenji, people.amara, people.yuki],
    text: 'and 2 others liked your photo',
    time: '12m',
    thumb: thumb('1507272931001-fc06c17e4f43'),
    thumbTint: ['#7c5cff', '#45e6d8'],
    group: 'today',
  },
  {
    id: 'n2',
    type: 'follow',
    users: [people.diego],
    time: '38m',
    group: 'today',
  },
  {
    id: 'n3',
    type: 'comment',
    users: [people.iris],
    text: 'commented: “this is so calming i forgot to breathe” ',
    time: '1h',
    thumb: thumb('1468581264429-2548ef9eb732'),
    thumbTint: ['#45e6d8', '#7c5cff'],
    group: 'today',
  },
  {
    id: 'n4',
    type: 'mention',
    users: [people.hana],
    text: 'mentioned you: “shot by the brilliant @you”',
    time: '3h',
    thumb: thumb('1544005313-94ddf0286df2'),
    thumbTint: ['#ff6ab5', '#ffc06b'],
    group: 'today',
  },
  {
    id: 'n5',
    type: 'follow',
    users: [people.leo],
    time: '5h',
    group: 'today',
  },
  {
    id: 'n6',
    type: 'like',
    users: [people.sofia, people.noor],
    text: 'and 1,204 others liked your photo',
    time: '1d',
    thumb: thumb('1520529890308-f503006340b4'),
    thumbTint: ['#b9a6ff', '#ffc06b'],
    group: 'week',
  },
  {
    id: 'n7',
    type: 'comment',
    users: [people.mara],
    text: 'commented: “frame 38 understood the assignment”',
    time: '2d',
    thumb: thumb('1771231590541-8f070d32edaf'),
    thumbTint: ['#ffc06b', '#ff5d7e'],
    group: 'week',
  },
  {
    id: 'n8',
    type: 'follow',
    users: [people.hana],
    time: '4d',
    group: 'week',
  },
]
