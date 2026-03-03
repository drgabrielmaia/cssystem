'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { supabase, type Mentorado } from '@/lib/supabase'
import { useOrganizationFilter } from '@/hooks/use-organization-filter'
import {
  Brain,
  Search,
  ExternalLink,
  Users,
  Calendar,
  MapPin,
  Eye,
  Plus,
  Pencil,
  CheckCircle2,
  AlertCircle,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface MentoradoComMapa {
  id: string
  nome_completo: string
  email: string
  estado_atual: string
  created_at: string
  organization_id: string
  mindMap?: {
    id: string
    title: string
    nodes: any[]
    updated_at: string
  }
}

export default function MapasMentaisPage() {
  const { user } = useAuth()
  const { activeOrganizationId, isReady, loading: orgLoading } = useOrganizationFilter()
  const [mentorados, setMentorados] = useState<MentoradoComMapa[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (isReady && activeOrganizationId) {
      loadMentorados()
    }
  }, [isReady, activeOrganizationId])

  const loadMentorados = async () => {
    try {
      setLoading(true)

      // Buscar mentorados da organização
      const { data: mentoradosData, error: mentoradosError } = await supabase
        .from('mentorados')
        .select('*')
        .eq('organization_id', activeOrganizationId)
        .order('nome_completo')

      if (mentoradosError) throw mentoradosError

      // Buscar mapas mentais para cada mentorado
      const mentoradosComMapas: MentoradoComMapa[] = []

      for (const mentorado of mentoradosData || []) {
        const { data: mindMapData, error: mindMapError } = await supabase
          .from('mind_maps')
          .select('*')
          .eq('mentorado_id', mentorado.id)
          .single()

        mentoradosComMapas.push({
          ...mentorado,
          mindMap: mindMapError ? undefined : mindMapData
        })
      }

      setMentorados(mentoradosComMapas)
    } catch (error) {
      console.error('Erro ao carregar mentorados:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMentorados = mentorados.filter(mentorado =>
    mentorado.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentorado.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const comMapas = filteredMentorados.filter(m => m.mindMap)
  const semMapas = filteredMentorados.filter(m => !m.mindMap)

  const progressPercent = filteredMentorados.length > 0
    ? Math.round((comMapas.length / filteredMentorados.length) * 100)
    : 0

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white">Carregando organização...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Header
        title="Mapas Mentais"
        subtitle="Gerencie e visualize os mapas mentais dos mentorados"
      />

      <div className="container mx-auto px-6 py-8">
        {/* Cabeçalho e Busca */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Mapas Mentais dos Mentorados</h1>
            <p className="text-gray-400">
              Acompanhe o desenvolvimento e progresso dos mapas mentais
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar mentorado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#141418] border-white/[0.06] text-white placeholder-gray-500"
              />
            </div>

            {semMapas.length > 0 && (
              <Button
                onClick={() => {
                  // Navigate to the first mentorado without a map
                  // This acts as a quick-start for creating maps in bulk
                  if (semMapas.length > 0) {
                    router.push(`/mindmap/${semMapas[0].id}`)
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar mapa para todos
              </Button>
            )}
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#141418] p-6 rounded-xl ring-1 ring-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total de Mentorados</p>
                <p className="text-2xl font-bold text-white">{filteredMentorados.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#141418] p-6 rounded-xl ring-1 ring-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Com Mapas Mentais</p>
                <p className="text-2xl font-bold text-white">{comMapas.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Brain className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#141418] p-6 rounded-xl ring-1 ring-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Sem Mapas</p>
                <p className="text-2xl font-bold text-white">{semMapas.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#141418] p-6 rounded-xl ring-1 ring-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Cobertura</p>
                <p className="text-2xl font-bold text-white">{progressPercent}%</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06] p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-400">
              Progresso de criação de mapas mentais
            </span>
            <span className="text-sm font-semibold text-white">
              {comMapas.length} / {filteredMentorados.length} mentorados
            </span>
          </div>
          <div className="w-full bg-white/[0.06] rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progressPercent}%`,
                background: progressPercent === 100
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : progressPercent >= 50
                    ? 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                    : 'linear-gradient(90deg, #f59e0b, #fbbf24)'
              }}
            />
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-gray-500">100% = Completo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-xs text-gray-500">50%+ = Bom</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs text-gray-500">&lt;50% = Atenção</span>
            </div>
          </div>
        </div>

        {/* Lista de Mentorados com Mapas */}
        {comMapas.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                Mentorados com Mapas Mentais
              </h2>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-0 ml-1">
                {comMapas.length}
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {comMapas.map((mentorado) => (
                <Link
                  key={mentorado.id}
                  href={`/mindmap/${mentorado.id}`}
                  className="group block"
                >
                  <div className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06] hover:ring-emerald-500/30 transition-all duration-200 p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white text-base font-semibold truncate group-hover:text-emerald-400 transition-colors">
                          {mentorado.nome_completo}
                        </h3>
                        <p className="text-gray-500 text-sm truncate">{mentorado.email}</p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-xs shrink-0 ml-2">
                        Ativo
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Nós no mapa</span>
                        <span className="text-white font-medium">
                          {mentorado.mindMap?.nodes?.length || 0}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Última atualização</span>
                        <span className="text-white">
                          {mentorado.mindMap?.updated_at ?
                            new Date(mentorado.mindMap.updated_at).toLocaleDateString('pt-BR') :
                            'Nunca'
                          }
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
                        onClick={(e) => {
                          e.preventDefault()
                          router.push(`/mindmap/${mentorado.id}`)
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        Visualizar
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
                        onClick={(e) => {
                          e.preventDefault()
                          router.push(`/mindmap/${mentorado.id}`)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        Editar
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/[0.06] text-gray-400 hover:bg-white/[0.04] hover:text-white"
                        onClick={(e) => {
                          e.preventDefault()
                          window.open(`/mindmap/${mentorado.id}`, '_blank')
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Mentorados sem Mapas */}
        {semMapas.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-orange-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                Mentorados sem Mapas Mentais
              </h2>
              <Badge className="bg-orange-500/15 text-orange-400 border-0 ml-1">
                {semMapas.length}
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {semMapas.map((mentorado) => (
                <div
                  key={mentorado.id}
                  className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06] hover:ring-orange-500/30 transition-all duration-200 p-5 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white text-base font-semibold truncate">
                        {mentorado.nome_completo}
                      </h3>
                      <p className="text-gray-500 text-sm truncate">{mentorado.email}</p>
                    </div>
                    <Badge className="bg-orange-500/10 text-orange-400 border-0 text-xs shrink-0 ml-2">
                      Pendente
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-gray-500 text-sm">
                      Este mentorado ainda não possui um mapa mental criado.
                    </p>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Estado atual</span>
                      <span className="text-white">{mentorado.estado_atual || 'N/A'}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Cadastrado em</span>
                      <span className="text-white">
                        {new Date(mentorado.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06]">
                    <Link href={`/mindmap/${mentorado.id}`} className="block">
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        size="sm"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Criar Mapa Mental
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span className="text-gray-400">Carregando mapas mentais...</span>
            </div>
          </div>
        )}

        {!loading && filteredMentorados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
              <Brain className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Nenhum mentorado encontrado</h3>
            <p className="text-gray-500 max-w-md">
              {searchTerm
                ? 'Nenhum mentorado corresponde à sua busca. Tente outros termos.'
                : 'Não há mentorados cadastrados nesta organização ainda.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
