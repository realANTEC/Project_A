import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/** Catches render-time errors so a single failure can't blank the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Aurora caught an error:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas p-6">
        <div className="glass edge-light max-w-md rounded-4xl p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-white">Something dimmed the aurora</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            An unexpected error interrupted the view. Reloading usually brings it back.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-aurora mt-6 rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow-violet)] transition hover:scale-[1.02] active:scale-95"
          >
            Reload Aurora
          </button>
        </div>
      </div>
    )
  }
}
