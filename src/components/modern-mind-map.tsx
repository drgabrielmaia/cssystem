'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { type Mentorado, supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Minus, Save, X, ArrowLeft, Share2, Play, Search, Video, Target, BookOpen, Loader2, GripVertical } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth'

// ==========================================
// TYPES
// ==========================================
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

// Paleta de cores rica estilo MindMeister
const BRANCH_COLORS = [
  '#4F46E5', // Indigo
  '#7C3AED', // Violet
  '#DB2777', // Pink
  '#059669', // Emerald
  '#D97706', // Amber
  '#2563EB', // Blue
  '#DC2626', // Red
  '#0891B2', // Cyan
]

const BRANCH_BG_COLORS: Record<string, string> = {
  '#4F46E5': '#EEF2FF',
  '#7C3AED': '#F5F3FF',
  '#DB2777': '#FDF2F8',
  '#059669': '#ECFDF5',
  '#D97706': '#FFFBEB',
  '#2563EB': '#EFF6FF',
  '#DC2626': '#FEF2F2',
  '#0891B2': '#ECFEFF',
}

// ==========================================
// LESSON PICKER MODAL
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
    if (isOpen) loadLessons()
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
      setLessons((data || []).map((l: any) => ({
        id: l.id,
        title: l.title,
        panda_video_embed_url: l.panda_video_embed_url,
        module_id: l.module_id,
        module_title: l.video_modules?.title || 'Sem módulo'
      })))
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Video className="h-4 w-4 text-purple-600" />
            </div>
            Linkar Aula
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar aula..." className="pl-10 rounded-xl" autoFocus />
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
                    onSelect({ id: lesson.id, title: lesson.title, embedUrl: lesson.panda_video_embed_url || '', moduleTitle: lesson.module_title })
                    onClose()
                  }}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                    lesson.id === currentLessonId ? 'bg-purple-50 border-2 border-purple-200 shadow-sm' : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${lesson.id === currentLessonId ? 'bg-purple-600' : 'bg-gray-100'}`}>
                    <Play className={`h-4 w-4 ${lesson.id === currentLessonId ? 'text-white' : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{lesson.title}</p>
                    <p className="text-xs text-gray-500 truncate">{lesson.module_title}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {currentLessonId && (
          <div className="p-3 border-t">
            <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
              onClick={() => { onSelect({ id: '', title: '', embedUrl: '' }); onClose() }}>
              <X className="h-4 w-4 mr-2" /> Remover link
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ==========================================
// VIDEO PLAYER MODAL
// ==========================================
const VideoPlayerModal = ({ lesson, onClose }: { lesson: LinkedLesson; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{lesson.title}</h3>
          {lesson.moduleTitle && <p className="text-sm text-gray-500">{lesson.moduleTitle}</p>}
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="h-5 w-5 text-gray-400" /></button>
      </div>
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        {lesson.embedUrl ? (
          <iframe src={lesson.embedUrl} className="absolute inset-0 w-full h-full rounded-b-2xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-b-2xl">
            <div className="text-center text-gray-500"><Video className="h-16 w-16 mx-auto mb-3 text-gray-300" /><p>Video nao disponivel</p></div>
          </div>
        )}
      </div>
    </div>
  </div>
)

// ==========================================
// MIND MAP EDGE (Curva organica)
// ==========================================
const MindMapEdgeComponent = ({ edge, fromNode, toNode }: { edge: MindMapEdge; fromNode: MindMapNode; toNode: MindMapNode }) => {
  const startX = fromNode.x
  const startY = fromNode.y
  const endX = toNode.x
  const endY = toNode.y

  const deltaX = endX - startX
  const deltaY = endY - startY
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  const controlDist = Math.min(distance * 0.45, 180)

  const cp1X = startX + (deltaX > 0 ? controlDist : -controlDist)
  const cp1Y = startY + deltaY * 0.15
  const cp2X = endX - (deltaX > 0 ? controlDist * 0.35 : -controlDist * 0.35)
  const cp2Y = endY - deltaY * 0.15

  const pathData = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`
  const fromLevel = fromNode.level || 0
  const lineWidth = fromLevel === 0 ? 4 : fromLevel === 1 ? 3 : 2.5

  return (
    <path
      d={pathData}
      stroke={edge.color}
      strokeWidth={lineWidth}
      strokeLinecap="round"
      fill="none"
      className="pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  )
}

// ==========================================
// MAIN COMPONENT
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
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [mindMapId, setMindMapId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [lessonPickerNodeId, setLessonPickerNodeId] = useState<string | null>(null)
  const [playingLesson, setPlayingLesson] = useState<LinkedLesson | null>(null)

  // Drag state using refs for immediate access in event handlers
  const dragRef = useRef<{
    active: boolean
    nodeId: string | null
    startX: number
    startY: number
    startNodeX: number
    startNodeY: number
    startTime: number
    hasMoved: boolean
  }>({ active: false, nodeId: null, startX: 0, startY: 0, startNodeX: 0, startNodeY: 0, startTime: 0, hasMoved: false })

  const panRef = useRef<{ active: boolean; startX: number; startY: number; startTX: number; startTY: number }>({
    active: false, startX: 0, startY: 0, startTX: 0, startTY: 0
  })

  const { user } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes
  const scaleRef = useRef(scale)
  scaleRef.current = scale

  const isReadOnly = mode === 'mentorado' || isSharedView
  const canEdit = !isReadOnly && !!user
  const totalLessons = nodes.filter(n => n.linkedLesson?.id).length

  // Load mind map
  useEffect(() => {
    loadMindMap()
  }, [mentorado])

  const loadMindMap = async () => {
    try {
      const { data, error } = await supabase
        .from('mind_maps')
        .select('*')
        .eq('mentorado_id', mentorado.id)
        .single()

      if (error && error.code !== 'PGRST116') return

      if (data) {
        setMindMapId(data.id)
        setNodes(data.nodes || [])
        setEdges(data.connections || [])
      } else {
        const centerX = 400
        const centerY = 300
        setNodes([{ id: 'root', text: mentorado.nome_completo || 'Mapa Mental', x: centerX, y: centerY, level: 0 }])
        setEdges([])
        setHasChanges(true)
      }
    } catch {
      setNodes([{ id: 'root', text: mentorado.nome_completo || 'Mapa Mental', x: 400, y: 300, level: 0 }])
      setEdges([])
    }
  }

  // Center viewport
  useEffect(() => {
    if (containerRef.current && nodes.length > 0) {
      const container = containerRef.current
      const rootNode = nodes.find(n => n.id === 'root')
      if (rootNode) {
        setTranslateX(container.offsetWidth / 2 - rootNode.x)
        setTranslateY(container.offsetHeight / 2 - rootNode.y)
      }
    }
  }, [nodes.length === 1]) // Only on initial load

  // Save
  const saveMindMap = useCallback(async () => {
    if (!user || !hasChanges) return
    setIsSaving(true)
    try {
      const mindMapData = {
        mentorado_id: mentorado.id,
        title: `Mapa Mental - ${mentorado.nome_completo}`,
        nodes, connections: edges,
        settings: { scale, translateX, translateY },
        updated_at: new Date().toISOString()
      }
      if (mindMapId) {
        await supabase.from('mind_maps').update(mindMapData).eq('id', mindMapId)
      } else {
        const { data } = await supabase.from('mind_maps').insert([mindMapData]).select().single()
        if (data) setMindMapId(data.id)
      }
      setHasChanges(false)
    } catch (err) {
      console.error('Erro ao salvar:', err)
    } finally {
      setIsSaving(false)
    }
  }, [user, hasChanges, nodes, edges, scale, translateX, translateY, mindMapId, mentorado])

  // Auto-save
  useEffect(() => {
    if (hasChanges && !isSaving && user) {
      const timeout = setTimeout(() => saveMindMap(), 2000)
      return () => clearTimeout(timeout)
    }
  }, [hasChanges, isSaving, user, saveMindMap])

  // ==========================================
  // UNIFIED POINTER HANDLERS (fixes drag bug)
  // ==========================================
  const handleNodePointerDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    if (!canEdit) return
    e.stopPropagation()
    e.preventDefault()

    const node = nodesRef.current.find(n => n.id === nodeId)
    if (!node) return

    dragRef.current = {
      active: true,
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      startNodeX: node.x,
      startNodeY: node.y,
      startTime: Date.now(),
      hasMoved: false
    }
  }, [canEdit])

  const handleDocumentMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current.active) return

    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 5) {
      dragRef.current.hasMoved = true
      const s = scaleRef.current
      const newX = dragRef.current.startNodeX + dx / s
      const newY = dragRef.current.startNodeY + dy / s

      setNodes(prev => prev.map(n =>
        n.id === dragRef.current.nodeId ? { ...n, x: newX, y: newY } : n
      ))
      setHasChanges(true)
    }
  }, [])

  const handleDocumentMouseUp = useCallback((e: MouseEvent) => {
    if (!dragRef.current.active) return

    const timeDiff = Date.now() - dragRef.current.startTime
    const nodeId = dragRef.current.nodeId!

    if (!dragRef.current.hasMoved && timeDiff < 400) {
      // It was a click, not a drag - trigger edit
      const node = nodesRef.current.find(n => n.id === nodeId)
      if (node) {
        setEditingNodeId(nodeId)
        setEditingText(node.text)
        setSelectedNodeId(nodeId)
      }
    }

    dragRef.current = { active: false, nodeId: null, startX: 0, startY: 0, startNodeX: 0, startNodeY: 0, startTime: 0, hasMoved: false }
  }, [])

  // Attach global mouse listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleDocumentMouseMove)
    document.addEventListener('mouseup', handleDocumentMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove)
      document.removeEventListener('mouseup', handleDocumentMouseUp)
    }
  }, [handleDocumentMouseMove, handleDocumentMouseUp])

  // Pan handlers
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return
    setSelectedNodeId(null)
    if (editingNodeId) {
      // Save edit on background click
      if (editingText.trim()) {
        setNodes(prev => prev.map(n => n.id === editingNodeId ? { ...n, text: editingText.trim() } : n))
        setHasChanges(true)
      }
      setEditingNodeId(null)
      setEditingText('')
    }
    panRef.current = { active: true, startX: e.clientX, startY: e.clientY, startTX: translateX, startTY: translateY }
  }, [editingNodeId, editingText, translateX, translateY])

  const handleCanvasMouseMove = useCallback((e: MouseEvent) => {
    if (!panRef.current.active) return
    const dx = e.clientX - panRef.current.startX
    const dy = e.clientY - panRef.current.startY
    setTranslateX(panRef.current.startTX + dx)
    setTranslateY(panRef.current.startTY + dy)
  }, [])

  const handleCanvasMouseUp = useCallback(() => {
    panRef.current.active = false
  }, [])

  useEffect(() => {
    document.addEventListener('mousemove', handleCanvasMouseMove)
    document.addEventListener('mouseup', handleCanvasMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleCanvasMouseMove)
      document.removeEventListener('mouseup', handleCanvasMouseUp)
    }
  }, [handleCanvasMouseMove, handleCanvasMouseUp])

  // Mentorado node click (play lesson)
  const handleMentoradoNodeClick = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (node?.linkedLesson?.id) {
      setPlayingLesson(node.linkedLesson)
    }
  }, [nodes])

  // Node operations
  const addChildNode = useCallback((parentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const parentNode = nodes.find(n => n.id === parentId)
    if (!parentNode) return

    const newNodeId = `node_${Date.now()}`
    const childCount = nodes.filter(n => n.parentId === parentId).length
    const colorIndex = (parentNode.level === 0 ? childCount : parentNode.level - 1) % BRANCH_COLORS.length
    const color = parentNode.level === 0 ? BRANCH_COLORS[colorIndex] : (parentNode.color || BRANCH_COLORS[0])

    // Smart positioning: spread children in a fan
    const existingChildren = nodes.filter(n => n.parentId === parentId)
    const baseAngle = existingChildren.length === 0 ? 0 : (Math.PI / 6) * existingChildren.length
    const sign = existingChildren.length % 2 === 0 ? 1 : -1
    const angle = baseAngle * sign
    const offset = 180

    const newX = parentNode.x + offset * Math.cos(angle)
    const newY = parentNode.y + offset * Math.sin(angle) + (parentNode.level === 0 ? -60 + childCount * 80 : 0)

    setNodes(prev => [...prev, {
      id: newNodeId, text: 'Novo no', x: newX, y: newY,
      parentId, color, level: parentNode.level + 1
    }])
    setEdges(prev => [...prev, {
      id: `${parentId}_${newNodeId}`, fromNodeId: parentId, toNodeId: newNodeId, color
    }])
    setHasChanges(true)

    // Auto-edit the new node
    setTimeout(() => {
      setEditingNodeId(newNodeId)
      setEditingText('Novo no')
      setSelectedNodeId(newNodeId)
    }, 50)
  }, [nodes])

  const deleteNode = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (nodeId === 'root') return
    if (!confirm('Deletar este no e todos os filhos?')) return

    const toDelete = new Set<string>()
    const findDesc = (id: string) => {
      toDelete.add(id)
      nodes.filter(n => n.parentId === id).forEach(c => findDesc(c.id))
    }
    findDesc(nodeId)

    setNodes(prev => prev.filter(n => !toDelete.has(n.id)))
    setEdges(prev => prev.filter(e => !toDelete.has(e.fromNodeId) && !toDelete.has(e.toNodeId)))
    setHasChanges(true)
    setSelectedNodeId(null)
  }, [nodes])

  const linkLesson = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setLessonPickerNodeId(nodeId)
  }, [])

  const handleLessonSelected = useCallback((lesson: LinkedLesson) => {
    if (!lessonPickerNodeId) return
    setNodes(prev => prev.map(node => {
      if (node.id !== lessonPickerNodeId) return node
      if (!lesson.id) {
        const { linkedLesson, nodeType, ...rest } = node
        return rest as MindMapNode
      }
      return { ...node, linkedLesson: lesson, nodeType: 'aula' as const }
    }))
    setLessonPickerNodeId(null)
    setHasChanges(true)
  }, [lessonPickerNodeId])

  // Edit handlers
  const handleSaveEdit = useCallback(() => {
    if (!editingNodeId) return
    const text = editingText.trim() || 'Sem titulo'
    setNodes(prev => prev.map(n => n.id === editingNodeId ? { ...n, text } : n))
    setEditingNodeId(null)
    setEditingText('')
    setHasChanges(true)
  }, [editingNodeId, editingText])

  // Zoom
  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 3))
  const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.3))

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(prev => Math.max(0.3, Math.min(3, prev * delta)))
  }, [])

  // ==========================================
  // RENDER NODE
  // ==========================================
  const renderNode = (node: MindMapNode) => {
    const isRoot = node.id === 'root'
    const isSelected = selectedNodeId === node.id
    const isEditing = editingNodeId === node.id
    const hasLesson = !!node.linkedLesson?.id
    const nodeColor = node.color || BRANCH_COLORS[0]
    const bgColor = BRANCH_BG_COLORS[nodeColor] || '#F9FAFB'
    const isDraggingThis = dragRef.current.active && dragRef.current.nodeId === node.id

    if (isEditing && canEdit) {
      return (
        <div
          key={node.id}
          className="absolute z-30"
          style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
        >
          <input
            type="text"
            value={editingText}
            onChange={e => setEditingText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSaveEdit()
              else if (e.key === 'Escape') { setEditingNodeId(null); setEditingText('') }
            }}
            onBlur={handleSaveEdit}
            autoFocus
            className="bg-white border-2 border-blue-500 rounded-2xl outline-none font-sans text-gray-800 text-center shadow-xl px-5 py-3"
            style={{
              minWidth: '160px',
              fontSize: isRoot ? '18px' : node.level === 1 ? '15px' : '14px',
              fontWeight: isRoot ? 700 : node.level === 1 ? 600 : 400
            }}
          />
        </div>
      )
    }

    return (
      <div
        key={node.id}
        className={`absolute select-none group transition-transform duration-75 ${isDraggingThis ? 'z-30' : isSelected ? 'z-20' : 'z-10'}`}
        style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
        onMouseDown={canEdit ? (e) => handleNodePointerDown(node.id, e) : undefined}
        onClick={isReadOnly ? () => handleMentoradoNodeClick(node.id) : undefined}
      >
        {/* Node pill */}
        <div
          className={`
            relative rounded-2xl border-2 transition-all duration-200 flex items-center gap-2
            ${isRoot
              ? 'px-6 py-4 shadow-lg'
              : node.level === 1
                ? 'px-4 py-2.5 shadow-md'
                : 'px-3.5 py-2 shadow-sm'
            }
            ${isSelected && canEdit
              ? 'ring-4 ring-blue-200 shadow-xl scale-105'
              : ''
            }
            ${isDraggingThis ? 'shadow-2xl scale-110 opacity-90' : ''}
            ${isReadOnly && hasLesson ? 'cursor-pointer hover:shadow-lg hover:scale-105' : ''}
            ${canEdit ? 'cursor-grab active:cursor-grabbing hover:shadow-lg' : ''}
          `}
          style={{
            borderColor: isRoot ? nodeColor : nodeColor,
            backgroundColor: isRoot ? 'white' : bgColor,
            ...(isRoot ? {
              background: `linear-gradient(135deg, white 0%, ${bgColor} 100%)`
            } : {})
          }}
        >
          {/* Play icon for lesson nodes */}
          {hasLesson && (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: nodeColor }}
            >
              <Play className="h-3.5 w-3.5 text-white ml-0.5" />
            </div>
          )}

          {/* Text */}
          <span
            className="font-sans"
            style={{
              color: isRoot ? '#1F2937' : '#374151',
              fontSize: isRoot ? '18px' : node.level === 1 ? '15px' : '13px',
              fontWeight: isRoot ? 700 : node.level === 1 ? 600 : 500,
              maxWidth: '250px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {node.text}
          </span>

          {/* Lesson badge (admin) */}
          {hasLesson && canEdit && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: nodeColor + '20', color: nodeColor }}>
              {node.linkedLesson!.title.length > 15 ? node.linkedLesson!.title.slice(0, 15) + '...' : node.linkedLesson!.title}
            </span>
          )}

          {/* Admin action buttons */}
          {canEdit && (
            <div className={`
              absolute -top-3 -right-3 flex items-center gap-1
              transition-all duration-200
              ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'}
            `}>
              {!isRoot && (
                <button
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
                  style={{ backgroundColor: '#7C3AED' }}
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => linkLesson(node.id, e)}
                  title="Linkar aula"
                >
                  <Video className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
                onMouseDown={e => e.stopPropagation()}
                onClick={e => addChildNode(node.id, e)}
                title="Adicionar filho"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              {!isRoot && (
                <button
                  className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => deleteNode(node.id, e)}
                  title="Deletar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #FAFBFF 0%, #F0F4FF 50%, #F5F0FF 100%)' }}>
      {/* Dot pattern background */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: 'radial-gradient(circle, #CBD5E1 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }} />

      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-4">
            <Link href={isReadOnly ? '/mentorado' : '/admin/mapas-mentais'}>
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-800 rounded-xl">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <h2 className="text-base font-semibold text-gray-800">{mentorado.nome_completo}</h2>
            {isReadOnly ? (
              <Badge className="bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">Visualizacao</Badge>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium">Editavel</Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isReadOnly && totalLessons > 0 && (
              <Badge className="bg-purple-100 text-purple-700 text-xs rounded-lg">
                <Play className="h-3 w-3 mr-1" /> {totalLessons} aula{totalLessons !== 1 ? 's' : ''}
              </Badge>
            )}
            {hasChanges && canEdit && (
              <Badge className="bg-orange-100 text-orange-600 text-xs rounded-lg">Nao salvo</Badge>
            )}
            {canEdit && (
              <Button size="sm" onClick={saveMindMap} disabled={!hasChanges || isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm">
                <Save className="h-4 w-4 mr-1.5" /> {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
            {onShare && (
              <Button variant="outline" size="sm" onClick={onShare} className="rounded-xl">
                <Share2 className="h-4 w-4 mr-1.5" /> Compartilhar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        id="mindmap-container"
        className="absolute inset-x-0 top-14 bottom-0"
        style={{ cursor: panRef.current.active ? 'grabbing' : 'grab' }}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
      >
        <div
          className="relative w-full h-full"
          style={{
            transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
            transformOrigin: '0 0'
          }}
        >
          {/* Edges */}
          <svg className="absolute pointer-events-none" style={{ width: '5000px', height: '5000px', left: '-2500px', top: '-2500px' }}>
            {edges.map(edge => {
              const from = nodes.find(n => n.id === edge.fromNodeId)
              const to = nodes.find(n => n.id === edge.toNodeId)
              if (!from || !to) return null
              return <MindMapEdgeComponent key={edge.id} edge={edge} fromNode={from} toNode={to} />
            })}
          </svg>

          {/* Nodes */}
          {nodes.map(renderNode)}
        </div>
      </div>

      {/* Help card */}
      {canEdit && (
        <div className="absolute top-18 right-4 z-30 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-gray-200/50 max-w-[200px]">
          <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Como usar</h4>
          <ul className="text-xs text-gray-500 space-y-1.5">
            <li className="flex items-center gap-1.5"><span className="w-4 h-4 bg-gray-100 rounded flex items-center justify-center text-[10px]">🖱</span> Clique = editar</li>
            <li className="flex items-center gap-1.5"><span className="w-4 h-4 bg-gray-100 rounded flex items-center justify-center text-[10px]">↕</span> Arraste = mover</li>
            <li className="flex items-center gap-1.5"><span className="w-4 h-4 bg-emerald-100 rounded flex items-center justify-center"><Plus className="w-2.5 h-2.5 text-emerald-600" /></span> Filho</li>
            <li className="flex items-center gap-1.5"><span className="w-4 h-4 bg-purple-100 rounded flex items-center justify-center"><Video className="w-2.5 h-2.5 text-purple-600" /></span> Linkar aula</li>
            <li className="flex items-center gap-1.5"><span className="w-4 h-4 bg-gray-100 rounded flex items-center justify-center text-[10px]">🔍</span> Scroll = zoom</li>
          </ul>
        </div>
      )}

      {isReadOnly && totalLessons > 0 && (
        <div className="absolute top-18 right-4 z-30 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-gray-200/50 max-w-[220px]">
          <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Seu Mapa</h4>
          <p className="text-xs text-gray-500">Clique nos nos com <Play className="inline h-3 w-3 text-purple-600" /> para assistir as aulas.</p>
          <div className="mt-2 text-xs font-semibold text-purple-600">{totalLessons} aula{totalLessons !== 1 ? 's' : ''} disponive{totalLessons !== 1 ? 'is' : 'l'}</div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-6 left-6 z-30 flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 p-1">
        <Button variant="ghost" size="sm" className="w-10 h-10 p-0 rounded-xl hover:bg-gray-100" onClick={handleZoomOut}>
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-xs text-gray-500 w-12 text-center font-medium">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="sm" className="w-10 h-10 p-0 rounded-xl hover:bg-gray-100" onClick={handleZoomIn}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Modals */}
      <LessonPickerModal
        isOpen={!!lessonPickerNodeId}
        onClose={() => setLessonPickerNodeId(null)}
        onSelect={handleLessonSelected}
        currentLessonId={lessonPickerNodeId ? nodes.find(n => n.id === lessonPickerNodeId)?.linkedLesson?.id : undefined}
      />
      {playingLesson && <VideoPlayerModal lesson={playingLesson} onClose={() => setPlayingLesson(null)} />}
    </div>
  )
}

export { ModernMindMap }
