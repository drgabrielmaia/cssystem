'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users, FileText, BarChart3, Plus, Trash2, GripVertical,
  Save, Eye, ChevronDown, ChevronUp, Loader2, Settings,
  PieChart, TrendingUp, Target, Brain, Search, Download,
  Edit3, Check, X, ArrowLeft, Sparkles, AlertCircle, CheckCircle2,
  ToggleLeft, ToggleRight, Type, List, AlignLeft, Hash, ListChecks
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================
interface ICPField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number'
  required: boolean
  placeholder?: string
  options?: string[]
}

interface ICPTemplate {
  id: string
  name: string
  description: string
  is_active: boolean
  fields: ICPField[]
  created_at: string
  updated_at: string
}

interface ICPResponse {
  id: string
  template_id: string
  mentorado_id: string
  responses: Record<string, any>
  completed_at: string
  mentorado?: {
    id: string
    nome: string
    email: string
    whatsapp?: string
  }
}

// ============================================================
// FIELD TYPE OPTIONS
// ============================================================
const FIELD_TYPES: { value: ICPField['type']; label: string; icon: any }[] = [
  { value: 'text', label: 'Texto Curto', icon: Type },
  { value: 'textarea', label: 'Texto Longo', icon: AlignLeft },
  { value: 'select', label: 'Seleção Única', icon: List },
  { value: 'multiselect', label: 'Múltipla Escolha', icon: ListChecks },
  { value: 'number', label: 'Número', icon: Hash },
]

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function ICPAdminPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'builder' | 'responses' | 'dashboard'>('dashboard')

  // Template state
  const [template, setTemplate] = useState<ICPTemplate | null>(null)
  const [editingFields, setEditingFields] = useState<ICPField[]>([])
  const [templateName, setTemplateName] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Responses state
  const [responses, setResponses] = useState<ICPResponse[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null)

  // Dashboard state
  const [dashboardData, setDashboardData] = useState<Record<string, any>>({})

  // Loading
  const [loading, setLoading] = useState(true)

  // ============================================================
  // LOAD DATA
  // ============================================================
  const loadTemplate = useCallback(async () => {
    const { data, error } = await supabase
      .from('icp_form_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      setTemplate(data)
      setEditingFields(data.fields || [])
      setTemplateName(data.name)
      setTemplateDesc(data.description || '')
    }
  }, [])

  const loadResponses = useCallback(async () => {
    const { data, error } = await supabase
      .from('icp_responses')
      .select(`
        *,
        mentorado:mentorados(id, nome, email, whatsapp)
      `)
      .order('completed_at', { ascending: false })

    if (data) {
      setResponses(data)
    }
  }, [])

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      await Promise.all([loadTemplate(), loadResponses()])
      setLoading(false)
    }
    loadAll()
  }, [loadTemplate, loadResponses])

  // ============================================================
  // FORM BUILDER FUNCTIONS
  // ============================================================
  const addField = () => {
    const newField: ICPField = {
      id: `field_${Date.now()}`,
      label: '',
      type: 'text',
      required: true,
      placeholder: '',
    }
    setEditingFields([...editingFields, newField])
    setHasChanges(true)
  }

  const updateField = (index: number, updates: Partial<ICPField>) => {
    const updated = [...editingFields]
    updated[index] = { ...updated[index], ...updates }
    setEditingFields(updated)
    setHasChanges(true)
  }

  const removeField = (index: number) => {
    setEditingFields(editingFields.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= editingFields.length) return
    const updated = [...editingFields]
    const [moved] = updated.splice(index, 1)
    updated.splice(newIndex, 0, moved)
    setEditingFields(updated)
    setHasChanges(true)
  }

  const addOption = (fieldIndex: number) => {
    const updated = [...editingFields]
    const field = updated[fieldIndex]
    if (!field.options) field.options = []
    field.options.push('')
    setEditingFields(updated)
    setHasChanges(true)
  }

  const updateOption = (fieldIndex: number, optionIndex: number, value: string) => {
    const updated = [...editingFields]
    if (updated[fieldIndex].options) {
      updated[fieldIndex].options![optionIndex] = value
      setEditingFields(updated)
      setHasChanges(true)
    }
  }

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const updated = [...editingFields]
    if (updated[fieldIndex].options) {
      updated[fieldIndex].options!.splice(optionIndex, 1)
      setEditingFields(updated)
      setHasChanges(true)
    }
  }

  const saveTemplate = async () => {
    setIsSaving(true)
    try {
      if (template) {
        await supabase
          .from('icp_form_templates')
          .update({
            name: templateName,
            description: templateDesc,
            fields: editingFields,
            updated_at: new Date().toISOString(),
          })
          .eq('id', template.id)
      } else {
        await supabase
          .from('icp_form_templates')
          .insert({
            name: templateName || 'ICP Padrão',
            description: templateDesc,
            fields: editingFields,
            is_active: true,
          })
      }
      setHasChanges(false)
      await loadTemplate()
    } catch (error) {
      console.error('Error saving template:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // ============================================================
  // DASHBOARD ANALYTICS
  // ============================================================
  const analytics = useMemo(() => {
    if (!responses.length || !template?.fields) return null

    const totalResponses = responses.length
    const fieldAnalytics: Record<string, any> = {}

    template.fields.forEach((field) => {
      const values = responses
        .map((r) => r.responses[field.id])
        .filter((v) => v !== undefined && v !== null && v !== '')

      if (field.type === 'select' || field.type === 'multiselect') {
        const counts: Record<string, number> = {}
        values.forEach((v) => {
          if (Array.isArray(v)) {
            v.forEach((item: string) => {
              counts[item] = (counts[item] || 0) + 1
            })
          } else {
            counts[v] = (counts[v] || 0) + 1
          }
        })
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
        fieldAnalytics[field.id] = {
          type: 'distribution',
          label: field.label,
          total: values.length,
          distribution: sorted,
          topAnswer: sorted[0]?.[0] || 'N/A',
        }
      } else if (field.type === 'number') {
        const nums = values.map(Number).filter((n) => !isNaN(n))
        fieldAnalytics[field.id] = {
          type: 'numeric',
          label: field.label,
          total: nums.length,
          average: nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : 0,
          min: nums.length ? Math.min(...nums) : 0,
          max: nums.length ? Math.max(...nums) : 0,
        }
      } else {
        // Text fields - word cloud-like analysis
        const wordCounts: Record<string, number> = {}
        values.forEach((v: string) => {
          const words = v.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3)
          words.forEach((w: string) => {
            wordCounts[w] = (wordCounts[w] || 0) + 1
          })
        })
        const topWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
        fieldAnalytics[field.id] = {
          type: 'text',
          label: field.label,
          total: values.length,
          topKeywords: topWords,
          sampleAnswers: values.slice(0, 3),
        }
      }
    })

    return { totalResponses, fieldAnalytics }
  }, [responses, template])

  // ============================================================
  // FILTERED RESPONSES
  // ============================================================
  const filteredResponses = useMemo(() => {
    if (!searchTerm) return responses
    const term = searchTerm.toLowerCase()
    return responses.filter((r) => {
      const name = r.mentorado?.nome?.toLowerCase() || ''
      const email = r.mentorado?.email?.toLowerCase() || ''
      const vals = Object.values(r.responses).join(' ').toLowerCase()
      return name.includes(term) || email.includes(term) || vals.includes(term)
    })
  }, [responses, searchTerm])

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-amber-400" />
          <p className="text-white/60">Carregando sistema ICP...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/20">
                <Brain className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
                  ICP — Perfil do Cliente Ideal
                </h1>
                <p className="text-sm text-white/40 mt-0.5">
                  Configure, visualize e analise o perfil dos seus mentorados
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1">
                {responses.length} respostas
              </Badge>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 bg-white/5 rounded-xl p-1">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { key: 'responses', label: 'Respostas', icon: Eye },
              { key: 'builder', label: 'Formulário', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/20 shadow-lg shadow-amber-500/5'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <DashboardTab analytics={analytics} responses={responses} template={template} />
        )}

        {/* RESPONSES TAB */}
        {activeTab === 'responses' && (
          <ResponsesTab
            responses={filteredResponses}
            template={template}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            expandedResponse={expandedResponse}
            setExpandedResponse={setExpandedResponse}
          />
        )}

        {/* BUILDER TAB */}
        {activeTab === 'builder' && (
          <BuilderTab
            fields={editingFields}
            templateName={templateName}
            templateDesc={templateDesc}
            setTemplateName={setTemplateName}
            setTemplateDesc={setTemplateDesc}
            addField={addField}
            updateField={updateField}
            removeField={removeField}
            moveField={moveField}
            addOption={addOption}
            updateOption={updateOption}
            removeOption={removeOption}
            saveTemplate={saveTemplate}
            isSaving={isSaving}
            hasChanges={hasChanges}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================
// DASHBOARD TAB COMPONENT
// ============================================================
function DashboardTab({
  analytics,
  responses,
  template,
}: {
  analytics: any
  responses: ICPResponse[]
  template: ICPTemplate | null
}) {
  if (!analytics || !template) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
          <BarChart3 className="w-10 h-10 text-white/20" />
        </div>
        <h3 className="text-xl font-semibold text-white/60 mb-2">Sem dados ainda</h3>
        <p className="text-white/30 text-center max-w-md">
          Quando mentorados responderem o formulário ICP, os dados aparecerão aqui com análises e gráficos.
        </p>
      </div>
    )
  }

  const { totalResponses, fieldAnalytics } = analytics

  // Color palette for charts
  const COLORS = [
    'from-amber-500 to-orange-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-purple-500 to-pink-500',
    'from-rose-500 to-red-500',
    'from-indigo-500 to-violet-500',
    'from-lime-500 to-green-500',
    'from-fuchsia-500 to-pink-500',
  ]

  const BAR_COLORS = [
    'bg-amber-400',
    'bg-blue-400',
    'bg-emerald-400',
    'bg-purple-400',
    'bg-rose-400',
    'bg-indigo-400',
    'bg-lime-400',
    'bg-fuchsia-400',
    'bg-cyan-400',
    'bg-orange-400',
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/10 backdrop-blur-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-300/60 uppercase tracking-wider font-medium">Total Respostas</p>
                <p className="text-3xl font-bold text-amber-300 mt-1">{totalResponses}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/10 backdrop-blur-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-300/60 uppercase tracking-wider font-medium">Campos no Form</p>
                <p className="text-3xl font-bold text-emerald-300 mt-1">{template?.fields?.length || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top nicho */}
        {fieldAnalytics['nicho'] && (
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/10 backdrop-blur-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-300/60 uppercase tracking-wider font-medium">Top Nicho</p>
                  <p className="text-lg font-bold text-blue-300 mt-1 truncate">
                    {fieldAnalytics['nicho']?.topKeywords?.[0]?.[0] || 'N/A'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top faturamento */}
        {fieldAnalytics['faturamento_atual'] && (
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/10 backdrop-blur-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-300/60 uppercase tracking-wider font-medium">Top Faturamento</p>
                  <p className="text-sm font-bold text-purple-300 mt-1 truncate">
                    {fieldAnalytics['faturamento_atual']?.topAnswer || 'N/A'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Field Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(fieldAnalytics).map(([fieldId, data]: [string, any], idx) => {
          if (data.type === 'distribution') {
            return (
              <Card key={fieldId} className="bg-white/[0.02] border-white/5 backdrop-blur-xl overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-white/80 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-amber-400/60" />
                    {data.label}
                    <Badge variant="outline" className="ml-auto text-xs border-white/10 text-white/40">
                      {data.total} respostas
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-5">
                  <div className="space-y-3">
                    {data.distribution.slice(0, 8).map(([label, count]: [string, number], i: number) => {
                      const pct = ((count / data.total) * 100).toFixed(0)
                      return (
                        <div key={label} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-white/70 truncate max-w-[200px]">{label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-white/40 text-xs">{count}x</span>
                              <span className="text-white/90 font-semibold w-12 text-right">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]} transition-all duration-700`}
                              style={{ width: `${pct}%`, opacity: 0.8 }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          }

          if (data.type === 'text') {
            return (
              <Card key={fieldId} className="bg-white/[0.02] border-white/5 backdrop-blur-xl overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-white/80 flex items-center gap-2">
                    <AlignLeft className="w-4 h-4 text-amber-400/60" />
                    {data.label}
                    <Badge variant="outline" className="ml-auto text-xs border-white/10 text-white/40">
                      {data.total} respostas
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-5">
                  {data.topKeywords.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Palavras-chave mais frequentes</p>
                      <div className="flex flex-wrap gap-2">
                        {data.topKeywords.map(([word, count]: [string, number], i: number) => (
                          <Badge
                            key={word}
                            className={`${
                              i === 0
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/20'
                                : 'bg-white/5 text-white/50 border-white/10'
                            } text-xs`}
                          >
                            {word} ({count})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.sampleAnswers.length > 0 && (
                    <div>
                      <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Exemplos de respostas</p>
                      <div className="space-y-2">
                        {data.sampleAnswers.map((answer: string, i: number) => (
                          <div key={i} className="text-sm text-white/50 bg-white/5 rounded-lg px-3 py-2 line-clamp-2">
                            &ldquo;{answer}&rdquo;
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          }

          if (data.type === 'numeric') {
            return (
              <Card key={fieldId} className="bg-white/[0.02] border-white/5 backdrop-blur-xl overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-white/80 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-amber-400/60" />
                    {data.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-5">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-white/5 rounded-xl">
                      <p className="text-xs text-white/30 mb-1">Média</p>
                      <p className="text-xl font-bold text-amber-300">{data.average}</p>
                    </div>
                    <div className="text-center p-3 bg-white/5 rounded-xl">
                      <p className="text-xs text-white/30 mb-1">Mínimo</p>
                      <p className="text-xl font-bold text-blue-300">{data.min}</p>
                    </div>
                    <div className="text-center p-3 bg-white/5 rounded-xl">
                      <p className="text-xs text-white/30 mb-1">Máximo</p>
                      <p className="text-xl font-bold text-emerald-300">{data.max}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}

// ============================================================
// RESPONSES TAB COMPONENT
// ============================================================
function ResponsesTab({
  responses,
  template,
  searchTerm,
  setSearchTerm,
  expandedResponse,
  setExpandedResponse,
}: {
  responses: ICPResponse[]
  template: ICPTemplate | null
  searchTerm: string
  setSearchTerm: (s: string) => void
  expandedResponse: string | null
  setExpandedResponse: (id: string | null) => void
}) {
  if (!responses.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
          <Eye className="w-10 h-10 text-white/20" />
        </div>
        <h3 className="text-xl font-semibold text-white/60 mb-2">Nenhuma resposta ainda</h3>
        <p className="text-white/30 text-center max-w-md">
          Quando mentorados preencherem o formulário ICP, as respostas aparecerão aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome, email ou resposta..."
          className="pl-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11"
        />
      </div>

      {/* Response Cards */}
      <div className="space-y-3">
        {responses.map((response) => {
          const isExpanded = expandedResponse === response.id
          return (
            <Card
              key={response.id}
              className="bg-white/[0.02] border-white/5 backdrop-blur-xl overflow-hidden hover:border-amber-500/10 transition-colors"
            >
              <div
                className="p-4 cursor-pointer flex items-center justify-between"
                onClick={() => setExpandedResponse(isExpanded ? null : response.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/10">
                    <span className="text-sm font-bold text-amber-300">
                      {response.mentorado?.nome?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-white/90">
                      {response.mentorado?.nome || 'Mentorado não encontrado'}
                    </p>
                    <p className="text-xs text-white/40">
                      {response.mentorado?.email} · {new Date(response.completed_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Completo
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-white/30" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white/30" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {template?.fields?.map((field) => {
                      const value = response.responses[field.id]
                      if (!value) return null
                      return (
                        <div key={field.id} className="space-y-1">
                          <p className="text-xs text-amber-300/60 uppercase tracking-wider font-medium">{field.label}</p>
                          <div className="text-sm text-white/80 bg-white/5 rounded-lg px-3 py-2">
                            {Array.isArray(value) ? (
                              <div className="flex flex-wrap gap-1">
                                {value.map((v: string) => (
                                  <Badge key={v} className="bg-white/10 text-white/70 border-white/10 text-xs">
                                    {v}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              String(value)
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// BUILDER TAB COMPONENT
// ============================================================
function BuilderTab({
  fields,
  templateName,
  templateDesc,
  setTemplateName,
  setTemplateDesc,
  addField,
  updateField,
  removeField,
  moveField,
  addOption,
  updateOption,
  removeOption,
  saveTemplate,
  isSaving,
  hasChanges,
}: {
  fields: ICPField[]
  templateName: string
  templateDesc: string
  setTemplateName: (s: string) => void
  setTemplateDesc: (s: string) => void
  addField: () => void
  updateField: (index: number, updates: Partial<ICPField>) => void
  removeField: (index: number) => void
  moveField: (index: number, direction: 'up' | 'down') => void
  addOption: (fieldIndex: number) => void
  updateOption: (fieldIndex: number, optionIndex: number, value: string) => void
  removeOption: (fieldIndex: number, optionIndex: number) => void
  saveTemplate: () => void
  isSaving: boolean
  hasChanges: boolean
}) {
  return (
    <div className="space-y-6">
      {/* Save Banner */}
      {hasChanges && (
        <div className="sticky top-[140px] z-20 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between backdrop-blur-xl">
          <div className="flex items-center gap-2 text-amber-300">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Você tem alterações não salvas</span>
          </div>
          <Button
            onClick={saveTemplate}
            disabled={isSaving}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            size="sm"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
        </div>
      )}

      {/* Template Info */}
      <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base text-white/80 flex items-center gap-2">
            <Settings className="w-4 h-4 text-amber-400/60" />
            Configurações do Formulário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1.5 block">
              Nome do Formulário
            </label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Ex: ICP Padrão"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1.5 block">
              Descrição
            </label>
            <Input
              value={templateDesc}
              onChange={(e) => setTemplateDesc(e.target.value)}
              placeholder="Descreva o propósito deste formulário..."
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Fields */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
            Campos ({fields.length})
          </h3>
          <Button onClick={addField} size="sm" className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20">
            <Plus className="w-4 h-4 mr-1" />
            Adicionar Campo
          </Button>
        </div>

        {fields.map((field, index) => (
          <Card key={field.id} className="bg-white/[0.02] border-white/5 backdrop-blur-xl group hover:border-amber-500/10 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Drag handle & order controls */}
                <div className="flex flex-col items-center gap-1 pt-1">
                  <button
                    onClick={() => moveField(index, 'up')}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 disabled:opacity-20"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-white/20 font-mono">{index + 1}</span>
                  <button
                    onClick={() => moveField(index, 'down')}
                    disabled={index === fields.length - 1}
                    className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 disabled:opacity-20"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Field Config */}
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Label */}
                    <div className="md:col-span-2">
                      <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">Pergunta</label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        placeholder="Ex: Qual seu nicho?"
                        className="bg-white/5 border-white/10 text-white text-sm"
                      />
                    </div>

                    {/* Type */}
                    <div>
                      <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">Tipo</label>
                      <select
                        value={field.type}
                        onChange={(e) => {
                          const newType = e.target.value as ICPField['type']
                          const updates: Partial<ICPField> = { type: newType }
                          if ((newType === 'select' || newType === 'multiselect') && !field.options) {
                            updates.options = ['']
                          }
                          updateField(index, updates)
                        }}
                        className="w-full h-9 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50"
                      >
                        {FIELD_TYPES.map((ft) => (
                          <option key={ft.value} value={ft.value} className="bg-gray-900">
                            {ft.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Placeholder */}
                  {(field.type === 'text' || field.type === 'textarea' || field.type === 'number') && (
                    <div>
                      <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">Placeholder</label>
                      <Input
                        value={field.placeholder || ''}
                        onChange={(e) => updateField(index, { placeholder: e.target.value })}
                        placeholder="Texto de exemplo..."
                        className="bg-white/5 border-white/10 text-white text-sm"
                      />
                    </div>
                  )}

                  {/* Options for select/multiselect */}
                  {(field.type === 'select' || field.type === 'multiselect') && (
                    <div>
                      <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">Opções</label>
                      <div className="space-y-2">
                        {(field.options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span className="text-xs text-white/20 w-5 text-center">{optIdx + 1}</span>
                            <Input
                              value={opt}
                              onChange={(e) => updateOption(index, optIdx, e.target.value)}
                              placeholder={`Opção ${optIdx + 1}`}
                              className="bg-white/5 border-white/10 text-white text-sm flex-1"
                            />
                            <button
                              onClick={() => removeOption(index, optIdx)}
                              className="p-1.5 rounded hover:bg-red-500/10 text-white/20 hover:text-red-400"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <Button
                          onClick={() => addOption(index)}
                          variant="outline"
                          size="sm"
                          className="text-white/40 border-white/10 hover:bg-white/5 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Adicionar Opção
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Required toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateField(index, { required: !field.required })}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {field.required ? (
                        <ToggleRight className="w-5 h-5 text-amber-400" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-white/30" />
                      )}
                      <span className={field.required ? 'text-amber-300' : 'text-white/30'}>
                        Obrigatório
                      </span>
                    </button>
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => removeField(index)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}

        {fields.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/10 rounded-2xl">
            <FileText className="w-10 h-10 text-white/10 mb-3" />
            <p className="text-white/30 text-sm mb-3">Nenhum campo configurado</p>
            <Button onClick={addField} size="sm" className="bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <Plus className="w-4 h-4 mr-1" />
              Criar Primeiro Campo
            </Button>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={saveTemplate}
          disabled={isSaving}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold px-8"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Formulário
        </Button>
      </div>
    </div>
  )
}
