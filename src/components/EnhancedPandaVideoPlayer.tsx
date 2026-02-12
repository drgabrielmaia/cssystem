'use client'

import { useState, useEffect, useRef } from 'react'
import { CustomVideoPlayer } from './CustomVideoPlayer'
import { AlertCircle, RefreshCw, Play, ExternalLink, Settings } from 'lucide-react'

interface EnhancedPandaVideoPlayerProps {
  embedUrl: string
  title: string
  className?: string
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
}

export function EnhancedPandaVideoPlayer({
  embedUrl,
  title,
  className = '',
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded
}: EnhancedPandaVideoPlayerProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [useCustomPlayer, setUseCustomPlayer] = useState(false)
  const [directVideoUrl, setDirectVideoUrl] = useState<string | null>(null)
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

    const strategies = [
      // Estratégia 1: Parâmetros completos com controles avançados
      [
        'controls=1',
        'showinfo=1',
        'autoplay=0',
        'theme=dark',
        'color=white',
        'modestbranding=1',
        'rel=0',
        'playsinline=1',
        'allowfullscreen=1',
        'responsive=1',
        'domain=' + encodeURIComponent(window.location.hostname)
      ],

      // Estratégia 2: Mobile otimizado com controles nativos
      mobile ? [
        'mobile=1',
        'responsive=1',
        'controls=1',
        'playsinline=1',
        'autoplay=0'
      ] : [
        'controls=1',
        'allowfullscreen=1',
        'responsive=1'
      ],

      // Estratégia 3: Minimal com bypass de domínio
      [
        'domain=' + encodeURIComponent('cs.medicosderesultado.com.br'),
        'controls=1'
      ],

      // Estratégia 4: Sem parâmetros extras
      ['controls=1']
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

    if (iframeRef.current) {
      iframeRef.current.src = generatePandaUrl(isMobile, newRetryCount - 1)
    }
  }

  const switchToCustomPlayer = () => {
    // Tenta extrair URL direta do vídeo ou usar uma URL de fallback
    // Em produção, você pode implementar um endpoint que retorna a URL direta do vídeo
    const fallbackUrl = `https://player-vz-00efd930-2fc.tv.pandavideo.com.br/video/${embedUrl}.mp4`
    setDirectVideoUrl(fallbackUrl)
    setUseCustomPlayer(true)
    setHasError(false)
  }

  const openInNewTab = () => {
    const directUrl = generatePandaUrl(isMobile, retryCount)
    window.open(directUrl, '_blank', 'width=1200,height=800')
  }

  // Detectar se o iframe foi bloqueado (timeout)
  useEffect(() => {
    if (!useCustomPlayer) {
      const timer = setTimeout(() => {
        if (isLoading && !hasError) {
          console.warn('⚠️ PandaVideo demorou para carregar, oferecendo alternativas')
          setHasError(true)
          setIsLoading(false)
        }
      }, 10000) // 10 segundos timeout

      return () => clearTimeout(timer)
    }
  }, [isLoading, hasError, retryCount, useCustomPlayer])

  // Player customizado como alternativa
  if (useCustomPlayer && directVideoUrl) {
    return (
      <div className={`relative ${className}`}>
        <CustomVideoPlayer
          src={directVideoUrl}
          title={title}
          className="w-full h-full"
          onTimeUpdate={onTimeUpdate}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
        />
        
        {/* Botão para voltar ao player original */}
        <button
          onClick={() => {
            setUseCustomPlayer(false)
            setDirectVideoUrl(null)
            setHasError(false)
            setIsLoading(true)
            setRetryCount(0)
          }}
          className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-2 rounded-lg hover:bg-opacity-90 transition-all text-xs"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    )
  }

  // Tela de erro com múltiplas opções
  if (hasError) {
    return (
      <div className={`bg-gray-900 flex flex-col items-center justify-center text-white p-8 ${className}`}>
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Problemas para carregar o vídeo?</h3>
        <p className="text-gray-400 text-center mb-6 max-w-md">
          Tente uma das opções abaixo para assistir ao vídeo com controles avançados
        </p>

        <div className="space-y-3 w-full max-w-sm">
          {/* Player customizado */}
          <button
            onClick={switchToCustomPlayer}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Play className="w-4 h-4" />
            Player Avançado (Recomendado)
          </button>

          {/* Tentar recarregar */}
          <button
            onClick={retryLoad}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar recarregar (tentativa {retryCount + 1})
          </button>

          {/* Abrir em nova aba */}
          <button
            onClick={openInNewTab}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir em nova aba
          </button>
        </div>

        {/* Informações adicionais */}
        <div className="mt-6 text-xs text-gray-500 text-center max-w-md space-y-2">
          <p>💡 <strong>Player Avançado:</strong> Controles de velocidade (0.25x-2x), atalhos de teclado, fullscreen aprimorado</p>
          <p>⌨️ <strong>Atalhos:</strong> Espaço (pause), ←→ (10s), ↑↓ (volume), 1-8 (velocidade), F (tela cheia)</p>
        </div>
      </div>
    )
  }

  // Player PandaVideo normal
  return (
    <div className={`relative ${className}`}>
      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center text-white z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-3"></div>
            <p className="text-sm text-gray-400">Carregando vídeo...</p>
            <button
              onClick={switchToCustomPlayer}
              className="mt-3 text-xs text-blue-400 hover:text-blue-300 underline"
            >
              Usar player avançado
            </button>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={generatePandaUrl(isMobile, retryCount)}
        className="w-full h-full"
        style={{ border: 'none' }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen; microphone; camera"
        allowFullScreen={true}
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-popups allow-top-navigation"
        title={title}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />

      {/* Botão de alternativa no canto */}
      {!isLoading && !hasError && (
        <button
          onClick={switchToCustomPlayer}
          className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-all text-xs"
          title="Usar controles avançados"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}