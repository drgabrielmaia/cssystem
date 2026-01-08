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
  Eye
} from 'lucide-react'
import Link from 'next/link'

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

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Carregando organização...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
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

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar mentorado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-gray-400 text-sm font-medium">Total de Mentorados</p>
                  <p className="text-white text-2xl font-bold">{filteredMentorados.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-gray-400 text-sm font-medium">Com Mapas Mentais</p>
                  <p className="text-white text-2xl font-bold">{comMapas.length}</p>
                </div>
                <Brain className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-gray-400 text-sm font-medium">Sem Mapas</p>
                  <p className="text-white text-2xl font-bold">{semMapas.length}</p>
                </div>
                <MapPin className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Mentorados com Mapas */}
        {comMapas.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-green-400" />
              Mentorados com Mapas Mentais ({comMapas.length})
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {comMapas.map((mentorado) => (
                <Card key={mentorado.id} className="bg-gray-800 border-gray-700 hover:border-green-400/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-white text-lg font-semibold truncate">
                          {mentorado.nome_completo}
                        </CardTitle>
                        <p className="text-gray-400 text-sm truncate">{mentorado.email}</p>
                      </div>
                      <Badge variant="outline" className="bg-green-400/10 text-green-400 border-green-400/30">
                        Ativo
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Nós no mapa:</span>
                        <span className="text-white font-medium">
                          {mentorado.mindMap?.nodes?.length || 0}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Última atualização:</span>
                        <span className="text-white">
                          {mentorado.mindMap?.updated_at ?
                            new Date(mentorado.mindMap.updated_at).toLocaleDateString('pt-BR') :
                            'Nunca'
                          }
                        </span>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Link
                          href={`/mindmap/${mentorado.id}`}
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-green-400/10 border-green-400/30 text-green-400 hover:bg-green-400/20"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </Button>
                        </Link>

                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-400 hover:bg-gray-700"
                          onClick={() => window.open(`/mindmap/${mentorado.id}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Mentorados sem Mapas */}
        {semMapas.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-400" />
              Mentorados sem Mapas Mentais ({semMapas.length})
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {semMapas.map((mentorado) => (
                <Card key={mentorado.id} className="bg-gray-800 border-gray-700 hover:border-orange-400/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-white text-lg font-semibold truncate">
                          {mentorado.nome_completo}
                        </CardTitle>
                        <p className="text-gray-400 text-sm truncate">{mentorado.email}</p>
                      </div>
                      <Badge variant="outline" className="bg-orange-400/10 text-orange-400 border-orange-400/30">
                        Pendente
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-gray-400 text-sm">
                        Ainda não criou um mapa mental. O mapa será criado automaticamente
                        quando o mentorado acessar o onboarding.
                      </p>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Estado atual:</span>
                        <span className="text-white">{mentorado.estado_atual}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-white">Carregando mapas mentais...</div>
          </div>
        )}

        {!loading && filteredMentorados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nenhum mentorado encontrado</h3>
            <p className="text-gray-400 max-w-md">
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