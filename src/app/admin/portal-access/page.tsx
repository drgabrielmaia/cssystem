'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Users, Eye, EyeOff, CheckCircle, XCircle, Plus, Shield, RefreshCw } from 'lucide-react'

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

  const simularLiberacaoUniversal = async () => {
    setBulkLoading(true)
    try {
      console.log('🧪 Iniciando simulação de liberação universal...')
      
      const response = await fetch('/api/admin/grant-all-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          force: false,
          dryRun: true // Just simulate, don't make changes
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(`🧪 Simulação concluída!\n\nO que seria processado:\n- Mentorados encontrados: ${result.stats?.mentoradosProcessed || 0}\n- Módulos encontrados: ${result.stats?.modulesFound || 0}\n- Novos acessos a criar: ${result.stats?.newAccessRecords || 0}\n- Acessos a atualizar: ${result.stats?.accessRecordsToUpdate || 0}\n- Registros já com acesso: ${result.stats?.skippedRecords || 0}\n- Total a processar: ${result.stats?.totalProcessed || 0}`)
      } else {
        throw new Error(result.message || 'Erro na simulação')
      }

    } catch (error: any) {
      console.error('💥 Erro na simulação:', error)
      alert(`❌ Erro na simulação: ${error.message}`)
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Controle de Acesso ao Portal</h1>
          <p className="text-gray-600 mt-2">
            Gerencie quais mentorados têm acesso ao portal de vídeos
          </p>
        </div>

        {/* Ações em Lote */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Shield className="w-5 h-5" />
              Liberação Universal de Acesso aos Módulos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p className="text-sm text-orange-700">
                Use estas ferramentas para liberar o acesso a todos os módulos de vídeo para todos os mentorados ativos.
                Esta ação afeta apenas o acesso aos <strong>módulos específicos</strong>, não o acesso geral ao portal.
              </p>
              
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={simularLiberacaoUniversal}
                  disabled={bulkLoading}
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  {bulkLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Simular Liberação
                    </>
                  )}
                </Button>

                <Button
                  onClick={liberarAcessoUniversal}
                  disabled={bulkLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
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
              </div>

              <div className="text-xs text-orange-600 bg-orange-100 p-3 rounded border">
                <strong>⚠️ Importante:</strong> A simulação mostra o que seria feito sem fazer alterações. 
                Use-a primeiro para verificar o impacto antes de executar a liberação real.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Mentorados</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Com Acesso</p>
                  <p className="text-3xl font-bold text-green-600">{stats.withAccess}</p>
                </div>
                <Eye className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Sem Acesso</p>
                  <p className="text-3xl font-bold text-red-600">{stats.withoutAccess}</p>
                </div>
                <EyeOff className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liberação Universal de Acesso */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">🔓 Liberação Universal de Acesso aos Módulos</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <p className="text-sm text-orange-700">
                <strong>⚠️ Atenção:</strong> Esta ação irá conceder acesso a todos os módulos de vídeo para todos os mentorados ativos.
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={simularLiberacaoUniversal}
                  variant="outline"
                  disabled={bulkLoading}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  {bulkLoading ? 'Simulando...' : '🧪 Simular Liberação'}
                </Button>
                <Button
                  onClick={executarLiberacaoUniversal}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={bulkLoading}
                >
                  {bulkLoading ? 'Processando...' : '🚀 Liberar Acesso Universal'}
                </Button>
              </div>
              {resultadoSimulacao && (
                <div className="mt-4 p-3 bg-white rounded border border-orange-200">
                  <h4 className="font-medium text-orange-800 mb-2">Resultado da Simulação:</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>• Mentorados ativos: {resultadoSimulacao.mentoradosProcessed}</p>
                    <p>• Módulos encontrados: {resultadoSimulacao.modulesFound}</p>
                    <p>• Novos acessos a criar: {resultadoSimulacao.newAccessRecords}</p>
                    <p>• Acessos a restaurar: {resultadoSimulacao.accessRecordsToUpdate}</p>
                    <p>• Total a processar: {resultadoSimulacao.totalProcessed}</p>
                  </div>
                </div>
              )}
              {resultadoExecucao && (
                <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2">✅ Liberação Concluída!</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>• Novos acessos criados: {resultadoExecucao.newAccessRecordsCreated}</p>
                    <p>• Acessos restaurados: {resultadoExecucao.accessRecordsUpdated}</p>
                    <p>• Total processado: {resultadoExecucao.totalProcessed}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Controles de Filtro */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar mentorado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilter('all')}
                  size="sm"
                >
                  Todos
                </Button>
                <Button
                  variant={filter === 'with_access' ? 'default' : 'outline'}
                  onClick={() => setFilter('with_access')}
                  size="sm"
                >
                  Com Acesso
                </Button>
                <Button
                  variant={filter === 'without_access' ? 'default' : 'outline'}
                  onClick={() => setFilter('without_access')}
                  size="sm"
                >
                  Sem Acesso
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Mentorados */}
        <Card>
          <CardHeader>
            <CardTitle>Mentorados ({mentoradosFiltrados.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mentorado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acesso Portal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mentoradosFiltrados.map((mentorado) => {
                    const accessInfo = getAccessInfo(mentorado.id)
                    const hasAccess = !!accessInfo

                    return (
                      <tr key={mentorado.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {mentorado.nome_completo}
                            </div>
                            <div className="text-sm text-gray-500">
                              Entrada: {new Date(mentorado.data_entrada).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{mentorado.email}</div>
                          <div className="text-sm text-gray-500">{mentorado.telefone}</div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={mentorado.status_login === 'ativo' ? 'default' : 'secondary'}
                            className={
                              mentorado.status_login === 'ativo' ? 'bg-green-100 text-green-700' :
                              mentorado.status_login === 'bloqueado' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }
                          >
                            {mentorado.status_login}
                          </Badge>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          {hasAccess ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-green-600">Ativo</span>
                              <Badge variant="outline" className="ml-2">
                                {accessInfo.access_level || 'basic'}
                              </Badge>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <XCircle className="w-4 h-4 text-red-500" />
                              <span className="text-sm text-red-600">Sem acesso</span>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {hasAccess ? (
                              <Button
                                onClick={() => revogarAcesso(mentorado.id)}
                                variant="destructive"
                                size="sm"
                              >
                                <EyeOff className="w-4 h-4 mr-1" />
                                Revogar
                              </Button>
                            ) : (
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => concederAcesso(mentorado.id, 'basic')}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Básico
                                </Button>
                                <Button
                                  onClick={() => concederAcesso(mentorado.id, 'premium')}
                                  variant="default"
                                  size="sm"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Premium
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
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    Nenhum mentorado encontrado
                  </h3>
                  <p className="text-gray-500">
                    Ajuste os filtros ou termo de busca
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}