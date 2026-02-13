'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Play, 
  Pause, 
  Maximize, 
  Minimize, 
  Settings,
  RotateCcw,
  RotateCw
} from 'lucide-react'

interface SimplePandaPlayerWithControlsProps {
  embedUrl: string
  title: string
  className?: string
}

export function SimplePandaPlayerWithControls({
  embedUrl,
  title,
  className = ''
}: SimplePandaPlayerWithControlsProps) {
  const [showControls, setShowControls] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Detectar fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showControls && !isFullscreen) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlayPause()
          break
        case 'KeyF':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'ArrowLeft':
          e.preventDefault()
          sendMessageToVideo('seek', -10)
          break
        case 'ArrowRight':
          e.preventDefault()
          sendMessageToVideo('seek', 10)
          break
        case 'Digit1':
          e.preventDefault()
          handleSpeedChange(0.5)
          break
        case 'Digit2':
          e.preventDefault()
          handleSpeedChange(0.75)
          break
        case 'Digit3':
          e.preventDefault()
          handleSpeedChange(1)
          break
        case 'Digit4':
          e.preventDefault()
          handleSpeedChange(1.25)
          break
        case 'Digit5':
          e.preventDefault()
          handleSpeedChange(1.5)
          break
        case 'Digit6':
          e.preventDefault()
          handleSpeedChange(1.75)
          break
        case 'Digit7':
          e.preventDefault()
          handleSpeedChange(2)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showControls, isFullscreen])

  const sendMessageToVideo = (action: string, value?: any) => {
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.postMessage({
          type: 'panda_control',
          action,
          value
        }, '*')
      } catch (error) {
        console.log('PostMessage não suportado, usando JavaScript injection')
        // Fallback: tenta injetar JavaScript no iframe
        try {
          const iframe = iframeRef.current
          if (iframe.contentDocument) {
            const script = iframe.contentDocument.createElement('script')
            if (action === 'speed') {
              script.innerHTML = `
                try {
                  const videos = document.querySelectorAll('video');
                  videos.forEach(v => v.playbackRate = ${value});
                } catch(e) {}
              `
            }
            iframe.contentDocument.head.appendChild(script)
          }
        } catch (e) {
          console.log('Controle de vídeo não disponível')
        }
      }
    }
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
    sendMessageToVideo('toggle')
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    try {
      if (isFullscreen) {
        await document.exitFullscreen()
      } else {
        await containerRef.current.requestFullscreen()
      }
    } catch (error) {
      console.error('Erro ao alternar fullscreen:', error)
    }
  }

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed)
    setShowSettings(false)
    sendMessageToVideo('speed', speed)
    
    // Fallback: usar URL do PandaVideo com parâmetro de velocidade
    if (iframeRef.current) {
      const currentSrc = iframeRef.current.src
      const newSrc = currentSrc.includes('playbackRate=') 
        ? currentSrc.replace(/playbackRate=[\d.]+/, `playbackRate=${speed}`)
        : `${currentSrc}&playbackRate=${speed}`
      
      // Não recarrega o iframe, só manda o comando
      sendMessageToVideo('speed', speed)
    }
  }

  const generatePandaUrl = () => {
    const baseUrl = `https://player-vz-00efd930-2fc.tv.pandavideo.com.br/embed/?v=${embedUrl}`
    const params = [
      'controls=1', // Controles nativos do PandaVideo
      'allowfullscreen=1', // Fullscreen
      'responsive=1', // Responsivo
      'autoplay=0', // Não autoplay
      'showinfo=1', // Mostrar informações
      'rel=0', // Não mostrar vídeos relacionados
      'playsinline=1', // Play inline em mobile
      'speed=1', // Controle de velocidade habilitado
      'keyboard=1', // Atalhos de teclado habilitados
      'quality=auto', // Qualidade automática
      'cc=0', // Closed captions
      'theme=dark', // Tema escuro
      'color=red' // Cor dos controles
    ]
    return `${baseUrl}&${params.join('&')}`
  }

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black group ${isFullscreen ? 'w-screen h-screen' : 'w-full h-full'} ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !showSettings && setShowControls(false)}
    >
      {/* PandaVideo Iframe Original */}
      <iframe
        ref={iframeRef}
        src={generatePandaUrl()}
        className="w-full h-full"
        style={{ border: 'none' }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen={true}
        title={title}
      />

      {/* Controles Customizados Overlay */}
      <div className={`absolute inset-0 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
        
        {/* Controles Superiores */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-auto">
          <div>
            {title && (
              <h3 className="text-white text-lg font-medium bg-black bg-opacity-50 backdrop-blur-sm rounded-lg px-3 py-2">
                {title}
              </h3>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Controle de Velocidade */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowSettings(!showSettings)
                }}
                className="bg-black bg-opacity-70 backdrop-blur-sm text-white p-3 rounded-lg hover:bg-opacity-90 transition-all flex items-center space-x-2"
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-medium">{playbackRate}x</span>
              </button>

              {/* Menu de Velocidade */}
              {showSettings && (
                <div className="absolute top-full right-0 mt-2 bg-black bg-opacity-90 backdrop-blur-sm rounded-lg p-3 min-w-[140px] z-50">
                  <div className="text-white text-sm font-medium mb-3">Velocidade</div>
                  <div className="space-y-1">
                    {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                      <button
                        key={speed}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSpeedChange(speed)
                        }}
                        className={`block w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          playbackRate === speed 
                            ? 'bg-red-500 text-white font-medium' 
                            : 'text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-20'
                        }`}
                      >
                        {speed}x {speed === 1 ? '(Normal)' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFullscreen()
              }}
              className="bg-black bg-opacity-70 backdrop-blur-sm text-white p-3 rounded-lg hover:bg-opacity-90 transition-all"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Controles Centrais (Atalhos Rápidos) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          <div className="flex items-center space-x-6">
            {/* Voltar 10s */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                sendMessageToVideo('seek', -10)
              }}
              className="bg-black bg-opacity-70 backdrop-blur-sm text-white p-4 rounded-full hover:bg-opacity-90 transition-all hover:scale-110"
            >
              <RotateCcw className="w-6 h-6" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                togglePlayPause()
              }}
              className="bg-black bg-opacity-70 backdrop-blur-sm text-white p-6 rounded-full hover:bg-opacity-90 transition-all hover:scale-110"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>

            {/* Avançar 10s */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                sendMessageToVideo('seek', 10)
              }}
              className="bg-black bg-opacity-70 backdrop-blur-sm text-white p-4 rounded-full hover:bg-opacity-90 transition-all hover:scale-110"
            >
              <RotateCw className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Instruções de Atalhos */}
        {showControls && (
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 backdrop-blur-sm text-white text-sm rounded-lg p-4 pointer-events-auto">
            <div className="font-medium mb-2">Atalhos:</div>
            <div className="space-y-1 text-xs">
              <div><span className="font-mono bg-white bg-opacity-20 px-1 rounded">Espaço</span>: Play/Pause</div>
              <div><span className="font-mono bg-white bg-opacity-20 px-1 rounded">← →</span>: -10s/+10s</div>
              <div><span className="font-mono bg-white bg-opacity-20 px-1 rounded">1-7</span>: Velocidade</div>
              <div><span className="font-mono bg-white bg-opacity-20 px-1 rounded">F</span>: Tela cheia</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}