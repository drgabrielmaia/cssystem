'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase, type Mentorado } from '@/lib/supabase'
import { ExternalLink, Mail, Phone, Calendar, User, Plus, Search, Filter, CheckSquare, Square, Trash2, Edit } from 'lucide-react'
import { AddMentoradoModal } from '@/components/add-mentorado-modal'
import { EditMentoradoModal } from '@/components/edit-mentorado-modal'

export default function MentoradosPage() {
  console.log('🚀 MentoradosPage component renderizando...')
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTurma, setSelectedTurma] = useState<string>('todas')
  const [selectedStatus, setSelectedStatus] = useState<string>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMentorados, setSelectedMentorados] = useState<string[]>([])
  const [bulkActionMode, setBulkActionMode] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [mentoradoToEdit, setMentoradoToEdit] = useState<Mentorado | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchMentorados = async () => {
    try {
      console.log('🔍 Buscando mentorados do Supabase...')
      
      const { data, error } = await supabase
        .from('mentorados')
        .select('*')
        .order('nome_completo', { ascending: true })

      if (error) {
        console.error('❌ Erro do Supabase:', error)
        throw error
      }

      console.log('✅ Mentorados carregados:', data?.length || 0)
      setMentorados(data || [])
      
    } catch (error) {
      console.error('💥 Erro ao buscar mentorados:', error instanceof Error ? error.message : String(error))
      setMentorados([])
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    console.log('🔥 useEffect triggered - calling fetchMentorados')
    fetchMentorados()
  }, [])

  const handleMentoradoAdded = () => {
    // Reload mentorados after adding new one
    setLoading(true)
    fetchMentorados()
  }

  const handleEditMentorado = (mentorado: Mentorado) => {
    setMentoradoToEdit(mentorado)
    setIsEditModalOpen(true)
  }

  const handleMentoradoEdited = () => {
    // Reload mentorados after editing
    setLoading(true)
    fetchMentorados()
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir ${selectedMentorados.length} mentorados? Esta ação não pode ser desfeita.`)) {
      return
    }

    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('mentorados')
        .delete()
        .in('id', selectedMentorados)

      if (error) throw error

      alert(`${selectedMentorados.length} mentorados foram excluídos com sucesso!`)
      setSelectedMentorados([])
      setBulkActionMode(false)
      fetchMentorados()
    } catch (error) {
      console.error('Erro ao excluir mentorados:', error)
      alert('Erro ao excluir mentorados. Tente novamente.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkStatusChange = async () => {
    if (!newStatus) {
      alert('Selecione um status primeiro!')
      return
    }

    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('mentorados')
        .update({ estado_atual: newStatus })
        .in('id', selectedMentorados)

      if (error) throw error

      alert(`Status de ${selectedMentorados.length} mentorados foi alterado para "${newStatus}" com sucesso!`)
      setSelectedMentorados([])
      setBulkActionMode(false)
      setShowStatusModal(false)
      setNewStatus('')
      fetchMentorados()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      alert('Erro ao alterar status. Tente novamente.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedMentorados.length === mentoradosPaginados.length) {
      setSelectedMentorados([])
    } else {
      setSelectedMentorados(mentoradosPaginados.map(m => m.id))
    }
  }

  const turmas = ['todas', ...Array.from(new Set(mentorados.map(m => m.turma).filter(Boolean)))]
  const statusOptions = ['todos', ...Array.from(new Set(mentorados.map(m => m.estado_atual).filter(Boolean)))]
  
  const mentoradosFiltrados = mentorados.filter(mentorado => {
    const matchesTurma = selectedTurma === 'todas' || mentorado.turma === selectedTurma
    const matchesStatus = selectedStatus === 'todos' || mentorado.estado_atual === selectedStatus
    const matchesSearch = searchTerm === '' || 
      mentorado.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentorado.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mentorado.telefone && mentorado.telefone.includes(searchTerm))
    
    return matchesTurma && matchesStatus && matchesSearch
  })

  // Paginação
  const totalPages = Math.ceil(mentoradosFiltrados.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const mentoradosPaginados = mentoradosFiltrados.slice(startIndex, endIndex)

  // Reset para primeira página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedTurma, selectedStatus, searchTerm])

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || ''
    if (['ativo', 'engajado'].includes(statusLower)) return 'success'
    if (['pausado', 'inseguro'].includes(statusLower)) return 'warning'
    if (['cancelado', 'inativo'].includes(statusLower)) return 'destructive'
    return 'secondary'
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="Mentorados" subtitle="Gerenciar todos os mentorados do programa" />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Carregando mentorados...</div>
        </div>
      </div>
    )
  }


  return (
    <div className="flex-1 overflow-y-auto">
      <Header title="Mentorados" subtitle={`${mentorados.length} mentorados cadastrados`} />
      
      <main className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header com ações */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Lista de Mentorados</h2>
            {bulkActionMode && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  {selectedMentorados.length === mentoradosPaginados.length ? (
                    <><CheckSquare className="h-4 w-4 mr-1" /> Desmarcar Todos</>
                  ) : (
                    <><Square className="h-4 w-4 mr-1" /> Selecionar Todos</>
                  )}
                </Button>
                {selectedMentorados.length > 0 && (
                  <>
                    <span className="text-sm text-gray-600">
                      {selectedMentorados.length} selecionados
                    </span>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={isProcessing}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {isProcessing ? 'Excluindo...' : 'Excluir'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowStatusModal(true)}
                  disabled={isProcessing}
                >
                  Alterar Status
                </Button>
                <Button size="sm" variant="outline">
                  Enviar Formulário
                </Button>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant={bulkActionMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setBulkActionMode(!bulkActionMode)
                setSelectedMentorados([])
              }}
            >
              {bulkActionMode ? "Cancelar Seleção" : "Seleção Múltipla"}
            </Button>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Mentorado
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Turma:</span>
            </div>
            {turmas.map(turma => (
              <Button
                key={turma}
                variant={selectedTurma === turma ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTurma(turma)}
                className="capitalize"
              >
                {turma === 'todas' ? 'Todas' : turma}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4"></div>
              <span className="text-sm text-gray-600">Status:</span>
            </div>
            {statusOptions.map(status => (
              <Button
                key={status}
                variant={selectedStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus(status)}
                className="capitalize"
              >
                {status === 'todos' ? 'Todos' : status}
              </Button>
            ))}
          </div>
        </div>

        {/* Lista de Mentorados */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mentoradosPaginados.map((mentorado) => (
            <Card key={mentorado.id} className={`rounded-2xl shadow-sm border transition-all ${
              selectedMentorados.includes(mentorado.id) 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:shadow-md'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {bulkActionMode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setSelectedMentorados(prev => 
                            prev.includes(mentorado.id)
                              ? prev.filter(id => id !== mentorado.id)
                              : [...prev, mentorado.id]
                          )
                        }}
                      >
                        {selectedMentorados.includes(mentorado.id) ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    )}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium text-gray-900 line-clamp-1">
                        {mentorado.nome_completo}
                      </CardTitle>
                      <p className="text-xs text-gray-500">{mentorado.turma}</p>
                    </div>
                  </div>
                  {!bulkActionMode && (
                    <Link href={`/mentorados/${mentorado.id}`}>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Status atual</span>
                  <Badge variant={getStatusColor(mentorado.estado_atual)} className="text-xs">
                    {mentorado.estado_atual || 'Não definido'}
                  </Badge>
                </div>

                {/* Estado de entrada */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Estado inicial</span>
                  <span className="text-xs text-gray-700">{mentorado.estado_entrada}</span>
                </div>

                {/* Contato */}
                <div className="space-y-1">
                  {mentorado.email && (
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{mentorado.email}</span>
                    </div>
                  )}
                  {mentorado.telefone && (
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <Phone className="h-3 w-3" />
                      <span>{mentorado.telefone}</span>
                    </div>
                  )}
                </div>

                {/* Data de início da mentoria */}
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {mentorado.data_inicio_mentoria
                      ? `Início: ${new Date(mentorado.data_inicio_mentoria).toLocaleDateString('pt-BR')}`
                      : `Cadastrado: ${new Date(mentorado.data_entrada).toLocaleDateString('pt-BR')}`
                    }
                  </span>
                </div>

                {/* Ações */}
                <div className="flex space-x-2 pt-2">
                  <Link href={`/mentorados/${mentorado.id}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full text-xs">
                      Ver Detalhes
                    </Button>
                  </Link>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs"
                    onClick={() => handleEditMentorado(mentorado)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Link href="/formularios" className="flex-1">
                    <Button size="sm" className="w-full text-xs">
                      Formulários
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-6 border rounded-lg">
            <div className="flex flex-1 justify-between sm:hidden">
              <Button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Anterior
              </Button>
              <Button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Próximo
              </Button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{startIndex + 1}</span> até{' '}
                  <span className="font-medium">{Math.min(endIndex, mentoradosFiltrados.length)}</span> de{' '}
                  <span className="font-medium">{mentoradosFiltrados.length}</span> mentorados
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  Anterior
                </Button>
                
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber
                    if (totalPages <= 5) {
                      pageNumber = i + 1
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i
                    } else {
                      pageNumber = currentPage - 2 + i
                    }
                    
                    return (
                      <Button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        className="w-10"
                      >
                        {pageNumber}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Próximo
                </Button>
              </div>
            </div>
          </div>
        )}

        {mentoradosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum mentorado encontrado</h3>
            <p className="text-gray-500">
              {selectedTurma === 'todas' 
                ? 'Não há mentorados cadastrados.' 
                : `Não há mentorados na turma "${selectedTurma}".`
              }
            </p>
          </div>
        )}
      </main>
      
      <AddMentoradoModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleMentoradoAdded}
      />
      
      <EditMentoradoModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setMentoradoToEdit(null)
        }}
        onSuccess={handleMentoradoEdited}
        mentorado={mentoradoToEdit}
      />

      {/* Modal para Alterar Status */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-4">Alterar Status - {selectedMentorados.length} mentorados</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Novo status:
                </label>
                <select 
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione um status...</option>
                  <option value="ativo">Ativo</option>
                  <option value="engajado">Engajado</option>
                  <option value="pausado">Pausado</option>
                  <option value="inativo">Inativo</option>
                  <option value="concluido">Concluído</option>
                </select>
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={handleBulkStatusChange} 
                  className="flex-1"
                  disabled={isProcessing || !newStatus}
                >
                  {isProcessing ? 'Alterando...' : 'Alterar Status'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowStatusModal(false)
                    setNewStatus('')
                  }}
                  disabled={isProcessing}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}