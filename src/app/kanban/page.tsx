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
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente'
}

// --- UI Helper constants & functions ---

const priorityBorderColors: Record<string, string> = {
  low: '#6B7280',
  medium: '#3B82F6',
  high: '#F97316',
  urgent: '#EF4444'
}

const priorityBadgeBg: Record<string, string> = {
  low: 'bg-gray-500/15 text-gray-400 ring-gray-500/20',
  medium: 'bg-blue-500/15 text-blue-400 ring-blue-500/20',
  high: 'bg-orange-500/15 text-orange-400 ring-orange-500/20',
  urgent: 'bg-red-500/15 text-red-400 ring-red-500/20'
}

const tagColorPalette = [
  'bg-violet-500/15 text-violet-400 ring-violet-500/20',
  'bg-sky-500/15 text-sky-400 ring-sky-500/20',
  'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20',
  'bg-amber-500/15 text-amber-400 ring-amber-500/20',
  'bg-pink-500/15 text-pink-400 ring-pink-500/20',
  'bg-teal-500/15 text-teal-400 ring-teal-500/20',
  'bg-indigo-500/15 text-indigo-400 ring-indigo-500/20',
  'bg-rose-500/15 text-rose-400 ring-rose-500/20',
]

function getTagColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return tagColorPalette[Math.abs(hash) % tagColorPalette.length]
}

function getInitials(email: string): string {
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function getAvatarColor(email: string): string {
  const colors = [
    'bg-violet-600', 'bg-sky-600', 'bg-emerald-600', 'bg-amber-600',
    'bg-pink-600', 'bg-teal-600', 'bg-indigo-600', 'bg-rose-600',
  ]
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getRelativeDate(dateStr: string): { text: string; isOverdue: boolean; className: string } {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  const diffMs = target.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays)
    return {
      text: absDays === 1 ? 'Atrasado 1 dia' : `Atrasado ${absDays} dias`,
      isOverdue: true,
      className: 'text-red-400'
    }
  }
  if (diffDays === 0) return { text: 'Hoje', isOverdue: false, className: 'text-amber-400' }
  if (diffDays === 1) return { text: 'Amanha', isOverdue: false, className: 'text-amber-400' }
  if (diffDays <= 7) return { text: `Em ${diffDays} dias`, isOverdue: false, className: 'text-white/50' }
  return { text: new Date(dateStr).toLocaleDateString('pt-BR'), isOverdue: false, className: 'text-white/40' }
}

// --- End UI Helpers ---

export default function KanbanPage() {
  const { user, organizationId } = useAuth()
  const [boards, setBoards] = useState<KanbanBoard[]>([])
  const [currentBoard, setCurrentBoard] = useState<KanbanBoard | null>(null)
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [tasks, setTasks] = useState<KanbanTask[]>([])
  const [organizationMembers, setOrganizationMembers] = useState<{email: string; role: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [showAllTasks, setShowAllTasks] = useState(true)

  const isAdmin = userRole === 'owner' || userRole === 'manager'
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [showNewBoardModal, setShowNewBoardModal] = useState(false)
  const [newTaskColumnId, setNewTaskColumnId] = useState<string>('')
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showTaskMenu, setShowTaskMenu] = useState<string | null>(null)
  const [isEditingTask, setIsEditingTask] = useState(false)
  const [editTask, setEditTask] = useState<{
    title: string
    description: string
    assigned_to_email: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    due_date: string
    estimated_hours: string
    tags: string[]
  }>({
    title: '',
    description: '',
    assigned_to_email: '',
    priority: 'medium',
    due_date: '',
    estimated_hours: '',
    tags: []
  })

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to_email: 'none',
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

  // Inline add state per column
  const [inlineAddColumn, setInlineAddColumn] = useState<string | null>(null)
  const [inlineAddTitle, setInlineAddTitle] = useState('')

  useEffect(() => {
    if (organizationId) {
      loadBoards()
      loadOrganizationMembers()
      loadUserRole()
    }
  }, [organizationId])

  const loadUserRole = async () => {
    if (!user?.email || !organizationId) return
    try {
      const { data, error } = await supabase
        .from('organization_users')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('email', user.email)
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('Error loading user role:', error)
        return
      }
      setUserRole(data?.role || null)
      // Non-admin users default to seeing only their own tasks
      if (data?.role !== 'owner' && data?.role !== 'manager') {
        setShowAllTasks(false)
      }
    } catch (error) {
      console.error('Error loading user role:', error)
    }
  }

  // Close task menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest('[data-task-menu]')) {
        setShowTaskMenu(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const loadOrganizationMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_users')
        .select('email, role')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('email')

      if (error) throw error

      setOrganizationMembers(data || [])
    } catch (error) {
      console.error('Error loading organization members:', error)
    }
  }

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
        { name: 'Em Revisao', color: '#F59E0B', position: 3 },
        { name: 'Concluido', color: '#10B981', position: 4 }
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
          assigned_to_email: (newTask.assigned_to_email && newTask.assigned_to_email !== 'none') ? newTask.assigned_to_email : null,
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

  // Inline quick-add handler
  const handleInlineAddTask = async (columnId: string) => {
    if (!inlineAddTitle.trim()) return

    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .insert({
          board_id: currentBoard?.id,
          column_id: columnId,
          title: inlineAddTitle.trim(),
          created_by_email: user?.email,
          priority: 'medium',
          tags: []
        })

      if (error) throw error

      if (currentBoard) {
        await loadBoardData(currentBoard.id)
      }

      setInlineAddTitle('')
      setInlineAddColumn(null)
    } catch (error) {
      console.error('Error creating task:', error)
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

  const handleTaskClick = (task: KanbanTask) => {
    setSelectedTask(task)
    setShowTaskModal(true)
    setIsEditingTask(false)
  }

  const handleEditTask = (task: KanbanTask) => {
    setSelectedTask(task)
    setEditTask({
      title: task.title,
      description: task.description || '',
      assigned_to_email: task.assigned_to_email || 'none',
      priority: task.priority,
      due_date: task.due_date || '',
      estimated_hours: task.estimated_hours ? task.estimated_hours.toString() : '',
      tags: task.tags
    })
    setIsEditingTask(true)
    setShowTaskModal(true)
  }

  const handleSaveEditTask = async () => {
    if (!selectedTask || !editTask.title.trim()) return

    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .update({
          title: editTask.title,
          description: editTask.description || null,
          assigned_to_email: (editTask.assigned_to_email && editTask.assigned_to_email !== 'none') ? editTask.assigned_to_email : null,
          priority: editTask.priority,
          due_date: editTask.due_date || null,
          estimated_hours: editTask.estimated_hours ? parseFloat(editTask.estimated_hours) : null,
          tags: editTask.tags,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTask.id)

      if (error) throw error

      // Reload board data
      if (currentBoard) {
        await loadBoardData(currentBoard.id)
      }

      setShowTaskModal(false)
      setIsEditingTask(false)
      setSelectedTask(null)
    } catch (error) {
      console.error('Error updating task:', error)
      alert('Erro ao atualizar tarefa')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta tarefa?')) return

    try {
      const { error } = await supabase
        .from('kanban_tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      setTasks(prev => prev.filter(task => task.id !== taskId))
      setShowTaskMenu(null)
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error)
      alert('Erro ao deletar tarefa')
    }
  }

  const getTasksByColumn = (columnId: string) => {
    return tasks
      .filter(task => task.column_id === columnId)
      .filter(task => {
        // Non-admin users only see tasks assigned to them (unless toggle is somehow on)
        // Admins see all tasks when showAllTasks is true, otherwise only their own
        if (!showAllTasks && user?.email) {
          return task.assigned_to_email === user.email || task.created_by_email === user.email
        }
        return true
      })
      .filter(task =>
        !searchTerm ||
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.assigned_to_email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.position - b.position)
  }

  // --- Stats computation ---
  const totalTasks = tasks.length
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const completedToday = tasks.filter(t => {
    if (!t.completed_at) return false
    return t.completed_at.startsWith(todayStr)
  }).length

  const overdueCount = tasks.filter(t => {
    if (!t.due_date || t.completed_at) return false
    const due = new Date(t.due_date + 'T00:00:00')
    return due < today
  }).length

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
      <div className="min-h-[calc(100vh-8rem)] bg-[#0A0A0A] -m-6 p-6 rounded-xl">

        {/* ── Board Tabs + Search Bar ── */}
        <div className="flex flex-col gap-4 mb-5">
          {/* Top row: board tabs + actions */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Board tab bar */}
            <div className="flex items-center gap-1 bg-[#141418] rounded-lg p-1 ring-1 ring-white/[0.06]">
              {boards.map(board => {
                const isActive = currentBoard?.id === board.id
                return (
                  <button
                    key={board.id}
                    onClick={() => {
                      const b = boards.find(x => x.id === board.id)
                      if (b) setCurrentBoard(b)
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-white/[0.08] text-white shadow-sm'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                    }`}
                  >
                    {board.type === 'geral' ? <Users className="h-3.5 w-3.5" /> : board.type === 'individual' ? <User className="h-3.5 w-3.5" /> : <Target className="h-3.5 w-3.5" />}
                    {board.name}
                  </button>
                )
              })}
              <Dialog open={showNewBoardModal} onOpenChange={setShowNewBoardModal}>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                    Board
                  </button>
                </DialogTrigger>
              </Dialog>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => setShowAllTasks(!showAllTasks)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ring-1 ${
                    showAllTasks
                      ? 'bg-blue-500/15 text-blue-400 ring-blue-500/25'
                      : 'bg-white/[0.04] text-white/50 ring-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  {showAllTasks ? <Users className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  {showAllTasks ? 'Todas' : 'Minhas'}
                </button>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <input
                  placeholder="Buscar tarefas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 w-56 bg-[#141418] ring-1 ring-white/[0.06] rounded-lg text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-white/[0.12] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-6 px-1">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-white/60 font-medium">{totalTasks}</span> tarefas
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-white/60 font-medium">{completedToday}</span> concluidas hoje
            </div>
            {overdueCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-red-400/80">
                <Flag className="h-3.5 w-3.5" />
                <span className="font-medium">{overdueCount}</span> atrasada{overdueCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* ── Kanban Board ── */}
        {currentBoard && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin">
              {columns.map(column => {
                const colTasks = getTasksByColumn(column.id)
                const wipRatio = column.wip_limit ? colTasks.length / column.wip_limit : 0
                const wipOverLimit = column.wip_limit ? colTasks.length > column.wip_limit : false

                return (
                  <div key={column.id} className="flex-shrink-0 w-[320px]">
                    <div className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06] overflow-hidden flex flex-col">

                      {/* ── Column Header ── */}
                      <div className="p-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* Colored accent bar */}
                            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: column.color }} />
                            <h3 className="font-semibold text-white/90 text-sm tracking-wide">{column.name}</h3>
                            <span className="text-xs font-medium text-white/30 bg-white/[0.06] px-2 py-0.5 rounded-full">
                              {colTasks.length}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setNewTaskColumnId(column.id)
                              setShowNewTaskModal(true)
                            }}
                            className="p-1.5 rounded-md text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        {/* WIP Limit progress bar */}
                        {column.wip_limit && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[10px] mb-1">
                              <span className={wipOverLimit ? 'text-red-400 font-medium' : 'text-white/30'}>
                                {colTasks.length} / {column.wip_limit} WIP
                              </span>
                              {wipOverLimit && <span className="text-red-400">Acima do limite</span>}
                            </div>
                            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  wipOverLimit ? 'bg-red-500' : wipRatio > 0.75 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(wipRatio * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── Column Tasks (Droppable) ── */}
                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`px-3 pb-3 min-h-[120px] transition-colors duration-150 ${
                              snapshot.isDraggingOver ? 'bg-white/[0.02]' : ''
                            }`}
                          >
                            {colTasks.map((task, index) => (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => {
                                  const dueDateInfo = task.due_date ? getRelativeDate(task.due_date) : null

                                  return (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`group mb-2.5 rounded-lg bg-[#1C1C22] ring-1 ring-white/[0.06] cursor-move transition-all duration-150 ${
                                        snapshot.isDragging
                                          ? 'rotate-[1.5deg] shadow-2xl shadow-black/50 ring-white/[0.12] scale-[1.02]'
                                          : 'hover:ring-white/[0.12] hover:bg-[#1E1E26] hover:shadow-lg hover:shadow-black/20'
                                      }`}
                                      onClick={(e) => {
                                        if (!(e.target as Element).closest('[data-task-menu]')) {
                                          handleTaskClick(task)
                                        }
                                      }}
                                    >
                                      {/* Priority accent - left border */}
                                      <div className="flex">
                                        <div
                                          className="w-1 rounded-l-lg flex-shrink-0"
                                          style={{ backgroundColor: priorityBorderColors[task.priority] }}
                                        />
                                        <div className="flex-1 p-3 min-w-0">

                                          {/* Task Header */}
                                          <div className="flex items-start justify-between gap-2 mb-1.5">
                                            <h4 className="font-medium text-white/90 text-sm leading-snug flex-1">
                                              {task.title}
                                            </h4>
                                            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <div className="relative">
                                                <button
                                                  data-task-menu
                                                  className="p-1 rounded text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-colors"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    setShowTaskMenu(showTaskMenu === task.id ? null : task.id)
                                                  }}
                                                >
                                                  <MoreVertical className="h-3.5 w-3.5" />
                                                </button>
                                                {showTaskMenu === task.id && (
                                                  <div className="absolute right-0 top-7 z-50 bg-[#1C1C22] ring-1 ring-white/[0.1] rounded-lg shadow-xl shadow-black/40 py-1 min-w-[130px]" data-task-menu>
                                                    <button
                                                      className="w-full px-3 py-2 text-left text-xs text-white/70 hover:bg-white/[0.06] flex items-center gap-2 transition-colors"
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleEditTask(task)
                                                        setShowTaskMenu(null)
                                                      }}
                                                    >
                                                      <Edit className="h-3 w-3" />
                                                      Editar
                                                    </button>
                                                    <button
                                                      className="w-full px-3 py-2 text-left text-xs text-red-400/80 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDeleteTask(task.id)
                                                      }}
                                                    >
                                                      <Trash2 className="h-3 w-3" />
                                                      Excluir
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Description preview */}
                                          {task.description && (
                                            <p className="text-xs text-white/30 mb-2.5 line-clamp-2 leading-relaxed">
                                              {task.description}
                                            </p>
                                          )}

                                          {/* Tags */}
                                          {task.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-2.5">
                                              {task.tags.slice(0, 3).map(tag => (
                                                <span
                                                  key={tag}
                                                  className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ring-1 ${getTagColor(tag)}`}
                                                >
                                                  {tag}
                                                </span>
                                              ))}
                                              {task.tags.length > 3 && (
                                                <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.05] text-white/30 ring-1 ring-white/[0.06]">
                                                  +{task.tags.length - 3}
                                                </span>
                                              )}
                                            </div>
                                          )}

                                          {/* Footer: avatar, date, meta */}
                                          <div className="flex items-center justify-between mt-1">
                                            <div className="flex items-center gap-2">
                                              {/* Avatar / initials */}
                                              {task.assigned_to_email && (
                                                <div className="flex items-center gap-1.5" title={task.assigned_to_email}>
                                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${getAvatarColor(task.assigned_to_email)}`}>
                                                    {getInitials(task.assigned_to_email)}
                                                  </div>
                                                </div>
                                              )}
                                              {/* Due date with relative time */}
                                              {dueDateInfo && (
                                                <div className={`flex items-center gap-1 text-[11px] ${dueDateInfo.className}`}>
                                                  <Calendar className="h-3 w-3" />
                                                  <span>{dueDateInfo.text}</span>
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                              {task.comments_count > 0 && (
                                                <div className="flex items-center gap-1 text-[11px] text-white/25">
                                                  <MessageCircle className="h-3 w-3" />
                                                  <span>{task.comments_count}</span>
                                                </div>
                                              )}
                                              {task.estimated_hours && (
                                                <div className="flex items-center gap-1 text-[11px] text-white/25">
                                                  <Clock className="h-3 w-3" />
                                                  <span>{task.estimated_hours}h</span>
                                                </div>
                                              )}
                                              {/* Priority badge (small) */}
                                              <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${priorityBadgeBg[task.priority]}`}>
                                                {priorityLabels[task.priority]}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                }}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>

                      {/* ── Inline Add Task ── */}
                      <div className="px-3 pb-3">
                        {inlineAddColumn === column.id ? (
                          <div className="bg-[#1C1C22] rounded-lg ring-1 ring-white/[0.08] p-2.5">
                            <input
                              autoFocus
                              placeholder="Titulo da tarefa..."
                              value={inlineAddTitle}
                              onChange={(e) => setInlineAddTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineAddTask(column.id)
                                if (e.key === 'Escape') { setInlineAddColumn(null); setInlineAddTitle('') }
                              }}
                              className="w-full bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none mb-2"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleInlineAddTask(column.id)}
                                disabled={!inlineAddTitle.trim()}
                                className="px-3 py-1 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                Adicionar
                              </button>
                              <button
                                onClick={() => { setInlineAddColumn(null); setInlineAddTitle('') }}
                                className="px-3 py-1 rounded-md text-white/40 text-xs hover:text-white/60 transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setInlineAddColumn(column.id); setInlineAddTitle('') }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.03] transition-colors text-xs"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Adicionar tarefa
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                )
              })}
            </div>
          </DragDropContext>
        )}

        {/* ── New Board Modal ── */}
        <Dialog open={showNewBoardModal} onOpenChange={setShowNewBoardModal}>
          <DialogContent className="sm:max-w-lg bg-[#141418] border-white/[0.06]">
            <DialogHeader>
              <DialogTitle className="text-white">Criar Novo Board</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-white/70 text-xs uppercase tracking-wider">Nome do Board *</Label>
                <Input
                  value={newBoard.name}
                  onChange={(e) => setNewBoard(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Sprint Atual, Projetos Q1..."
                  className="bg-[#1C1C22] border-white/[0.06] text-white mt-1.5 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <Label className="text-white/70 text-xs uppercase tracking-wider">Descricao</Label>
                <Textarea
                  value={newBoard.description}
                  onChange={(e) => setNewBoard(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o proposito deste board..."
                  className="bg-[#1C1C22] border-white/[0.06] text-white mt-1.5"
                />
              </div>

              <div>
                <Label className="text-white/70 text-xs uppercase tracking-wider">Tipo do Board</Label>
                <Select value={newBoard.type} onValueChange={(value: 'geral' | 'individual' | 'departamento') => setNewBoard(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="bg-[#1C1C22] border-white/[0.06] text-white mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1C1C22] border-white/[0.08]">
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
                <p className="text-[11px] text-white/30 mt-1.5">
                  {newBoard.type === 'geral' && 'Visivel para todos da organizacao'}
                  {newBoard.type === 'individual' && 'Apenas voce pode ver e editar'}
                  {newBoard.type === 'departamento' && 'Visivel para membros do departamento'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowNewBoardModal(false)}
                className="flex-1 bg-white/[0.04] border-white/[0.06] text-white/70 hover:bg-white/[0.08] hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateBoard}
                disabled={!newBoard.name.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
              >
                Criar Board
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── New Task Modal ── */}
        <Dialog open={showNewTaskModal} onOpenChange={setShowNewTaskModal}>
          <DialogContent className="sm:max-w-lg bg-[#141418] border-white/[0.06]">
            <DialogHeader>
              <DialogTitle className="text-white">Nova Tarefa</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-white/70 text-xs uppercase tracking-wider">Titulo *</Label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Digite o titulo da tarefa..."
                  className="bg-[#1C1C22] border-white/[0.06] text-white mt-1.5"
                />
              </div>

              <div>
                <Label className="text-white/70 text-xs uppercase tracking-wider">Descricao</Label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descricao detalhada da tarefa..."
                  className="bg-[#1C1C22] border-white/[0.06] text-white min-h-[80px] mt-1.5"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/70 text-xs uppercase tracking-wider">Responsavel</Label>
                  <Select
                    value={newTask.assigned_to_email}
                    onValueChange={(value) => setNewTask(prev => ({ ...prev, assigned_to_email: value }))}
                  >
                    <SelectTrigger className="bg-[#1C1C22] border-white/[0.06] text-white mt-1.5">
                      <SelectValue placeholder="Selecione um responsavel" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1C1C22] border-white/[0.08]">
                      <SelectItem value="none" className="text-white">
                        Sem responsavel
                      </SelectItem>
                      {organizationMembers.map(member => (
                        <SelectItem key={member.email} value={member.email} className="text-white">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${getAvatarColor(member.email)}`}>
                              {getInitials(member.email)}
                            </div>
                            <span>{member.email}</span>
                            <span className="text-white/30 text-xs">{member.role}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white/70 text-xs uppercase tracking-wider">Prioridade</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: any) => setNewTask(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger className="bg-[#1C1C22] border-white/[0.06] text-white mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1C1C22] border-white/[0.08]">
                      {Object.entries(priorityLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key} className="text-white">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: priorityBorderColors[key] }} />
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/70 text-xs uppercase tracking-wider">Data de Entrega</Label>
                  <Input
                    value={newTask.due_date}
                    onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                    type="date"
                    className="bg-[#1C1C22] border-white/[0.06] text-white mt-1.5"
                  />
                </div>

                <div>
                  <Label className="text-white/70 text-xs uppercase tracking-wider">Estimativa (horas)</Label>
                  <Input
                    value={newTask.estimated_hours}
                    onChange={(e) => setNewTask(prev => ({ ...prev, estimated_hours: e.target.value }))}
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Ex: 2.5"
                    className="bg-[#1C1C22] border-white/[0.06] text-white mt-1.5"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowNewTaskModal(false)}
                className="flex-1 bg-white/[0.04] border-white/[0.06] text-white/70 hover:bg-white/[0.08] hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateTask}
                disabled={!newTask.title.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
              >
                Criar Tarefa
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Task Details / Edit Modal ── */}
        <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
          <DialogContent className="sm:max-w-2xl bg-[#141418] border-white/[0.06]">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-3">
                {selectedTask && (
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: priorityBorderColors[selectedTask.priority] }}
                  />
                )}
                {isEditingTask ? 'Editar Tarefa' : (selectedTask?.title || 'Visualizar Tarefa')}
              </DialogTitle>
            </DialogHeader>

            {selectedTask && !isEditingTask && (
              <div className="space-y-5">
                {/* Task Info grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/[0.03] rounded-lg p-3 ring-1 ring-white/[0.04]">
                    <Label className="text-white/40 text-[10px] uppercase tracking-widest">Responsavel</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      {selectedTask.assigned_to_email && selectedTask.assigned_to_email !== 'none' ? (
                        <>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${getAvatarColor(selectedTask.assigned_to_email)}`}>
                            {getInitials(selectedTask.assigned_to_email)}
                          </div>
                          <span className="text-white/80 text-sm">{selectedTask.assigned_to_email}</span>
                        </>
                      ) : (
                        <span className="text-white/30 text-sm">Nao atribuido</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3 ring-1 ring-white/[0.04]">
                    <Label className="text-white/40 text-[10px] uppercase tracking-widest">Prioridade</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: priorityBorderColors[selectedTask.priority] }} />
                      <span className={`text-sm font-medium px-2 py-0.5 rounded ${priorityBadgeBg[selectedTask.priority]}`}>
                        {priorityLabels[selectedTask.priority]}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedTask.due_date && (
                  <div className="bg-white/[0.03] rounded-lg p-3 ring-1 ring-white/[0.04]">
                    <Label className="text-white/40 text-[10px] uppercase tracking-widest">Data de Entrega</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Calendar className="h-3.5 w-3.5 text-white/40" />
                      {(() => {
                        const info = getRelativeDate(selectedTask.due_date!)
                        return (
                          <span className={`text-sm ${info.className}`}>
                            {new Date(selectedTask.due_date!).toLocaleDateString('pt-BR')}
                            <span className="ml-2 text-xs opacity-70">({info.text})</span>
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                )}

                {selectedTask.description && (
                  <div>
                    <Label className="text-white/40 text-[10px] uppercase tracking-widest">Descricao</Label>
                    <div className="bg-white/[0.03] ring-1 ring-white/[0.04] rounded-lg p-3 mt-1.5">
                      <p className="text-white/70 text-sm whitespace-pre-wrap leading-relaxed">
                        {selectedTask.description}
                      </p>
                    </div>
                  </div>
                )}

                {selectedTask.tags.length > 0 && (
                  <div>
                    <Label className="text-white/40 text-[10px] uppercase tracking-widest">Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {selectedTask.tags.map(tag => (
                        <span key={tag} className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ring-1 ${getTagColor(tag)}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTask.estimated_hours && (
                  <div className="bg-white/[0.03] rounded-lg p-3 ring-1 ring-white/[0.04]">
                    <Label className="text-white/40 text-[10px] uppercase tracking-widest">Estimativa</Label>
                    <p className="text-white/80 text-sm mt-1">{selectedTask.estimated_hours}h</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/[0.02] rounded-lg p-3">
                    <Label className="text-white/30 text-[10px] uppercase tracking-widest">Criado em</Label>
                    <p className="text-white/50 text-xs mt-1">
                      {new Date(selectedTask.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg p-3">
                    <Label className="text-white/30 text-[10px] uppercase tracking-widest">Atualizado em</Label>
                    <p className="text-white/50 text-xs mt-1">
                      {new Date(selectedTask.updated_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Form */}
            {isEditingTask && (
              <div className="space-y-4">
                <div>
                  <Label className="text-white/70 text-xs uppercase tracking-wider">Titulo *</Label>
                  <Input
                    value={editTask.title}
                    onChange={(e) => setEditTask(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Digite o titulo da tarefa..."
                    className="bg-[#1C1C22] border-white/[0.06] text-white mt-1.5"
                  />
                </div>

                <div>
                  <Label className="text-white/70 text-xs uppercase tracking-wider">Descricao</Label>
                  <Textarea
                    value={editTask.description}
                    onChange={(e) => setEditTask(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descricao detalhada da tarefa..."
                    className="bg-[#1C1C22] border-white/[0.06] text-white min-h-[80px] mt-1.5"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/70 text-xs uppercase tracking-wider">Responsavel</Label>
                    <Select
                      value={editTask.assigned_to_email}
                      onValueChange={(value) => setEditTask(prev => ({ ...prev, assigned_to_email: value }))}
                    >
                      <SelectTrigger className="bg-[#1C1C22] border-white/[0.06] text-white mt-1.5">
                        <SelectValue placeholder="Selecione um responsavel" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1C1C22] border-white/[0.08]">
                        <SelectItem value="none" className="text-white">
                          Sem responsavel
                        </SelectItem>
                        {organizationMembers.map(member => (
                          <SelectItem key={member.email} value={member.email} className="text-white">
                            {member.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-white/70 text-xs uppercase tracking-wider">Prioridade</Label>
                    <Select
                      value={editTask.priority}
                      onValueChange={(value: any) => setEditTask(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger className="bg-[#1C1C22] border-white/[0.06] text-white mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1C1C22] border-white/[0.08]">
                        {Object.entries(priorityLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-white">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: priorityBorderColors[key] }} />
                              {label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/70 text-xs uppercase tracking-wider">Data de Entrega</Label>
                    <Input
                      value={editTask.due_date}
                      onChange={(e) => setEditTask(prev => ({ ...prev, due_date: e.target.value }))}
                      type="date"
                      className="bg-[#1C1C22] border-white/[0.06] text-white mt-1.5"
                    />
                  </div>

                  <div>
                    <Label className="text-white/70 text-xs uppercase tracking-wider">Estimativa (horas)</Label>
                    <Input
                      value={editTask.estimated_hours}
                      onChange={(e) => setEditTask(prev => ({ ...prev, estimated_hours: e.target.value }))}
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Ex: 2.5"
                      className="bg-[#1C1C22] border-white/[0.06] text-white mt-1.5"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTaskModal(false)
                  setIsEditingTask(false)
                }}
                className="flex-1 bg-white/[0.04] border-white/[0.06] text-white/70 hover:bg-white/[0.08] hover:text-white"
              >
                {isEditingTask ? 'Cancelar' : 'Fechar'}
              </Button>
              {isEditingTask ? (
                <Button
                  onClick={handleSaveEditTask}
                  disabled={!editTask.title.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                >
                  Salvar
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    if (selectedTask) {
                      setEditTask({
                        title: selectedTask.title,
                        description: selectedTask.description || '',
                        assigned_to_email: selectedTask.assigned_to_email || 'none',
                        priority: selectedTask.priority,
                        due_date: selectedTask.due_date || '',
                        estimated_hours: selectedTask.estimated_hours ? selectedTask.estimated_hours.toString() : '',
                        tags: selectedTask.tags
                      })
                    }
                    setIsEditingTask(true)
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
              {!isEditingTask && (
                <Button
                  onClick={() => {
                    handleDeleteTask(selectedTask?.id || '')
                    setShowTaskModal(false)
                  }}
                  disabled={!selectedTask}
                  className="bg-red-600/80 hover:bg-red-600 text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  )
}
