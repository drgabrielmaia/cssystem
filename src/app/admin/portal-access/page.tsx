'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Users, Eye, EyeOff, CheckCircle, XCircle, Plus, Shield, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

interface Mentorado {
  id: string
  nome_completo: string
  email: string
  telefone: string
  status_login: 'ativo' | 'inativo' | 'bloqueado'
  data_entrada: string
  created_at: string
}

interface AccessControl {
  id: string
  mentorado_id: string
  module_id: string | null
  has_access: boolean
  has_portal_access?: boolean
  access_level?: 'basic' | 'premium' | 'vip'
  granted_at: string
  granted_by: string
  revoked_at?: string
  revoked_by?: string
  notes?: string
  created_at: string
  updated_at: string
}

export default function PortalAccessPage() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [accessControls, setAccessControls] = useState<AccessControl[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'with_access' | 'without_access'>('all')
  const [resultadoSimulacao, setResultadoSimulacao] = useState<any>(null)
  const [resultadoExecucao, setResultadoExecucao] = useState<any>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkExpanded, setBulkExpanded] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      // Carregar mentorados
      const { data: mentoradosData, error: mentoradosError } = await supabase
        .from('mentorados')
        .select('*')
        .order('nome_completo')

      if (mentoradosError) throw mentoradosError

      // Carregar controles de acesso
      const { data: accessData, error: accessError } = await supabase
        .from('video_access_control')
        .select('*')

      if (accessError) throw accessError

      setMentorados(mentoradosData || [])
      setAccessControls(accessData || [])

    } catch (error: any) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const concederAcesso = async (mentoradoId: string, accessLevel: 'basic' | 'premium' | 'vip' = 'basic') => {
    try {
      console.log('🔧 Concedendo acesso para:', mentoradoId, 'Nível:', accessLevel)

      // Primeiro, verificar se já existe registro
      const { data: existing, error: searchError } = await supabase
        .from('video_access_control')
        .select('*')
        .eq('mentorado_id', mentoradoId)
        .maybeSingle()

      console.log('🔍 Registro existente:', existing)

      if (existing) {
        // Atualizar registro existente com campos básicos
        console.log('📝 Atualizando registro existente...')
        const { error } = await supabase
          .from('video_access_control')
          .update({
            has_access: true,
            granted_at: new Date().toISOString(),
            granted_by: 'admin',
            revoked_at: null,
            revoked_by: null
          })
          .eq('mentorado_id', mentoradoId)

        if (error) throw error
        console.log('✅ Registro atualizado')
      } else {
        // Criar novo registro com campos básicos
        console.log('➕ Criando novo registro...')
        const { error } = await supabase
          .from('video_access_control')
          .insert({
            mentorado_id: mentoradoId,
            module_id: null,
            has_access: true,
            granted_at: new Date().toISOString(),
            granted_by: 'admin'
          })

        if (error) throw error
        console.log('✅ Registro criado')
      }

      await carregarDados()

    } catch (error: any) {
      console.error('💥 Erro ao conceder acesso:', error)
      alert(`Erro ao conceder acesso: ${error.message}`)
    }
  }

  const revogarAcesso = async (mentoradoId: string) => {
    try {
      const { error } = await supabase
        .from('video_access_control')
        .update({
          has_access: false,
          revoked_at: new Date().toISOString(),
          revoked_by: 'admin'
        })
        .eq('mentorado_id', mentoradoId)

      if (error) throw error
      await carregarDados()

    } catch (error: any) {
      console.error('Erro ao revogar acesso:', error)
      alert(`Erro ao revogar acesso: ${error.message}`)
    }
  }

  const liberarAcessoUniversal = async () => {
    if (!confirm('🚨 ATENÇÃO: Esta ação irá liberar o acesso a TODOS OS MÓDULOS DE VÍDEO para TODOS OS MENTORADOS ATIVOS.\n\nTem certeza que deseja continuar?')) {
      return
    }

    setBulkLoading(true)
    try {
      console.log('🚀 Iniciando liberação universal de acesso aos módulos...')

      const response = await fetch('/api/admin/grant-all-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          force: false, // Don't override existing access
          dryRun: false // Actually execute the changes
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(`✅ Sucesso! ${result.message}\n\nEstatísticas:\n- Mentorados processados: ${result.stats?.mentoradosProcessed || 0}\n- Novos acessos criados: ${result.stats?.newAccessRecordsCreated || 0}\n- Acessos atualizados: ${result.stats?.accessRecordsUpdated || 0}\n- Total processado: ${result.stats?.totalProcessed || 0}`)
        await carregarDados() // Reload data to show updated access
      } else {
        throw new Error(result.message || 'Erro desconhecido')
      }

    } catch (error: any) {
      console.error('💥 Erro na liberação universal:', error)
      alert(`❌ Erro na liberação universal: ${error.message}`)
    } finally {
      setBulkLoading(false)
    }
  }


  const getAccessInfo = (mentoradoId: string) => {
    return accessControls.find(ac =>
      ac.mentorado_id === mentoradoId &&
      ac.has_access &&
      !ac.revoked_at
    )
  }

  const simularLiberacaoUniversal = async () => {
    if (bulkLoading) return
    setBulkLoading(true)
    setResultadoSimulacao(null)
    setResultadoExecucao(null)

    try {
      console.log('🧪 Iniciando simulação de liberação universal...')
      const response = await fetch('/api/admin/grant-all-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true })
      })

      const result = await response.json()

      if (result.success) {
        setResultadoSimulacao(result.stats)
        console.log('✅ Simulação concluída:', result.stats)
      } else {
        alert(`Erro na simulação: ${result.message}`)
        console.error('❌ Erro na simulação:', result)
      }
    } catch (error: any) {
      console.error('💥 Erro ao simular liberação:', error)
      alert(`Erro na simulação: ${error.message}`)
    } finally {
      setBulkLoading(false)
    }
  }

  const executarLiberacaoUniversal = async () => {
    if (bulkLoading) return

    const confirmacao = confirm(
      'Tem certeza que deseja liberar acesso a todos os módulos para todos os mentorados ativos?\n\n' +
      'Esta ação não pode ser desfeita facilmente.'
    )

    if (!confirmacao) return

    setBulkLoading(true)
    setResultadoExecucao(null)

    try {
      console.log('🚀 Iniciando liberação universal de acesso...')
      const response = await fetch('/api/admin/grant-all-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false })
      })

      const result = await response.json()

      if (result.success) {
        setResultadoExecucao(result.stats)
        await carregarDados() // Recarregar dados para ver mudanças
        console.log('✅ Liberação concluída:', result.stats)
        alert(`Liberação concluída! ${result.stats.totalProcessed} acessos processados.`)
      } else {
        alert(`Erro na liberação: ${result.message}`)
        console.error('❌ Erro na liberação:', result)
      }
    } catch (error: any) {
      console.error('💥 Erro ao executar liberação:', error)
      alert(`Erro na liberação: ${error.message}`)
    } finally {
      setBulkLoading(false)
    }
  }

  const mentoradosFiltrados = mentorados.filter(mentorado => {
    const matchesSearch = mentorado.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          mentorado.email.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    const hasAccess = getAccessInfo(mentorado.id)

    switch (filter) {
      case 'with_access': return hasAccess
      case 'without_access': return !hasAccess
      default: return true
    }
  })

  const stats = {
    total: mentorados.length,
    withAccess: mentorados.filter(m => getAccessInfo(m.id)).length,
    withoutAccess: mentorados.filter(m => !getAccessInfo(m.id)).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/10 border-t-white/60"></div>
          <p className="text-gray-400 text-sm">Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Controle de Acesso ao Portal</h1>
          <p className="text-gray-400 mt-2">
            Gerencie quais mentorados tem acesso ao portal de videos
          </p>
        </div>

        {/* Estatisticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#141418] p-6 rounded-xl ring-1 ring-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total de Mentorados</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#141418] p-6 rounded-xl ring-1 ring-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Com Acesso</p>
                <p className="text-3xl font-bold text-emerald-400 mt-1">{stats.withAccess}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Eye className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#141418] p-6 rounded-xl ring-1 ring-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Sem Acesso</p>
                <p className="text-3xl font-bold text-red-400 mt-1">{stats.withoutAccess}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <EyeOff className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Liberacao Universal - Collapsible */}
        <div className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06] overflow-hidden">
          <button
            onClick={() => setBulkExpanded(!bulkExpanded)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Liberacao Universal de Acesso aos Modulos</h3>
                <p className="text-xs text-gray-500 mt-0.5">Ferramentas para liberar acesso em lote</p>
              </div>
            </div>
            {bulkExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {bulkExpanded && (
            <div className="px-5 pb-5 space-y-4 border-t border-white/[0.06]">
              <p className="text-sm text-gray-400 pt-4">
                Use estas ferramentas para liberar o acesso a todos os modulos de video para todos os mentorados ativos.
                Esta acao afeta apenas o acesso aos <strong className="text-gray-300">modulos especificos</strong>, nao o acesso geral ao portal.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={simularLiberacaoUniversal}
                  disabled={bulkLoading}
                  variant="outline"
                  className="border-white/[0.08] bg-white/[0.03] text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/20 hover:text-blue-300"
                >
                  {bulkLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Simulando...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Simular Liberacao
                    </>
                  )}
                </Button>

                <Button
                  onClick={liberarAcessoUniversal}
                  disabled={bulkLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                >
                  {bulkLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Liberando...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Liberar Acesso Universal
                    </>
                  )}
                </Button>

                <Button
                  onClick={executarLiberacaoUniversal}
                  disabled={bulkLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white border-0"
                >
                  {bulkLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Executar Liberacao
                    </>
                  )}
                </Button>
              </div>

              <div className="text-xs text-amber-400/70 bg-amber-500/[0.06] p-3 rounded-lg ring-1 ring-amber-500/10">
                <strong>Importante:</strong> A simulacao mostra o que seria feito sem fazer alteracoes.
                Use-a primeiro para verificar o impacto antes de executar a liberacao real.
              </div>

              {resultadoSimulacao && (
                <div className="p-4 bg-white/[0.03] rounded-lg ring-1 ring-white/[0.06]">
                  <h4 className="font-medium text-white mb-3 text-sm">Resultado da Simulacao:</h4>
                  <div className="text-sm text-gray-400 space-y-1.5">
                    <p>Mentorados ativos: <span className="text-white">{resultadoSimulacao.mentoradosProcessed}</span></p>
                    <p>Modulos encontrados: <span className="text-white">{resultadoSimulacao.modulesFound}</span></p>
                    <p>Novos acessos a criar: <span className="text-emerald-400">{resultadoSimulacao.newAccessRecords}</span></p>
                    <p>Acessos a restaurar: <span className="text-blue-400">{resultadoSimulacao.accessRecordsToUpdate}</span></p>
                    <p>Total a processar: <span className="text-white font-medium">{resultadoSimulacao.totalProcessed}</span></p>
                  </div>
                </div>
              )}

              {resultadoExecucao && (
                <div className="p-4 bg-emerald-500/[0.06] rounded-lg ring-1 ring-emerald-500/10">
                  <h4 className="font-medium text-emerald-400 mb-3 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Liberacao Concluida!
                  </h4>
                  <div className="text-sm text-gray-400 space-y-1.5">
                    <p>Novos acessos criados: <span className="text-emerald-400">{resultadoExecucao.newAccessRecordsCreated}</span></p>
                    <p>Acessos restaurados: <span className="text-blue-400">{resultadoExecucao.accessRecordsUpdated}</span></p>
                    <p>Total processado: <span className="text-white font-medium">{resultadoExecucao.totalProcessed}</span></p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controles de Filtro */}
        <div className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06] p-5">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Buscar mentorado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#1a1a1e] border-white/[0.06] text-white placeholder-gray-500 focus:ring-white/10 focus:border-white/10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-white/10 text-white ring-1 ring-white/20'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/[0.04]'
                }`}
              >
                Todos ({stats.total})
              </button>
              <button
                onClick={() => setFilter('with_access')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === 'with_access'
                    ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/[0.04]'
                }`}
              >
                Com Acesso ({stats.withAccess})
              </button>
              <button
                onClick={() => setFilter('without_access')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === 'without_access'
                    ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/20'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/[0.04]'
                }`}
              >
                Sem Acesso ({stats.withoutAccess})
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Mentorados */}
        <div className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">
              Mentorados <span className="text-gray-500 font-normal ml-1">({mentoradosFiltrados.length})</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Mentorado
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Status Login
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Acesso Portal
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {mentoradosFiltrados.map((mentorado) => {
                  const accessInfo = getAccessInfo(mentorado.id)
                  const hasAccess = !!accessInfo
                  const isVip = accessInfo?.access_level === 'vip'

                  return (
                    <tr key={mentorado.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white flex items-center gap-2">
                            {mentorado.nome_completo}
                            {isVip && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20">
                                VIP
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Entrada: {new Date(mentorado.data_entrada).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{mentorado.email}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{mentorado.telefone}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${
                            mentorado.status_login === 'ativo'
                              ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                              : mentorado.status_login === 'bloqueado'
                              ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
                              : 'bg-white/[0.06] text-gray-400 ring-1 ring-white/[0.08]'
                          }`}
                        >
                          {mentorado.status_login}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasAccess ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm text-emerald-400">Ativo</span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ml-1 ${
                                accessInfo.access_level === 'vip'
                                  ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20'
                                  : accessInfo.access_level === 'premium'
                                  ? 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/20'
                                  : 'bg-white/[0.06] text-gray-400 ring-1 ring-white/[0.08]'
                              }`}
                            >
                              {accessInfo.access_level || 'basic'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-400/70" />
                            <span className="text-sm text-gray-500">Sem acesso</span>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {hasAccess ? (
                            <Button
                              onClick={() => revogarAcesso(mentorado.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-3 text-xs"
                            >
                              <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                              Revogar
                            </Button>
                          ) : (
                            <div className="flex gap-1.5">
                              <Button
                                onClick={() => concederAcesso(mentorado.id, 'basic')}
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-white hover:bg-white/[0.06] h-8 px-3 text-xs ring-1 ring-white/[0.06]"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Basico
                              </Button>
                              <Button
                                onClick={() => concederAcesso(mentorado.id, 'premium')}
                                variant="ghost"
                                size="sm"
                                className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 h-8 px-3 text-xs ring-1 ring-purple-500/20"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Premium
                              </Button>
                              <Button
                                onClick={() => concederAcesso(mentorado.id, 'vip')}
                                variant="ghost"
                                size="sm"
                                className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 h-8 px-3 text-xs ring-1 ring-amber-500/20"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                VIP
                              </Button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {mentoradosFiltrados.length === 0 && (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-gray-600" />
                </div>
                <h3 className="text-base font-medium text-gray-400 mb-1">
                  Nenhum mentorado encontrado
                </h3>
                <p className="text-sm text-gray-600">
                  Ajuste os filtros ou termo de busca
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
