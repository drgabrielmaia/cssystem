import { Loader2, RefreshCw, AlertCircle } from 'lucide-react'

interface LoadingStateProps {
  loading: boolean
  error?: Error | null
  stage?: string
  retryAttempt?: number
  maxAttempts?: number
  onRetry?: () => void
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingState({
  loading,
  error,
  stage,
  retryAttempt,
  maxAttempts = 3,
  onRetry,
  size = 'md'
}: LoadingStateProps) {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const paddingSizes = {
    sm: 'py-4',
    md: 'py-8',
    lg: 'py-12'
  }

  if (!loading && !error) return null

  return (
    <div className={`flex flex-col items-center justify-center ${paddingSizes[size]} space-y-3`}>
      {loading && (
        <>
          <Loader2 className={`${iconSizes[size]} animate-spin text-orange-500`} />
          {stage && <div className="text-sm text-gray-600">{stage}</div>}
          {retryAttempt && retryAttempt > 1 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <RefreshCw className="w-3 h-3" />
              Tentativa {retryAttempt}/{maxAttempts}
            </div>
          )}
        </>
      )}

      {error && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-xs text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span>
              {error.message || "Erro ao carregar dados"}
            </span>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Tentar novamente
            </button>
          )}
        </div>
      )}
    </div>
  )
}