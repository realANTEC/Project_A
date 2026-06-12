import { lazy, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, type Location } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/lib/theme'
import { AuthProvider, useAuth } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useFeedRealtime } from '@/lib/realtime'
import { useInboxRealtime } from '@/lib/messages'
import { useNotificationsRealtime } from '@/lib/notifications'
import { FeedProvider } from '@/lib/feed-store'
import { PresenceProvider } from '@/lib/presence'
import { ToastProvider } from '@/lib/toast'
import { CallProvider } from '@/lib/calls'
import { PostModalProvider } from '@/lib/post-modal'
import { ComposeProvider } from '@/lib/compose'
import { SearchProvider } from '@/lib/search'
import { AuroraBackground } from '@/components/AuroraBackground'
import { Brand } from '@/components/Brand'
import { AuthGate } from '@/components/AuthGate'
import { Layout } from '@/components/Layout'
// Route pages are code-split — each loads on demand.
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const ExplorePage = lazy(() => import('@/pages/ExplorePage').then((m) => ({ default: m.ExplorePage })))
const NotificationsPage = lazy(() =>
  import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
)
const MessagesPage = lazy(() => import('@/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })))
const SavedPage = lazy(() => import('@/pages/SavedPage').then((m) => ({ default: m.SavedPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const PostDetailPage = lazy(() =>
  import('@/pages/PostDetailPage').then((m) => ({ default: m.PostDetailPage })),
)

function Splash() {
  return (
    <>
      <AuroraBackground />
      <div className="grid min-h-dvh place-items-center">
        <div className="animate-float">
          <Brand />
        </div>
      </div>
    </>
  )
}

function AppShell() {
  const { ready, session } = useAuth()
  const location = useLocation()
  // The history key of the first entry this app instance saw (a direct link or a reload).
  const [initialKey] = useState(() => location.key)
  useFeedRealtime()
  useInboxRealtime()
  useNotificationsRealtime()

  if (!ready) return <Splash />
  if (isSupabaseConfigured && !session) return <AuthGate />

  // Modal-as-route: an in-app post open pushes `/p/:id` with the feed stashed as
  // `background`, so the feed stays mounted under the lightbox. The very first
  // history entry (a direct link or a reload) ignores any rehydrated `background`
  // and renders the full PostDetailPage instead of an empty feed.
  const onInitialEntry = location.key === initialKey
  const background = onInitialEntry
    ? undefined
    : (location.state as { background?: Location } | null)?.background

  return (
    <PresenceProvider>
      <ToastProvider>
        <CallProvider>
          <FeedProvider>
            <PostModalProvider>
              <ComposeProvider>
                <SearchProvider>
                  <Routes location={background ?? location}>
                    <Route path="/" element={<Layout />}>
                      <Route index element={<HomePage />} />
                      <Route path="explore" element={<ExplorePage />} />
                      <Route path="notifications" element={<NotificationsPage />} />
                      <Route path="messages" element={<MessagesPage />} />
                      <Route path="messages/:conversationId" element={<MessagesPage />} />
                      <Route path="saved" element={<SavedPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                      <Route path="u/:handle" element={<ProfilePage />} />
                      <Route path="p/:id" element={<PostDetailPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                  </Routes>
                </SearchProvider>
              </ComposeProvider>
            </PostModalProvider>
          </FeedProvider>
        </CallProvider>
      </ToastProvider>
    </PresenceProvider>
  )
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})

// Router base mirrors Vite's build base ('/' in dev, a subpath on GitHub Pages).
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter basename={basename}>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <AppShell />
          </QueryClientProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
