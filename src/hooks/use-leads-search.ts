'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

export interface Lead {
  id: string
  nome_completo: string
  email?: string
  telefone?: string
  empresa?: string
  cargo?: string
  status: string
  origem?: string
  temperatura?: string
  data_primeiro_contato: string
  data_venda?: string
  valor_vendido?: number
  valor_arrecadado?: number
  convertido_em?: string
  observacoes?: string
  cidade?: string
  estado?: string
  created_at: string
  updated_at?: string
}

interface UseLeadsSearchProps {
  statusFilter?: string
  origemFilter?: string
  temperaturaFilter?: string
  dateFilter?: {
    start?: string
    end?: string
  }
  pageSize?: number
}

export function useLeadsSearch({
  statusFilter = 'todos',
  origemFilter = 'todas',
  temperaturaFilter = 'todas',
  dateFilter,
  pageSize = 20
}: UseLeadsSearchProps = {}) {
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [displayedLeads, setDisplayedLeads] = useState<Lead[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // Buscar todos os leads uma vez
  useEffect(() => {
    fetchAllLeads()
  }, [])

  const fetchAllLeads = async () => {
    try {
      setLoading(true)
      const { data, error, count } = await supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (error) throw error

      setAllLeads(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Erro ao buscar leads:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar leads baseado nos critérios
  const filteredLeads = useMemo(() => {
    let filtered = [...allLeads]

    // Filtro por texto de busca - BUSCA GLOBAL
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(lead => {
        return (
          lead.nome_completo?.toLowerCase().includes(searchLower) ||
          lead.email?.toLowerCase().includes(searchLower) ||
          lead.telefone?.toLowerCase().includes(searchLower) ||
          lead.empresa?.toLowerCase().includes(searchLower) ||
          lead.cargo?.toLowerCase().includes(searchLower) ||
          lead.cidade?.toLowerCase().includes(searchLower) ||
          lead.estado?.toLowerCase().includes(searchLower) ||
          lead.observacoes?.toLowerCase().includes(searchLower)
        )
      })
    }

    // Filtro por status
    if (statusFilter && statusFilter !== 'todos') {
      filtered = filtered.filter(lead => lead.status === statusFilter)
    }

    // Filtro por origem
    if (origemFilter && origemFilter !== 'todas') {
      filtered = filtered.filter(lead => lead.origem === origemFilter)
    }

    // Filtro por temperatura
    if (temperaturaFilter && temperaturaFilter !== 'todas') {
      filtered = filtered.filter(lead => lead.temperatura === temperaturaFilter)
    }

    // Filtro por data
    if (dateFilter?.start || dateFilter?.end) {
      filtered = filtered.filter(lead => {
        // Para leads vendidos, usar data_venda; para outros, data_primeiro_contato
        const dataParaFiltro = lead.status === 'vendido' && lead.data_venda
          ? lead.data_venda
          : lead.data_primeiro_contato

        if (!dataParaFiltro) return false

        const leadDate = new Date(dataParaFiltro)
        const startDate = dateFilter.start ? new Date(dateFilter.start) : null
        const endDate = dateFilter.end ? new Date(dateFilter.end) : null

        if (startDate && leadDate < startDate) return false
        if (endDate && leadDate > endDate) return false

        return true
      })
    }

    return filtered
  }, [allLeads, searchTerm, statusFilter, origemFilter, temperaturaFilter, dateFilter])

  // Paginação dos leads filtrados
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredLeads.slice(0, startIndex + pageSize)
  }, [filteredLeads, currentPage, pageSize])

  // Reset da página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1)
    setDisplayedLeads([])
  }, [searchTerm, statusFilter, origemFilter, temperaturaFilter, dateFilter])

  // Atualizar leads exibidos
  useEffect(() => {
    setDisplayedLeads(paginatedLeads)
  }, [paginatedLeads])

  // Carregar mais leads (para scroll infinito ou botão "carregar mais")
  const loadMore = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1)
    }
  }

  // Verificar se há mais leads para carregar
  const hasMore = paginatedLeads.length < filteredLeads.length

  // Busca instantânea - retorna resultados imediatamente
  const searchInstant = (term: string) => {
    const searchLower = term.toLowerCase().trim()

    if (!searchLower) return []

    return allLeads
      .filter(lead => (
        lead.nome_completo?.toLowerCase().includes(searchLower) ||
        lead.email?.toLowerCase().includes(searchLower) ||
        lead.telefone?.toLowerCase().includes(searchLower) ||
        lead.empresa?.toLowerCase().includes(searchLower) ||
        lead.cargo?.toLowerCase().includes(searchLower)
      ))
      .slice(0, 10) // Limitar a 10 resultados para performance
  }

  // Buscar lead por ID
  const findLeadById = (id: string) => {
    return allLeads.find(lead => lead.id === id)
  }

  // Refresh dos dados
  const refresh = async () => {
    await fetchAllLeads()
  }

  // Stats dos leads filtrados
  const stats = useMemo(() => {
    const statsMap: { [key: string]: number } = {}

    filteredLeads.forEach(lead => {
      statsMap[lead.status] = (statsMap[lead.status] || 0) + 1
    })

    return Object.entries(statsMap).map(([status, quantidade]) => ({
      status,
      quantidade
    }))
  }, [filteredLeads])

  return {
    // Dados
    leads: displayedLeads,
    allLeads,
    filteredLeads,
    stats,

    // Estado
    loading,
    searchTerm,
    currentPage,
    totalCount,
    filteredCount: filteredLeads.length,
    displayedCount: displayedLeads.length,
    hasMore,

    // Ações
    setSearchTerm,
    loadMore,
    refresh,
    searchInstant,
    findLeadById,

    // Reset
    resetPage: () => setCurrentPage(1)
  }
}