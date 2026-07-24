import { Component, type ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <AlertTriangle size={36} className="text-ink-muted/30 mb-4" />
          <h3 className="text-sm font-medium text-ink mb-2">出了点问题</h3>
          <p className="text-xs text-ink-muted mb-4 max-w-[300px]">
            {this.state.error?.message || "发生了未知错误"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-ink text-white rounded-full text-xs hover:opacity-90 transition-opacity"
          >
            重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
