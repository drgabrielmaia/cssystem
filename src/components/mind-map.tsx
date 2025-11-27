'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { type Mentorado } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Target,
  Brain,
  Star,
  Clock,
  Check,
  X,
  Edit,
  Trash2,
  Save,
  Calendar
} from 'lucide-react'

interface MindMapNode {
  id: string
  title: string
  description?: string
  type: 'goal' | 'action' | 'achievement' | 'obstacle'
  status: 'pending' | 'in_progress' | 'completed' | 'paused'
  priority: 'low' | 'medium' | 'high'
  deadline?: string
  x: number
  y: number
  parentId?: string
  children: string[]
}

interface MindMapProps {
  mentorado: Mentorado
}

export function MindMap({ mentorado }: MindMapProps) {
  const [nodes, setNodes] = useState<MindMapNode[]>([])
  const [connections, setConnections] = useState<Array<{ from: string; to: string }>>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [editingNode, setEditingNode] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    type: 'goal' as MindMapNode['type'],
    status: 'pending' as MindMapNode['status'],
    priority: 'medium' as MindMapNode['priority'],
    deadline: ''
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createPosition, setCreatePosition] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    initializeMindMap()
  }, [mentorado.id])

  const initializeMindMap = () => {
    const centralNode: MindMapNode = {
      id: 'central',
      title: mentorado.nome_completo,
      description: `Jornada de desenvolvimento pessoal`,
      type: 'goal',
      status: 'in_progress',
      priority: 'high',
      x: 400,
      y: 300,
      children: []
    }

    const sampleNodes: MindMapNode[] = [
      {
        id: '1',
        title: 'Metas Profissionais',
        description: 'Objetivos de carreira e desenvolvimento',
        type: 'goal',
        status: 'in_progress',
        priority: 'high',
        x: 200,
        y: 150,
        parentId: 'central',
        children: []
      },
      {
        id: '2',
        title: 'Desenvolvimento Pessoal',
        description: 'Crescimento pessoal e habilidades',
        type: 'goal',
        status: 'pending',
        priority: 'medium',
        x: 600,
        y: 150,
        parentId: 'central',
        children: []
      },
      {
        id: '3',
        title: 'Competências Técnicas',
        description: 'Habilidades específicas da área',
        type: 'action',
        status: 'in_progress',
        priority: 'high',
        x: 200,
        y: 450,
        parentId: 'central',
        children: []
      },
      {
        id: '4',
        title: 'Network e Relacionamentos',
        description: 'Construção de rede profissional',
        type: 'goal',
        status: 'pending',
        priority: 'medium',
        x: 600,
        y: 450,
        parentId: 'central',
        children: []
      }
    ]

    centralNode.children = ['1', '2', '3', '4']
    setNodes([centralNode, ...sampleNodes])

    const initialConnections = sampleNodes.map(node => ({
      from: 'central',
      to: node.id
    }))
    setConnections(initialConnections)
  }

  const getNodeColor = (type: MindMapNode['type'], status: MindMapNode['status']) => {
    const baseColors = {
      goal: { from: '#60a5fa', to: '#2563eb' },
      action: { from: '#4ade80', to: '#16a34a' },
      achievement: { from: '#fbbf24', to: '#d97706' },
      obstacle: { from: '#f87171', to: '#dc2626' }
    }

    if (status === 'completed') {
      return { from: '#d1d5db', to: '#6b7280' }
    }

    return baseColors[type]
  }

  const getStatusIcon = (status: MindMapNode['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="h-3 w-3" />
      case 'in_progress':
        return <Clock className="h-3 w-3" />
      case 'paused':
        return <X className="h-3 w-3" />
      default:
        return <Target className="h-3 w-3" />
    }
  }

  const handleNodeClick = (nodeId: string) => {
    if (editingNode) return
    setSelectedNode(selectedNode === nodeId ? null : nodeId)
  }

  const handleAddNode = (e: React.MouseEvent) => {
    if (editingNode) return

    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setCreatePosition({ x, y })
    setIsCreating(true)
    setEditForm({
      title: '',
      description: '',
      type: 'goal',
      status: 'pending',
      priority: 'medium',
      deadline: ''
    })
  }

  const handleCreateNode = () => {
    if (!editForm.title.trim()) return

    const newNode: MindMapNode = {
      id: Date.now().toString(),
      title: editForm.title,
      description: editForm.description,
      type: editForm.type,
      status: editForm.status,
      priority: editForm.priority,
      deadline: editForm.deadline,
      x: createPosition.x,
      y: createPosition.y,
      children: []
    }

    if (selectedNode && selectedNode !== 'central') {
      newNode.parentId = selectedNode
      setNodes(prev => prev.map(node =>
        node.id === selectedNode
          ? { ...node, children: [...node.children, newNode.id] }
          : node
      ))
      setConnections(prev => [...prev, { from: selectedNode, to: newNode.id }])
    }

    setNodes(prev => [...prev, newNode])
    setIsCreating(false)
    setEditForm({ title: '', description: '', type: 'goal', status: 'pending', priority: 'medium', deadline: '' })
  }

  const handleEditNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node || nodeId === 'central') return

    setEditingNode(nodeId)
    setEditForm({
      title: node.title,
      description: node.description || '',
      type: node.type,
      status: node.status,
      priority: node.priority,
      deadline: node.deadline || ''
    })
  }

  const handleSaveEdit = () => {
    if (!editForm.title.trim() || !editingNode) return

    setNodes(prev => prev.map(node =>
      node.id === editingNode
        ? {
            ...node,
            title: editForm.title,
            description: editForm.description,
            type: editForm.type,
            status: editForm.status,
            priority: editForm.priority,
            deadline: editForm.deadline
          }
        : node
    ))

    setEditingNode(null)
    setEditForm({ title: '', description: '', type: 'goal', status: 'pending', priority: 'medium', deadline: '' })
  }

  const handleDeleteNode = (nodeId: string) => {
    if (nodeId === 'central') return

    setNodes(prev => prev.filter(node => node.id !== nodeId))
    setConnections(prev => prev.filter(conn => conn.from !== nodeId && conn.to !== nodeId))
    setSelectedNode(null)
  }

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (editingNode || isCreating) return

    setDraggedNode(nodeId)
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y
    })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedNode || !svgRef.current) return

    const rect = svgRef.current.getBoundingClientRect()
    const newX = e.clientX - rect.left - dragOffset.x
    const newY = e.clientY - rect.top - dragOffset.y

    setNodes(prev => prev.map(node =>
      node.id === draggedNode
        ? { ...node, x: Math.max(50, Math.min(750, newX)), y: Math.max(50, Math.min(550, newY)) }
        : node
    ))
  }, [draggedNode, dragOffset])

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null)
  }, [])

  useEffect(() => {
    if (draggedNode) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [draggedNode, handleMouseMove, handleMouseUp])

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button
          size="sm"
          onClick={() => handleAddNode({ clientX: 400, clientY: 300 } as any)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Nó
        </Button>
        {selectedNode && selectedNode !== 'central' && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEditNode(selectedNode)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleDeleteNode(selectedNode)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10">
        <Card className="p-3">
          <div className="text-xs font-medium mb-2">Legenda:</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-400 to-blue-600"></div>
              <span>Metas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gradient-to-r from-green-400 to-green-600"></div>
              <span>Ações</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
              <span>Conquistas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gradient-to-r from-red-400 to-red-600"></div>
              <span>Obstáculos</span>
            </div>
          </div>
        </Card>
      </div>

      {/* SVG Mind Map */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="absolute inset-0 cursor-pointer"
        onClick={handleAddNode}
      >
        {/* Connections */}
        {connections.map((conn, index) => {
          const fromNode = nodes.find(n => n.id === conn.from)
          const toNode = nodes.find(n => n.id === conn.to)
          if (!fromNode || !toNode) return null

          return (
            <line
              key={index}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke="#cbd5e1"
              strokeWidth="2"
              strokeDasharray={toNode.status === 'completed' ? '5,5' : 'none'}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={node.id === 'central' ? 40 : 30}
              fill={`url(#gradient-${node.id})`}
              stroke={selectedNode === node.id ? '#3b82f6' : '#94a3b8'}
              strokeWidth={selectedNode === node.id ? 3 : 1}
              className="cursor-move hover:stroke-blue-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                handleNodeClick(node.id)
              }}
              onMouseDown={(e) => handleMouseDown(e, node.id)}
            />
            <defs>
              <linearGradient id={`gradient-${node.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={getNodeColor(node.type, node.status).from} />
                <stop offset="100%" stopColor={getNodeColor(node.type, node.status).to} />
              </linearGradient>
            </defs>

            {/* Node Icon */}
            <foreignObject
              x={node.x - 8}
              y={node.y - 8}
              width="16"
              height="16"
              className="pointer-events-none"
            >
              <div className="text-white flex items-center justify-center">
                {getStatusIcon(node.status)}
              </div>
            </foreignObject>

            {/* Node Label */}
            <text
              x={node.x}
              y={node.y + (node.id === 'central' ? 55 : 45)}
              textAnchor="middle"
              className="text-xs font-medium fill-gray-700 pointer-events-none"
              fontSize={node.id === 'central' ? '14' : '12'}
            >
              {node.title.length > 20 ? node.title.substring(0, 20) + '...' : node.title}
            </text>

            {/* Priority Badge */}
            {node.priority === 'high' && node.id !== 'central' && (
              <circle
                cx={node.x + 20}
                cy={node.y - 20}
                r="6"
                fill="#ef4444"
                className="pointer-events-none"
              />
            )}
          </g>
        ))}
      </svg>

      {/* Edit Modal */}
      {(isCreating || editingNode) && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <Card className="p-6 w-96 max-w-sm mx-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {isCreating ? 'Criar Novo Nó' : 'Editar Nó'}
              </h3>

              <div>
                <label className="text-sm font-medium">Título*</label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Aprender Python"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Input
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalhes sobre o objetivo..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Tipo</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full p-2 border rounded-md text-sm"
                  >
                    <option value="goal">Meta</option>
                    <option value="action">Ação</option>
                    <option value="achievement">Conquista</option>
                    <option value="obstacle">Obstáculo</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full p-2 border rounded-md text-sm"
                  >
                    <option value="pending">Pendente</option>
                    <option value="in_progress">Em Progresso</option>
                    <option value="completed">Concluído</option>
                    <option value="paused">Pausado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Prioridade</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full p-2 border rounded-md text-sm"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Prazo</label>
                  <Input
                    type="date"
                    value={editForm.deadline}
                    onChange={(e) => setEditForm(prev => ({ ...prev, deadline: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={isCreating ? handleCreateNode : handleSaveEdit}
                  className="flex-1"
                  disabled={!editForm.title.trim()}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isCreating ? 'Criar' : 'Salvar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false)
                    setEditingNode(null)
                    setEditForm({ title: '', description: '', type: 'goal', status: 'pending', priority: 'medium', deadline: '' })
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}