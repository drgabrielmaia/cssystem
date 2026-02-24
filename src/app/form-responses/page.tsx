'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CalendarBooking } from '@/components/calendar-booking'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'
import {
  FileText,
  Eye,
  Search,
  Filter,
  Calendar,
  User,
  ExternalLink,
  Download,
  BarChart3,
  Clock,
  CalendarDays,
  MessageSquare,
  Phone,
  Mail,
  Star,
  CheckCircle2,
  AlertCircle,
  Timer,
  Sparkles
} from 'lucide-react'

interface FormSubmission {
  id: string
  template_id: string
  template_slug: string
  lead_id: string | null
  mentorado_id: string | null
  source_url: string | null
  submission_data: Record<string, any>
  created_at: string
  template: {
    name: string
    description: string
    fields: any[]
  } | null
  lead: {
    nome_completo: string
    email: string
    telefone: string
  } | null
  mentorado: {
    nome_completo: string
    email: string
    // turma: string  // Campo não existe na tabela
  } | null
}

export default function FormResponsesPage() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<FormSubmission[]>([])
  const [templates, setTemplates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('all')
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null)
  const [bookingSubmission, setBookingSubmission] = useState<FormSubmission | null>(null)
  const [abandonedSubmissions, setAbandonedSubmissions] = useState<FormSubmission[]>([])

  useEffect(() => {
    fetchSubmissions()
  }, [])

  useEffect(() => {
    filterSubmissions()
  }, [submissions, searchTerm, selectedTemplate])

  const fetchSubmissions = async () => {
    try {
      console.log('🔍 Buscando respostas de formulários...')
      setLoading(true)

      if (!user?.organizationId) {
        setSubmissions([])
        setTemplates([])
        setLoading(false)
        return
      }

      // Use uma única query otimizada com joins e filtro por organização
      const { data: submissions, error } = await supabase
        .from('form_submissions')
        .select(`
          id,
          template_id,
          template_slug,
          lead_id,
          mentorado_id,
          source_url,
          submission_data,
          created_at,
          form_templates:template_id(
            name,
            description,
            fields
          ),
          leads:lead_id(
            nome_completo,
            email,
            telefone
          ),
          mentorados:mentorado_id(
            nome_completo,
            email
          )
        `)
        .eq('organization_id', user.organizationId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('❌ Erro ao buscar form submissions:', error)
        // If table doesn't exist, create empty state
        if (error.code === '42P01') {
          setSubmissions([])
          setTemplates([])
          setLoading(false)
          return
        }
        throw error
      }

      console.log('✅ Encontrados', submissions?.length || 0, 'form submissions')

      // Transform data to match interface
      const transformedSubmissions: FormSubmission[] = (submissions || []).map(submission => ({
        id: submission.id,
        template_id: submission.template_id,
        template_slug: submission.template_slug,
        lead_id: submission.lead_id,
        mentorado_id: submission.mentorado_id,
        source_url: submission.source_url,
        submission_data: submission.submission_data || {},
        created_at: submission.created_at,
        template: submission.form_templates ? {
          name: (submission.form_templates as any).name,
          description: (submission.form_templates as any).description,
          fields: (submission.form_templates as any).fields || []
        } : null,
        lead: submission.leads ? {
          nome_completo: (submission.leads as any).nome_completo,
          email: (submission.leads as any).email,
          telefone: (submission.leads as any).telefone
        } : null,
        mentorado: submission.mentorados ? {
          nome_completo: (submission.mentorados as any).nome_completo,
          email: (submission.mentorados as any).email
        } : null
      }))

      setSubmissions(transformedSubmissions)

      // Extract unique template slugs for filter (using slugs instead of names for consistency)
      const templateSlugs = transformedSubmissions
        .map(s => s.template_slug)
        .filter(Boolean) as string[]
      
      const uniqueTemplates = Array.from(new Set(templateSlugs))
      
      setTemplates(uniqueTemplates)

    } catch (error) {
      console.error('❌ Erro geral:', error)
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }

  const filterSubmissions = () => {
    let filtered = [...submissions]

    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(submission => {
        const searchLower = searchTerm.toLowerCase()
        const templateName = submission.template?.name?.toLowerCase() || ''
        const leadName = submission.lead?.nome_completo?.toLowerCase() || ''
        const leadEmail = submission.lead?.email?.toLowerCase() || ''
        const mentoradoName = submission.mentorado?.nome_completo?.toLowerCase() || ''
        const mentoradoEmail = submission.mentorado?.email?.toLowerCase() || ''
        const source = submission.source_url?.toLowerCase() || ''

        return templateName.includes(searchLower) ||
               leadName.includes(searchLower) ||
               leadEmail.includes(searchLower) ||
               mentoradoName.includes(searchLower) ||
               mentoradoEmail.includes(searchLower) ||
               source.includes(searchLower)
      })
    }

    // Filtrar por template
    if (selectedTemplate !== 'all') {
      filtered = filtered.filter(submission => submission.template_slug === selectedTemplate)
    }

    setFilteredSubmissions(filtered)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSourceColor = (source: string | null) => {
    if (!source) return 'bg-gray-100 text-gray-800'

    if (source.includes('instagram')) return 'bg-pink-100 text-pink-800'
    if (source.includes('facebook')) return 'bg-blue-100 text-blue-800'
    if (source.includes('google')) return 'bg-green-100 text-green-800'
    if (source.includes('bio')) return 'bg-purple-100 text-purple-800'
    if (source.includes('ads')) return 'bg-orange-100 text-orange-800'

    return 'bg-gray-100 text-gray-800'
  }

  const exportSubmissions = () => {
    const csv = [
      // Cabeçalho
      [
        'Data',
        'Formulário',
        'Nome',
        'Email',
        'Telefone',
        'Turma',
        'Origem',
        'Dados'
      ].join(','),
      // Dados
      ...filteredSubmissions.map(submission => [
        formatDate(submission.created_at),
        submission.template?.name || submission.template_slug,
        submission.lead?.nome_completo || submission.mentorado?.nome_completo || '',
        submission.lead?.email || submission.mentorado?.email || '',
        submission.lead?.telefone || '',
        '',  // Campo turma não existe
        submission.source_url || '',
        `"${JSON.stringify(submission.submission_data).replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `respostas-formularios-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const SubmissionDetail = ({ submission }: { submission: FormSubmission }) => (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-600 pb-4">
        <h3 className="text-xl font-semibold text-white mb-2">
          {submission.template?.name || submission.template_slug}
        </h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="flex items-center space-x-1 bg-gray-700 text-white">
            <Clock className="h-3 w-3" />
            <span>{formatDate(submission.created_at)}</span>
          </Badge>
          {submission.source_url && (
            <Badge className="bg-blue-600 text-white hover:bg-blue-700">
              {submission.source_url}
            </Badge>
          )}
          {submission.lead && (
            <Badge variant="outline" className="flex items-center space-x-1 text-blue-400 border-blue-400">
              <User className="h-3 w-3" />
              <span>Lead criado</span>
            </Badge>
          )}
          {submission.mentorado && (
            <Badge variant="outline" className="flex items-center space-x-1 text-green-400 border-green-400">
              <User className="h-3 w-3" />
              <span>Mentorado</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Lead Info */}
      {submission.lead && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <h4 className="font-semibold text-blue-300 mb-2">Informações do Lead:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
            <div><strong className="text-white">Nome:</strong> {submission.lead.nome_completo}</div>
            <div><strong className="text-white">Email:</strong> {submission.lead.email}</div>
            <div><strong className="text-white">Telefone:</strong> {submission.lead.telefone}</div>
          </div>
        </div>
      )}

      {/* Mentorado Info */}
      {submission.mentorado && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
          <h4 className="font-semibold text-green-300 mb-2">Informações do Mentorado:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
            <div><strong className="text-white">Nome:</strong> {submission.mentorado.nome_completo}</div>
            <div><strong className="text-white">Email:</strong> {submission.mentorado.email}</div>
            {/* <div><strong>Turma:</strong> Campo turma não existe</div> */}
          </div>
        </div>
      )}

      {/* Form Data */}
      <div>
        <h4 className="font-semibold text-white mb-4">Respostas do Formulário:</h4>
        <div className="space-y-4">
          {Object.entries(submission.submission_data).map(([key, value]) => {
            // Tentar encontrar o label do campo no template
            const field = submission.template?.fields?.find((f: any) => f.name === key)
            const label = field?.label || key

            return (
              <div key={key} className="border border-gray-600 rounded-lg p-4 bg-gray-800/50">
                <div className="font-medium text-gray-300 mb-2">{label}</div>
                <div className="text-white">
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header
          title="📋 Respostas dos Formulários"
          subtitle="Carregando respostas..."
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Carregando respostas...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title="📋 Respostas dos Formulários"
        subtitle={`${filteredSubmissions.length} respostas encontradas`}
      />

      <main className="flex-1 p-6 space-y-6">
        {/* Controles */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Busca */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar por nome, email, formulário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtro por template */}
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os formulários</option>
              {templates.map(templateSlug => {
                // Encontrar o nome do formulário baseado no slug
                const submission = submissions.find(s => s.template_slug === templateSlug)
                const displayName = submission?.template?.name || templateSlug.replace(/-/g, ' ').replace(/_/g, ' ')
                
                return (
                  <option key={templateSlug} value={templateSlug}>
                    {displayName}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-2">
            <Button onClick={exportSubmissions} variant="outline" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Exportar CSV</span>
            </Button>
          </div>
        </div>

        {/* Estatísticas Melhoradas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Respostas</p>
                  <p className="text-3xl font-bold text-blue-600">{submissions.length}</p>
                  <p className="text-xs text-gray-500 mt-1">+{submissions.filter(s => new Date(s.created_at) > new Date(Date.now() - 7*24*60*60*1000)).length} esta semana</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Leads Convertidos</p>
                  <p className="text-3xl font-bold text-emerald-600">{submissions.filter(s => s.lead_id).length}</p>
                  <p className="text-xs text-gray-500 mt-1">{Math.round((submissions.filter(s => s.lead_id).length / submissions.length) * 100)}% taxa conversão</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-full">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Formulários Ativos</p>
                  <p className="text-3xl font-bold text-purple-600">{templates.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Em {new Set(submissions.map(s => s.source_url)).size} canais</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-full">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Hoje</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {submissions.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString()).length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Respostas recebidas</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-full">
                  <Timer className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de respostas */}
        <div className="grid gap-4">
          {filteredSubmissions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma resposta encontrada
                </h3>
                <p className="text-gray-500">
                  {searchTerm || selectedTemplate !== 'all'
                    ? 'Tente ajustar os filtros de busca.'
                    : 'Ainda não há respostas de formulários.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredSubmissions.map((submission) => (
              <Card key={submission.id} className="hover:shadow-lg transition-all duration-300 hover:border-blue-200 group">
                <CardContent className="p-6 relative overflow-hidden">
                  {/* Gradient Background */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"></div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                          <Sparkles className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {submission.template?.name || submission.template_slug}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                            {submission.source_url && (
                              <Badge className={getSourceColor(submission.source_url)}>
                                {submission.source_url}
                              </Badge>
                            )}
                            {submission.lead_id && (
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Lead criado
                              </Badge>
                            )}
                            {submission.mentorado_id && (
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                                <Star className="h-3 w-3 mr-1" />
                                Mentorado
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Informações da Pessoa */}
                      {(submission.lead || submission.mentorado) && (
                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 mb-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-100 rounded-full">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Nome</p>
                                <p className="font-semibold text-gray-900">
                                  {submission.lead?.nome_completo || submission.mentorado?.nome_completo}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-emerald-100 rounded-full">
                                <Mail className="h-4 w-4 text-emerald-600" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                                <p className="font-medium text-gray-700">
                                  {submission.lead?.email || submission.mentorado?.email}
                                </p>
                              </div>
                            </div>
                            {submission.lead?.telefone && (
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-orange-100 rounded-full">
                                  <Phone className="h-4 w-4 text-orange-600" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 uppercase tracking-wide">Telefone</p>
                                  <p className="font-medium text-gray-700">{submission.lead.telefone}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Metadados */}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>{formatDate(submission.created_at)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4" />
                            <span>{Object.keys(submission.submission_data).length} campos preenchidos</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      {/* Botão Agendar Call */}
                      <Button
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                        size="sm"
                        onClick={() => setBookingSubmission(submission)}
                      >
                        <CalendarDays className="h-4 w-4 mr-2" />
                        Agendar Call
                      </Button>

                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="hover:bg-blue-50 hover:border-blue-300"
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detalhes
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Detalhes da Resposta</DialogTitle>
                            </DialogHeader>
                            {selectedSubmission && (
                              <SubmissionDetail submission={selectedSubmission} />
                            )}
                          </DialogContent>
                        </Dialog>

                        {submission.lead_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-green-50 hover:border-green-300"
                            onClick={() => window.open(`/leads/${submission.lead_id}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Lead
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-purple-50 hover:border-purple-300"
                          onClick={() => {/* TODO: Implementar WhatsApp */}}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Componente de Agendamento de Calendário */}
        {bookingSubmission && (
          <CalendarBooking
            submission={bookingSubmission}
            isOpen={!!bookingSubmission}
            onClose={() => setBookingSubmission(null)}
          />
        )}
      </main>
    </div>
  )
}