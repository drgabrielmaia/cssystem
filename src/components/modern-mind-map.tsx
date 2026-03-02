'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { type Mentorado, supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Plus, Minus, Save, X, ArrowLeft, Share2, Play, Search, Video, Loader2,
  Undo2, Redo2, StickyNote, Download, Palette, Maximize, ChevronRight
} from 'lucide-react'
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
  collapsed?: boolean
  notes?: string
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

interface HistoryState {
  nodes: MindMapNode[]
  edges: MindMapEdge[]
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
        module_title: l.video_modules?.title || 'Sem modulo'
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
  // Core state
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

  // Undo/Redo
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const undoStackRef = useRef<HistoryState[]>([])
  const redoStackRef = useRef<HistoryState[]>([])

  // Search
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Notes modal
  const [notesNodeId, setNotesNodeId] = useState<string | null>(null)
  const [notesText, setNotesText] = useState('')

  // Color picker
  const [colorPickerNodeId, setColorPickerNodeId] = useState<string | null>(null)

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
  const searchInputRef = useRef<HTMLInputElement>(null)
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes
  const edgesRef = useRef(edges)
  edgesRef.current = edges
  const scaleRef = useRef(scale)
  scaleRef.current = scale

  const isReadOnly = mode === 'mentorado' || isSharedView
  const canEdit = !isReadOnly && !!user
  const totalLessons = nodes.filter(n => n.linkedLesson?.id).length

  // ==========================================
  // VISIBLE NODES (collapse filtering)
  // ==========================================
  const visibleNodes = useMemo(() => {
    const collapsedIds = new Set(nodes.filter(n => n.collapsed).map(n => n.id))
    if (collapsedIds.size === 0) return nodes

    return nodes.filter(node => {
      let parentId = node.parentId
      while (parentId) {
        if (collapsedIds.has(parentId)) return false
        const parent = nodes.find(n => n.id === parentId)
        parentId = parent?.parentId
      }
      return true
    })
  }, [nodes])

  const visibleEdges = useMemo(() => {
    const visibleIds = new Set(visibleNodes.map(n => n.id))
    return edges.filter(e => visibleIds.has(e.fromNodeId) && visibleIds.has(e.toNodeId))
  }, [edges, visibleNodes])

  // Search results
  const highlightedNodeIds = useMemo(() => {
    if (!searchOpen || !searchQuery.trim()) return new Set<string>()
    const q = searchQuery.toLowerCase()
    return new Set(nodes.filter(n => n.text.toLowerCase().includes(q)).map(n => n.id))
  }, [searchOpen, searchQuery, nodes])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return nodes.filter(n => n.text.toLowerCase().includes(q))
  }, [nodes, searchQuery])

  // ==========================================
  // UNDO / REDO
  // ==========================================
  const pushUndo = useCallback(() => {
    undoStackRef.current.push({
      nodes: JSON.parse(JSON.stringify(nodesRef.current)),
      edges: JSON.parse(JSON.stringify(edgesRef.current))
    })
    if (undoStackRef.current.length > 50) undoStackRef.current.shift()
    redoStackRef.current = []
    setCanUndo(true)
    setCanRedo(false)
  }, [])

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return
    const prev = undoStackRef.current.pop()!
    redoStackRef.current.push({
      nodes: JSON.parse(JSON.stringify(nodesRef.current)),
      edges: JSON.parse(JSON.stringify(edgesRef.current))
    })
    setNodes(prev.nodes)
    setEdges(prev.edges)
    setCanUndo(undoStackRef.current.length > 0)
    setCanRedo(true)
    setHasChanges(true)
  }, [])

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return
    const next = redoStackRef.current.pop()!
    undoStackRef.current.push({
      nodes: JSON.parse(JSON.stringify(nodesRef.current)),
      edges: JSON.parse(JSON.stringify(edgesRef.current))
    })
    setNodes(next.nodes)
    setEdges(next.edges)
    setCanUndo(true)
    setCanRedo(redoStackRef.current.length > 0)
    setHasChanges(true)
  }, [])

  // ==========================================
  // LOAD / SAVE
  // ==========================================
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
  }, [nodes.length === 1])

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
      if (!dragRef.current.hasMoved) {
        pushUndo()
        dragRef.current.hasMoved = true
      }

      const s = scaleRef.current
      const newX = dragRef.current.startNodeX + dx / s
      const newY = dragRef.current.startNodeY + dy / s

      setNodes(prev => prev.map(n =>
        n.id === dragRef.current.nodeId ? { ...n, x: newX, y: newY } : n
      ))
      setHasChanges(true)
    }
  }, [pushUndo])

  const handleDocumentMouseUp = useCallback(() => {
    if (!dragRef.current.active) return

    const timeDiff = Date.now() - dragRef.current.startTime
    const nodeId = dragRef.current.nodeId!

    if (!dragRef.current.hasMoved && timeDiff < 400) {
      const node = nodesRef.current.find(n => n.id === nodeId)
      if (node) {
        setEditingNodeId(nodeId)
        setEditingText(node.text)
        setSelectedNodeId(nodeId)
      }
    } else if (!dragRef.current.hasMoved) {
      setSelectedNodeId(nodeId)
    }

    dragRef.current = { active: false, nodeId: null, startX: 0, startY: 0, startNodeX: 0, startNodeY: 0, startTime: 0, hasMoved: false }
  }, [])

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
    setColorPickerNodeId(null)
    if (editingNodeId) {
      if (editingText.trim()) {
        pushUndo()
        setNodes(prev => prev.map(n => n.id === editingNodeId ? { ...n, text: editingText.trim() } : n))
        setHasChanges(true)
      }
      setEditingNodeId(null)
      setEditingText('')
    }
    panRef.current = { active: true, startX: e.clientX, startY: e.clientY, startTX: translateX, startTY: translateY }
  }, [editingNodeId, editingText, translateX, translateY, pushUndo])

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

  // ==========================================
  // NODE OPERATIONS
  // ==========================================
  const addChildNode = useCallback((parentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const parentNode = nodes.find(n => n.id === parentId)
    if (!parentNode) return

    pushUndo()
    const newNodeId = `node_${Date.now()}`
    const childCount = nodes.filter(n => n.parentId === parentId).length
    const colorIndex = (parentNode.level === 0 ? childCount : parentNode.level - 1) % BRANCH_COLORS.length
    const color = parentNode.level === 0 ? BRANCH_COLORS[colorIndex] : (parentNode.color || BRANCH_COLORS[0])

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

    // If parent was collapsed, expand it
    if (parentNode.collapsed) {
      setNodes(prev => prev.map(n => n.id === parentId ? { ...n, collapsed: false } : n))
    }

    setTimeout(() => {
      setEditingNodeId(newNodeId)
      setEditingText('Novo no')
      setSelectedNodeId(newNodeId)
    }, 50)
  }, [nodes, pushUndo])

  const addSiblingNode = useCallback(() => {
    if (!selectedNodeId) return
    const node = nodes.find(n => n.id === selectedNodeId)
    if (!node || !node.parentId) return

    pushUndo()
    const newNodeId = `node_${Date.now()}`
    const color = node.color || BRANCH_COLORS[0]

    const newX = node.x
    const newY = node.y + 80

    setNodes(prev => [...prev, {
      id: newNodeId, text: 'Novo no', x: newX, y: newY,
      parentId: node.parentId, color, level: node.level
    }])
    setEdges(prev => [...prev, {
      id: `${node.parentId}_${newNodeId}`, fromNodeId: node.parentId!, toNodeId: newNodeId, color
    }])
    setHasChanges(true)

    setTimeout(() => {
      setEditingNodeId(newNodeId)
      setEditingText('Novo no')
      setSelectedNodeId(newNodeId)
    }, 50)
  }, [selectedNodeId, nodes, pushUndo])

  const deleteNode = useCallback((nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (nodeId === 'root') return
    if (!confirm('Deletar este no e todos os filhos?')) return

    pushUndo()
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
  }, [nodes, pushUndo])

  const toggleCollapse = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    const hasChildren = nodes.some(n => n.parentId === nodeId)
    if (!hasChildren) return

    pushUndo()
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n))
    setHasChanges(true)
  }, [nodes, pushUndo])

  const changeNodeColor = useCallback((nodeId: string, color: string) => {
    pushUndo()
    // Get all descendants
    const descendants = new Set<string>()
    const findDesc = (id: string) => {
      nodes.filter(n => n.parentId === id).forEach(c => {
        descendants.add(c.id)
        findDesc(c.id)
      })
    }
    descendants.add(nodeId)
    findDesc(nodeId)

    setNodes(prev => prev.map(n => descendants.has(n.id) ? { ...n, color } : n))
    setEdges(prev => prev.map(e => descendants.has(e.toNodeId) ? { ...e, color } : e))
    setHasChanges(true)
    setColorPickerNodeId(null)
  }, [nodes, pushUndo])

  const linkLesson = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setLessonPickerNodeId(nodeId)
  }, [])

  const handleLessonSelected = useCallback((lesson: LinkedLesson) => {
    if (!lessonPickerNodeId) return
    pushUndo()
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
  }, [lessonPickerNodeId, pushUndo])

  // ==========================================
  // EDIT HANDLERS
  // ==========================================
  const handleSaveEdit = useCallback(() => {
    if (!editingNodeId) return
    pushUndo()
    const text = editingText.trim() || 'Sem titulo'
    setNodes(prev => prev.map(n => n.id === editingNodeId ? { ...n, text } : n))
    setEditingNodeId(null)
    setEditingText('')
    setHasChanges(true)
  }, [editingNodeId, editingText, pushUndo])

  const startEditing = useCallback(() => {
    if (!selectedNodeId) return
    const node = nodes.find(n => n.id === selectedNodeId)
    if (!node) return
    setEditingNodeId(selectedNodeId)
    setEditingText(node.text)
  }, [selectedNodeId, nodes])

  // ==========================================
  // NOTES
  // ==========================================
  const openNotes = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    setNotesNodeId(nodeId)
    setNotesText(node.notes || '')
  }, [nodes])

  const saveNotes = useCallback(() => {
    if (!notesNodeId) return
    pushUndo()
    setNodes(prev => prev.map(n => n.id === notesNodeId ? { ...n, notes: notesText } : n))
    setNotesNodeId(null)
    setNotesText('')
    setHasChanges(true)
  }, [notesNodeId, notesText, pushUndo])

  // ==========================================
  // SEARCH
  // ==========================================
  const centerOnNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node || !containerRef.current) return
    const container = containerRef.current
    setTranslateX(container.offsetWidth / 2 - node.x * scale)
    setTranslateY(container.offsetHeight / 2 - node.y * scale)
    setSelectedNodeId(nodeId)

    // Uncollapse ancestors
    let parentId = node.parentId
    const toUncollapse: string[] = []
    while (parentId) {
      const parent = nodes.find(n => n.id === parentId)
      if (parent?.collapsed) toUncollapse.push(parentId)
      parentId = parent?.parentId
    }
    if (toUncollapse.length > 0) {
      setNodes(prev => prev.map(n => toUncollapse.includes(n.id) ? { ...n, collapsed: false } : n))
    }
  }, [nodes, scale])

  // ==========================================
  // NAVIGATION (arrow keys)
  // ==========================================
  const navigateToNode = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!selectedNodeId) return
    const node = nodes.find(n => n.id === selectedNodeId)
    if (!node) return

    let targetId: string | null = null

    switch (direction) {
      case 'left':
        targetId = node.parentId || null
        break
      case 'right': {
        if (node.collapsed) {
          toggleCollapse(node.id)
          return
        }
        const children = nodes.filter(n => n.parentId === node.id)
        if (children.length > 0) targetId = children[0].id
        break
      }
      case 'up':
      case 'down': {
        if (!node.parentId) break
        const siblings = nodes.filter(n => n.parentId === node.parentId)
        const idx = siblings.findIndex(n => n.id === node.id)
        if (direction === 'up' && idx > 0) targetId = siblings[idx - 1].id
        if (direction === 'down' && idx < siblings.length - 1) targetId = siblings[idx + 1].id
        break
      }
    }

    if (targetId) {
      setSelectedNodeId(targetId)
      // Center on target
      const target = nodes.find(n => n.id === targetId)
      if (target && containerRef.current) {
        const container = containerRef.current
        const nodeScreenX = target.x * scale + translateX
        const nodeScreenY = target.y * scale + translateY
        // Only pan if node is near edges
        if (nodeScreenX < 100 || nodeScreenX > container.offsetWidth - 100 ||
            nodeScreenY < 100 || nodeScreenY > container.offsetHeight - 100) {
          setTranslateX(container.offsetWidth / 2 - target.x * scale)
          setTranslateY(container.offsetHeight / 2 - target.y * scale)
        }
      }
    }
  }, [selectedNodeId, nodes, scale, translateX, translateY, toggleCollapse])

  // ==========================================
  // ZOOM
  // ==========================================
  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 3))
  const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.3))

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(prev => Math.max(0.3, Math.min(3, prev * delta)))
  }, [])

  const zoomToFit = useCallback(() => {
    if (!containerRef.current || visibleNodes.length === 0) return
    const container = containerRef.current
    const xs = visibleNodes.map(n => n.x)
    const ys = visibleNodes.map(n => n.y)
    const minX = Math.min(...xs) - 120
    const maxX = Math.max(...xs) + 120
    const minY = Math.min(...ys) - 80
    const maxY = Math.max(...ys) + 80
    const contentWidth = maxX - minX
    const contentHeight = maxY - minY
    const scaleX = container.offsetWidth / contentWidth
    const scaleY = (container.offsetHeight - 56) / contentHeight
    const newScale = Math.min(scaleX, scaleY, 1.5)
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    setScale(newScale)
    setTranslateX(container.offsetWidth / 2 - centerX * newScale)
    setTranslateY((container.offsetHeight - 56) / 2 - centerY * newScale + 28)
  }, [visibleNodes])

  // ==========================================
  // EXPORT PNG
  // ==========================================
  const exportPNG = useCallback(async () => {
    try {
      const html2canvas = (await import('html2canvas')).default
      const container = document.getElementById('mindmap-container')
      if (!container) return
      const canvas = await html2canvas(container, {
        backgroundColor: '#FAFBFF',
        scale: 2,
        useCORS: true,
        logging: false
      })
      const link = document.createElement('a')
      link.download = `mapa-mental-${mentorado.nome_completo || 'export'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Erro ao exportar PNG:', err)
    }
  }, [mentorado])

  // ==========================================
  // KEYBOARD HANDLER
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      // Ctrl+Y / Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
        return
      }
      // Ctrl+F
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setSearchOpen(prev => {
          if (!prev) setTimeout(() => searchInputRef.current?.focus(), 50)
          else setSearchQuery('')
          return !prev
        })
        return
      }

      // If editing text, only handle Escape/Enter
      if (editingNodeId) {
        // Enter/Escape handled by the input's onKeyDown
        return
      }

      // Escape closes modals/search
      if (e.key === 'Escape') {
        if (searchOpen) { setSearchOpen(false); setSearchQuery(''); return }
        if (notesNodeId) { setNotesNodeId(null); return }
        if (colorPickerNodeId) { setColorPickerNodeId(null); return }
        setSelectedNodeId(null)
        return
      }

      if (!canEdit || !selectedNodeId) return

      switch (e.key) {
        case 'Tab':
          e.preventDefault()
          addChildNode(selectedNodeId)
          break
        case 'Enter':
          e.preventDefault()
          addSiblingNode()
          break
        case 'Delete':
        case 'Backspace':
          e.preventDefault()
          deleteNode(selectedNodeId)
          break
        case 'F2':
          e.preventDefault()
          startEditing()
          break
        case ' ':
          e.preventDefault()
          toggleCollapse(selectedNodeId)
          break
        case 'ArrowLeft':
          e.preventDefault()
          navigateToNode('left')
          break
        case 'ArrowRight':
          e.preventDefault()
          navigateToNode('right')
          break
        case 'ArrowUp':
          e.preventDefault()
          navigateToNode('up')
          break
        case 'ArrowDown':
          e.preventDefault()
          navigateToNode('down')
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, editingNodeId, searchOpen, notesNodeId, colorPickerNodeId, canEdit, selectedNodeId, addChildNode, addSiblingNode, deleteNode, startEditing, toggleCollapse, navigateToNode])

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  // ==========================================
  // HELPER: descendant count
  // ==========================================
  const getDescendantCount = useCallback((nodeId: string): number => {
    const children = nodes.filter(n => n.parentId === nodeId)
    return children.length + children.reduce((sum, c) => sum + getDescendantCount(c.id), 0)
  }, [nodes])

  // ==========================================
  // RENDER NODE
  // ==========================================
  const renderNode = (node: MindMapNode) => {
    const isRoot = node.id === 'root'
    const isSelected = selectedNodeId === node.id
    const isEditing = editingNodeId === node.id
    const hasLesson = !!node.linkedLesson?.id
    const hasNotes = !!node.notes
    const nodeColor = node.color || BRANCH_COLORS[0]
    const bgColor = BRANCH_BG_COLORS[nodeColor] || '#F9FAFB'
    const isDraggingThis = dragRef.current.active && dragRef.current.nodeId === node.id
    const isHighlighted = highlightedNodeIds.has(node.id)
    const childCount = nodes.filter(n => n.parentId === node.id).length
    const descendantCount = node.collapsed ? getDescendantCount(node.id) : 0

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
            ${isHighlighted ? 'ring-4 ring-yellow-400 shadow-xl' : ''}
          `}
          style={{
            borderColor: nodeColor,
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

          {/* Notes indicator */}
          {hasNotes && (
            <button
              className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 hover:bg-amber-200 transition-colors"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); openNotes(node.id) }}
              title="Ver notas"
            >
              <StickyNote className="h-3 w-3 text-amber-600" />
            </button>
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

          {/* Collapse indicator */}
          {childCount > 0 && (
            <button
              className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all z-20 border-2 border-white shadow-sm ${
                node.collapsed
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-500 hover:bg-gray-300 opacity-0 group-hover:opacity-100'
              }`}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); toggleCollapse(node.id) }}
              title={node.collapsed ? `Expandir (${descendantCount} nos)` : 'Recolher'}
            >
              {node.collapsed ? descendantCount : <ChevronRight className="h-3 w-3" />}
            </button>
          )}

          {/* Admin action buttons */}
          {canEdit && (
            <div className={`
              absolute -top-3 -right-3 flex items-center gap-1
              transition-all duration-200
              ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'}
            `}>
              {/* Notes */}
              <button
                className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 bg-amber-500"
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); openNotes(node.id) }}
                title="Notas"
              >
                <StickyNote className="w-3.5 h-3.5" />
              </button>
              {/* Color */}
              {!isRoot && (
                <button
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 bg-pink-500"
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setColorPickerNodeId(colorPickerNodeId === node.id ? null : node.id) }}
                  title="Cor"
                >
                  <Palette className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Link lesson */}
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
              {/* Add child */}
              <button
                className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
                onMouseDown={e => e.stopPropagation()}
                onClick={e => addChildNode(node.id, e)}
                title="Adicionar filho (Tab)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              {/* Delete */}
              {!isRoot && (
                <button
                  className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => deleteNode(node.id, e)}
                  title="Deletar (Del)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Color picker popover */}
        {colorPickerNodeId === node.id && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-lg border p-2 flex gap-1.5 z-50">
            {BRANCH_COLORS.map(c => (
              <button
                key={c}
                className={`w-7 h-7 rounded-full border-2 shadow-sm hover:scale-125 transition-transform ${
                  c === nodeColor ? 'border-gray-800 scale-110' : 'border-white'
                }`}
                style={{ backgroundColor: c }}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); changeNodeColor(node.id, c) }}
              />
            ))}
          </div>
        )}
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
          <div className="flex items-center gap-3">
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

            {/* Undo/Redo */}
            {canEdit && (
              <>
                <div className="h-6 w-px bg-gray-200" />
                <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo}
                  className="w-8 h-8 p-0 rounded-lg text-gray-500 hover:text-gray-800 disabled:opacity-30" title="Desfazer (Ctrl+Z)">
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo}
                  className="w-8 h-8 p-0 rounded-lg text-gray-500 hover:text-gray-800 disabled:opacity-30" title="Refazer (Ctrl+Y)">
                  <Redo2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isReadOnly && totalLessons > 0 && (
              <Badge className="bg-purple-100 text-purple-700 text-xs rounded-lg">
                <Play className="h-3 w-3 mr-1" /> {totalLessons} aula{totalLessons !== 1 ? 's' : ''}
              </Badge>
            )}

            {/* Search toggle */}
            <Button variant="ghost" size="sm" onClick={() => {
              setSearchOpen(prev => {
                if (!prev) setTimeout(() => searchInputRef.current?.focus(), 50)
                else setSearchQuery('')
                return !prev
              })
            }} className={`w-8 h-8 p-0 rounded-lg ${searchOpen ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-800'}`}
              title="Buscar (Ctrl+F)">
              <Search className="h-4 w-4" />
            </Button>

            {/* Export */}
            <Button variant="ghost" size="sm" onClick={exportPNG}
              className="w-8 h-8 p-0 rounded-lg text-gray-500 hover:text-gray-800" title="Exportar PNG">
              <Download className="h-4 w-4" />
            </Button>

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

        {/* Search bar */}
        {searchOpen && (
          <div className="px-5 pb-3 flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') }
                  if (e.key === 'Enter' && searchResults.length > 0) centerOnNode(searchResults[0].id)
                }}
                placeholder="Buscar nos..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
            {searchQuery && (
              <span className="text-xs text-gray-500">{searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}</span>
            )}
            {searchResults.length > 0 && (
              <div className="flex gap-1 max-w-xs overflow-x-auto">
                {searchResults.slice(0, 5).map(r => (
                  <button
                    key={r.id}
                    onClick={() => centerOnNode(r.id)}
                    className="text-xs px-2 py-1 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors whitespace-nowrap"
                  >
                    {r.text.length > 20 ? r.text.slice(0, 20) + '...' : r.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        id="mindmap-container"
        className={`absolute inset-x-0 bottom-0 ${searchOpen ? 'top-[104px]' : 'top-14'}`}
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
            {visibleEdges.map(edge => {
              const from = visibleNodes.find(n => n.id === edge.fromNodeId)
              const to = visibleNodes.find(n => n.id === edge.toNodeId)
              if (!from || !to) return null
              return <MindMapEdgeComponent key={edge.id} edge={edge} fromNode={from} toNode={to} />
            })}
          </svg>

          {/* Nodes */}
          {visibleNodes.map(renderNode)}
        </div>
      </div>

      {/* Help card */}
      {canEdit && (
        <div className="absolute top-18 right-4 z-30 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-gray-200/50 max-w-[220px]">
          <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Atalhos</h4>
          <ul className="text-[11px] text-gray-500 space-y-1">
            <li><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Click</kbd> Editar texto</li>
            <li><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Drag</kbd> Mover no</li>
            <li><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Tab</kbd> Novo filho</li>
            <li><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Enter</kbd> Novo irmao</li>
            <li><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Del</kbd> Deletar</li>
            <li><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Space</kbd> Recolher/Expandir</li>
            <li><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">F2</kbd> Renomear</li>
            <li><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Setas</kbd> Navegar</li>
            <li><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Ctrl+Z/Y</kbd> Desfazer/Refazer</li>
            <li><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Ctrl+F</kbd> Buscar</li>
            <li><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Scroll</kbd> Zoom</li>
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
        <div className="w-px h-6 bg-gray-200" />
        <Button variant="ghost" size="sm" className="w-10 h-10 p-0 rounded-xl hover:bg-gray-100" onClick={zoomToFit} title="Ajustar zoom">
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Notes Modal */}
      {notesNodeId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setNotesNodeId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-amber-500" />
                Notas - {nodes.find(n => n.id === notesNodeId)?.text}
              </h3>
              <button onClick={() => setNotesNodeId(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={notesText}
                onChange={e => setNotesText(e.target.value)}
                readOnly={isReadOnly}
                placeholder="Adicionar notas..."
                className="w-full h-40 p-3 border rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                autoFocus
              />
            </div>
            {canEdit && (
              <div className="p-4 border-t flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setNotesNodeId(null)} className="rounded-xl">Cancelar</Button>
                <Button size="sm" onClick={saveNotes} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">Salvar</Button>
              </div>
            )}
          </div>
        </div>
      )}

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
