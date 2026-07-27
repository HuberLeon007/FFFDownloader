import { Component, type ErrorInfo, type ReactNode } from "react"
import { createRoot } from "react-dom/client"

import { LOG_PREFIX } from "~lib/utils"
import App from "~popup/App"

import "~styles/globals.source.css"

interface BoundaryState {
  error: Error | null
}

class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  override state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`${LOG_PREFIX} Popup crashed.`, error, info.componentStack)
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface-base p-6 text-center">
          <p className="text-sm font-semibold text-ink">Something broke in the popup.</p>
          <p className="max-w-xs text-xs text-ink-faint">{this.state.error.message}</p>
          <button
            type="button"
            aria-label="Reload the extension popup"
            onClick={() => this.setState({ error: null })}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-surface-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function Popup() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}

const container = document.getElementById("__plasmo") ?? document.body
createRoot(container).render(<Popup />)

export default Popup
