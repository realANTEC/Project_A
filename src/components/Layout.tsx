import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AuroraBackground } from './AuroraBackground'
import { NavRail } from './NavRail'
import { MobileTopBar } from './MobileTopBar'
import { MobileTabBar } from './MobileTabBar'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

/** Persistent app shell — rails and mobile chrome stay mounted across routes. */
export function Layout() {
  return (
    <>
      <AuroraBackground />
      <ScrollToTop />

      <div className="mx-auto flex w-full max-w-[1320px] items-start justify-center gap-4 px-6 sm:px-10 lg:gap-7 lg:px-6">
        <aside className="no-scrollbar sticky top-0 hidden h-dvh w-[244px] shrink-0 overflow-y-auto lg:block">
          <NavRail />
        </aside>

        <div className="min-w-0 flex-1 pb-28 lg:pb-12">
          <MobileTopBar />
          <Suspense
            fallback={
              <div className="grid place-items-center py-32" aria-label="Loading" role="status">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </div>

      <MobileTabBar />
    </>
  )
}
