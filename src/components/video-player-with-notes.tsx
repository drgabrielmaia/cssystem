'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { anotacoesService } from '@/lib/video-portal-service'
import {
  Play, Pause, BookOpen, MessageSquare, AlertCircle,
  Lightbulb, Star, Clock, Edit, Trash2, Save, Plus
} from 'lucide-react'

interface VideoNote {
  id: string
  timestamp_video: number
  conteudo: string
  tipo: 'anotacao' | 'duvida' | 'importante' | 'resumo'
  created_at: string
}

interface VideoPlayerWithNotesProps {
  lessonId: string
  mentoradoId: string
  videoUrl: string
  lessonTitle: string
}

export function VideoPlayerWithNotes({
  lessonId,
  mentoradoId,
  videoUrl,
  lessonTitle
}: VideoPlayerWithNotesProps) {
  const [notes, setNotes] = useState<VideoNote[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState<'anotacao' | 'duvida' | 'importante' | 'resumo'>('anotacao')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [showNotes, setShowNotes] = useState(true)
  const [loading, setLoading] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)

  const noteTypes = [
    { value: 'anotacao', label: 'Anotação', icon: <BookOpen className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { value: 'duvida', label: 'Dúvida', icon: <MessageSquare className="h-4 w-4" />, color: 'bg-orange-100 text-orange-800 border-orange-300' },
    { value: 'importante', label: 'Importante', icon: <AlertCircle className="h-4 w-4" />, color: 'bg-red-100 text-red-800 border-red-300' },
    { value: 'resumo', label: 'Resumo', icon: <Lightbulb className="h-4 w-4" />, color: 'bg-green-100 text-green-800 border-green-300' }
  ]

  useEffect(() => {
    loadNotes()
  }, [lessonId, mentoradoId])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [])

  const loadNotes = async () => {
    try {
      const notesData = await anotacoesService.buscarAnotacoesDaAula(lessonId, mentoradoId)
      const formattedNotes = notesData.map(note => ({
        id: note.id,
        timestamp_video: note.resposta_json.timestamp_video,
        conteudo: note.resposta_json.conteudo,
        tipo: note.resposta_json.tipo,
        created_at: note.data_envio
      }))
      // Ordenar por timestamp
      formattedNotes.sort((a, b) => a.timestamp_video - b.timestamp_video)
      setNotes(formattedNotes)
    } catch (error) {
      console.error('Erro ao carregar anotações:', error)
    }
  }

  const saveNote = async () => {
    if (!newNote.trim()) return

    setLoading(true)
    try {
      await anotacoesService.salvarAnotacao({
        mentorado_id: mentoradoId,
        lesson_id: lessonId,
        timestamp_video: Math.floor(currentTime),
        conteudo: newNote,
        tipo: noteType
      })

      setNewNote('')
      await loadNotes()
    } catch (error) {
      console.error('Erro ao salvar anotação:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const jumpToTime = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp
    }
  }

  const getCurrentNoteType = () => {
    return noteTypes.find(type => type.value === noteType)
  }

  return (
    <div className="space-y-6">
      {/* Video Player */}
      <Card className="border-gray-200 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-blue-600" />
            {lessonTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative bg-black rounded-lg overflow-hidden">
            {videoUrl.includes('pandavideo') ? (
              <div className="aspect-video">
                <iframe
                  src={`${videoUrl}${videoUrl.includes('?') ? '&' : '?'}controls=1&showinfo=1&autohide=0&theme=dark&color=white`}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <video
                ref={videoRef}
                className="w-full aspect-video"
                controls
                src={videoUrl}
              >
                Seu navegador não suporta o elemento de vídeo.
              </video>
            )}
          </div>

          {/* Controles de Anotação */}
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Tempo atual: {formatTime(currentTime)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotes(!showNotes)}
              >
                <BookOpen className="h-4 w-4 mr-1" />
                {showNotes ? 'Ocultar' : 'Mostrar'} Anotações ({notes.length})
              </Button>
            </div>

            {/* Nova Anotação */}
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
              <div className="flex items-center gap-2 mb-3">
                <Plus className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-blue-900">Nova Anotação</span>
                <Badge variant="outline" className="text-xs">
                  {formatTime(currentTime)}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Select value={noteType} onValueChange={(value: any) => setNoteType(value)}>
                    <SelectTrigger className="w-40 border-blue-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {noteTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            {type.icon} {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Badge variant="outline" className={getCurrentNoteType()?.color}>
                    {getCurrentNoteType()?.icon} {getCurrentNoteType()?.label}
                  </Badge>
                </div>

                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Digite sua anotação aqui..."
                  rows={3}
                  className="border-blue-300 resize-none"
                />

                <div className="flex justify-end">
                  <Button
                    onClick={saveNote}
                    disabled={!newNote.trim() || loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Salvando...' : 'Salvar Anotação'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Anotações */}
      {showNotes && (
        <Card className="border-gray-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                Suas Anotações ({notes.length})
              </div>
              {notes.length > 0 && (
                <div className="text-sm text-gray-500">
                  Clique no tempo para pular para o momento
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Nenhuma anotação ainda
                </h3>
                <p className="text-gray-500">
                  Comece a assistir o vídeo e faça suas primeiras anotações!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => {
                  const noteTypeInfo = noteTypes.find(type => type.value === note.tipo)
                  const isEditing = editingNote === note.id

                  return (
                    <div
                      key={note.id}
                      className="p-4 rounded-lg border bg-gradient-to-r from-gray-50 to-gray-100 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => jumpToTime(note.timestamp_video)}
                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTime(note.timestamp_video)}
                          </Button>

                          {noteTypeInfo && (
                            <Badge variant="outline" className={noteTypeInfo.color}>
                              {noteTypeInfo.icon} {noteTypeInfo.label}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingNote(note.id)
                              setEditingContent(note.conteudo)
                            }}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-3">
                          <Textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            rows={3}
                            className="border-gray-300"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingNote(null)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={async () => {
                                // Aqui você implementaria a atualização da anotação
                                setEditingNote(null)
                                await loadNotes()
                              }}
                            >
                              Salvar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-700 leading-relaxed">
                          {note.conteudo}
                        </p>
                      )}

                      <div className="mt-3 text-xs text-gray-500">
                        Criado em {new Date(note.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}