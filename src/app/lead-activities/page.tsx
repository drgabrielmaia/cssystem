'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import {
  FileText,
  User,
  Clock,
  Search,
  Filter,
  Eye,
  MessageSquare,
  Phone,
  Mail,
  ExternalLink,
  Calendar,
  Activity,
  Target,
  Edit
} from 'lucide-react'

interface LeadActivity {
  id: string
  lead_id: string
  activity_type: string
  title: string
  description: string | null
  metadata: Record<string, any>
  source_url: string | null
  created_by: string
  created_at: string
  lead_name: string
  lead_email: string
  lead_phone: string
  lead_status: string
}

export default function LeadActivitiesPage() {
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [filteredActivities, setFilteredActivities] = useState<LeadActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedActivity, setSelectedActivity] = useState<LeadActivity | null>(null)

  useEffect(() => {
    fetchActivities()
  }, [])

  useEffect(() => {
    filterActivities()
  }, [activities, searchTerm, selectedType])

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_activities_view')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) {
        console.error('Erro ao buscar atividades:', error)
        return
      }

      if (data) {
        setActivities(data)
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterActivities = () => {
    let filtered = [...activities]

    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(activity => {
        const searchLower = searchTerm.toLowerCase()
        return (
          activity.title.toLowerCase().includes(searchLower) ||
          activity.lead_name.toLowerCase().includes(searchLower) ||
          activity.lead_email?.toLowerCase().includes(searchLower) ||
          activity.description?.toLowerCase().includes(searchLower) ||
          activity.source_url?.toLowerCase().includes(searchLower)
        )
      })
    }

    // Filtrar por tipo
    if (selectedType !== 'all') {
      filtered = filtered.filter(activity => activity.activity_type === selectedType)
    }

    setFilteredActivities(filtered)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return 'Agora há pouco'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h atrás`
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d atrás`
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'form_submission': return FileText
      case 'status_change': return Target
      case 'note': return MessageSquare
      case 'call': return Phone
      case 'email': return Mail
      case 'whatsapp': return MessageSquare
      default: return Activity
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'form_submission': return 'bg-blue-100 text-blue-800'
      case 'status_change': return 'bg-green-100 text-green-800'
      case 'note': return 'bg-yellow-100 text-yellow-800'
      case 'call': return 'bg-purple-100 text-purple-800'
      case 'email': return 'bg-red-100 text-red-800'
      case 'whatsapp': return 'bg-emerald-100 text-emerald-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getActivityTypeLabel = (type: string) => {
    const labels = {
      'form_submission': 'Formulário',
      'status_change': 'Status',
      'note': 'Anotação',
      'call': 'Ligação',
      'email': 'Email',
      'whatsapp': 'WhatsApp'
    }
    return labels[type as keyof typeof labels] || type
  }

  const ActivityDetail = ({ activity }: { activity: LeadActivity }) => (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-center space-x-3 mb-2">
          <div className={`p-2 rounded-lg ${getActivityColor(activity.activity_type)}`}>
            {(() => {
              const IconComponent = getActivityIcon(activity.activity_type)
              return <IconComponent className="h-5 w-5" />
            })()}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{activity.title}</h3>
            <p className="text-sm text-gray-500">
              {formatDate(activity.created_at)} • {activity.created_by}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className={getActivityColor(activity.activity_type)}>
            {getActivityTypeLabel(activity.activity_type)}
          </Badge>
          {activity.source_url && (
            <Badge variant="outline">
              Origem: {activity.source_url}
            </Badge>
          )}
        </div>
      </div>

      {/* Lead Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
          <User className="h-4 w-4 mr-2" />
          Informações do Lead
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div><strong>Nome:</strong> {activity.lead_name}</div>
          <div><strong>Email:</strong> {activity.lead_email || 'Não informado'}</div>
          <div><strong>Telefone:</strong> {activity.lead_phone || 'Não informado'}</div>
          <div><strong>Status:</strong>
            <span className="ml-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              {activity.lead_status}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() => window.open(`/leads/${activity.lead_id}`, '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Ver Lead
        </Button>
      </div>

      {/* Description */}
      {activity.description && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Descrição:</h4>
          <div className="bg-white border rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
              {activity.description}
            </pre>
          </div>
        </div>
      )}

      {/* Metadata */}
      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Dados Adicionais:</h4>
          <div className="bg-white border rounded-lg p-4">
            <div className="space-y-2">
              {Object.entries(activity.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between border-b pb-2 last:border-b-0">
                  <span className="font-medium text-gray-600">{key}:</span>
                  <span className="text-gray-900">
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const activityTypes = [
    { value: 'all', label: 'Todas' },
    { value: 'form_submission', label: 'Formulários' },
    { value: 'status_change', label: 'Mudanças de Status' },
    { value: 'note', label: 'Anotações' },
    { value: 'call', label: 'Ligações' },
    { value: 'email', label: 'Emails' },
    { value: 'whatsapp', label: 'WhatsApp' }
  ]

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header
          title="📋 Histórico de Atividades"
          subtitle="Carregando atividades..."
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Carregando atividades...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title="📋 Histórico de Atividades dos Leads"
        subtitle={`${filteredActivities.length} atividades encontradas`}
      />

      <main className="flex-1 p-6 space-y-6">
        {/* Controles */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Busca */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar por lead, atividade, descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtro por tipo */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {activityTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
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
                <Activity className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Atividades</p>
                  <p className="text-2xl font-bold">{activities.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Formulários</p>
                  <p className="text-2xl font-bold">
                    {activities.filter(a => a.activity_type === 'form_submission').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <User className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Leads Únicos</p>
                  <p className="text-2xl font-bold">
                    {new Set(activities.map(a => a.lead_id)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Hoje</p>
                  <p className="text-2xl font-bold">
                    {activities.filter(a =>
                      new Date(a.created_at).toDateString() === new Date().toDateString()
                    ).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline de atividades */}
        <div className="space-y-4">
          {filteredActivities.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma atividade encontrada
                </h3>
                <p className="text-gray-500">
                  {searchTerm || selectedType !== 'all'
                    ? 'Tente ajustar os filtros de busca.'
                    : 'Ainda não há atividades registradas.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity, index) => {
                const ActivityIcon = getActivityIcon(activity.activity_type)
                const isLast = index === filteredActivities.length - 1

                return (
                  <div key={activity.id} className="relative">
                    {/* Timeline line */}
                    {!isLast && (
                      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
                    )}

                    {/* Activity item */}
                    <div className="flex items-start space-x-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 p-2 rounded-full ${getActivityColor(activity.activity_type)}`}>
                        <ActivityIcon className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <Card className="flex-1 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="font-semibold text-gray-900">
                                  {activity.title}
                                </h3>
                                <Badge className={getActivityColor(activity.activity_type)} size="sm">
                                  {getActivityTypeLabel(activity.activity_type)}
                                </Badge>
                              </div>

                              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                                <span className="flex items-center">
                                  <User className="h-4 w-4 mr-1" />
                                  {activity.lead_name}
                                </span>
                                <span className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {formatDate(activity.created_at)}
                                </span>
                                {activity.source_url && (
                                  <span className="text-blue-600">
                                    📍 {activity.source_url}
                                  </span>
                                )}
                              </div>

                              {activity.description && (
                                <p className="text-gray-700 text-sm line-clamp-3">
                                  {activity.description}
                                </p>
                              )}
                            </div>

                            <div className="flex space-x-2 ml-4">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedActivity(activity)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Ver Detalhes
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Detalhes da Atividade</DialogTitle>
                                  </DialogHeader>
                                  {selectedActivity && (
                                    <ActivityDetail activity={selectedActivity} />
                                  )}
                                </DialogContent>
                              </Dialog>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`/leads/${activity.lead_id}`, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Lead
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}