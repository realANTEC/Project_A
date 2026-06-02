import { lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/lib/theme'
import { AuthProvider, useAuth } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useFeedRealtime } from '@/lib/realtime'
import { useInboxRealtime } from '@/lib/messages'
import { FeedProvider } from '@/lib/feed-store'
import { PresenceProvider } from '@/lib/presence'
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
  useFeedRealtime()
  useInboxRealtime()

  if (!ready) return <Splash />
  if (isSupabaseConfigured && !session) return <AuthGate />

  return (
    <PresenceProvider>
      <FeedProvider>
        <PostModalProvider>
          <ComposeProvider>
            <SearchProvider>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="explore" element={<ExplorePage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="messages" element={<MessagesPage />} />
                  <Route path="messages/:conversationId" element={<MessagesPage />} />
                  <Route path="saved" element={<SavedPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="u/:handle" element={<ProfilePage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </SearchProvider>
          </ComposeProvider>
        </PostModalProvider>
      </FeedProvider>
    </PresenceProvider>
  )
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <AppShell />
          </QueryClientProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
