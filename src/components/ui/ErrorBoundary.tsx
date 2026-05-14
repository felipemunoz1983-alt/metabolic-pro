'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

/**
 * Global error boundary — catches unhandled render exceptions in client
 * components and shows a recovery UI instead of a blank page.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error)
    return { hasError: true, message }
  }

  componentDidCatch(error: unknown, info: { componentStack?: string }) {
    console.error('[ErrorBoundary] Caught error:', error, info?.componentStack ?? '')
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <h3 className="text-base font-bold text-[#0C1F2C] mb-2">Algo salió mal</h3>
          <p className="text-xs text-[#8BA5BE] mb-5 max-w-xs leading-relaxed">
            Ocurrió un error inesperado en esta sección. Puedes intentar recargar.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, message: '' })
              window.location.reload()
            }}
            className="flex items-center gap-2 text-xs font-bold bg-[#29ABE2] text-white px-4 py-2.5 rounded-xl hover:bg-[#1a8fc2] transition"
          >
            <RefreshCw size={12} /> Recargar página
          </button>
          {process.env.NODE_ENV === 'development' && this.state.message && (
            <details className="mt-4 text-left max-w-sm">
              <summary className="text-[10px] text-[#8BA5BE] cursor-pointer">Detalles del error</summary>
              <pre className="text-[9px] text-red-500 mt-2 overflow-auto max-h-32 bg-red-50 p-2 rounded-lg">
                {this.state.message}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
