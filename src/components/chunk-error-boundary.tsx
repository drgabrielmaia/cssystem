'use client'

import React from 'react'

interface ChunkErrorBoundaryState {
  hasError: boolean
  errorCount: number
}

interface ChunkErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export class ChunkErrorBoundary extends React.Component<
  ChunkErrorBoundaryProps,
  ChunkErrorBoundaryState
> {
  private retryTimeout: NodeJS.Timeout | null = null

  constructor(props: ChunkErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, errorCount: 0 }
  }

  static getDerivedStateFromError(error: Error): ChunkErrorBoundaryState | null {
    if (
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to import') ||
      error.stack?.includes('chunk')
    ) {
      return {
        hasError: true,
        errorCount: 1
      }
    }

    return null
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('ChunkErrorBoundary capturou erro:', error, errorInfo)
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorCount: 0 })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center min-h-[200px] p-4">
            <div className="text-center space-y-4">
              <div className="text-4xl">⚠️</div>
              <p className="text-gray-400 text-sm">
                Erro ao carregar componente
              </p>
              <div className="flex items-center gap-3 justify-center">
                <button
                  onClick={this.handleRetry}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  Tentar novamente
                </button>
                <button
                  onClick={this.handleReload}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
                >
                  Recarregar pagina
                </button>
              </div>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
