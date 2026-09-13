import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface State {
  error: Error | null
}

/**
 * Catches render errors so a bug in one page never blanks the whole window.
 * The technical detail stays in the console/log; the user gets a plain message and a way back.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; onReset?: () => void }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Renderer error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-warning" />
        <div className="text-sm font-medium">Something went wrong on this screen</div>
        <div className="max-w-md text-xs text-fg-muted">The error has been logged. Your data is safe — try going back to the dashboard.</div>
        <button
          type="button"
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg"
          onClick={() => {
            this.setState({ error: null })
            this.props.onReset?.()
          }}
        >
          Back to dashboard
        </button>
      </div>
    )
  }
}
