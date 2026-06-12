import { Check, LogOut, Palette, RotateCcw, Zap } from 'lucide-react'
import { ACCENTS, useTheme } from '@/lib/theme'
import { useAuth } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import { Page } from '@/components/Page'

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        value ? 'bg-aurora' : 'bg-white/15',
      )}
    >
      <span
        className={cn(
          // GPU-composited slide (translate, not `left`) so the knob can't trigger layout.
          'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out',
          value ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}

export function SettingsPage() {
  const { accent, setAccent, reduceMotion, setReduceMotion } = useTheme()
  const { session, profile, signOut } = useAuth()

  function reset() {
    try {
      for (const k of [
        'aurora:liked',
        'aurora:saved',
        'aurora:comments',
        'aurora:accent',
        'aurora:reduce-motion',
      ]) {
        localStorage.removeItem(k)
      }
    } catch {
      /* ignore */
    }
    window.location.href = import.meta.env.BASE_URL
  }

  return (
    <Page className="mx-auto max-w-[680px]">
      <div className="sticky top-16 z-30 lg:top-0 -mx-3 mb-5 bg-gradient-to-b from-canvas via-canvas/85 to-transparent px-3 pb-3 pt-4 backdrop-blur-md lg:-mx-1 lg:px-1 lg:pt-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Settings</h1>
      </div>

      {/* Account */}
      {isSupabaseConfigured && session && (
        <section className="glass edge-light mb-5 flex items-center gap-4 rounded-4xl p-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-white">Account</h2>
            <p className="truncate text-sm text-white/55">
              {session.user.email ?? (profile ? `@${profile.username}` : 'Guest session')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="glass-inset flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </section>
      )}

      {/* Accent */}
      <section className="glass edge-light rounded-4xl p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Palette className="h-4 w-4 text-lilac" /> Accent
        </h2>
        <p className="mt-0.5 text-sm text-white/55">
          Recolor the entire aurora — applied instantly, remembered next time.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(ACCENTS).map(([key, a]) => (
            <button
              key={key}
              type="button"
              onClick={() => setAccent(key)}
              aria-pressed={accent === key}
              className={cn(
                'group overflow-hidden rounded-2xl text-left transition',
                accent === key ? 'ring-2 ring-white/70' : 'ring-1 ring-white/10 hover:ring-white/30',
              )}
            >
              <span
                className="block h-20 w-full"
                style={{
                  backgroundImage: `linear-gradient(120deg, ${a.colors.iris}, ${a.colors.magenta} 52%, ${a.colors.pink})`,
                }}
              />
              <span className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-medium text-white">{a.label}</span>
                {accent === key && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Motion */}
      <section className="glass edge-light mt-5 flex items-center gap-4 rounded-4xl p-6">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.06] text-cyan">
          <Zap className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-white">Reduce motion</h2>
          <p className="text-sm text-white/55">Calm the ambient drift and transitions.</p>
        </div>
        <Toggle value={reduceMotion} onChange={setReduceMotion} />
      </section>

      {/* Data */}
      <section className="glass edge-light mt-5 flex items-center gap-4 rounded-4xl p-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-white">Reset everything</h2>
          <p className="text-sm text-white/55">Clear saved likes, bookmarks, comments and preferences.</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="glass-inset flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-white/[0.08]"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </section>

      <p className="mt-8 text-center text-xs text-white/55">Soul ✦ made with light</p>
    </Page>
  )
}
