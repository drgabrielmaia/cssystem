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
  Download,
  RotateCcw,
  RotateCw
} from 'lucide-react'

interface CustomVideoPlayerProps {
  src: string
  poster?: string
  title?: string
  className?: string
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
}

export function CustomVideoPlayer({
  src,
  poster,
  title,
  className = '',
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded
}: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [buffered, setBuffered] = useState(0)
  const [lastVolume, setLastVolume] = useState(1)

  // Ocultar controles automaticamente após 3 segundos
  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (isPlaying && showControls) {
      timeout = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
    return () => clearTimeout(timeout)
  }, [isPlaying, showControls])

  // Atualizar tempo e buffer
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => {
      setCurrentTime(video.currentTime)
      onTimeUpdate?.(video.currentTime, video.duration)
    }

    const updateProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        const bufferedPercent = (bufferedEnd / video.duration) * 100
        setBuffered(bufferedPercent)
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setIsLoading(false)
    }

    const handleCanPlay = () => {
      setIsLoading(false)
    }

    const handleWaiting = () => {
      setIsLoading(true)
    }

    const handleCanPlayThrough = () => {
      setIsLoading(false)
    }

    video.addEventListener('timeupdate', updateTime)
    video.addEventListener('progress', updateProgress)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('canplaythrough', handleCanPlayThrough)
    
    video.addEventListener('play', () => {
      setIsPlaying(true)
      onPlay?.()
    })
    
    video.addEventListener('pause', () => {
      setIsPlaying(false)
      onPause?.()
    })
    
    video.addEventListener('ended', () => {
      setIsPlaying(false)
      onEnded?.()
    })

    return () => {
      video.removeEventListener('timeupdate', updateTime)
      video.removeEventListener('progress', updateProgress)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('canplaythrough', handleCanPlayThrough)
    }
  }, [onTimeUpdate, onPlay, onPause, onEnded])

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
      if (!videoRef.current) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlayPause()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skipTime(-10)
          break
        case 'ArrowRight':
          e.preventDefault()
          skipTime(10)
          break
        case 'ArrowUp':
          e.preventDefault()
          changeVolume(0.1)
          break
        case 'ArrowDown':
          e.preventDefault()
          changeVolume(-0.1)
          break
        case 'KeyM':
          e.preventDefault()
          toggleMute()
          break
        case 'KeyF':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'Digit1':
          e.preventDefault()
          setPlaybackRate(0.25)
          break
        case 'Digit2':
          e.preventDefault()
          setPlaybackRate(0.5)
          break
        case 'Digit3':
          e.preventDefault()
          setPlaybackRate(0.75)
          break
        case 'Digit4':
          e.preventDefault()
          setPlaybackRate(1)
          break
        case 'Digit5':
          e.preventDefault()
          setPlaybackRate(1.25)
          break
        case 'Digit6':
          e.preventDefault()
          setPlaybackRate(1.5)
          break
        case 'Digit7':
          e.preventDefault()
          setPlaybackRate(1.75)
          break
        case 'Digit8':
          e.preventDefault()
          setPlaybackRate(2)
          break
      }
    }

    if (isFullscreen || showControls) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, showControls])

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }, [isPlaying])

  const skipTime = useCallback((seconds: number) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds))
  }, [duration])

  const changeVolume = useCallback((delta: number) => {
    const video = videoRef.current
    if (!video) return

    const newVolume = Math.max(0, Math.min(1, volume + delta))
    setVolume(newVolume)
    video.volume = newVolume
    
    if (newVolume > 0 && isMuted) {
      setIsMuted(false)
      video.muted = false
    }
  }, [volume, isMuted])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (isMuted) {
      setIsMuted(false)
      video.muted = false
      setVolume(lastVolume)
      video.volume = lastVolume
    } else {
      setIsMuted(true)
      video.muted = true
      setLastVolume(volume)
      setVolume(0)
    }
  }, [isMuted, volume, lastVolume])

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
    const video = videoRef.current
    if (!video || !duration) return

    const newTime = (percentage / 100) * duration
    video.currentTime = newTime
    setCurrentTime(newTime)
  }, [duration])

  const handleSpeedChange = useCallback((speed: number) => {
    const video = videoRef.current
    if (!video) return

    setPlaybackRate(speed)
    video.playbackRate = speed
    setShowSettings(false)
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

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black ${isFullscreen ? 'w-screen h-screen' : 'w-full h-full'} ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !showSettings && setShowControls(false)}
      onMouseMove={() => setShowControls(true)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        onClick={togglePlayPause}
        onDoubleClick={toggleFullscreen}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Play Button Overlay */}
      {!isPlaying && !isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 cursor-pointer"
          onClick={togglePlayPause}
        >
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-4 hover:bg-opacity-30 transition-all">
            <Play className="w-12 h-12 text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Progress Bar */}
        <div className="px-4 pb-2">
          <div className="relative h-1 bg-white bg-opacity-30 rounded-full cursor-pointer group"
               onClick={(e) => {
                 const rect = e.currentTarget.getBoundingClientRect()
                 const percentage = ((e.clientX - rect.left) / rect.width) * 100
                 seekTo(percentage)
               }}>
            {/* Buffer Progress */}
            <div 
              className="absolute left-0 top-0 h-full bg-white bg-opacity-50 rounded-full"
              style={{ width: `${buffered}%` }}
            />
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
              onClick={togglePlayPause}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>

            {/* Skip Backward */}
            <button
              onClick={() => skipTime(-10)}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Skip Forward */}
            <button
              onClick={() => skipTime(10)}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            {/* Volume */}
            <div className="flex items-center space-x-2 group">
              <button
                onClick={toggleMute}
                className="text-white hover:text-gray-300 transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <div className="w-0 group-hover:w-20 overflow-hidden transition-all duration-200">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value)
                    setVolume(newVolume)
                    if (videoRef.current) {
                      videoRef.current.volume = newVolume
                      videoRef.current.muted = newVolume === 0
                      setIsMuted(newVolume === 0)
                    }
                  }}
                  className="w-full h-1 bg-white bg-opacity-30 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${volume * 100}%, rgba(255,255,255,0.3) ${volume * 100}%, rgba(255,255,255,0.3) 100%)`
                  }}
                />
              </div>
            </div>

            {/* Time Display */}
            <span className="text-white text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Playback Speed */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
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
                      onClick={() => handleSpeedChange(speed)}
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
              onClick={toggleFullscreen}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Title */}
      {title && showControls && (
        <div className="absolute top-4 left-4 text-white">
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
      )}

      {/* Keyboard Shortcuts Info */}
      {isFullscreen && showControls && (
        <div className="absolute top-4 right-4 text-white text-sm bg-black bg-opacity-50 backdrop-blur-sm rounded-lg p-3">
          <div className="font-medium mb-2">Atalhos:</div>
          <div className="space-y-1 text-xs">
            <div>Espaço: Play/Pause</div>
            <div>← →: Retroceder/Avançar 10s</div>
            <div>↑ ↓: Volume</div>
            <div>M: Mute</div>
            <div>F: Fullscreen</div>
            <div>1-8: Velocidade (0.25x-2x)</div>
          </div>
        </div>
      )}
    </div>
  )
}