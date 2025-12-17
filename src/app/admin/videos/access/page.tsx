'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  ShieldX,
  Video,
  Eye,
  EyeOff,
  Play,
  Lock,
  Unlock
} from 'lucide-react'

interface Mentorado {
  id: string
  nome_completo: string
  email: string
  turma: string
  status_login: string
}

interface VideoModule {
  id: string
  title: string
  description: string
  order_index: number
  is_active: boolean
}

interface VideoAccess {
  id: string
  mentorado_id: string
  module_id: string
  has_access: boolean
  granted_at: string
  granted_by: string
}

export default function VideoAccessControlPage() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [modules, setModules] = useState<VideoModule[]>([])
  const [access, setAccess] = useState<VideoAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedModule, setSelectedModule] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Buscar mentorados ativos
      const { data: mentoradosData } = await supabase
        .from('mentorados')
        .select('id, nome_completo, email, turma, status_login')
        .eq('excluido', false)
        .eq('status_login', 'ativo')
        .order('nome_completo')

      // Buscar módulos de vídeo
      const { data: modulesData } = await supabase
        .from('video_modules')
        .select('*')
        .eq('is_active', true)
        .order('order_index')

      // Buscar controles de acesso existentes
      const { data: accessData } = await supabase
        .from('video_access_control')
        .select('*')

      setMentorados(mentoradosData || [])
      setModules(modulesData || [])
      setAccess(accessData || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAccess = async (mentoradoId: string, moduleId: string, hasAccess: boolean) => {
    try {
      if (hasAccess) {
        // Remover acesso
        await supabase
          .from('video_access_control')
          .delete()
          .eq('mentorado_id', mentoradoId)
          .eq('module_id', moduleId)
      } else {
        // Conceder acesso
        await supabase
          .from('video_access_control')
          .insert({
            mentorado_id: mentoradoId,
            module_id: moduleId,
            has_access: true,
            granted_at: new Date().toISOString(),
            granted_by: 'admin' // TODO: pegar usuário atual
          })
      }

      // Recarregar dados
      loadData()
    } catch (error) {
      console.error('Erro ao alterar acesso:', error)
    }
  }

  const hasModuleAccess = (mentoradoId: string, moduleId: string) => {
    return access.some(a =>
      a.mentorado_id === mentoradoId &&
      a.module_id === moduleId &&
      a.has_access
    )
  }

  const filteredMentorados = mentorados.filter(m => {
    const searchLower = searchTerm.toLowerCase()
    return m.nome_completo.toLowerCase().includes(searchLower) ||
           m.email.toLowerCase().includes(searchLower) ||
           m.turma.toLowerCase().includes(searchLower)
  })

  const getAccessStats = (mentoradoId: string) => {
    const total = modules.length
    const granted = modules.filter(m => hasModuleAccess(mentoradoId, m.id)).length
    return { total, granted }
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header
          title="🛡️ Controle de Acesso - Vídeos"
          subtitle="Carregando..."
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Carregando dados...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title="🛡️ Controle de Acesso - Vídeos"
        subtitle={`${filteredMentorados.length} mentorados • ${modules.length} módulos`}
      />

      <main className="flex-1 p-6 space-y-6">
        {/* Controles */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Busca */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar mentorado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtro por módulo */}
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os módulos</option>
              {modules.map(module => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Mentorados</p>
                  <p className="text-2xl font-bold">{mentorados.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Video className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Módulos</p>
                  <p className="text-2xl font-bold">{modules.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <ShieldCheck className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Acessos Ativos</p>
                  <p className="text-2xl font-bold">{access.filter(a => a.has_access).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Controles</p>
                  <p className="text-2xl font-bold">{access.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de mentorados */}
        <div className="grid gap-4">
          {filteredMentorados.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum mentorado encontrado
                </h3>
                <p className="text-gray-500">
                  {searchTerm
                    ? 'Tente ajustar os filtros de busca.'
                    : 'Não há mentorados ativos cadastrados.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredMentorados.map((mentorado) => {
              const stats = getAccessStats(mentorado.id)
              return (
                <Card key={mentorado.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{mentorado.nome_completo}</CardTitle>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <span>📧 {mentorado.email}</span>
                          <span>🎓 {mentorado.turma}</span>
                          <Badge variant={stats.granted > 0 ? "default" : "secondary"}>
                            {stats.granted}/{stats.total} módulos
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Acesso aos Módulos:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {modules.map((module) => {
                          const hasAccess = hasModuleAccess(mentorado.id, module.id)
                          return (
                            <div
                              key={module.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-sm">{module.title}</p>
                                <p className="text-xs text-gray-500">Módulo {module.order_index}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {hasAccess ? (
                                  <Unlock className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Lock className="h-4 w-4 text-gray-400" />
                                )}
                                <Switch
                                  checked={hasAccess}
                                  onCheckedChange={(checked) =>
                                    toggleAccess(mentorado.id, module.id, hasAccess)
                                  }
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}