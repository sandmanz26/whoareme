import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * The last line of defence against a blank page.
 *
 * A render error anywhere below this boundary would otherwise unmount the whole
 * tree and leave a white screen with a console message only a developer would
 * see. This keeps the failure visible and recoverable.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Render error:", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-5 text-center">
          <h1 className="display text-3xl">Something went wrong</h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            The page failed to render. Reloading usually clears it.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-7 cursor-pointer rounded-pill bg-ink px-5 py-2.5 font-display text-sm font-semibold text-paper"
          >
            Reload the page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
