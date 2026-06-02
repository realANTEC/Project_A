/* ============================================================================
   Mock content for the Aurora feed.
   Image sources are resilient (deterministic Picsum seeds + Pravatar faces);
   every media surface also has a gradient fallback so a slow/blocked request
   never breaks the composition.
   ========================================================================== */

export type User = {
  name: string
  handle: string
  /** Pravatar portrait id (1–70) for mock users. */
  avatarId: number
  verified?: boolean
  /** Explicit avatar URL (real DB users) — takes precedence over avatarId. */
  avatarUrl?: string
}

export type Comment = {
  user: User
  text: string
  likes: number
}

export type Aspect = 'portrait' | 'square' | 'landscape'

export type Post = {
  id: string
  author: User
  image: string
  aspect: Aspect
  /** Two-stop gradient shown beneath the image while it loads. */
  tint: [string, string]
  location?: string
  caption: string
  tags: string[]
  likes: number
  commentsCount: number
  time: string
  likedByYou?: boolean
  saved?: boolean
  topComments: Comment[]
  likedBy: User[]
  /** 'db' = real Postgres post (interactions hit Supabase); otherwise curated/local. */
  source?: 'db' | 'seed'
  /** The author's real profile id (DB posts only) — recipient for like/comment notifications. */
  authorId?: string
}

export type Story = {
  user: User
  seen?: boolean
  live?: boolean
}

export type Trend = {
  topic: string
  category: string
  posts: number
}

/* ---- source helpers --------------------------------------------------- */

const DIMS: Record<Aspect, [number, number]> = {
  portrait: [1000, 1250],
  square: [1080, 1080],
  landscape: [1280, 854],
}

/** Curated Unsplash photo, cropped to the post's aspect ratio. */
export const photo = (id: string, aspect: Aspect) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${DIMS[aspect][0]}&h=${DIMS[aspect][1]}&q=80`

export const avatar = (id: number) => `https://i.pravatar.cc/240?img=${id}`

/** A user's avatar: explicit URL (real DB users) or a Pravatar by id (mock users). */
export const resolveAvatar = (user: User) => user.avatarUrl ?? avatar(user.avatarId)

/* ---- people ----------------------------------------------------------- */

const u = {
  you: { name: 'You', handle: 'you', avatarId: 12 },
  mara: { name: 'Mara Lindqvist', handle: 'maralin', avatarId: 5, verified: true },
  kenji: { name: 'Kenji Watanabe', handle: 'kenji.frames', avatarId: 13, verified: true },
  sofia: { name: 'Sofia Marchetti', handle: 'sofiam', avatarId: 16 },
  amara: { name: 'Amara Okafor', handle: 'amara.shoots', avatarId: 25, verified: true },
  leo: { name: 'Leo Hartmann', handle: 'leoh', avatarId: 33 },
  yuki: { name: 'Yuki Tanaka', handle: 'yuki.lens', avatarId: 44, verified: true },
  noor: { name: 'Noor Haddad', handle: 'noorscapes', avatarId: 47 },
  iris: { name: 'Iris Bergström', handle: 'iris.b', avatarId: 49 },
  diego: { name: 'Diego Castillo', handle: 'dcastillo', avatarId: 51 },
  hana: { name: 'Hana Park', handle: 'hana.p', avatarId: 60, verified: true },
} satisfies Record<string, User>

/** Directory of mock people, keyed for reuse across messages/notifications. */
export const people = u

/* ---- the feed --------------------------------------------------------- */

export const posts: Post[] = [
  {
    id: 'p1',
    author: u.mara,
    image: photo('1507272931001-fc06c17e4f43', 'portrait'),
    aspect: 'portrait',
    tint: ['#7c5cff', '#45e6d8'],
    location: 'Lofoten, Norway',
    caption:
      'Stood completely still for an hour while the sky did this. Some nights the world just shows off. 🌌',
    tags: ['aurora', 'lofoten', 'nightsky'],
    likes: 18420,
    commentsCount: 312,
    time: '2h',
    likedByYou: false,
    saved: false,
    topComments: [
      { user: u.kenji, text: 'The reflection is unreal. What were your settings?', likes: 28 },
      { user: u.sofia, text: 'okay this is my new wallpaper 😍', likes: 64 },
    ],
    likedBy: [u.kenji, u.sofia, u.amara],
  },
  {
    id: 'p2',
    author: u.kenji,
    image: photo('1520529890308-f503006340b4', 'landscape'),
    aspect: 'landscape',
    tint: ['#b9a6ff', '#ffc06b'],
    location: 'Naoshima, Japan',
    caption: 'Light is the only material that matters. Everything else is just there to catch it.',
    tags: ['architecture', 'minimal', 'tadaoando'],
    likes: 9234,
    commentsCount: 141,
    time: '5h',
    likedByYou: true,
    saved: true,
    topComments: [{ user: u.iris, text: 'compositionally perfect. the negative space 🤍', likes: 41 }],
    likedBy: [u.iris, u.leo, u.hana],
  },
  {
    id: 'p3',
    author: u.amara,
    image: photo('1544005313-94ddf0286df2', 'portrait'),
    aspect: 'portrait',
    tint: ['#ff6ab5', '#ffc06b'],
    location: 'Lagos, Nigeria',
    caption: 'Golden hour did 90% of the work here. Endless thanks to @hana.p for trusting the vision. ✨',
    tags: ['portrait', 'goldenhour', 'editorial'],
    likes: 27310,
    commentsCount: 503,
    time: '7h',
    likedByYou: false,
    saved: false,
    topComments: [
      { user: u.hana, text: 'best shoot of the year, hands down 🧡', likes: 188 },
      { user: u.diego, text: 'the tones!! teach a workshop already', likes: 73 },
    ],
    likedBy: [u.hana, u.diego, u.yuki],
  },
  {
    id: 'p4',
    author: u.noor,
    image: photo('1771231590541-8f070d32edaf', 'square'),
    aspect: 'square',
    tint: ['#ffc06b', '#ff5d7e'],
    location: 'home studio',
    caption: 'Sunday discipline: one subject, one window, forty frames. This was frame 38.',
    tags: ['stilllife', 'naturallight'],
    likes: 4120,
    commentsCount: 58,
    time: '11h',
    likedByYou: false,
    saved: true,
    topComments: [{ user: u.mara, text: 'frame 38 understood the assignment', likes: 22 }],
    likedBy: [u.mara, u.sofia],
  },
  {
    id: 'p5',
    author: u.yuki,
    image: photo('1468581264429-2548ef9eb732', 'landscape'),
    aspect: 'landscape',
    tint: ['#45e6d8', '#7c5cff'],
    location: 'Enoshima',
    caption: 'Two minutes of shutter and the ocean turns to silk. Patience as a medium. 🌊',
    tags: ['longexposure', 'seascape', 'minimal'],
    likes: 15890,
    commentsCount: 207,
    time: '14h',
    likedByYou: true,
    saved: false,
    topComments: [
      { user: u.noor, text: 'this is so calming i forgot to breathe', likes: 51 },
      { user: u.leo, text: 'ND1000? looks flawless', likes: 19 },
    ],
    likedBy: [u.noor, u.leo, u.mara],
  },
  {
    id: 'p6',
    author: u.iris,
    image: photo('1644979512144-bcfc2db78073', 'portrait'),
    aspect: 'portrait',
    tint: ['#e84cff', '#5ad1ff'],
    location: 'Stockholm',
    caption: 'A small color study before the studio opened. Pink against cyan will always win. 🌸',
    tags: ['colorstudy', 'flowers', 'creative'],
    likes: 6745,
    commentsCount: 93,
    time: '1d',
    likedByYou: false,
    saved: false,
    topComments: [{ user: u.amara, text: 'your eye for color is a cheat code', likes: 37 }],
    likedBy: [u.amara, u.kenji, u.hana],
  },
]

/* ---- stories ---------------------------------------------------------- */

export const stories: Story[] = [
  { user: u.mara, live: true },
  { user: u.kenji },
  { user: u.amara },
  { user: u.yuki, live: true },
  { user: u.sofia },
  { user: u.noor },
  { user: u.iris, seen: true },
  { user: u.diego, seen: true },
  { user: u.leo, seen: true },
  { user: u.hana },
]

/* ---- right rail ------------------------------------------------------- */

export const suggestions: { user: User; reason: string }[] = [
  { user: u.diego, reason: 'Followed by maralin + 4 more' },
  { user: u.leo, reason: 'New to Aurora' },
  { user: u.hana, reason: 'Followed by amara.shoots' },
]

export const trends: Trend[] = [
  { topic: '#nightsky', category: 'Photography', posts: 128400 },
  { topic: 'Blue hour', category: 'Trending in Travel', posts: 64200 },
  { topic: '#filmlook', category: 'Creative', posts: 309000 },
  { topic: 'Brutalism', category: 'Architecture', posts: 41700 },
  { topic: '#goldenhour', category: 'Photography', posts: 982000 },
]

export const currentUser = u.you

/* ---- explore mosaic --------------------------------------------------- */

const POOL: User[] = [u.mara, u.kenji, u.amara, u.yuki, u.noor, u.iris, u.diego, u.leo, u.hana, u.sofia]

const TINTS: [string, string][] = [
  ['#7c5cff', '#45e6d8'],
  ['#ff6ab5', '#ffc06b'],
  ['#e84cff', '#5ad1ff'],
  ['#45e6d8', '#7c5cff'],
  ['#ffc06b', '#ff5d7e'],
  ['#b9a6ff', '#ff6ab5'],
]

const CAPTIONS = [
  'Light is the only material that matters.',
  'Found this quiet corner and stayed a while.',
  'Color study, no. 14. Pink will always win.',
  'Two minutes of shutter, an ocean of patience.',
  'Texture is a kind of music.',
  'The blue hour keeps its promises.',
  'Negative space doing the heavy lifting.',
  'Catching the last of the gold.',
]

// Curated Unsplash ids (re-used across the explore grid + profiles).
const EXPLORE_IMG: [string, Aspect][] = [
  ['1520529890308-f503006340b4', 'landscape'],
  ['1526835746352-0b9da4054862', 'portrait'],
  ['1508841220-87fbee1b4767', 'square'],
  ['1731120071516-392130554911', 'portrait'],
  ['1612090078171-9e1e933e2bcc', 'landscape'],
  ['1505063885677-21ba33183857', 'square'],
  ['1610645011205-fee7314782c5', 'portrait'],
  ['1554201791-f9fcfba504a0', 'square'],
  ['1444044205806-38f3ed106c10', 'landscape'],
  ['1626875952983-5c65b77ecb6d', 'portrait'],
  ['1531139582780-03a6c4d71674', 'square'],
  ['1616901737917-834592c43635', 'landscape'],
  ['1516384917873-ac27a5f35f4c', 'portrait'],
  ['1506967534058-2dc0162a83d6', 'square'],
  ['1619896849560-f92c4330f1a6', 'portrait'],
  ['1464376810568-596bdd5a1897', 'landscape'],
  ['1630520525353-768060fcd8f7', 'portrait'],
  ['1477649826131-b6c2d84043c9', 'square'],
]

function buildPost(id: string, aspect: Aspect, i: number): Post {
  const author = POOL[i % POOL.length]
  return {
    id: `e${i}`,
    author,
    image: photo(id, aspect),
    aspect,
    tint: TINTS[i % TINTS.length],
    caption: CAPTIONS[i % CAPTIONS.length],
    tags: [],
    likes: 1200 + ((i * 8867) % 60000),
    commentsCount: 12 + ((i * 53) % 460),
    time: `${1 + (i % 23)}h`,
    topComments: [
      { user: POOL[(i + 3) % POOL.length], text: 'this is gorgeous ✨', likes: 4 + (i % 30) },
      { user: POOL[(i + 5) % POOL.length], text: 'saved immediately', likes: 2 + (i % 12) },
    ],
    likedBy: [POOL[(i + 1) % POOL.length], POOL[(i + 2) % POOL.length], POOL[(i + 4) % POOL.length]],
  }
}

export const explorePosts: Post[] = EXPLORE_IMG.map(([id, aspect], i) => buildPost(id, aspect, i))

/* ---- profiles --------------------------------------------------------- */

export type Profile = {
  user: User
  bio: string
  website?: string
  stats: { posts: number; followers: number; following: number }
  grid: Post[]
}

const BIOS: Record<string, { bio: string; website?: string; followers: number; following: number }> = {
  maralin: {
    bio: 'Chasing light above the Arctic circle 🌌\nNightscape & aurora photography · Lofoten',
    website: 'maralindqvist.co',
    followers: 184000,
    following: 312,
  },
  'kenji.frames': {
    bio: 'Architecture & light. Less, but better.\nTokyo ↔ Naoshima',
    website: 'kenjiwatanabe.studio',
    followers: 96400,
    following: 188,
  },
  'amara.shoots': {
    bio: 'Editorial & golden-hour portraits 🧡\nBooking Q3 — Lagos / London',
    website: 'amaraokafor.com',
    followers: 273100,
    following: 421,
  },
  'yuki.lens': {
    bio: 'Long exposures & quiet seas 🌊\nPatience as a medium',
    followers: 158900,
    following: 96,
  },
  noorscapes: {
    bio: 'Still life by one window. Sunday discipline.',
    followers: 41200,
    following: 503,
  },
  'iris.b': {
    bio: 'Colour studies & blooms 🌸 Stockholm studio',
    followers: 67450,
    following: 274,
  },
  you: {
    bio: 'Collecting beautiful things on Aurora ✦',
    followers: 1280,
    following: 342,
  },
}

export function getProfile(handle: string): Profile {
  const user = Object.values(u).find((x) => x.handle === handle) ?? u.mara
  const meta = BIOS[handle] ?? { bio: 'Made of light.', followers: 4200, following: 180 }
  const own = posts.filter((p) => p.author.handle === handle)
  const grid = [...own, ...explorePosts].slice(0, 12)
  return {
    user,
    bio: meta.bio,
    website: meta.website,
    stats: {
      posts: grid.length + (own.length ? 134 : 18),
      followers: meta.followers,
      following: meta.following,
    },
    grid,
  }
}
