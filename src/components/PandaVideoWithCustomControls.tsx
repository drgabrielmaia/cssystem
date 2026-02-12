'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  SkipBack, 
  SkipForward, 
  Settings,
  RotateCcw,
  RotateCw
} from 'lucide-react'

interface PandaVideoWithCustomControlsProps {
  embedUrl: string
  title: string
  className?: string
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
}

export function PandaVideoWithCustomControls({
  embedUrl,
  title,
  className = '',
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded
}: PandaVideoWithCustomControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Simula progresso do vídeo (já que não temos acesso direto ao iframe)
  const [simulatedProgress, setSimulatedProgress] = useState(0)
  const [estimatedDuration] = useState(1800) // 30 min default, pode ser ajustado

  // Ocultar controles automaticamente após 3 segundos
  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (showControls && isPlaying) {
      timeout = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
    return () => clearTimeout(timeout)
  }, [showControls, isPlaying])

  // Simular progresso quando estiver tocando
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setSimulatedProgress(prev => {
          const newTime = Math.min(prev + 1, estimatedDuration)
          setCurrentTime(newTime)
          onTimeUpdate?.(newTime, estimatedDuration)
          if (newTime >= estimatedDuration) {
            setIsPlaying(false)
            onEnded?.()
          }
          return newTime
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlaying, estimatedDuration, onTimeUpdate, onEnded])

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
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlayPause()
          break
        case 'KeyF':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'KeyM':
          e.preventDefault()
          toggleMute()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skipTime(-10)
          break
        case 'ArrowRight':
          e.preventDefault()
          skipTime(10)
          break
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
        case 'Digit5':
        case 'Digit6':
        case 'Digit7':
        case 'Digit8':
          e.preventDefault()
          const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
          const speedIndex = parseInt(e.key) - 1
          if (speeds[speedIndex]) {
            handleSpeedChange(speeds[speedIndex])
          }
          break
      }
    }

    if (isFullscreen || showControls) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, showControls])

  const togglePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying)
    if (!isPlaying) {
      onPlay?.()
    } else {
      onPause?.()
    }
    
    // Tenta comunicar com o iframe PandaVideo
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({
        type: isPlaying ? 'pause' : 'play'
      }, '*')
    }
  }, [isPlaying, onPlay, onPause])

  const skipTime = useCallback((seconds: number) => {
    const newTime = Math.max(0, Math.min(estimatedDuration, simulatedProgress + seconds))
    setSimulatedProgress(newTime)
    setCurrentTime(newTime)
    
    // Tenta comunicar com o iframe
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({
        type: 'seek',
        time: newTime
      }, '*')
    }
  }, [simulatedProgress, estimatedDuration])

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted)
    
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({
        type: 'mute',
        muted: !isMuted
      }, '*')
    }
  }, [isMuted])

  const toggleFullscreen = useCallback(async () => {
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
  }, [isFullscreen])

  const seekTo = useCallback((percentage: number) => {
    const newTime = (percentage / 100) * estimatedDuration
    setSimulatedProgress(newTime)
    setCurrentTime(newTime)
    
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({
        type: 'seek',
        time: newTime
      }, '*')
    }
  }, [estimatedDuration])

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackRate(speed)
    setShowSettings(false)
    
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({
        type: 'playbackRate',
        rate: speed
      }, '*')
    }
  }, [])

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const generatePandaUrl = () => {
    const baseUrl = `https://player-vz-00efd930-2fc.tv.pandavideo.com.br/embed/?v=${embedUrl}`
    const params = [
      'controls=0', // Remover controles nativos
      'showinfo=0',
      'modestbranding=1',
      'autoplay=0',
      'rel=0',
      'playsinline=1',
      'allowfullscreen=1',
      'responsive=1'
    ]
    return `${baseUrl}&${params.join('&')}`
  }

  const progressPercentage = estimatedDuration > 0 ? (simulatedProgress / estimatedDuration) * 100 : 0

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black ${isFullscreen ? 'w-screen h-screen' : 'w-full h-full'} ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !showSettings && setShowControls(false)}
      onMouseMove={() => setShowControls(true)}
    >
      {/* PandaVideo Iframe */}
      <iframe
        ref={iframeRef}
        src={generatePandaUrl()}
        className="w-full h-full"
        style={{ border: 'none' }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen={true}
        title={title}
        onLoad={() => setIsLoading(false)}
      />

      {/* Overlay transparente para capturar cliques */}
      <div 
        className="absolute inset-0 bg-transparent cursor-pointer"
        onClick={togglePlayPause}
      />

      {/* Play Button Overlay */}
      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 pointer-events-none">
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-4">
            <Play className="w-12 h-12 text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Custom Controls Overlay */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-300 pointer-events-auto z-50 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Progress Bar */}
        <div className="px-4 pb-2">
          <div className="relative h-1 bg-white bg-opacity-30 rounded-full cursor-pointer group"
               onClick={(e) => {
                 const rect = e.currentTarget.getBoundingClientRect()
                 const percentage = ((e.clientX - rect.left) / rect.width) * 100
                 seekTo(percentage)
               }}>
            {/* Current Progress */}
            <div 
              className="absolute left-0 top-0 h-full bg-red-500 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
            {/* Seek Handle */}
            <div 
              className="absolute w-3 h-3 bg-red-500 rounded-full top-1/2 transform -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="flex items-center space-x-2">
            {/* Play/Pause */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                togglePlayPause()
              }}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>

            {/* Skip Controls */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                skipTime(-10)
              }}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                skipTime(10)
              }}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            {/* Volume */}
            <div className="flex items-center space-x-2 group">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleMute()
                }}
                className="text-white hover:text-gray-300 transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>

            {/* Time Display */}
            <span className="text-white text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(estimatedDuration)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Speed Control */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowSettings(!showSettings)
                }}
                className="text-white hover:text-gray-300 transition-colors flex items-center space-x-1"
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm">{playbackRate}x</span>
              </button>

              {/* Speed Menu */}
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 bg-black bg-opacity-90 backdrop-blur-sm rounded-lg p-2 min-w-[120px]">
                  <div className="text-white text-sm font-medium mb-2 px-2">Velocidade</div>
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSpeedChange(speed)
                      }}
                      className={`block w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                        playbackRate === speed 
                          ? 'bg-red-500 text-white' 
                          : 'text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-20'
                      }`}
                    >
                      {speed}x {speed === 1 ? '(Normal)' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFullscreen()
              }}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Title */}
      {title && showControls && (
        <div className="absolute top-4 left-4 text-white z-40 pointer-events-none">
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
      )}

      {/* Instructions */}
      {showControls && (
        <div className="absolute top-4 right-4 text-white text-sm bg-black bg-opacity-50 backdrop-blur-sm rounded-lg p-3 pointer-events-none z-40">
          <div className="font-medium mb-2">Controles Avançados:</div>
          <div className="space-y-1 text-xs">
            <div>Espaço: Play/Pause</div>
            <div>← →: -10s/+10s</div>
            <div>1-8: Velocidade</div>
            <div>F: Tela cheia</div>
          </div>
        </div>
      )}
    </div>
  )
}