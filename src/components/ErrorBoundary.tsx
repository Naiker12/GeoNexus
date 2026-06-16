import * as React from "react"
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/Button"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error("[ErrorBoundary] caught:", error.message, error.stack)
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] componentDidCatch:", error.message, error.stack, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex size-full min-h-[24rem] flex-col items-center justify-center gap-4 p-8">
          <div className="flex size-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangleIcon className="size-6 text-red-500" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">Error al cargar el grafo</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {this.state.error?.message || "Ocurrió un error inesperado."}
            </p>
            {this.state.error?.stack && (
              <pre className="mt-4 max-h-48 overflow-auto rounded border bg-muted p-3 text-left font-mono text-xs text-muted-foreground">
                {this.state.error.stack}
              </pre>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
          >
            <RefreshCwIcon className="size-4" />
            Reintentar
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
