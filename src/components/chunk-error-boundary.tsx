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
    // Detectar se é um erro de chunk
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

    // Auto-reload se for erro de chunk
    if (this.state.hasError && this.state.errorCount <= 3) {
      this.retryTimeout = setTimeout(() => {
        window.location.reload()
      }, 1500)
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center min-h-[200px] p-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400 text-sm">
                Recarregando aplicação...
              </p>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}