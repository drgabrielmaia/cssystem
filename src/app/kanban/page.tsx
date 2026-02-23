'use client'

import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Search, 
  Filter,
  Users,
  User,
  Calendar,
  Clock,
  Tag,
  MessageCircle,
  MoreVertical,
  Edit,
  Trash2,
  Target,
  Flag,
  CheckCircle2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

interface KanbanBoard {
  id: string
  name: string
  description?: string
  type: 'geral' | 'individual' | 'departamento'
  organization_id: string
  owner_id?: string
  is_active: boolean
}

interface KanbanColumn {
  id: string
  name: string
  color: string
  position: number
  wip_limit?: number
  task_count: number
}

interface KanbanTask {
  id: string
  title: string
  description?: string
  column_id: string
  assigned_to_email?: string
  created_by_email?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  estimated_hours?: number
  actual_hours: number
  position: number
  tags: string[]
  comments_count: number
  completed_at?: string
  created_at: string
  updated_at: string
}

const priorityColors = {
  low: 'bg-gray-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
}

const priorityLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente'
}

export default function KanbanPage() {
  const { user, organizationId } = useAuth()
  const [boards, setBoards] = useState<KanbanBoard[]>([])
  const [currentBoard, setCurrentBoard] = useState<KanbanBoard | null>(null)
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [tasks, setTasks] = useState<KanbanTask[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [showNewBoardModal, setShowNewBoardModal] = useState(false)
  const [newTaskColumnId, setNewTaskColumnId] = useState<string>('')

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to_email: '',
    priority: 'medium' as const,
    due_date: '',
    estimated_hours: '',
    tags: [] as string[]
  })

  // New board form state
  const [newBoard, setNewBoard] = useState<{
    name: string
    description: string
    type: 'geral' | 'individual' | 'departamento'
  }>({
    name: '',
    description: '',
    type: 'geral'
  })

  useEffect(() => {
    if (organizationId) {
      loadBoards()
    }
  }, [organizationId])

  useEffect(() => {
    if (currentBoard) {
      loadBoardData(currentBoard.id)
    }
  }, [currentBoard])

  const loadBoards = async () => {
    try {
      setLoading(true)
      
      // Get existing boards
      let { data: existingBoards, error } = await supabase
        .from('kanban_boards')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at')

      if (error) throw error

      // If no general board exists, create one
      if (!existingBoards?.find(b => b.type === 'geral')) {
        const { data: initResult } = await supabase.rpc('initialize_default_kanban', {
          p_organization_id: organizationId,
          p_user_email: user?.email
        })

        if (initResult?.[0]?.success) {
          // Reload boards after creating default
          const { data: updatedBoards } = await supabase
            .from('kanban_boards')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .order('created_at')

          existingBoards = updatedBoards || []
        }
      }

      setBoards(existingBoards || [])
      
      // Set first board as current if none selected
      if (existingBoards?.length && !currentBoard) {
        setCurrentBoard(existingBoards[0])
      }
    } catch (error) {
      console.error('Error loading boards:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBoardData = async (boardId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_kanban_board_data', {
        p_board_id: boardId,
        p_user_email: user?.email
      })

      if (error) throw error

      if (data && data[0]) {
        const { board_info, columns_data, tasks_data } = data[0]
        setColumns(columns_data || [])
        setTasks(tasks_data || [])
      }
    } catch (error) {
      console.error('Error loading board data:', error)
    }
  }

  const handleCreateBoard = async () => {
    if (!newBoard.name.trim()) return

    try {
      const { data, error } = await supabase
        .from('kanban_boards')
        .insert({
          name: newBoard.name,
          description: newBoard.description || null,
          type: newBoard.type,
          organization_id: organizationId,
          owner_id: user?.id,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      // Create default columns for the new board
      const defaultColumns = [
        { name: 'A Fazer', color: '#6B7280', position: 1 },
        { name: 'Em Progresso', color: '#3B82F6', position: 2 },
        { name: 'Em Revisão', color: '#F59E0B', position: 3 },
        { name: 'Concluído', color: '#10B981', position: 4 }
      ]

      await supabase
        .from('kanban_columns')
        .insert(defaultColumns.map(col => ({
          ...col,
          board_id: data.id
        })))

      // Reload boards and set new board as current
      await loadBoards()
      setCurrentBoard(data)
      
      setNewBoard({
        name: '',
        description: '',
        type: 'geral'
      })
      setShowNewBoardModal(false)
    } catch (error) {
      console.error('Error creating board:', error)
      alert('Erro ao criar board')
    }
  }

  const handleCreateTask = async () => {
    if (!newTask.title.trim() || !newTaskColumnId) return

    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .insert({
          board_id: currentBoard?.id,
          column_id: newTaskColumnId,
          title: newTask.title,
          description: newTask.description || null,
          assigned_to_email: newTask.assigned_to_email || null,
          created_by_email: user?.email,
          priority: newTask.priority,
          due_date: newTask.due_date || null,
          estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : null,
          tags: newTask.tags
        })

      if (error) throw error

      // Reload board data
      if (currentBoard) {
        await loadBoardData(currentBoard.id)
      }

      // Reset form
      setNewTask({
        title: '',
        description: '',
        assigned_to_email: '',
        priority: 'medium',
        due_date: '',
        estimated_hours: '',
        tags: []
      })
      setNewTaskColumnId('')
      setShowNewTaskModal(false)
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Erro ao criar tarefa')
    }
  }

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return

    const { draggableId, destination } = result
    const taskId = draggableId
    const newColumnId = destination.droppableId
    const newPosition = destination.index

    // Optimistically update UI
    setTasks(prevTasks => {
      const updatedTasks = prevTasks.map(task => {
        if (task.id === taskId) {
          return { ...task, column_id: newColumnId, position: newPosition }
        }
        return task
      })
      return updatedTasks
    })

    try {
      const { error } = await supabase.rpc('move_kanban_task', {
        p_task_id: taskId,
        p_new_column_id: newColumnId,
        p_new_position: newPosition,
        p_user_email: user?.email
      })

      if (error) throw error

      // Reload to get accurate positions
      if (currentBoard) {
        await loadBoardData(currentBoard.id)
      }
    } catch (error) {
      console.error('Error moving task:', error)
      // Revert optimistic update
      if (currentBoard) {
        await loadBoardData(currentBoard.id)
      }
    }
  }

  const getTasksByColumn = (columnId: string) => {
    return tasks
      .filter(task => task.column_id === columnId)
      .filter(task => 
        !searchTerm || 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.assigned_to_email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.position - b.position)
  }

  if (loading) {
    return (
      <PageLayout title="Kanban">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Kanban de Atividades">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Select 
            value={currentBoard?.id || ''} 
            onValueChange={(value) => {
              const board = boards.find(b => b.id === value)
              if (board) setCurrentBoard(board)
            }}
          >
            <SelectTrigger className="w-64 bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Selecione um board" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {boards.map(board => (
                <SelectItem key={board.id} value={board.id} className="text-white">
                  <div className="flex items-center gap-2">
                    {board.type === 'geral' ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    {board.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar tarefas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64 bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={showNewBoardModal} onOpenChange={setShowNewBoardModal}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Board
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Kanban Board */}
      {currentBoard && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-6 overflow-x-auto pb-6">
            {columns.map(column => (
              <div key={column.id} className="flex-shrink-0 w-80">
                <div className="bg-gray-800 rounded-lg shadow-lg">
                  {/* Column Header */}
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: column.color }}
                        />
                        <h3 className="font-semibold text-white">{column.name}</h3>
                        <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                          {column.task_count}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setNewTaskColumnId(column.id)
                          setShowNewTaskModal(true)
                        }}
                        className="text-gray-400 hover:text-white hover:bg-gray-700"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {column.wip_limit && (
                      <div className="text-xs text-gray-400">
                        Limite WIP: {column.task_count}/{column.wip_limit}
                      </div>
                    )}
                  </div>

                  {/* Column Tasks */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-3 min-h-[200px] ${
                          snapshot.isDraggingOver ? 'bg-gray-700' : ''
                        }`}
                      >
                        {getTasksByColumn(column.id).map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`mb-3 p-3 bg-gray-900 rounded-lg border border-gray-600 cursor-move hover:border-gray-500 transition-colors ${
                                  snapshot.isDragging ? 'transform rotate-2 shadow-xl' : ''
                                }`}
                              >
                                {/* Task Header */}
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-medium text-white text-sm leading-tight flex-1">
                                    {task.title}
                                  </h4>
                                  <div className="flex items-center gap-1 ml-2">
                                    <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400">
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Task Description */}
                                {task.description && (
                                  <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}

                                {/* Task Tags */}
                                {task.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {task.tags.slice(0, 2).map(tag => (
                                      <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                                        {tag}
                                      </Badge>
                                    ))}
                                    {task.tags.length > 2 && (
                                      <Badge variant="outline" className="text-xs px-1 py-0">
                                        +{task.tags.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {/* Task Footer */}
                                <div className="flex items-center justify-between text-xs text-gray-400">
                                  <div className="flex items-center gap-2">
                                    {task.assigned_to_email && (
                                      <div className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        <span className="truncate max-w-16">
                                          {task.assigned_to_email.split('@')[0]}
                                        </span>
                                      </div>
                                    )}
                                    {task.due_date && (
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>{new Date(task.due_date).toLocaleDateString('pt-BR')}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {task.comments_count > 0 && (
                                      <div className="flex items-center gap-1">
                                        <MessageCircle className="h-3 w-3" />
                                        <span>{task.comments_count}</span>
                                      </div>
                                    )}
                                    {task.estimated_hours && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{task.estimated_hours}h</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* New Board Modal */}
      <Dialog open={showNewBoardModal} onOpenChange={setShowNewBoardModal}>
        <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Criar Novo Board</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-white">Nome do Board *</Label>
              <Input
                value={newBoard.name}
                onChange={(e) => setNewBoard(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Sprint Atual, Projetos Q1..."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Descrição</Label>
              <Textarea
                value={newBoard.description}
                onChange={(e) => setNewBoard(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o propósito deste board..."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Tipo do Board</Label>
              <Select value={newBoard.type} onValueChange={(value: 'geral' | 'individual' | 'departamento') => setNewBoard(prev => ({ ...prev, type: value }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="geral" className="text-white">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Board Geral
                    </div>
                  </SelectItem>
                  <SelectItem value="individual" className="text-white">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Board Individual
                    </div>
                  </SelectItem>
                  <SelectItem value="departamento" className="text-white">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Board de Departamento
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1">
                {newBoard.type === 'geral' && 'Visível para todos da organização'}
                {newBoard.type === 'individual' && 'Apenas você pode ver e editar'}
                {newBoard.type === 'departamento' && 'Visível para membros do departamento'}
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowNewBoardModal(false)}
              className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateBoard}
              disabled={!newBoard.name.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Criar Board
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Task Modal */}
      <Dialog open={showNewTaskModal} onOpenChange={setShowNewTaskModal}>
        <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Nova Tarefa</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-white">Título *</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Digite o título da tarefa..."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Descrição</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição detalhada da tarefa..."
                className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Responsável</Label>
                <Input
                  value={newTask.assigned_to_email}
                  onChange={(e) => setNewTask(prev => ({ ...prev, assigned_to_email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  type="email"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div>
                <Label className="text-white">Prioridade</Label>
                <Select 
                  value={newTask.priority} 
                  onValueChange={(value: any) => setNewTask(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {Object.entries(priorityLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key} className="text-white">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${priorityColors[key as keyof typeof priorityColors]}`} />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Data de Entrega</Label>
                <Input
                  value={newTask.due_date}
                  onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                  type="date"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div>
                <Label className="text-white">Estimativa (horas)</Label>
                <Input
                  value={newTask.estimated_hours}
                  onChange={(e) => setNewTask(prev => ({ ...prev, estimated_hours: e.target.value }))}
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Ex: 2.5"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowNewTaskModal(false)}
              className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateTask}
              disabled={!newTask.title.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Criar Tarefa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}