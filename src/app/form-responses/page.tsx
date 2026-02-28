'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CalendarBooking } from '@/components/calendar-booking'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'
import {
  FileText, Eye, Search, Calendar, User, ExternalLink, Download,
  BarChart3, Clock, CalendarDays, MessageSquare, Phone, Mail, Star,
  CheckCircle2, AlertCircle, Timer, Sparkles, ChevronDown, Filter,
  Inbox, ArrowUpRight, Hash
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  } | null
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Data fetching  (FIX: depends on user)
  // -------------------------------------------------------------------------

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true)

      if (!user?.organizationId) {
        setSubmissions([])
        setTemplates([])
        setLoading(false)
        return
      }

      const { data: rawSubmissions, error } = await supabase
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
        console.error('Erro ao buscar form submissions:', error)
        if (error.code === '42P01') {
          setSubmissions([])
          setTemplates([])
          setLoading(false)
          return
        }
        throw error
      }

      const transformedSubmissions: FormSubmission[] = (rawSubmissions || []).map(submission => ({
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

      const templateSlugs = transformedSubmissions
        .map(s => s.template_slug)
        .filter(Boolean) as string[]
      const uniqueTemplates = Array.from(new Set(templateSlugs))
      setTemplates(uniqueTemplates)
    } catch (error) {
      console.error('Erro geral:', error)
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }, [user?.organizationId])

  // FIX: depend on user?.organizationId via the memoised callback
  useEffect(() => {
    if (user?.organizationId) {
      fetchSubmissions()
    }
  }, [user?.organizationId, fetchSubmissions])

  // Retry mechanism: if user loads slowly, retry after a short delay
  useEffect(() => {
    if (!user?.organizationId && loading) {
      const timer = setTimeout(() => {
        if (user?.organizationId) {
          fetchSubmissions()
        }
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [user, loading, fetchSubmissions])

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------

  useEffect(() => {
    filterSubmissions()
  }, [submissions, searchTerm, selectedTemplate])

  const filterSubmissions = () => {
    let filtered = [...submissions]

    if (searchTerm) {
      filtered = filtered.filter(submission => {
        const s = searchTerm.toLowerCase()
        const templateName = submission.template?.name?.toLowerCase() || ''
        const leadName = submission.lead?.nome_completo?.toLowerCase() || ''
        const leadEmail = submission.lead?.email?.toLowerCase() || ''
        const mentoradoName = submission.mentorado?.nome_completo?.toLowerCase() || ''
        const mentoradoEmail = submission.mentorado?.email?.toLowerCase() || ''
        const source = submission.source_url?.toLowerCase() || ''

        return templateName.includes(s) ||
               leadName.includes(s) ||
               leadEmail.includes(s) ||
               mentoradoName.includes(s) ||
               mentoradoEmail.includes(s) ||
               source.includes(s)
      })
    }

    if (selectedTemplate !== 'all') {
      filtered = filtered.filter(submission => submission.template_slug === selectedTemplate)
    }

    setFilteredSubmissions(filtered)
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatRelativeDate = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'agora'
    if (diffMin < 60) return `${diffMin}min atras`
    if (diffHours < 24) return `${diffHours}h atras`
    if (diffDays < 7) return `${diffDays}d atras`
    return formatDate(dateString)
  }

  const getSourceLabel = (source: string | null): string => {
    if (!source) return 'Direto'
    if (source.includes('instagram')) return 'Instagram'
    if (source.includes('facebook')) return 'Facebook'
    if (source.includes('google')) return 'Google'
    if (source.includes('bio')) return 'Link Bio'
    if (source.includes('ads')) return 'Ads'
    return source.length > 24 ? source.slice(0, 22) + '...' : source
  }

  const getSourceStyles = (source: string | null): string => {
    if (!source) return 'bg-white/[0.04] text-white/50 border-white/[0.06]'
    if (source.includes('instagram')) return 'bg-pink-500/10 text-pink-400 border-pink-500/20'
    if (source.includes('facebook')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    if (source.includes('google')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    if (source.includes('bio')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    if (source.includes('ads')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    return 'bg-white/[0.04] text-white/50 border-white/[0.06]'
  }

  const exportSubmissions = () => {
    const csv = [
      [
        'Data',
        'Formulario',
        'Nome',
        'Email',
        'Telefone',
        'Turma',
        'Origem',
        'Dados'
      ].join(','),
      ...filteredSubmissions.map(submission => [
        formatDate(submission.created_at),
        submission.template?.name || submission.template_slug,
        submission.lead?.nome_completo || submission.mentorado?.nome_completo || '',
        submission.lead?.email || submission.mentorado?.email || '',
        submission.lead?.telefone || '',
        '',
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

  // -------------------------------------------------------------------------
  // Computed KPIs
  // -------------------------------------------------------------------------

  const totalResponses = submissions.length
  const leadsConverted = submissions.filter(s => s.lead_id).length
  const conversionRate = totalResponses > 0 ? Math.round((leadsConverted / totalResponses) * 100) : 0
  const thisWeek = submissions.filter(s => new Date(s.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
  const today = submissions.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString()).length
  const uniqueChannels = new Set(submissions.map(s => s.source_url).filter(Boolean)).size

  // -------------------------------------------------------------------------
  // Sub-components
  // -------------------------------------------------------------------------

  const SubmissionDetail = ({ submission }: { submission: FormSubmission }) => (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-white/[0.06] pb-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/[0.06] flex items-center justify-center">
            <FileText className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              {submission.template?.name || submission.template_slug}
            </h3>
            <p className="text-sm text-white/40">{formatDate(submission.created_at)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {submission.source_url && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${getSourceStyles(submission.source_url)}`}>
              <ExternalLink className="h-3 w-3" />
              {getSourceLabel(submission.source_url)}
            </span>
          )}
          {submission.lead && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <CheckCircle2 className="h-3 w-3" />
              Lead criado
            </span>
          )}
          {submission.mentorado && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Star className="h-3 w-3" />
              Mentorado
            </span>
          )}
        </div>
      </div>

      {/* Lead Info */}
      {submission.lead && (
        <div className="rounded-xl bg-blue-500/[0.06] border border-blue-500/10 p-4">
          <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
            <User className="h-4 w-4" />
            Informacoes do Lead
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/30 mb-1">Nome</p>
              <p className="text-sm text-white font-medium">{submission.lead.nome_completo}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/30 mb-1">Email</p>
              <p className="text-sm text-white/70">{submission.lead.email}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/30 mb-1">Telefone</p>
              <p className="text-sm text-white/70">{submission.lead.telefone}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mentorado Info */}
      {submission.mentorado && (
        <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/10 p-4">
          <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
            <Star className="h-4 w-4" />
            Informacoes do Mentorado
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/30 mb-1">Nome</p>
              <p className="text-sm text-white font-medium">{submission.mentorado.nome_completo}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/30 mb-1">Email</p>
              <p className="text-sm text-white/70">{submission.mentorado.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form Answers */}
      <div>
        <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-white/40" />
          Respostas do Formulario
        </h4>
        <div className="space-y-3">
          {Object.entries(submission.submission_data).map(([key, value]) => {
            const field = submission.template?.fields?.find((f: any) => f.name === key)
            const label = field?.label || key

            return (
              <div key={key} className="rounded-xl bg-[#111113] border border-white/[0.06] p-4">
                <p className="text-xs text-white/40 mb-1.5 font-medium">{label}</p>
                <p className="text-sm text-white leading-relaxed">
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  // -------------------------------------------------------------------------
  // Loading skeleton
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#0a0a0c]">
        <Header title="Respostas dos Formularios" subtitle="Carregando..." />
        <div className="p-6 space-y-4">
          {/* Skeleton KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-[#1a1a1e] rounded-2xl animate-pulse border border-white/[0.06]" />
            ))}
          </div>
          {/* Skeleton rows */}
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-[#1a1a1e] rounded-2xl animate-pulse border border-white/[0.06]" />
          ))}
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0c]">
      <Header
        title="Respostas dos Formularios"
        subtitle={`${filteredSubmissions.length} respostas encontradas`}
      />

      <main className="p-6 space-y-6">
        {/* ----------------------------------------------------------------- */}
        {/* Sticky toolbar                                                     */}
        {/* ----------------------------------------------------------------- */}
        <div className="sticky top-0 z-20 -mx-6 px-6 py-4 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/[0.04]">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  placeholder="Buscar por nome, email, formulario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-[#111113] border-white/[0.08] text-white placeholder:text-white/30 focus:border-white/20 focus:ring-white/10 rounded-xl h-10"
                />
              </div>

              {/* Template filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30 pointer-events-none z-10" />
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="appearance-none pl-9 pr-9 py-2 h-10 bg-[#111113] border border-white/[0.08] text-white text-sm rounded-xl focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 cursor-pointer"
                >
                  <option value="all">Todos os formularios</option>
                  {templates.map(templateSlug => {
                    const sub = submissions.find(s => s.template_slug === templateSlug)
                    const displayName = sub?.template?.name || templateSlug.replace(/[-_]/g, ' ')
                    return (
                      <option key={templateSlug} value={templateSlug}>
                        {displayName}
                      </option>
                    )
                  })}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30 pointer-events-none" />
              </div>
            </div>

            {/* Export */}
            <Button
              onClick={exportSubmissions}
              variant="outline"
              className="bg-[#111113] border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.12] rounded-xl h-10"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* KPI Cards                                                          */}
        {/* ----------------------------------------------------------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total */}
          <div className="group relative bg-[#1a1a1e] rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.1] transition-all duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Total Respostas</p>
                <p className="text-3xl font-bold text-white tabular-nums">{totalResponses}</p>
                <p className="text-xs text-white/30 mt-1.5">+{thisWeek} esta semana</p>
              </div>
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-blue-500 animate-ping opacity-30" />
              </div>
            </div>
          </div>

          {/* Leads */}
          <div className="group relative bg-[#1a1a1e] rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.1] transition-all duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Leads Convertidos</p>
                <p className="text-3xl font-bold text-white tabular-nums">{leadsConverted}</p>
                <p className="text-xs text-white/30 mt-1.5">{conversionRate}% taxa conversao</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
          </div>

          {/* Templates */}
          <div className="group relative bg-[#1a1a1e] rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.1] transition-all duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Formularios Ativos</p>
                <p className="text-3xl font-bold text-white tabular-nums">{templates.length}</p>
                <p className="text-xs text-white/30 mt-1.5">Em {uniqueChannels} {uniqueChannels === 1 ? 'canal' : 'canais'}</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-purple-500" />
            </div>
          </div>

          {/* Today */}
          <div className="group relative bg-[#1a1a1e] rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.1] transition-all duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Hoje</p>
                <p className="text-3xl font-bold text-white tabular-nums">{today}</p>
                <p className="text-xs text-white/30 mt-1.5">Respostas recebidas</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Table header                                                       */}
        {/* ----------------------------------------------------------------- */}
        <div className="hidden lg:grid grid-cols-[1fr_1.2fr_140px_120px_180px] gap-4 px-5 py-2">
          <p className="text-[11px] font-medium text-white/25 uppercase tracking-wider">Formulario</p>
          <p className="text-[11px] font-medium text-white/25 uppercase tracking-wider">Contato</p>
          <p className="text-[11px] font-medium text-white/25 uppercase tracking-wider">Origem</p>
          <p className="text-[11px] font-medium text-white/25 uppercase tracking-wider">Data</p>
          <p className="text-[11px] font-medium text-white/25 uppercase tracking-wider text-right">Acoes</p>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Submissions list                                                   */}
        {/* ----------------------------------------------------------------- */}
        <div className="space-y-2">
          {filteredSubmissions.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-20 h-20 rounded-3xl bg-[#1a1a1e] border border-white/[0.06] flex items-center justify-center mb-6">
                <Inbox className="h-9 w-9 text-white/20" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Nenhuma resposta encontrada
              </h3>
              <p className="text-sm text-white/40 max-w-sm text-center">
                {searchTerm || selectedTemplate !== 'all'
                  ? 'Tente ajustar os filtros de busca para encontrar resultados.'
                  : 'Quando seus formularios receberem respostas, elas aparecerão aqui.'}
              </p>
              {(searchTerm || selectedTemplate !== 'all') && (
                <Button
                  variant="outline"
                  className="mt-4 bg-transparent border-white/[0.08] text-white/60 hover:text-white hover:border-white/[0.15] rounded-xl"
                  onClick={() => { setSearchTerm(''); setSelectedTemplate('all') }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            filteredSubmissions.map((submission) => {
              const personName = submission.lead?.nome_completo || submission.mentorado?.nome_completo || ''
              const personEmail = submission.lead?.email || submission.mentorado?.email || ''
              const personPhone = submission.lead?.telefone || ''
              const fieldsCount = Object.keys(submission.submission_data).length

              return (
                <div
                  key={submission.id}
                  className="group bg-[#1a1a1e] rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 hover:bg-[#1e1e22]"
                >
                  <div className="p-5">
                    {/* Desktop layout */}
                    <div className="hidden lg:grid grid-cols-[1fr_1.2fr_140px_120px_180px] gap-4 items-center">
                      {/* Template info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {submission.template?.name || submission.template_slug}
                          </p>
                          <p className="text-xs text-white/30 mt-0.5">
                            <Hash className="h-3 w-3 inline mr-0.5 -mt-px" />
                            {fieldsCount} campos
                            {submission.lead_id && (
                              <span className="ml-2 text-blue-400/60">Lead</span>
                            )}
                            {submission.mentorado_id && (
                              <span className="ml-2 text-emerald-400/60">Mentorado</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Person info */}
                      <div className="min-w-0">
                        {personName ? (
                          <div>
                            <p className="text-sm text-white truncate">{personName}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {personEmail && (
                                <span className="text-xs text-white/30 truncate">{personEmail}</span>
                              )}
                              {personPhone && (
                                <span className="text-xs text-white/30 flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {personPhone}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-white/20 italic">Sem contato vinculado</p>
                        )}
                      </div>

                      {/* Source badge */}
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium border ${getSourceStyles(submission.source_url)}`}>
                          {getSourceLabel(submission.source_url)}
                        </span>
                      </div>

                      {/* Date */}
                      <div>
                        <p className="text-xs text-white/50">{formatRelativeDate(submission.created_at)}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 text-white/50 hover:text-white hover:bg-white/[0.06] rounded-lg"
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              <span className="text-xs">Ver</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-[#141416] border-white/[0.08] text-white">
                            <DialogHeader>
                              <DialogTitle className="text-white text-lg">Detalhes da Resposta</DialogTitle>
                            </DialogHeader>
                            {selectedSubmission && (
                              <SubmissionDetail submission={selectedSubmission} />
                            )}
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                          onClick={() => setBookingSubmission(submission)}
                        >
                          <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                          <span className="text-xs">Agendar</span>
                        </Button>

                        {submission.lead_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"
                            onClick={() => window.open(`/leads/${submission.lead_id}`, '_blank')}
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {personPhone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-green-400/70 hover:text-green-400 hover:bg-green-500/10 rounded-lg"
                            onClick={() => {
                              const cleanPhone = personPhone.replace(/\D/g, '')
                              window.open(`https://wa.me/55${cleanPhone}`, '_blank')
                            }}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Mobile layout */}
                    <div className="lg:hidden space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                            <FileText className="h-4 w-4 text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {submission.template?.name || submission.template_slug}
                            </p>
                            <p className="text-xs text-white/30 mt-0.5">{formatRelativeDate(submission.created_at)}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${getSourceStyles(submission.source_url)}`}>
                          {getSourceLabel(submission.source_url)}
                        </span>
                      </div>

                      {personName && (
                        <div className="bg-[#111113] rounded-xl p-3 border border-white/[0.04]">
                          <p className="text-sm text-white">{personName}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            {personEmail && <span className="text-xs text-white/30">{personEmail}</span>}
                            {personPhone && (
                              <span className="text-xs text-white/30 flex items-center gap-1">
                                <Phone className="h-3 w-3" />{personPhone}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {submission.lead_id && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <CheckCircle2 className="h-3 w-3" />Lead
                          </span>
                        )}
                        {submission.mentorado_id && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Star className="h-3 w-3" />Mentorado
                          </span>
                        )}
                        <span className="text-[10px] text-white/20">{fieldsCount} campos</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-white/[0.04]">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-white/50 hover:text-white hover:bg-white/[0.06] rounded-lg flex-1"
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              <span className="text-xs">Detalhes</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-[#141416] border-white/[0.08] text-white">
                            <DialogHeader>
                              <DialogTitle className="text-white text-lg">Detalhes da Resposta</DialogTitle>
                            </DialogHeader>
                            {selectedSubmission && (
                              <SubmissionDetail submission={selectedSubmission} />
                            )}
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg flex-1"
                          onClick={() => setBookingSubmission(submission)}
                        >
                          <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                          <span className="text-xs">Agendar</span>
                        </Button>

                        {personPhone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-green-400/70 hover:text-green-400 hover:bg-green-500/10 rounded-lg"
                            onClick={() => {
                              const cleanPhone = personPhone.replace(/\D/g, '')
                              window.open(`https://wa.me/55${cleanPhone}`, '_blank')
                            }}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {submission.lead_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"
                            onClick={() => window.open(`/leads/${submission.lead_id}`, '_blank')}
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Results count footer */}
        {filteredSubmissions.length > 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-white/20">
              Mostrando {filteredSubmissions.length} de {submissions.length} respostas
            </p>
          </div>
        )}

        {/* Calendar booking integration */}
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
