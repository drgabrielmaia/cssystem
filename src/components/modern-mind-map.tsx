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
  onDrag,
  onEdit,
  onAddChild,
  onDelete
}: {
  node: MindMapNode
  isRoot?: boolean
  onDrag?: (nodeId: string, x: number, y: number) => void
  onEdit?: (nodeId: string) => void
  onAddChild?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onDrag) return

    setIsDragging(true)
    const rect = e.currentTarget.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    e.preventDefault()
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !onDrag) return

    const container = document.getElementById('mindmap-container')
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const newX = e.clientX - containerRect.left - dragOffset.x
    const newY = e.clientY - containerRect.top - dragOffset.y

    onDrag(node.id, newX, newY)
  }, [isDragging, onDrag, node.id, dragOffset])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div
      className={`absolute select-none cursor-pointer group ${isDragging ? 'z-10' : ''}`}
      style={{
        left: node.x,
        top: node.y,
        transform: 'translate(-50%, -50%)'
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={() => onEdit?.(node.id)}
    >
      {/* Círculo de conexão para nós filhos/netos */}
      {!isRoot && (
        <div
          className="absolute w-2 h-2 bg-white border-2 rounded-full"
          style={{
            borderColor: node.color || BRANCH_COLORS[0],
            left: '-6px',
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        />
      )}

      {/* Texto do nó */}
      <div
        className={`
          font-sans text-gray-800 whitespace-nowrap px-2 py-1 relative
          ${isRoot ? 'text-lg font-medium' : 'text-sm font-normal'}
          hover:bg-gray-50 rounded transition-colors duration-200
          ${isDragging ? 'opacity-70' : ''}
        `}
      >
        {node.text}

        {/* Controles ao hover */}
        <div className="absolute top-0 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onAddChild && (
            <button
              className="w-4 h-4 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onAddChild(node.id)
              }}
              title="Adicionar nó filho"
            >
              <Plus className="w-2 h-2" />
            </button>
          )}
          {onEdit && (
            <button
              className="w-4 h-4 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(node.id)
              }}
              title="Editar texto"
            >
              <Edit2 className="w-2 h-2" />
            </button>
          )}
          {onDelete && !isRoot && (
            <button
              className="w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white"
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('Deletar este nó e todos os filhos?')) {
                  onDelete(node.id)
                }
              }}
              title="Deletar nó"
            >
              <X className="w-2 h-2" />
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
  // Calcular pontos de controle para curva Bézier suave
  const startX = fromNode.x
  const startY = fromNode.y
  const endX = toNode.x - 6 // Ajustar para o círculo de conexão
  const endY = toNode.y

  // Distância horizontal para pontos de controle
  const controlDistance = Math.abs(endX - startX) * 0.5

  // Pontos de controle para curva suave
  const cp1X = startX + (endX > startX ? controlDistance : -controlDistance)
  const cp1Y = startY
  const cp2X = endX - (endX > startX ? controlDistance * 0.3 : -controlDistance * 0.3)
  const cp2Y = endY

  const pathData = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`

  return (
    <path
      d={pathData}
      stroke={edge.color}
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
      className="pointer-events-none"
    />
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

  const handleNodeEdit = useCallback((nodeId: string) => {
    const currentNode = nodes.find(n => n.id === nodeId)
    const newText = prompt('Digite o novo texto:', currentNode?.text || '')
    if (newText && newText !== currentNode?.text) {
      setNodes(prev => prev.map(node =>
        node.id === nodeId ? { ...node, text: newText } : node
      ))
      setHasChanges(true)
    }
  }, [nodes])

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

  const handlePanStart = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsPanning(true)
      setLastPanPoint({ x: e.clientX, y: e.clientY })
    }
  }

  const handlePanMove = useCallback((e: MouseEvent) => {
    if (!isPanning) return

    const deltaX = e.clientX - lastPanPoint.x
    const deltaY = e.clientY - lastPanPoint.y

    setTranslateX(prev => prev + deltaX)
    setTranslateY(prev => prev + deltaY)
    setLastPanPoint({ x: e.clientX, y: e.clientY })
  }, [isPanning, lastPanPoint])

  const handlePanEnd = useCallback(() => {
    setIsPanning(false)
  }, [])

  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handlePanMove)
      document.addEventListener('mouseup', handlePanEnd)

      return () => {
        document.removeEventListener('mousemove', handlePanMove)
        document.removeEventListener('mouseup', handlePanEnd)
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
                {mentorado.turma}
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
        className="absolute inset-x-0 top-16 bottom-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handlePanStart}
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
            <MindMapNode
              key={node.id}
              node={node}
              isRoot={node.id === 'root'}
              onDrag={!isSharedView ? handleNodeDrag : undefined}
              onEdit={!isSharedView ? handleNodeEdit : undefined}
              onAddChild={!isSharedView ? addChildNode : undefined}
              onDelete={!isSharedView ? deleteNode : undefined}
            />
          ))}
        </div>
      </div>

      {/* Controles de zoom */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-8 h-8 p-0 bg-white shadow-sm border-gray-200 hover:bg-gray-50"
          onClick={handleZoomIn}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-8 h-8 p-0 bg-white shadow-sm border-gray-200 hover:bg-gray-50"
          onClick={handleZoomOut}
        >
          <Minus className="h-4 w-4" />
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