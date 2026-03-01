'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { type Mentorado, supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Minus, Save, X, ArrowLeft, Share2, Play, Search, Video, Target, BookOpen, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth'

// Tipos para o mapa mental
interface LinkedLesson {
  id: string
  title: string
  embedUrl: string
  moduleTitle?: string
}

interface MindMapNode {
  id: string
  text: string
  x: number
  y: number
  parentId?: string
  color?: string
  level: number
  linkedLesson?: LinkedLesson
  nodeType?: 'default' | 'meta' | 'aula'
}

interface MindMapEdge {
  id: string
  fromNodeId: string
  toNodeId: string
  color: string
}

interface VideoLesson {
  id: string
  title: string
  panda_video_embed_url: string | null
  module_id: string
  module_title?: string
}

// Cores pastéis para os ramos
const BRANCH_COLORS = [
  '#6366F1', // Índigo suave
  '#8B5CF6', // Roxo suave
  '#EC4899', // Rosa suave
  '#10B981', // Verde esmeralda suave
]

// ==========================================
// LESSON PICKER MODAL (Admin)
// ==========================================
const LessonPickerModal = ({
  isOpen,
  onClose,
  onSelect,
  currentLessonId
}: {
  isOpen: boolean
  onClose: () => void
  onSelect: (lesson: LinkedLesson) => void
  currentLessonId?: string
}) => {
  const [lessons, setLessons] = useState<VideoLesson[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadLessons()
    }
  }, [isOpen])

  const loadLessons = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('video_lessons')
        .select('id, title, panda_video_embed_url, module_id, video_modules(title)')
        .eq('is_active', true)
        .order('title', { ascending: true })

      if (error) throw error

      const formatted = (data || []).map((l: any) => ({
        id: l.id,
        title: l.title,
        panda_video_embed_url: l.panda_video_embed_url,
        module_id: l.module_id,
        module_title: l.video_modules?.title || 'Sem módulo'
      }))

      setLessons(formatted)
    } catch (err) {
      console.error('Erro ao carregar aulas:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = lessons.filter(l =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    (l.module_title || '').toLowerCase().includes(search.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Video className="h-5 w-5 text-purple-600" />
            Linkar Aula ao Nó
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar aula por título ou módulo..."
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Video className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhuma aula encontrada</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map(lesson => (
                <button
                  key={lesson.id}
                  onClick={() => {
                    onSelect({
                      id: lesson.id,
                      title: lesson.title,
                      embedUrl: lesson.panda_video_embed_url || '',
                      moduleTitle: lesson.module_title
                    })
                    onClose()
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                    lesson.id === currentLessonId
                      ? 'bg-purple-50 border border-purple-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    lesson.id === currentLessonId ? 'bg-purple-600' : 'bg-gray-100'
                  }`}>
                    <Play className={`h-5 w-5 ${lesson.id === currentLessonId ? 'text-white' : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{lesson.title}</p>
                    <p className="text-xs text-gray-500 truncate">{lesson.module_title}</p>
                  </div>
                  {lesson.id === currentLessonId && (
                    <Badge className="bg-purple-600 text-white text-xs">Atual</Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {currentLessonId && (
          <div className="p-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => {
                onSelect({ id: '', title: '', embedUrl: '' })
                onClose()
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Remover link de aula
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ==========================================
// VIDEO PLAYER MODAL (Mentorado)
// ==========================================
const VideoPlayerModal = ({
  lesson,
  onClose
}: {
  lesson: LinkedLesson
  onClose: () => void
}) => {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{lesson.title}</h3>
            {lesson.moduleTitle && (
              <p className="text-sm text-gray-500">{lesson.moduleTitle}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          {lesson.embedUrl ? (
            <iframe
              src={lesson.embedUrl}
              className="absolute inset-0 w-full h-full rounded-b-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-b-xl">
              <div className="text-center text-gray-500">
                <Video className="h-16 w-16 mx-auto mb-3 text-gray-300" />
                <p>Vídeo não disponível</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE DO NÓ
// ==========================================
const MindMapNodeComponent = ({
  node,
  isRoot = false,
  isSelected = false,
  mode = 'admin',
  onDrag,
  onEdit,
  onAddChild,
  onDelete,
  onSelect,
  onLinkLesson,
  onPlayLesson
}: {
  node: MindMapNode
  isRoot?: boolean
  isSelected?: boolean
  mode?: 'admin' | 'mentorado'
  onDrag?: (nodeId: string, x: number, y: number) => void
  onEdit?: (nodeId: string) => void
  onAddChild?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
  onSelect?: (nodeId: string) => void
  onLinkLesson?: (nodeId: string) => void
  onPlayLesson?: (lesson: LinkedLesson) => void
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isLongPress, setIsLongPress] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dragStartTime, setDragStartTime] = useState(0)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

  const hasLesson = !!node.linkedLesson?.id
  const isReadOnly = mode === 'mentorado'

  const handlePointerDown = (e: React.PointerEvent | React.MouseEvent) => {
    if (isReadOnly && !hasLesson) return
    if (!onDrag && !onEdit && !onPlayLesson) return

    const startTime = Date.now()
    setDragStartTime(startTime)

    const rect = e.currentTarget.getBoundingClientRect()
    const clientX = 'clientX' in e ? e.clientX : (e as any).touches?.[0]?.clientX
    const clientY = 'clientY' in e ? e.clientY : (e as any).touches?.[0]?.clientY

    setDragOffset({
      x: clientX - rect.left,
      y: clientY - rect.top
    })

    if (!isReadOnly && ('touches' in e || e.type.includes('touch'))) {
      longPressTimerRef.current = setTimeout(() => {
        setIsLongPress(true)
        navigator.vibrate?.(50)
      }, 500)
    }

    e.preventDefault()
  }

  const handlePointerMove = useCallback((e: PointerEvent | MouseEvent | TouchEvent) => {
    if (!onDrag || isReadOnly) return

    const currentTime = Date.now()
    const timeDiff = currentTime - dragStartTime

    if (timeDiff > 150) {
      const container = document.getElementById('mindmap-container')
      if (container) {
        const containerRect = container.getBoundingClientRect()
        let clientX, clientY

        if ('touches' in e) {
          clientX = e.touches[0].clientX
          clientY = e.touches[0].clientY
        } else {
          clientX = e.clientX
          clientY = e.clientY
        }

        const currentX = clientX - containerRect.left - dragOffset.x
        const currentY = clientY - containerRect.top - dragOffset.y
        const distance = Math.sqrt(Math.pow(currentX - node.x, 2) + Math.pow(currentY - node.y, 2))

        if (distance > 5) {
          setIsDragging(true)
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
          }
        }
      }
    }

    if (!isDragging) return

    const container = document.getElementById('mindmap-container')
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    let clientX, clientY

    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const newX = clientX - containerRect.left - dragOffset.x
    const newY = clientY - containerRect.top - dragOffset.y

    onDrag(node.id, newX, newY)
  }, [isDragging, onDrag, node.id, dragOffset, dragStartTime, isReadOnly])

  const handlePointerUp = useCallback((e: PointerEvent | MouseEvent | TouchEvent) => {
    const timeDiff = Date.now() - dragStartTime

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    if (isLongPress && onDelete && !isRoot) {
      if (confirm('Deletar este nó e todos os filhos?')) {
        onDelete(node.id)
      }
    } else if (!isDragging && timeDiff < 500 && !isLongPress) {
      if (isReadOnly && hasLesson && onPlayLesson && node.linkedLesson) {
        onPlayLesson(node.linkedLesson)
      } else if (!isReadOnly && onEdit) {
        onEdit(node.id)
      } else if (onSelect) {
        onSelect(node.id)
      }
    }

    setIsDragging(false)
    setIsLongPress(false)
  }, [isDragging, isLongPress, onEdit, onDelete, onSelect, onPlayLesson, node, isRoot, dragStartTime, isReadOnly, hasLesson])

  useEffect(() => {
    if (isDragging || isLongPress) {
      const handleMove = (e: any) => handlePointerMove(e)
      const handleEnd = (e: any) => handlePointerUp(e)

      document.addEventListener('pointermove', handleMove, { passive: false })
      document.addEventListener('pointerup', handleEnd)
      document.addEventListener('touchmove', handleMove, { passive: false })
      document.addEventListener('touchend', handleEnd)
      document.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseup', handleEnd)

      return () => {
        document.removeEventListener('pointermove', handleMove)
        document.removeEventListener('pointerup', handleEnd)
        document.removeEventListener('touchmove', handleMove)
        document.removeEventListener('touchend', handleEnd)
        document.removeEventListener('mousemove', handleMove)
        document.removeEventListener('mouseup', handleEnd)
      }
    }
  }, [isDragging, isLongPress, handlePointerMove, handlePointerUp])

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])

  const nodeLevel = node.level || 0

  return (
    <div
      className={`absolute select-none group ${isDragging ? 'z-20' : isSelected ? 'z-10' : ''}`}
      style={{
        left: node.x,
        top: node.y,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* Hit area */}
      <div
        className={`absolute inset-0 ${
          isReadOnly
            ? hasLesson ? 'cursor-pointer' : 'cursor-default'
            : onEdit ? 'cursor-pointer' : 'cursor-move'
        } ${isDragging ? 'cursor-grabbing' : ''}`}
        style={{ padding: '16px', margin: '-16px' }}
        onPointerDown={handlePointerDown}
        onTouchStart={handlePointerDown as any}
        onMouseDown={handlePointerDown}
      />

      {/* Connector dot */}
      {!isRoot && (
        <div
          className="absolute w-3 h-3 bg-white border-2 rounded-full shadow-sm z-10"
          style={{
            borderColor: node.color || BRANCH_COLORS[0],
            left: '-8px',
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        />
      )}

      {/* Node content */}
      <div
        className={`
          font-sans text-gray-800 whitespace-nowrap relative z-10
          transition-all duration-200 rounded-md border flex items-center gap-2
          ${isRoot ? 'text-xl font-semibold px-4 py-3 bg-white shadow-md border-2' :
            nodeLevel === 1 ? 'text-base font-medium px-3 py-2' :
            'text-sm font-normal px-3 py-2'}
          ${isSelected ? 'bg-blue-50 shadow-md ring-2 ring-blue-200 border-blue-300' : 'bg-white shadow-sm border-gray-200'}
          ${isDragging ? 'opacity-70 scale-95' : ''}
          ${isLongPress ? 'bg-red-50 ring-2 ring-red-200 border-red-300' : ''}
          ${isReadOnly && hasLesson ? 'hover:bg-purple-50 hover:border-purple-300 hover:shadow-md' : ''}
          ${!isReadOnly ? 'hover:bg-blue-25 hover:border-blue-300 hover:shadow-md' : ''}
        `}
        style={{
          borderColor: isRoot ? (node.color || BRANCH_COLORS[0]) : undefined
        }}
      >
        {/* Node type icon */}
        {hasLesson && (
          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
            isReadOnly ? 'bg-purple-600' : 'bg-purple-100'
          }`}>
            <Play className={`h-3 w-3 ${isReadOnly ? 'text-white' : 'text-purple-600'}`} />
          </div>
        )}
        {node.nodeType === 'meta' && !hasLesson && (
          <Target className="h-4 w-4 text-orange-500 flex-shrink-0" />
        )}

        <span>{node.text}</span>

        {/* Lesson badge (admin only) */}
        {hasLesson && !isReadOnly && (
          <Badge className="bg-purple-100 text-purple-700 text-[10px] ml-1 flex-shrink-0">
            {node.linkedLesson!.title.length > 20
              ? node.linkedLesson!.title.slice(0, 20) + '...'
              : node.linkedLesson!.title}
          </Badge>
        )}

        {/* Admin controls */}
        {!isReadOnly && (
          <div className={`
            absolute -top-2 -right-2 flex items-center gap-1 z-20
            transition-opacity duration-200
            ${isSelected ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}
          `}>
            {onLinkLesson && !isRoot && (
              <button
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white
                  shadow-md transition-transform active:scale-95 touch-manipulation
                  ${hasLesson ? 'bg-purple-500 hover:bg-purple-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onLinkLesson(node.id)
                }}
                title={hasLesson ? 'Alterar aula' : 'Linkar aula'}
              >
                <Video className="w-4 h-4" />
              </button>
            )}

            {onAddChild && (
              <button
                className="w-8 h-8 bg-green-500 hover:bg-green-600 active:bg-green-700
                  rounded-full flex items-center justify-center text-white
                  shadow-md transition-transform active:scale-95 touch-manipulation"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddChild(node.id)
                }}
                title="Adicionar nó filho"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}

            {onDelete && !isRoot && (
              <button
                className="w-8 h-8 bg-red-500 hover:bg-red-600 active:bg-red-700
                  rounded-full flex items-center justify-center text-white
                  shadow-md transition-transform active:scale-95 touch-manipulation"
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Deletar este nó e todos os filhos?')) {
                    onDelete(node.id)
                  }
                }}
                title="Deletar nó"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE DA ARESTA
// ==========================================
const MindMapEdgeComponent = ({
  edge,
  fromNode,
  toNode
}: {
  edge: MindMapEdge
  fromNode: MindMapNode
  toNode: MindMapNode
}) => {
  const startX = fromNode.x
  const startY = fromNode.y
  const endX = toNode.x - 8
  const endY = toNode.y

  const deltaX = endX - startX
  const deltaY = endY - startY
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  const controlDistance = Math.min(distance * 0.4, 150)

  const cp1X = startX + (deltaX > 0 ? controlDistance : -controlDistance)
  const cp1Y = startY + deltaY * 0.1
  const cp2X = endX - (deltaX > 0 ? controlDistance * 0.3 : -controlDistance * 0.3)
  const cp2Y = endY - deltaY * 0.1

  const pathData = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`
  const fromLevel = fromNode.level || 0
  const lineWidth = fromLevel === 0 ? 3 : fromLevel === 1 ? 2.5 : 2

  return (
    <g>
      <path
        d={pathData}
        stroke={edge.color}
        strokeWidth={lineWidth}
        strokeLinecap="round"
        fill="none"
        className="pointer-events-none"
        style={{ opacity: fromLevel >= 2 ? 0.7 : 0.8 }}
      />
    </g>
  )
}

// ==========================================
// COMPONENTE PRINCIPAL DO MAPA MENTAL
// ==========================================
const ModernMindMap = ({
  mentorado,
  isSharedView = false,
  mode = 'admin',
  onShare
}: {
  mentorado: Mentorado
  isSharedView?: boolean
  mode?: 'admin' | 'mentorado'
  onShare?: () => void
}) => {
  const [nodes, setNodes] = useState<MindMapNode[]>([])
  const [edges, setEdges] = useState<MindMapEdge[]>([])
  const [scale, setScale] = useState(1)
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [mindMapId, setMindMapId] = useState<string | null>(null)

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  // Lesson picker & video player state
  const [lessonPickerNodeId, setLessonPickerNodeId] = useState<string | null>(null)
  const [playingLesson, setPlayingLesson] = useState<LinkedLesson | null>(null)

  const { user } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)

  const isReadOnly = mode === 'mentorado' || isSharedView
  const canEdit = !isReadOnly && !!user

  // Contagem de aulas para mentorado
  const totalLessons = nodes.filter(n => n.linkedLesson?.id).length
  const lessonNodes = nodes.filter(n => n.linkedLesson?.id)

  // Carregar mapa mental do Supabase
  useEffect(() => {
    loadMindMap()
  }, [mentorado])

  const loadMindMap = async () => {
    try {
      const { data: existingMap, error } = await supabase
        .from('mind_maps')
        .select('*')
        .eq('mentorado_id', mentorado.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar mapa mental:', error)
        return
      }

      if (existingMap) {
        setMindMapId(existingMap.id)
        setNodes(existingMap.nodes || [])
        setEdges(existingMap.connections || [])
      } else {
        createDefaultMindMap()
      }
    } catch (error) {
      console.error('Erro ao carregar mapa mental:', error)
      createDefaultMindMap()
    }
  }

  const createDefaultMindMap = () => {
    const centerX = 400
    const centerY = 300

    setNodes([{
      id: 'root',
      text: mentorado.nome_completo || 'Mapa Mental',
      x: centerX,
      y: centerY,
      level: 0
    }])
    setEdges([])
    setHasChanges(true)
  }

  // Centralizar viewport no nó raiz
  useEffect(() => {
    if (containerRef.current && nodes.length > 0) {
      const container = containerRef.current
      const rootNode = nodes.find(n => n.id === 'root')
      if (rootNode) {
        setTranslateX(container.offsetWidth / 2 - rootNode.x)
        setTranslateY(container.offsetHeight / 2 - rootNode.y)
      }
    }
  }, [nodes])

  // Salvar mapa mental
  const saveMindMap = async () => {
    if (!user || !hasChanges) return

    setIsSaving(true)
    try {
      const mindMapData = {
        mentorado_id: mentorado.id,
        title: `Mapa Mental - ${mentorado.nome_completo}`,
        nodes: nodes,
        connections: edges,
        settings: { scale, translateX, translateY },
        updated_at: new Date().toISOString()
      }

      if (mindMapId) {
        const { error } = await supabase
          .from('mind_maps')
          .update(mindMapData)
          .eq('id', mindMapId)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('mind_maps')
          .insert([mindMapData])
          .select()
          .single()

        if (error) throw error
        setMindMapId(data.id)
      }

      setHasChanges(false)
    } catch (error) {
      console.error('Erro ao salvar mapa mental:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Node interaction handlers
  const handleNodeDrag = useCallback((nodeId: string, newX: number, newY: number) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId ? { ...node, x: newX / scale, y: newY / scale } : node
    ))
    setHasChanges(true)
  }, [scale])

  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
  }, [])

  const handleNodeEdit = useCallback((nodeId: string) => {
    const currentNode = nodes.find(n => n.id === nodeId)
    if (!currentNode) return

    setEditingNodeId(nodeId)
    setEditingText(currentNode.text)
    setSelectedNodeId(nodeId)
  }, [nodes])

  const handleSaveEdit = useCallback(() => {
    if (!editingNodeId || !editingText.trim()) return

    setNodes(prev => prev.map(node =>
      node.id === editingNodeId ? { ...node, text: editingText.trim() } : node
    ))
    setEditingNodeId(null)
    setEditingText('')
    setHasChanges(true)
  }, [editingNodeId, editingText])

  const handleCancelEdit = useCallback(() => {
    setEditingNodeId(null)
    setEditingText('')
  }, [])

  const handleBackgroundClick = useCallback(() => {
    setSelectedNodeId(null)
    if (editingNodeId) {
      handleSaveEdit()
    }
  }, [editingNodeId, handleSaveEdit])

  const addChildNode = useCallback((parentId: string) => {
    const parentNode = nodes.find(n => n.id === parentId)
    if (!parentNode) return

    const newNodeId = `node_${Date.now()}`
    const colorIndex = parentNode.level % BRANCH_COLORS.length
    const color = BRANCH_COLORS[colorIndex]

    const offset = 150
    const angle = Math.random() * Math.PI * 2
    const newX = parentNode.x + Math.cos(angle) * offset
    const newY = parentNode.y + Math.sin(angle) * offset

    const newNode: MindMapNode = {
      id: newNodeId,
      text: 'Novo nó',
      x: newX,
      y: newY,
      parentId: parentId,
      color: color,
      level: parentNode.level + 1
    }

    const newEdge: MindMapEdge = {
      id: `${parentId}_${newNodeId}`,
      fromNodeId: parentId,
      toNodeId: newNodeId,
      color: color
    }

    setNodes(prev => [...prev, newNode])
    setEdges(prev => [...prev, newEdge])
    setHasChanges(true)
  }, [nodes])

  const deleteNode = useCallback((nodeId: string) => {
    if (nodeId === 'root') return

    const nodesToDelete = new Set<string>()
    const findDescendants = (id: string) => {
      nodesToDelete.add(id)
      nodes.filter(n => n.parentId === id).forEach(child => findDescendants(child.id))
    }
    findDescendants(nodeId)

    setNodes(prev => prev.filter(n => !nodesToDelete.has(n.id)))
    setEdges(prev => prev.filter(e =>
      !nodesToDelete.has(e.fromNodeId) && !nodesToDelete.has(e.toNodeId)
    ))
    setHasChanges(true)
  }, [nodes])

  // Lesson linking
  const handleLinkLesson = useCallback((nodeId: string) => {
    setLessonPickerNodeId(nodeId)
  }, [])

  const handleLessonSelected = useCallback((lesson: LinkedLesson) => {
    if (!lessonPickerNodeId) return

    setNodes(prev => prev.map(node => {
      if (node.id !== lessonPickerNodeId) return node

      if (!lesson.id) {
        // Remove lesson link
        const { linkedLesson, ...rest } = node
        return rest as MindMapNode
      }

      return {
        ...node,
        linkedLesson: lesson,
        nodeType: 'aula' as const
      }
    }))
    setLessonPickerNodeId(null)
    setHasChanges(true)
  }, [lessonPickerNodeId])

  // Play lesson (mentorado)
  const handlePlayLesson = useCallback((lesson: LinkedLesson) => {
    setPlayingLesson(lesson)
  }, [])

  // Zoom
  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 3))
  const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.3))

  // Pan
  const handlePanStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.target === e.currentTarget) {
      setIsPanning(true)
      let clientX, clientY
      if ('touches' in e) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }
      setLastPanPoint({ x: clientX, y: clientY })
    }
  }

  const handlePanMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isPanning) return
    let clientX, clientY
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    const deltaX = clientX - lastPanPoint.x
    const deltaY = clientY - lastPanPoint.y
    setTranslateX(prev => prev + deltaX)
    setTranslateY(prev => prev + deltaY)
    setLastPanPoint({ x: clientX, y: clientY })
  }, [isPanning, lastPanPoint])

  const handlePanEnd = useCallback(() => setIsPanning(false), [])

  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handlePanMove)
      document.addEventListener('mouseup', handlePanEnd)
      document.addEventListener('touchmove', handlePanMove, { passive: false })
      document.addEventListener('touchend', handlePanEnd)
      return () => {
        document.removeEventListener('mousemove', handlePanMove)
        document.removeEventListener('mouseup', handlePanEnd)
        document.removeEventListener('touchmove', handlePanMove)
        document.removeEventListener('touchend', handlePanEnd)
      }
    }
  }, [isPanning, handlePanMove, handlePanEnd])

  // Auto-save
  useEffect(() => {
    if (hasChanges && !isSaving && user) {
      const timeout = setTimeout(() => saveMindMap(), 2000)
      return () => clearTimeout(timeout)
    }
  }, [hasChanges, isSaving, user, saveMindMap])

  return (
    <div className="fixed inset-0 bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href={isReadOnly ? '/mentorado' : '/admin/mapas-mentais'}>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-medium text-gray-800 font-sans">
                {mentorado.nome_completo}
              </h2>
              <Badge variant="outline" className="text-gray-600">
                {mentorado.estado_atual}
              </Badge>
              {isReadOnly ? (
                <Badge variant="outline" className="text-purple-600 border-purple-300">
                  <BookOpen className="h-3 w-3 mr-1" />
                  Visualização
                </Badge>
              ) : (
                <Badge variant="outline" className="text-green-600 border-green-300">
                  ✏️ Editável
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Lesson counter for mentorado */}
            {isReadOnly && totalLessons > 0 && (
              <Badge className="bg-purple-100 text-purple-700 text-xs">
                <Play className="h-3 w-3 mr-1" />
                {totalLessons} aula{totalLessons !== 1 ? 's' : ''}
              </Badge>
            )}

            {hasChanges && canEdit && (
              <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                Não salvo
              </Badge>
            )}
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={saveMindMap}
                disabled={!hasChanges || isSaving}
                className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
            {onShare && (
              <Button
                variant="outline"
                size="sm"
                onClick={onShare}
                className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        id="mindmap-container"
        className="absolute inset-x-0 top-16 bottom-0 cursor-grab active:cursor-grabbing touch-none"
        onMouseDown={handlePanStart}
        onTouchStart={handlePanStart}
        onClick={handleBackgroundClick}
      >
        <div
          className="relative w-full h-full"
          style={{
            transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
            transformOrigin: '0 0'
          }}
        >
          {/* Edges SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ width: '100%', height: '100%' }}>
            {edges.map(edge => {
              const fromNode = nodes.find(n => n.id === edge.fromNodeId)
              const toNode = nodes.find(n => n.id === edge.toNodeId)
              if (!fromNode || !toNode) return null
              return (
                <MindMapEdgeComponent key={edge.id} edge={edge} fromNode={fromNode} toNode={toNode} />
              )
            })}
          </svg>

          {/* Nodes */}
          {nodes.map(node => (
            <div key={node.id}>
              {editingNodeId === node.id && canEdit ? (
                <div
                  className="absolute select-none z-30"
                  style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
                >
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit()
                      else if (e.key === 'Escape') handleCancelEdit()
                    }}
                    onBlur={handleSaveEdit}
                    autoFocus
                    className={`
                      bg-white border-2 border-blue-400 rounded-md outline-none
                      font-sans text-gray-800 text-center shadow-lg
                      ${node.id === 'root' ? 'text-xl font-semibold px-4 py-3' :
                        node.level === 1 ? 'text-base font-medium px-3 py-2' :
                        'text-sm font-normal px-3 py-2'}
                    `}
                    style={{ minWidth: '120px' }}
                  />
                </div>
              ) : (
                <MindMapNodeComponent
                  node={node}
                  isRoot={node.id === 'root'}
                  isSelected={selectedNodeId === node.id}
                  mode={mode}
                  onDrag={canEdit ? handleNodeDrag : undefined}
                  onEdit={canEdit ? handleNodeEdit : undefined}
                  onAddChild={canEdit ? addChildNode : undefined}
                  onDelete={canEdit ? deleteNode : undefined}
                  onSelect={handleNodeSelect}
                  onLinkLesson={canEdit ? handleLinkLesson : undefined}
                  onPlayLesson={isReadOnly ? handlePlayLesson : undefined}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      {canEdit && (
        <div className="absolute top-20 right-4 z-20 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border max-w-xs">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Como usar:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• <strong>Clique</strong> em um nó para editar o texto</li>
            <li>• <strong>Arraste</strong> para mover os nós</li>
            <li>• <strong className="text-green-600">+</strong> para adicionar nós filhos</li>
            <li>• <strong className="text-purple-600">🎬</strong> para linkar aula ao nó</li>
            <li>• <strong>Toque longo</strong> para excluir</li>
          </ul>
        </div>
      )}

      {isReadOnly && totalLessons > 0 && (
        <div className="absolute top-20 right-4 z-20 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border max-w-xs">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Seu Mapa de Aulas</h4>
          <p className="text-xs text-gray-600 mb-2">
            Clique nos nós com <strong className="text-purple-600">▶</strong> para assistir as aulas.
          </p>
          <div className="text-xs text-purple-600 font-medium">
            {totalLessons} aula{totalLessons !== 1 ? 's' : ''} disponíve{totalLessons !== 1 ? 'is' : 'l'}
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-3">
        <Button
          variant="outline"
          size="sm"
          className="w-12 h-12 p-0 bg-white shadow-lg border-gray-200 hover:bg-gray-50
            active:scale-95 transition-transform touch-manipulation"
          onClick={handleZoomIn}
        >
          <Plus className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-12 h-12 p-0 bg-white shadow-lg border-gray-200 hover:bg-gray-50
            active:scale-95 transition-transform touch-manipulation"
          onClick={handleZoomOut}
        >
          <Minus className="h-5 w-5" />
        </Button>
      </div>

      <div className="absolute bottom-4 left-16 z-20 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm">
        {Math.round(scale * 100)}%
      </div>

      {/* Lesson Picker Modal */}
      <LessonPickerModal
        isOpen={!!lessonPickerNodeId}
        onClose={() => setLessonPickerNodeId(null)}
        onSelect={handleLessonSelected}
        currentLessonId={lessonPickerNodeId ? nodes.find(n => n.id === lessonPickerNodeId)?.linkedLesson?.id : undefined}
      />

      {/* Video Player Modal */}
      {playingLesson && (
        <VideoPlayerModal
          lesson={playingLesson}
          onClose={() => setPlayingLesson(null)}
        />
      )}
    </div>
  )
}

export { ModernMindMap }
