# Aurora ✦

A visual-first social experience rendered on **living glass** — a near-black canvas lit by
slow-drifting aurora light, with frosted-glass surfaces, luminous gradients, real depth, and
physical micro-interactions.

> A multi-screen experience — **home feed**, **explore mosaic**, **profiles**, **messages**,
> **notifications**, **saved**, **settings**, a **create-post** flow, **⌘K search**, and an
> **immersive post lightbox** — on one glass-and-light design language. Likes, bookmarks &
> comments **persist**, and a live **accent theme** recolors the entire aurora.

![Aurora — home feed](public/aurora.svg)

## Stack

- **React 19** + **TypeScript** + **Vite 6**
- **Tailwind CSS v4** (design tokens via `@theme`)
- **Motion** (`motion/react`) for spring physics & layout animation
- **lucide-react** icons

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run build    # typecheck (tsc -b) + production bundle
npm run preview  # serve the production build
npm run lint     # typecheck only
```

## The design language

Everything is built from a small, coherent vocabulary defined in [`src/index.css`](src/index.css):

| Token / class  | Role                                                             |
| -------------- | ---------------------------------------------------------------- |
| `.glass`       | Frosted surface — blur, saturation, hairline border, soft shadow |
| `.glass-inset` | Subtler nested surface (inputs, chips)                           |
| `.edge-light`  | Luminous hairline along a surface's top edge                     |
| `.text-aurora` | Brand gradient as type (lilac → pink → cyan)                     |
| `.bg-aurora`   | Primary gradient fill (iris → magenta → pink)                    |
| `.ring-aurora` | Conic gradient ring for stories / live avatars                   |
| `--color-*`    | iris · violet · lilac · magenta · pink · cyan · amber palette    |

The ambient backdrop ([`AuroraBackground`](src/components/AuroraBackground.tsx)) layers drifting
radial blobs, a vignette, and SVG film grain so the gradients never band.

## Structure

```
src/
  index.css                 # design system: tokens, glass, gradients, motion, grain
  App.tsx                   # router (/, /explore, /notifications, /messages, /u/:handle)
  data/
    feed.ts                 # types + curated content (Unsplash + Pravatar) + explore/profiles
    messages.ts · notifications.ts
  lib/
    cn.ts · format.ts       # class merge + compact counts
    feed-store.tsx          # live feed + persisted likes/saves/comments (localStorage)
    theme.tsx               # accent presets → overrides CSS vars at :root (persisted)
    post-modal.tsx          # immersive post lightbox context
    compose.tsx             # create-post flow context
    search.tsx              # ⌘K command-palette context
  pages/
    HomePage.tsx            # feed + right rail
    ExplorePage.tsx         # masonry mosaic + filter chips
    ProfilePage.tsx         # glass profile header + post grid
    NotificationsPage.tsx   # grouped activity feed
    MessagesPage.tsx        # conversation list + glass chat thread
    SavedPage.tsx           # bookmarked posts grid
    SettingsPage.tsx        # accent picker · reduce motion · reset
  components/
    Layout.tsx              # persistent shell (rails + Outlet + scroll-to-top)
    Page.tsx                # opacity-only page-enter (keeps sticky working)
    AuroraBackground.tsx    # the living canvas
    NavRail.tsx · RightRail.tsx · MobileTopBar.tsx · MobileTabBar.tsx
    Stories.tsx · Composer.tsx · FeedTabs.tsx
    FeedCard.tsx            # ★ hero post card
    PostMedia.tsx           # fade-in + double-tap heart / single-tap open
    PostDetailModal.tsx     # ★ two-pane glass lightbox
    ComposeModal.tsx        # ★ create-post flow (pick/upload → caption → share)
    SearchPalette.tsx       # ★ ⌘K search overlay
    PhotoTile.tsx           # square grid tile (profile + saved)
    Avatar.tsx · VerifiedBadge.tsx · Brand.tsx
```

## Signature interactions

- **Tap a photo** → opens the immersive lightbox; **double-tap** → a heart bursts and it's liked
- **Like / save** → spring-pop toggles with animated counts
- **For you / Following** → an aurora pill slides between tabs (shared layout animation)
- **Explore / profile tiles** reveal likes + comments on hover; click opens the lightbox
- Modal closes on **Esc** or backdrop click; routes animate in and scroll to top
- **Create** → pick from the gallery _or upload your own_, caption it, Share → it prepends to your feed
- **⌘K / Ctrl-K** (or the search field) → a command palette across people, tags & posts
- **Comment** in the lightbox → it appears in the thread and **persists**
- **Likes, bookmarks & comments persist** across reloads (localStorage); **Saved** collects them
- **Settings → Accent** recolors the whole app live (Aurora / Sunset / Ocean / Bloom), remembered
- **Messages** thread with aurora bubbles; grouped **notifications**; route-aware nav
- **Stories** lift on hover; respects `prefers-reduced-motion` (plus a manual toggle)

## What's next

Every surface is live, with persistence, photo upload, search, comments, and live theming in
place. The remaining frontier is backend-shaped: real-time **presence/typing** in messages,
threaded **replies**, **optimistic** server sync, and a real **backend / auth**.

---

Made with light. © 2026 Aurora.
