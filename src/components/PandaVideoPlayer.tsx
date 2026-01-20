'use client'

import { useState, useEffect, useRef } from 'react'
import { AlertCircle, RefreshCw, Play } from 'lucide-react'

interface PandaVideoPlayerProps {
  embedUrl: string
  title: string
  className?: string
}

export function PandaVideoPlayer({ embedUrl, title, className }: PandaVideoPlayerProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const isSmallScreen = window.innerWidth <= 768
      setIsMobile(isMobileDevice || isSmallScreen)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const generatePandaUrl = (mobile: boolean = false) => {
    const baseUrl = `https://player-vz-00efd930-2fc.tv.pandavideo.com.br/embed/?v=${embedUrl}`

    // Parâmetros específicos para mobile
    const mobileParams = mobile ? [
      'mobile=true',
      'responsive=true',
      'allowfullscreen=true',
      'autoplay=false',
      'controls=true',
      'skin=dark',
      'muted=false',
      'loop=false',
      'preload=metadata'
    ] : [
      'allowfullscreen=true',
      'responsive=true',
      'autoplay=false',
      'controls=true',
      'skin=dark'
    ]

    return `${baseUrl}&${mobileParams.join('&')}`
  }

  const handleIframeLoad = () => {
    console.log('🎥 PandaVideo carregado com sucesso')
    setIsLoading(false)
    setHasError(false)
  }

  const handleIframeError = () => {
    console.error('❌ Erro ao carregar PandaVideo')
    setHasError(true)
    setIsLoading(false)
  }

  const retryLoad = () => {
    setRetryCount(prev => prev + 1)
    setHasError(false)
    setIsLoading(true)

    // Força reload do iframe
    if (iframeRef.current) {
      iframeRef.current.src = generatePandaUrl(isMobile)
    }
  }

  // Detectar se o iframe foi bloqueado (timeout)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading && !hasError) {
        console.warn('⚠️ PandaVideo demorou para carregar, possível bloqueio')
        setHasError(true)
        setIsLoading(false)
      }
    }, 15000) // 15 segundos timeout

    return () => clearTimeout(timer)
  }, [isLoading, hasError, retryCount])

  if (hasError) {
    return (
      <div className={`bg-gray-900 flex flex-col items-center justify-center text-white p-8 ${className}`}>
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar vídeo</h3>
        <p className="text-gray-400 text-center mb-6 max-w-md">
          {isMobile
            ? 'Problema de compatibilidade mobile detectado. Tentando soluções...'
            : 'Não foi possível carregar o player de vídeo.'
          }
        </p>

        <div className="space-y-3">
          <button
            onClick={retryLoad}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente ({retryCount + 1})
          </button>

          {isMobile && (
            <div className="text-xs text-gray-500 text-center max-w-sm">
              💡 Dica: Se o problema persistir, tente abrir em outro navegador ou ative o modo desktop
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center text-white z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-3"></div>
            <p className="text-sm text-gray-400">Carregando vídeo...</p>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={generatePandaUrl(isMobile)}
        className="w-full h-full"
        style={{ border: 'none' }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen; microphone; camera"
        allowFullScreen={true}
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-popups"
        title={title}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        // Atributos específicos para mobile
        {...(isMobile && {
          'data-mobile': 'true',
          'data-responsive': 'true'
        })}
      />

      {/* Overlay transparente para capturar cliques em mobile */}
      {isMobile && isLoading && (
        <div
          className="absolute inset-0 bg-transparent cursor-pointer z-5"
          onClick={() => {
            console.log('🎥 Clique detectado em mobile, tentando ativar player')
            if (iframeRef.current) {
              iframeRef.current.focus()
            }
          }}
        />
      )}
    </div>
  )
}