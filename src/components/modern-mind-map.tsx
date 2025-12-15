'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { type Mentorado, supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Minus, Edit2, Settings, Share2, ArrowLeft, Save, X } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth'

// Tipos para o mapa mental
interface MindMapNode {
  id: string
  text: string
  x: number
  y: number
  parentId?: string
  color?: string
  level: number
}

interface MindMapEdge {
  id: string
  fromNodeId: string
  toNodeId: string
  color: string
}

// Cores pastéis para os ramos
const BRANCH_COLORS = [
  '#6366F1', // Índigo suave
  '#8B5CF6', // Roxo suave
  '#EC4899', // Rosa suave
  '#10B981', // Verde esmeralda suave
]

// Componente do Nó
const MindMapNode = ({
  node,
  isRoot = false,
  isSelected = false,
  onDrag,
  onEdit,
  onAddChild,
  onDelete,
  onSelect
}: {
  node: MindMapNode
  isRoot?: boolean
  isSelected?: boolean
  onDrag?: (nodeId: string, x: number, y: number) => void
  onEdit?: (nodeId: string) => void
  onAddChild?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
  onSelect?: (nodeId: string) => void
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isLongPress, setIsLongPress] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dragStartTime, setDragStartTime] = useState(0)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Touch/mouse handlers unificados
  const handlePointerDown = (e: React.PointerEvent | React.MouseEvent) => {
    if (!onDrag && !onEdit) return

    const startTime = Date.now()
    setDragStartTime(startTime)

    const rect = e.currentTarget.getBoundingClientRect()
    const clientX = 'clientX' in e ? e.clientX : (e as any).touches?.[0]?.clientX
    const clientY = 'clientY' in e ? e.clientY : (e as any).touches?.[0]?.clientY

    setDragOffset({
      x: clientX - rect.left,
      y: clientY - rect.top
    })

    // Long press para mobile (exclusão)
    if ('touches' in e || e.type.includes('touch')) {
      longPressTimerRef.current = setTimeout(() => {
        setIsLongPress(true)
        navigator.vibrate?.(50) // Feedback háptico se disponível
      }, 500)
    }

    e.preventDefault()
  }

  const handlePointerMove = useCallback((e: PointerEvent | MouseEvent | TouchEvent) => {
    if (!onDrag) return

    const currentTime = Date.now()
    const timeDiff = currentTime - dragStartTime

    // Se moveu muito rápido, é provável que seja drag (não click/edit)
    if (timeDiff > 100) {
      setIsDragging(true)

      // Clear long press se começou a arrastar
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }

    if (!isDragging && timeDiff <= 100) return

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
  }, [isDragging, onDrag, node.id, dragOffset, dragStartTime])

  const handlePointerUp = useCallback((e: PointerEvent | MouseEvent | TouchEvent) => {
    const timeDiff = Date.now() - dragStartTime

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    if (isLongPress && onDelete && !isRoot) {
      // Long press - mostrar opções de exclusão
      if (confirm('Deletar este nó e todos os filhos?')) {
        onDelete(node.id)
      }
    } else if (!isDragging && timeDiff < 300 && !isLongPress) {
      // Click/tap rápido - editar ou selecionar
      if (onEdit) {
        onEdit(node.id)
      } else if (onSelect) {
        onSelect(node.id)
      }
    }

    setIsDragging(false)
    setIsLongPress(false)
  }, [isDragging, isLongPress, onEdit, onDelete, onSelect, node.id, isRoot, dragStartTime])

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])

  const nodeLevel = node.level || 0
  const isLevel1 = nodeLevel === 1
  const isLevel2Plus = nodeLevel >= 2

  return (
    <div
      className={`absolute select-none group ${isDragging ? 'z-20' : isSelected ? 'z-10' : ''}`}
      style={{
        left: node.x,
        top: node.y,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* Hit area invisível maior - CRÍTICO para mobile */}
      <div
        className="absolute inset-0 cursor-pointer"
        style={{
          padding: '16px', // Hit area 32px maior em todas as direções
          margin: '-16px'
        }}
        onPointerDown={handlePointerDown}
        onTouchStart={handlePointerDown as any}
        onMouseDown={handlePointerDown}
      />

      {/* Círculo de conexão para nós filhos - mais visível e clicável */}
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

      {/* Texto do nó com feedback visual claro */}
      <div
        className={`
          font-sans text-gray-800 whitespace-nowrap relative z-10
          transition-all duration-200 rounded-md
          ${isRoot ? 'text-xl font-semibold px-4 py-3 bg-white shadow-md border-2' :
            isLevel1 ? 'text-base font-medium px-3 py-2' :
            'text-sm font-normal px-3 py-2'}
          ${isSelected ? 'bg-blue-50 shadow-md ring-2 ring-blue-200' : 'bg-white shadow-sm'}
          ${isDragging ? 'opacity-70 scale-95' : ''}
          ${isLongPress ? 'bg-red-50 ring-2 ring-red-200' : ''}
        `}
        style={{
          borderColor: isRoot ? (node.color || BRANCH_COLORS[0]) : 'transparent'
        }}
      >
        {node.text}

        {/* Controles para desktop (hover) e mobile (quando selecionado) */}
        <div className={`
          absolute -top-2 -right-2 flex items-center gap-1 z-20
          transition-opacity duration-200
          ${isSelected ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}
        `}>
          {onAddChild && (
            <button
              className="w-8 h-8 bg-green-500 hover:bg-green-600 active:bg-green-700
                         rounded-full flex items-center justify-center text-white
                         shadow-md transition-transform active:scale-95
                         touch-manipulation"
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
                         shadow-md transition-transform active:scale-95
                         touch-manipulation"
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('Deletar este nó e todos os filhos?')) {
                  onDelete(node.id)
                }
              }}
              title="Deletar nó (ou toque longo)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente da Aresta (curva conectando nós)
const MindMapEdge = ({
  edge,
  fromNode,
  toNode
}: {
  edge: MindMapEdge
  fromNode: MindMapNode
  toNode: MindMapNode
}) => {
  // Calcular pontos de início e fim que não sobreponham o texto
  const startX = fromNode.x
  const startY = fromNode.y

  // Fim da linha: conecta diretamente ao círculo de conexão, que está a -8px do centro do nó
  const endX = toNode.x - 8
  const endY = toNode.y

  // Distância horizontal para pontos de controle - mais orgânico
  const deltaX = endX - startX
  const deltaY = endY - startY
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  const controlDistance = Math.min(distance * 0.4, 150)

  // Pontos de controle para curva suave e orgânica
  const cp1X = startX + (deltaX > 0 ? controlDistance : -controlDistance)
  const cp1Y = startY + deltaY * 0.1
  const cp2X = endX - (deltaX > 0 ? controlDistance * 0.3 : -controlDistance * 0.3)
  const cp2Y = endY - deltaY * 0.1

  const pathData = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`

  // Espessura da linha baseada no nível hierárquico
  const fromLevel = fromNode.level || 0
  const lineWidth = fromLevel === 0 ? 3 : fromLevel === 1 ? 2.5 : 2

  return (
    <g>
      {/* Linha principal */}
      <path
        d={pathData}
        stroke={edge.color}
        strokeWidth={lineWidth}
        strokeLinecap="round"
        fill="none"
        className="pointer-events-none"
        style={{
          opacity: fromLevel >= 2 ? 0.7 : 0.8
        }}
      />
    </g>
  )
}

// Componente principal do Mapa Mental
const ModernMindMap = ({
  mentorado,
  isSharedView = false,
  onShare
}: {
  mentorado: Mentorado
  isSharedView?: boolean
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

  // Novos estados para UX melhorada
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  const { user } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)

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

      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows returned
        console.error('Erro ao carregar mapa mental:', error)
        return
      }

      if (existingMap) {
        // Carregar mapa existente
        setMindMapId(existingMap.id)
        setNodes(existingMap.nodes || [])
        setEdges(existingMap.connections || [])
        console.log('Mapa mental carregado do banco:', existingMap.id)
      } else {
        // Criar mapa padrão se não existir
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

    const initialNodes: MindMapNode[] = [
      {
        id: 'root',
        text: mentorado.nome_completo || 'Mapa Mental',
        x: centerX,
        y: centerY,
        level: 0
      }
    ]

    const initialEdges: MindMapEdge[] = []

    setNodes(initialNodes)
    setEdges(initialEdges)
    setHasChanges(true) // Marcar para salvar o mapa inicial
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

  // Salvar mapa mental no Supabase
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
        // Atualizar existente
        const { error } = await supabase
          .from('mind_maps')
          .update(mindMapData)
          .eq('id', mindMapId)

        if (error) throw error
        console.log('Mapa mental atualizado:', mindMapId)
      } else {
        // Criar novo
        const { data, error } = await supabase
          .from('mind_maps')
          .insert([mindMapData])
          .select()
          .single()

        if (error) throw error
        setMindMapId(data.id)
        console.log('Novo mapa mental criado:', data.id)
      }

      setHasChanges(false)
    } catch (error) {
      console.error('Erro ao salvar mapa mental:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Handlers para interação
  const handleNodeDrag = useCallback((nodeId: string, newX: number, newY: number) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId
        ? { ...node, x: newX / scale, y: newY / scale }
        : node
    ))
    setHasChanges(true)
  }, [scale])

  // Função para selecionar nó
  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
  }, [])

  // Função para entrar em modo de edição in-line
  const handleNodeEdit = useCallback((nodeId: string) => {
    const currentNode = nodes.find(n => n.id === nodeId)
    if (!currentNode) return

    setEditingNodeId(nodeId)
    setEditingText(currentNode.text)
    setSelectedNodeId(nodeId)
  }, [nodes])

  // Função para salvar edição in-line
  const handleSaveEdit = useCallback(() => {
    if (!editingNodeId || !editingText.trim()) return

    setNodes(prev => prev.map(node =>
      node.id === editingNodeId ? { ...node, text: editingText.trim() } : node
    ))
    setEditingNodeId(null)
    setEditingText('')
    setHasChanges(true)
  }, [editingNodeId, editingText])

  // Função para cancelar edição
  const handleCancelEdit = useCallback(() => {
    setEditingNodeId(null)
    setEditingText('')
  }, [])

  // Função para detectar clique fora dos nós
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

    // Calcular posição para novo nó
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
    if (nodeId === 'root') return // Não permitir deletar nó raiz

    // Deletar nó e todos os filhos
    const nodesToDelete = new Set<string>()

    const findDescendants = (id: string) => {
      nodesToDelete.add(id)
      nodes.filter(n => n.parentId === id).forEach(child => {
        findDescendants(child.id)
      })
    }

    findDescendants(nodeId)

    setNodes(prev => prev.filter(n => !nodesToDelete.has(n.id)))
    setEdges(prev => prev.filter(e =>
      !nodesToDelete.has(e.fromNodeId) && !nodesToDelete.has(e.toNodeId)
    ))
    setHasChanges(true)
  }, [nodes])

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 3))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.3))
  }

  // Pan handlers unificados para mouse e touch
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

  const handlePanEnd = useCallback(() => {
    setIsPanning(false)
  }, [])

  useEffect(() => {
    if (isPanning) {
      // Mouse events
      document.addEventListener('mousemove', handlePanMove)
      document.addEventListener('mouseup', handlePanEnd)

      // Touch events
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

  // Auto-save após 2 segundos de inatividade
  useEffect(() => {
    if (hasChanges && !isSaving && user) {
      const timeout = setTimeout(() => {
        saveMindMap()
      }, 2000)

      return () => clearTimeout(timeout)
    }
  }, [hasChanges, isSaving, user, saveMindMap])

  return (
    <div className="fixed inset-0 bg-white overflow-hidden">
      {/* Toolbar completa */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/onboarding">
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
              {!user && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                  👁️ Visualização
                </Badge>
              )}
              {user && (
                <Badge variant="outline" className="text-green-600 border-green-300">
                  ✏️ Editável
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasChanges && !isSharedView && (
              <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                Não salvo
              </Badge>
            )}
            {!isSharedView && (
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

      {/* Canvas do mapa mental */}
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
          {/* SVG para as arestas */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ width: '100%', height: '100%' }}
          >
            {edges.map(edge => {
              const fromNode = nodes.find(n => n.id === edge.fromNodeId)
              const toNode = nodes.find(n => n.id === edge.toNodeId)

              if (!fromNode || !toNode) return null

              return (
                <MindMapEdge
                  key={edge.id}
                  edge={edge}
                  fromNode={fromNode}
                  toNode={toNode}
                />
              )
            })}
          </svg>

          {/* Nós */}
          {nodes.map(node => (
            <div key={node.id}>
              {editingNodeId === node.id ? (
                /* Campo de edição in-line */
                <div
                  className="absolute select-none z-30"
                  style={{
                    left: node.x,
                    top: node.y,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveEdit()
                      } else if (e.key === 'Escape') {
                        handleCancelEdit()
                      }
                    }}
                    onBlur={handleSaveEdit}
                    autoFocus
                    className={`
                      bg-white border-2 border-blue-400 rounded-md outline-none
                      font-sans text-gray-800 text-center
                      transition-all duration-200 shadow-lg
                      ${node.id === 'root' ? 'text-xl font-semibold px-4 py-3' :
                        (node.level === 1) ? 'text-base font-medium px-3 py-2' :
                        'text-sm font-normal px-3 py-2'}
                    `}
                    style={{
                      minWidth: '120px',
                      fontSize: node.id === 'root' ? '20px' :
                                (node.level === 1) ? '16px' : '14px'
                    }}
                  />
                </div>
              ) : (
                <MindMapNode
                  node={node}
                  isRoot={node.id === 'root'}
                  isSelected={selectedNodeId === node.id}
                  onDrag={!isSharedView ? handleNodeDrag : undefined}
                  onEdit={!isSharedView ? handleNodeEdit : undefined}
                  onAddChild={!isSharedView ? addChildNode : undefined}
                  onDelete={!isSharedView ? deleteNode : undefined}
                  onSelect={!isSharedView ? handleNodeSelect : undefined}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Controles de zoom - mobile-friendly */}
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

      {/* Indicador de zoom */}
      <div className="absolute bottom-4 left-16 z-20 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm">
        {Math.round(scale * 100)}%
      </div>
    </div>
  )
}

export { ModernMindMap }