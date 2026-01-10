'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Header } from '@/components/header'
import {
  Star,
  TrendingUp,
  Users,
  BarChart3,
  Calendar,
  MessageSquare,
  Filter,
  Search,
  Download,
  ExternalLink
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ModuleRating {
  id: string
  rating: number
  feedback?: string
  created_at: string
  module: {
    id: string
    title: string
    description: string
    cover_image_url?: string
  }
  mentorado: {
    id: string
    nome_completo: string
    email: string
  }
}

interface ModuleStats {
  module_id: string
  module_title: string
  total_ratings: number
  average_rating: number
  nps_score: number
  promoters: number
  passives: number
  detractors: number
  last_rating: string
}

export default function AvaliacoesModulosPage() {
  const [ratings, setRatings] = useState<ModuleRating[]>([])
  const [moduleStats, setModuleStats] = useState<ModuleStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [ratingFilter, setRatingFilter] = useState('todos')
  const [moduleFilter, setModuleFilter] = useState('todos')
  const [selectedModule, setSelectedModule] = useState<string | null>(null)

  useEffect(() => {
    fetchRatingsData()
  }, [])

  const fetchRatingsData = async () => {
    try {
      setLoading(true)

      // Buscar todas as avaliações com detalhes do módulo e mentorado
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('module_ratings')
        .select(`
          *,
          module:video_modules!module_id (
            id,
            title,
            description,
            cover_image_url
          ),
          mentorado:mentorados!mentorado_id (
            id,
            nome_completo,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (ratingsError) throw ratingsError

      setRatings(ratingsData || [])

      // Calcular estatísticas por módulo
      if (ratingsData && ratingsData.length > 0) {
        const statsByModule = ratingsData.reduce((acc, rating) => {
          const moduleId = rating.module_id

          if (!acc[moduleId]) {
            acc[moduleId] = {
              module_id: moduleId,
              module_title: rating.module?.title || 'Módulo sem nome',
              ratings: [],
              total_ratings: 0,
              average_rating: 0,
              promoters: 0,
              passives: 0,
              detractors: 0,
              last_rating: rating.created_at
            }
          }

          acc[moduleId].ratings.push(rating.rating)
          acc[moduleId].total_ratings++
          acc[moduleId].last_rating = rating.created_at

          // Classificar por NPS (0-6: detractors, 7-8: passives, 9-10: promoters)
          if (rating.rating >= 0 && rating.rating <= 6) {
            acc[moduleId].detractors++
          } else if (rating.rating >= 7 && rating.rating <= 8) {
            acc[moduleId].passives++
          } else if (rating.rating >= 9) {
            acc[moduleId].promoters++
          }

          return acc
        }, {} as Record<string, any>)

        // Calcular médias e NPS
        const stats = Object.values(statsByModule).map((stat: any) => {
          const average = stat.ratings.reduce((sum: number, r: number) => sum + r, 0) / stat.ratings.length
          const nps = ((stat.promoters - stat.detractors) / stat.total_ratings) * 100

          return {
            ...stat,
            average_rating: Math.round(average * 100) / 100,
            nps_score: Math.round(nps * 100) / 100
          }
        })

        setModuleStats(stats)
      }

    } catch (error) {
      console.error('Erro ao carregar avaliações:', error)
    } finally {
      setLoading(false)
    }
  }

  const getOverallStats = () => {
    if (ratings.length === 0) return null

    const totalRatings = ratings.length
    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings

    const promoters = ratings.filter(r => r.rating >= 9).length
    const passives = ratings.filter(r => r.rating >= 7 && r.rating <= 8).length
    const detractors = ratings.filter(r => r.rating >= 0 && r.rating <= 6).length

    const nps = ((promoters - detractors) / totalRatings) * 100

    return {
      total: totalRatings,
      average: Math.round(averageRating * 100) / 100,
      nps: Math.round(nps * 100) / 100,
      promoters,
      passives,
      detractors
    }
  }

  const getNPSColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-50'
    if (score >= 50) return 'text-yellow-600 bg-yellow-50'
    if (score >= 0) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 9) return 'text-green-600'
    if (rating >= 7) return 'text-yellow-600'
    return 'text-red-600'
  }

  const filteredRatings = ratings.filter(rating => {
    const matchesSearch = searchTerm === '' ||
      rating.module?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rating.mentorado?.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rating.feedback && rating.feedback.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesRating = ratingFilter === 'todos' ||
      (ratingFilter === 'promoters' && rating.rating >= 9) ||
      (ratingFilter === 'passives' && rating.rating >= 7 && rating.rating <= 8) ||
      (ratingFilter === 'detractors' && rating.rating >= 0 && rating.rating <= 6)

    const matchesModule = moduleFilter === 'todos' || rating.module.id === moduleFilter

    return matchesSearch && matchesRating && matchesModule
  })

  const exportData = () => {
    const csvContent = [
      ['Data', 'Módulo', 'Mentorado', 'Avaliação', 'Feedback'],
      ...filteredRatings.map(rating => [
        new Date(rating.created_at).toLocaleDateString('pt-BR'),
        rating.module?.title || '',
        rating.mentorado?.nome_completo || '',
        rating.rating.toString(),
        rating.feedback || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `avaliacoes_modulos_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const overallStats = getOverallStats()

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="⭐ Avaliações de Módulos" subtitle="Carregando avaliações..." />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Carregando dados...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title="⭐ Avaliações de Módulos"
        subtitle={`${ratings.length} avaliações de ${moduleStats.length} módulos diferentes`}
      />

      <main className="flex-1 p-6 space-y-6">
        {/* Estatísticas Gerais */}
        {overallStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Star className="h-8 w-8 text-yellow-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avaliação Média</p>
                    <p className="text-2xl font-bold">{overallStats.average}/10</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">NPS Geral</p>
                    <p className={`text-2xl font-bold ${getNPSColor(overallStats.nps)}`}>
                      {overallStats.nps > 0 ? '+' : ''}{overallStats.nps}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total de Avaliações</p>
                    <p className="text-2xl font-bold">{overallStats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Promotores</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-green-600">{overallStats.promoters}</span>
                      <span className="text-xs text-gray-500">
                        ({Math.round((overallStats.promoters / overallStats.total) * 100)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estatísticas por Módulo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>📊 Performance por Módulo</span>
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {moduleStats.map((stat) => (
                <div key={stat.module_id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">{stat.module_title}</h3>
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline" className="flex items-center">
                        <Star className="w-3 h-3 mr-1 text-yellow-500" />
                        {stat.average_rating}/10
                      </Badge>
                      <Badge className={getNPSColor(stat.nps_score)}>
                        NPS: {stat.nps_score > 0 ? '+' : ''}{stat.nps_score}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total:</span>
                      <span className="ml-2 font-medium">{stat.total_ratings}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Promotores:</span>
                      <span className="ml-2 font-medium text-green-600">{stat.promoters}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Neutros:</span>
                      <span className="ml-2 font-medium text-yellow-600">{stat.passives}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Detratores:</span>
                      <span className="ml-2 font-medium text-red-600">{stat.detractors}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Última:</span>
                      <span className="ml-2 font-medium">
                        {new Date(stat.last_rating).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filtros */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar por módulo, mentorado ou feedback..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Nota:</span>
              <div className="flex gap-1">
                {[
                  { key: 'todos', label: 'Todas' },
                  { key: 'promoters', label: '🟢 9-10' },
                  { key: 'passives', label: '🟡 7-8' },
                  { key: 'detractors', label: '🔴 0-6' }
                ].map(rating => (
                  <Button
                    key={rating.key}
                    variant={ratingFilter === rating.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRatingFilter(rating.key)}
                    className="text-xs"
                  >
                    {rating.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Módulo:</span>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="border rounded-md px-3 py-1 text-sm"
              >
                <option value="todos">Todos os módulos</option>
                {moduleStats.map((stat) => (
                  <option key={stat.module_id} value={stat.module_id}>
                    {stat.module_title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Avaliações */}
        <Card>
          <CardHeader>
            <CardTitle>
              📝 Avaliações Individuais ({filteredRatings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRatings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4" />
                <p>Nenhuma avaliação encontrada com os filtros aplicados.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRatings.map((rating) => (
                  <div key={rating.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-lg">{rating.module?.title}</h4>
                        <p className="text-sm text-gray-600">
                          por <strong>{rating.mentorado?.nome_completo}</strong>
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(rating.created_at).toLocaleDateString('pt-BR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getRatingColor(rating.rating)}`}>
                          {rating.rating}/10
                        </div>
                        <div className="flex">
                          {[...Array(10)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < rating.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {rating.feedback && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700">
                          <MessageSquare className="w-4 h-4 inline mr-2" />
                          "{rating.feedback}"
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}