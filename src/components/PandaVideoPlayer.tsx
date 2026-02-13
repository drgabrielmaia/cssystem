'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Play } from 'lucide-react'

interface PandaVideoPlayerProps {
  embedUrl: string
  title: string
  className?: string
}

export function PandaVideoPlayer({ embedUrl, title, className }: PandaVideoPlayerProps) {
  const [hasError, setHasError] = useState(false)

  // Usar a estrutura oficial simples do PandaVideo
  const pandaUrl = `https://player-vz-00efd930-2fc.tv.pandavideo.com.br/embed/?v=${embedUrl}`

  useEffect(() => {
    // Reset error state quando URL mudar
    setHasError(false)
  }, [embedUrl])

  const openInNewTab = () => {
    const fullUrl = `${pandaUrl}&controls=play-large,play,progress,current-time,volume,captions,settings,pip,fullscreen&autoplay=false&muted=false`
    window.open(fullUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
  }

  if (hasError) {
    return (
      <div className={`bg-gray-900 flex flex-col items-center justify-center text-white p-8 ${className}`}>
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Vídeo não disponível no iframe</h3>
        <p className="text-gray-400 text-center mb-6 max-w-md">
          O PandaVideo pode ter restrições de domínio para este vídeo. Clique no botão abaixo para assistir.
        </p>

        <button
          onClick={openInNewTab}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Play className="w-5 h-5" />
          Assistir Vídeo
        </button>
      </div>
    )
  }

  return (
    <div className={`relative bg-gray-900 ${className}`}>
      {/* Estrutura oficial do PandaVideo - Simples e Funcional */}
      <iframe
        id={`panda-${embedUrl}`}
        src={pandaUrl}
        className="w-full h-full border-0"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        title={title}
        onError={() => setHasError(true)}
        onLoad={() => console.log('🎥 PandaVideo iframe carregado')}
      />
      
      {/* Botão de fallback sobreposto */}
      <div className="absolute top-4 right-4">
        <button
          onClick={openInNewTab}
          className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-lg transition-colors text-sm"
          title="Abrir em nova aba"
        >
          <Play className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}