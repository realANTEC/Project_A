import { type FormEvent, useState } from 'react'
import { motion } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { AuroraBackground } from './AuroraBackground'
import { Brand } from './Brand'

function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-white/55">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="glass-inset w-full rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/55 focus:outline-none"
      />
    </label>
  )
}

/** Full-screen glass auth screen shown when Supabase is configured but signed out. */
export function AuthGate() {
  const { signInWithPassword, signUp, signInAsGuest } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    const res =
      mode === 'signin'
        ? await signInWithPassword(email, password)
        : await signUp(email, password, username.trim() || email.split('@')[0])
    setLoading(false)
    if (res.error) setError(res.error)
    else if (res.needsConfirmation) setInfo('Check your email to confirm your account, then sign in.')
  }

  async function guest() {
    setError(null)
    setInfo(null)
    setLoading(true)
    const res = await signInAsGuest()
    setLoading(false)
    if (res.error) setError(res.error)
  }

  return (
    <>
      <AuroraBackground />
      <main className="grid min-h-dvh place-items-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="glass edge-light w-full max-w-md overflow-hidden rounded-5xl p-8"
        >
          <div className="flex flex-col items-center text-center">
            <Brand />
            <h1 className="mt-6 font-display text-2xl font-bold text-white">
              {mode === 'signin' ? 'Welcome back' : 'Join Aurora'}
            </h1>
            <p className="mt-1 text-sm text-white/50">
              {mode === 'signin'
                ? 'Sign in to your luminous feed.'
                : 'Create an account to share something beautiful.'}
            </p>
          </div>

          <div role="tablist" className="glass-inset mt-6 flex rounded-full p-1">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m)
                  setError(null)
                  setInfo(null)
                }}
                className="relative flex-1 rounded-full py-2 text-sm font-medium"
              >
                {mode === m && (
                  <motion.span
                    layoutId="auth-tab"
                    className="bg-aurora absolute inset-0 rounded-full shadow-[var(--shadow-glow-violet)]"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className={cn('relative', mode === m ? 'text-white' : 'text-white/55')}>
                  {m === 'signin' ? 'Sign in' : 'Create account'}
                </span>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3">
            {mode === 'signup' && (
              <Field
                label="Username"
                value={username}
                onChange={setUsername}
                placeholder="yourname"
                autoComplete="username"
              />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
            />

            {error && (
              <p role="alert" className="text-sm text-rose-300">
                {error}
              </p>
            )}
            {info && <p className="text-sm text-cyan">{info}</p>}

            <button
              type="submit"
              disabled={loading}
              className="bg-aurora animate-gradient flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-glow-violet)] transition enabled:hover:scale-[1.02] disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-white/55">
            <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={guest}
            disabled={loading}
            className="glass-inset w-full rounded-2xl px-5 py-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.08] disabled:opacity-60"
          >
            Continue as guest
          </button>
        </motion.div>
      </main>
    </>
  )
}
