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

  const generatePandaUrl = (mobile: boolean = false, retryAttempt: number = 0) => {
    const baseUrl = `https://player-vz-00efd930-2fc.tv.pandavideo.com.br/embed/?v=${embedUrl}`

    // Estratégias baseadas na documentação oficial do PandaVideo
    const strategies = [
      // Tentativa 1: Controles completos do PandaVideo
      [
        'controls=play-large,play,progress,current-time,volume,captions,settings,pip,fullscreen',
        'autoplay=false',
        'muted=false'
      ],

      // Tentativa 2: Controles essenciais com settings (engrenagem)
      [
        'controls=play,progress,current-time,settings,fullscreen',
        'autoplay=false'
      ],

      // Tentativa 3: Controles básicos garantidos
      [
        'controls=play,progress,settings,fullscreen'
      ],

      // Tentativa 4: Mínimo funcional
      [
        'controls=play,settings'
      ]
    ]

    const params = strategies[Math.min(retryAttempt, strategies.length - 1)]
    return `${baseUrl}&${params.join('&')}`
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
    const newRetryCount = retryCount + 1
    setRetryCount(newRetryCount)
    setHasError(false)
    setIsLoading(true)

    console.log(`🔄 Retry #${newRetryCount} - Tentando estratégia ${newRetryCount}`)

    // Força reload do iframe com nova estratégia
    if (iframeRef.current) {
      iframeRef.current.src = generatePandaUrl(isMobile, newRetryCount - 1)
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
            ? `Erro de domínio PandaVideo no mobile (tentativa ${retryCount + 1}/4)`
            : 'Não foi possível carregar o player de vídeo.'
          }
        </p>

        <div className="space-y-3">
          <button
            onClick={retryLoad}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar estratégia {retryCount + 1}
          </button>

          {retryCount >= 2 && (
            <button
              onClick={() => {
                const directUrl = `https://player-vz-00efd930-2fc.tv.pandavideo.com.br/embed/?v=${embedUrl}&domain=cs.medicosderesultado.com.br`
                window.open(directUrl, '_blank', 'width=800,height=600')
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Abrir em nova aba
            </button>
          )}

          {isMobile && (
            <div className="text-xs text-gray-500 text-center max-w-sm">
              💡 No mobile, o PandaVideo tem validações extras. URL atual: cs.medicosderesultado.com.br
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
        src={generatePandaUrl(isMobile, retryCount)}
        className="w-full h-full"
        style={{ border: 'none' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
        allowFullScreen={true}
        title={title}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
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