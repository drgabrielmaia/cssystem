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
  Eye,
  Search,
  Filter,
  Calendar,
  User,
  ExternalLink,
  Download,
  BarChart3,
  Clock
} from 'lucide-react'

interface FormSubmission {
  id: string
  template_id: string
  template_slug: string
  lead_id: string | null
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
}

export default function FormResponsesPage() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<FormSubmission[]>([])
  const [templates, setTemplates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('all')
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null)

  useEffect(() => {
    fetchSubmissions()
  }, [])

  useEffect(() => {
    filterSubmissions()
  }, [submissions, searchTerm, selectedTemplate])

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('form_submissions')
        .select(`
          *,
          template:form_templates(name, description, fields),
          lead:leads(nome_completo, email, telefone)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar respostas:', error)
        return
      }

      if (data) {
        setSubmissions(data)

        // Extrair templates únicos
        const templateSlugs = data.map(s => s.template_slug)
        const uniqueTemplates = templateSlugs.filter((slug, index) => templateSlugs.indexOf(slug) === index)
        setTemplates(uniqueTemplates)
      }
    } catch (error) {
      console.error('Erro:', error)
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
        const source = submission.source_url?.toLowerCase() || ''

        return templateName.includes(searchLower) ||
               leadName.includes(searchLower) ||
               leadEmail.includes(searchLower) ||
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
        'Origem',
        'Dados'
      ].join(','),
      // Dados
      ...filteredSubmissions.map(submission => [
        formatDate(submission.created_at),
        submission.template?.name || submission.template_slug,
        submission.lead?.nome_completo || '',
        submission.lead?.email || '',
        submission.lead?.telefone || '',
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
      <div className="border-b pb-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {submission.template?.name || submission.template_slug}
        </h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{formatDate(submission.created_at)}</span>
          </Badge>
          {submission.source_url && (
            <Badge className={getSourceColor(submission.source_url)}>
              {submission.source_url}
            </Badge>
          )}
          {submission.lead && (
            <Badge variant="outline" className="flex items-center space-x-1">
              <User className="h-3 w-3" />
              <span>Lead criado</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Lead Info */}
      {submission.lead && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Informações do Lead:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div><strong>Nome:</strong> {submission.lead.nome_completo}</div>
            <div><strong>Email:</strong> {submission.lead.email}</div>
            <div><strong>Telefone:</strong> {submission.lead.telefone}</div>
          </div>
        </div>
      )}

      {/* Form Data */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Respostas do Formulário:</h4>
        <div className="space-y-4">
          {Object.entries(submission.submission_data).map(([key, value]) => {
            // Tentar encontrar o label do campo no template
            const field = submission.template?.fields?.find((f: any) => f.name === key)
            const label = field?.label || key

            return (
              <div key={key} className="border rounded-lg p-4">
                <div className="font-medium text-gray-700 mb-2">{label}</div>
                <div className="text-gray-900">
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
              {templates.map(template => (
                <option key={template} value={template}>
                  {template.replace('-', ' ').replace('_', ' ')}
                </option>
              ))}
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

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Respostas</p>
                  <p className="text-2xl font-bold">{submissions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <User className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Leads Criados</p>
                  <p className="text-2xl font-bold">
                    {submissions.filter(s => s.lead_id).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Formulários Ativos</p>
                  <p className="text-2xl font-bold">{templates.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Hoje</p>
                  <p className="text-2xl font-bold">
                    {submissions.filter(s =>
                      new Date(s.created_at).toDateString() === new Date().toDateString()
                    ).length}
                  </p>
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
              <Card key={submission.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {submission.template?.name || submission.template_slug}
                        </h3>
                        {submission.source_url && (
                          <Badge className={getSourceColor(submission.source_url)}>
                            {submission.source_url}
                          </Badge>
                        )}
                        {submission.lead_id && (
                          <Badge variant="outline" className="text-green-700 border-green-300">
                            Lead criado
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(submission.created_at)}</span>
                        </div>

                        {submission.lead && (
                          <>
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4" />
                              <span>{submission.lead.nome_completo}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span>📧</span>
                              <span>{submission.lead.email}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mt-3 text-sm text-gray-500">
                        {Object.keys(submission.submission_data).length} campos preenchidos
                      </div>
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSubmission(submission)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Detalhes
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
                          onClick={() => window.open(`/leads/${submission.lead_id}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Ver Lead
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}