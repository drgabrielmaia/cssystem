'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'
import { useOrganization } from '@/hooks/use-organization'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, Trash2, Eye, Edit, Copy, ExternalLink, Type, Phone, Mail,
  Building, User, FileText, Hash, Calendar, CheckSquare, Radio, List,
  Palette, GripVertical, Save, ArrowLeft, Smartphone, Monitor,
  Star, Image, Link, ChevronDown, ChevronUp, Settings2, Zap,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────
interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'rating'
  label: string
  name: string
  required: boolean
  options?: string[]
  placeholder?: string
  mapToLead?: string
  scoring?: {
    enabled: boolean
    points?: number
    optionScores?: { [key: string]: number }
  }
}

interface FormStyle {
  primaryColor: string
  backgroundColor: string
  textColor: string
  cardColor: string
  borderRadius: string
  fontFamily: string
  logoUrl?: string
  backgroundPattern?: string
}

interface FormTemplate {
  id?: string
  name: string
  description: string
  slug: string
  form_type: 'lead' | 'nps' | 'survey' | 'feedback' | 'other'
  fields: FormField[]
  leadQualification?: {
    enabled: boolean
    frioCloserId?: string
    mornoCloserId?: string
    quenteCloserId?: string
    thresholdMorno?: number
    thresholdQuente?: number
    enableCalendar?: boolean
  }
  style?: FormStyle
  created_at?: string
  updated_at?: string
}

// ─── Constants ───────────────────────────────────────────────────────
const defaultStyle: FormStyle = {
  primaryColor: '#C13B3B',
  backgroundColor: '#FDF6EE',
  textColor: '#2D2D2D',
  cardColor: '#ffffff',
  borderRadius: '16',
  fontFamily: 'Inter',
}

const colorPresets = [
  { name: 'Vermelho', primary: '#C13B3B', bg: '#FDF6EE', text: '#2D2D2D' },
  { name: 'Azul', primary: '#3b82f6', bg: '#EFF6FF', text: '#1e293b' },
  { name: 'Verde', primary: '#10b981', bg: '#F0FDF4', text: '#1e293b' },
  { name: 'Roxo', primary: '#8b5cf6', bg: '#FAF5FF', text: '#1e293b' },
  { name: 'Rosa', primary: '#ec4899', bg: '#FDF2F8', text: '#1e293b' },
  { name: 'Laranja', primary: '#f97316', bg: '#FFF7ED', text: '#1e293b' },
  { name: 'Escuro', primary: '#6366f1', bg: '#1a1a2e', text: '#FFFFFF' },
  { name: 'Neutro', primary: '#6B7280', bg: '#F9FAFB', text: '#111827' },
]

const fieldTypes = [
  { value: 'text', label: 'Texto', icon: Type, desc: 'Campo de texto simples' },
  { value: 'email', label: 'Email', icon: Mail, desc: 'Email com validação' },
  { value: 'phone', label: 'Telefone', icon: Phone, desc: 'Campo de telefone' },
  { value: 'number', label: 'Número', icon: Hash, desc: 'Campo numérico' },
  { value: 'textarea', label: 'Texto Longo', icon: FileText, desc: 'Área de texto' },
  { value: 'select', label: 'Dropdown', icon: List, desc: 'Lista suspensa' },
  { value: 'radio', label: 'Seleção Única', icon: Radio, desc: 'Escolha uma opção' },
  { value: 'checkbox', label: 'Múltipla Escolha', icon: CheckSquare, desc: 'Várias opções' },
  { value: 'rating', label: 'Avaliação 1-10', icon: Star, desc: 'Escala horizontal' },
  { value: 'date', label: 'Data', icon: Calendar, desc: 'Seletor de data' },
]

const leadFields = [
  { value: 'none', label: 'Não mapear' },
  { value: 'nome_completo', label: 'Nome Completo' },
  { value: 'email', label: 'Email' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'cargo', label: 'Cargo' },
]

const formTypes = [
  { value: 'lead', label: 'Captura de Lead', icon: '🎯' },
  { value: 'nps', label: 'Pesquisa NPS', icon: '📊' },
  { value: 'survey', label: 'Pesquisa', icon: '📋' },
  { value: 'feedback', label: 'Feedback', icon: '💭' },
  { value: 'other', label: 'Outro', icon: '📝' },
]

// ─── Sortable Field Component ────────────────────────────────────────
function SortableField({
  field,
  onUpdate,
  onRemove,
  onDuplicate,
}: {
  field: FormField
  onUpdate: (id: string, updates: Partial<FormField>) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-[#1a1a1e] border border-white/[0.06] rounded-xl overflow-hidden transition-all ${isDragging ? 'z-50 shadow-2xl ring-2 ring-emerald-500/30' : ''}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing text-gray-600 hover:text-gray-400 transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
          {fieldTypes.find(t => t.value === field.type)?.label}
        </Badge>
        <span className="text-sm font-medium text-white flex-1 truncate">{field.label}</span>
        {field.required && (
          <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">Obrigatório</Badge>
        )}
        {field.scoring?.enabled && (
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">Pontuado</Badge>
        )}
        <div className="flex items-center gap-1">
          <button onClick={() => onDuplicate(field.id)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onRemove(field.id)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded config */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-400 mb-1 block">Rótulo</Label>
              <Input
                value={field.label}
                onChange={e => onUpdate(field.id, { label: e.target.value })}
                className="bg-[#141418] border-white/[0.06] text-white text-sm h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-400 mb-1 block">Nome do campo</Label>
              <Input
                value={field.name}
                onChange={e => onUpdate(field.id, { name: e.target.value })}
                className="bg-[#141418] border-white/[0.06] text-white text-sm h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-400 mb-1 block">Placeholder</Label>
              <Input
                value={field.placeholder || ''}
                onChange={e => onUpdate(field.id, { placeholder: e.target.value })}
                className="bg-[#141418] border-white/[0.06] text-white text-sm h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-400 mb-1 block">Mapear para Lead</Label>
              <Select value={field.mapToLead || 'none'} onValueChange={v => onUpdate(field.id, { mapToLead: v })}>
                <SelectTrigger className="bg-[#141418] border-white/[0.06] text-white text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1e] border-white/[0.06]">
                  {leadFields.map(lf => (
                    <SelectItem key={lf.value} value={lf.value} className="text-white hover:bg-white/5">{lf.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Options for select/radio/checkbox */}
          {(['select', 'radio', 'checkbox'].includes(field.type)) && (
            <div>
              <Label className="text-xs text-gray-400 mb-2 block">Opções</Label>
              <div className="space-y-2">
                {field.options?.map((option, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={e => {
                        const newOpts = [...(field.options || [])]
                        newOpts[i] = e.target.value
                        onUpdate(field.id, { options: newOpts })
                      }}
                      className="bg-[#141418] border-white/[0.06] text-white text-sm h-9"
                    />
                    <button
                      onClick={() => onUpdate(field.id, { options: field.options?.filter((_, idx) => idx !== i) })}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => onUpdate(field.id, { options: [...(field.options || []), `Opção ${(field.options?.length || 0) + 1}`] })}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar opção
                </button>
              </div>
            </div>
          )}

          {/* Rating options */}
          {field.type === 'rating' && (
            <div>
              <Label className="text-xs text-gray-400 mb-2 block">Valores da escala</Label>
              <div className="flex flex-wrap gap-2">
                {(field.options || ['1','2','3','4','5','6','7','8','9','10']).map((val, i) => (
                  <div key={i} className="w-10 h-10 rounded-lg bg-[#141418] border border-white/[0.06] flex items-center justify-center text-sm text-white font-medium">
                    {val}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Escala padrão 1-10. Para personalizar, edite as opções.</p>
            </div>
          )}

          {/* Scoring */}
          <div className="border-t border-white/[0.06] pt-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs text-gray-400">Pontuação</Label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.scoring?.enabled || false}
                  onChange={e => onUpdate(field.id, {
                    scoring: { enabled: e.target.checked, points: field.scoring?.points || 10, optionScores: field.scoring?.optionScores || {} }
                  })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>

            {field.scoring?.enabled && (
              <div className="space-y-3 bg-blue-500/5 border border-blue-500/10 p-3 rounded-xl">
                {!['select', 'radio', 'checkbox', 'rating'].includes(field.type) ? (
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-blue-300 whitespace-nowrap">Pontos por resposta</Label>
                    <Input
                      type="number"
                      value={field.scoring?.points || 10}
                      onChange={e => onUpdate(field.id, { scoring: { ...field.scoring!, points: Number(e.target.value) } })}
                      className="bg-[#141418] border-white/[0.06] text-white text-sm h-8 w-20"
                      min={0} max={100}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs text-blue-300">Pontuação por opção</Label>
                    {(field.options || (field.type === 'rating' ? ['1','2','3','4','5','6','7','8','9','10'] : [])).map((option, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 truncate flex-1">{option}</span>
                        <Input
                          type="number"
                          value={field.scoring?.optionScores?.[option] || 0}
                          onChange={e => onUpdate(field.id, {
                            scoring: { ...field.scoring!, optionScores: { ...field.scoring?.optionScores, [option]: Number(e.target.value) } }
                          })}
                          className="bg-[#141418] border-white/[0.06] text-white text-sm h-8 w-16"
                          min={0} max={100}
                        />
                        <span className="text-xs text-gray-500">pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Required toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-gray-400">Campo obrigatório</Label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={field.required}
                onChange={e => onUpdate(field.id, { required: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────
export default function FormBuilderPage() {
  const { user } = useAuth()
  const { organization } = useOrganization(user?.id || null)
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [currentTemplate, setCurrentTemplate] = useState<FormTemplate>({
    name: '', description: '', slug: '', form_type: 'lead', fields: [], style: defaultStyle,
  })
  const [showEditor, setShowEditor] = useState(false)
  const [loading, setLoading] = useState(true)
  const [closers, setClosers] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('fields')
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ─── Data fetching ─────────────────────────────────────────────────
  useEffect(() => {
    if (organization?.id) {
      fetchTemplates()
      fetchClosers()
    }
  }, [organization?.id])

  const fetchTemplates = async () => {
    if (!organization?.id) return
    try {
      const { data } = await supabase
        .from('form_templates').select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
      setTemplates(data || [])
    } catch {} finally {
      setLoading(false)
    }
  }

  const fetchClosers = async () => {
    if (!organization?.id) return
    try {
      const { data } = await supabase
        .from('closers').select('id, nome_completo, status_contrato')
        .eq('ativo', true).eq('organization_id', organization.id)
      setClosers(data || [])
    } catch {}
  }

  // ─── Template operations ───────────────────────────────────────────
  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()

  const addField = (type: string) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: type as any,
      label: `${fieldTypes.find(f => f.value === type)?.label} ${currentTemplate.fields.length + 1}`,
      name: `field_${currentTemplate.fields.length + 1}`,
      required: false,
      placeholder: '',
      mapToLead: 'none',
    }
    if (['select', 'radio', 'checkbox'].includes(type)) {
      newField.options = ['Opção 1', 'Opção 2']
    }
    if (type === 'rating') {
      newField.options = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
    }
    setCurrentTemplate(prev => ({ ...prev, fields: [...prev.fields, newField] }))
  }

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setCurrentTemplate(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f),
    }))
  }

  const removeField = (fieldId: string) => {
    setCurrentTemplate(prev => ({ ...prev, fields: prev.fields.filter(f => f.id !== fieldId) }))
  }

  const duplicateField = (fieldId: string) => {
    const field = currentTemplate.fields.find(f => f.id === fieldId)
    if (field) {
      setCurrentTemplate(prev => ({
        ...prev,
        fields: [...prev.fields, { ...field, id: `field_${Date.now()}`, name: `${field.name}_copy` }],
      }))
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      setCurrentTemplate(prev => {
        const oldIndex = prev.fields.findIndex(f => f.id === active.id)
        const newIndex = prev.fields.findIndex(f => f.id === over?.id)
        return { ...prev, fields: arrayMove(prev.fields, oldIndex, newIndex) }
      })
    }
  }

  const saveTemplate = async () => {
    if (!organization?.id) return alert('Organização não identificada')
    if (!currentTemplate.name.trim()) return alert('Nome do formulário é obrigatório')

    try {
      const slug = currentTemplate.slug?.trim() || generateSlug(currentTemplate.name)
      const { leadQualification, ...rest } = currentTemplate
      const templateData = {
        name: rest.name, description: rest.description, slug,
        form_type: rest.form_type, fields: rest.fields, style: rest.style,
        lead_qualification: leadQualification || null,
        organization_id: organization.id,
        updated_at: new Date().toISOString(),
      }

      let result
      if (currentTemplate.id) {
        result = await supabase.from('form_templates').update(templateData)
          .eq('id', currentTemplate.id).eq('organization_id', organization.id).select()
      } else {
        result = await supabase.from('form_templates')
          .insert([{ ...templateData, created_at: new Date().toISOString() }]).select()
      }

      if (result.error) return alert('Erro ao salvar formulário')
      alert('Formulário salvo com sucesso!')
      await fetchTemplates()
      setShowEditor(false)
      resetEditor()
    } catch {
      alert('Erro inesperado')
    }
  }

  const resetEditor = () => {
    setCurrentTemplate({ name: '', description: '', slug: '', form_type: 'lead', fields: [], style: defaultStyle })
    setActiveTab('fields')
  }

  const editTemplate = (t: any) => {
    setCurrentTemplate({
      id: t.id, name: t.name, description: t.description, slug: t.slug,
      form_type: t.form_type, fields: t.fields || [],
      leadQualification: t.lead_qualification || undefined,
      style: t.style || defaultStyle,
    })
    setShowEditor(true)
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este formulário?')) return
    await supabase.from('form_templates').delete().eq('id', id)
    await fetchTemplates()
  }

  const updateStyle = (updates: Partial<FormStyle>) => {
    setCurrentTemplate(prev => ({ ...prev, style: { ...prev.style, ...updates } as FormStyle }))
  }

  // ─── Preview Component ─────────────────────────────────────────────
  const FormPreview = () => {
    const st = currentTemplate.style || defaultStyle
    const accent = st.primaryColor
    const bg = st.backgroundColor
    const txt = st.textColor
    const logo = st.logoUrl

    return (
      <div
        className={`rounded-2xl overflow-hidden transition-all duration-300 ${
          previewMode === 'mobile' ? 'max-w-[320px] mx-auto' : 'w-full'
        }`}
        style={{ backgroundColor: bg, color: txt, fontFamily: st.fontFamily || 'Inter', minHeight: '500px' }}
      >
        {/* Dot pattern */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />

        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ backgroundColor: accent }} />

        {/* Logo */}
        <div className="px-5 py-4 relative z-10">
          {logo ? (
            <img src={logo} alt="" className="h-8 object-contain" />
          ) : (
            <span className="text-xs font-medium opacity-40">{currentTemplate.name || 'Preview'}</span>
          )}
        </div>

        {/* Fields */}
        <div className="px-5 pb-6 space-y-6 relative z-10">
          {currentTemplate.fields.length === 0 ? (
            <div className="text-center py-12 opacity-30">
              <FileText className="h-10 w-10 mx-auto mb-2" />
              <p className="text-sm">Adicione campos ao formulário</p>
            </div>
          ) : (
            currentTemplate.fields.map((field, index) => (
              <div key={field.id}>
                <span className="text-xs font-bold opacity-40 mb-1 block">{index + 1}.</span>
                <p className="font-bold text-base mb-1">
                  {field.label}
                  {field.required && <span style={{ color: accent }} className="ml-1">*</span>}
                </p>
                {field.placeholder && <p className="text-xs opacity-50 mb-3">{field.placeholder}</p>}

                {/* Field preview */}
                {field.type === 'rating' ? (
                  <div className="flex gap-1.5 flex-wrap">
                    {(field.options || ['1','2','3','4','5','6','7','8','9','10']).map((v, i) => (
                      <div
                        key={i}
                        className="w-9 h-9 rounded-lg border-2 flex items-center justify-center text-xs font-bold"
                        style={{ borderColor: i === 0 ? accent : '#E5E7EB', backgroundColor: i === 0 ? accent : 'white', color: i === 0 ? '#fff' : txt }}
                      >
                        {v}
                      </div>
                    ))}
                  </div>
                ) : field.type === 'radio' ? (
                  <div className="space-y-2">
                    {field.options?.map((opt, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 border-2 rounded-xl" style={{ borderColor: i === 0 ? accent : '#E5E7EB' }}>
                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: i === 0 ? accent : '#9CA3AF' }}>
                          {i === 0 && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent }} />}
                        </div>
                        <span className="text-sm font-medium">{opt}</span>
                      </div>
                    ))}
                  </div>
                ) : field.type === 'checkbox' ? (
                  <div className="space-y-2">
                    {field.options?.map((opt, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 border-2 rounded-xl" style={{ borderColor: '#E5E7EB' }}>
                        <div className="w-4 h-4 rounded border-2" style={{ borderColor: '#9CA3AF' }} />
                        <span className="text-sm font-medium">{opt}</span>
                      </div>
                    ))}
                  </div>
                ) : field.type === 'textarea' ? (
                  <div className="w-full h-20 border-2 rounded-xl" style={{ borderColor: '#E5E7EB' }} />
                ) : field.type === 'select' ? (
                  <div className="w-full h-10 border-2 rounded-xl px-3 flex items-center text-sm opacity-50" style={{ borderColor: '#E5E7EB' }}>
                    Selecione...
                  </div>
                ) : (
                  <div className="w-full border-0 border-b-2 pb-2" style={{ borderColor: '#D1D5DB' }} />
                )}
              </div>
            ))
          )}

          {/* Submit button preview */}
          {currentTemplate.fields.length > 0 && (
            <div className="pt-2">
              <div
                className="px-6 py-3 rounded-xl text-white text-sm font-semibold inline-block"
                style={{ backgroundColor: accent, borderRadius: `${st.borderRadius}px` }}
              >
                Responder
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c]">
        <Header title="Form Builder" />
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
        </div>
      </div>
    )
  }

  // ─── Editor View ───────────────────────────────────────────────────
  if (showEditor) {
    return (
      <div className="min-h-screen bg-[#0a0a0c]">
        <Header title="Form Builder" />

        {/* Toolbar */}
        <div className="border-b border-white/[0.06] bg-[#141418] sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEditor(false)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
              <div className="h-5 w-px bg-white/[0.06]" />
              <h2 className="text-sm font-semibold text-white truncate max-w-[200px]">
                {currentTemplate.name || 'Novo Formulário'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#1a1a1e] rounded-lg p-0.5">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-1.5 rounded-md transition-all ${previewMode === 'desktop' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-400'}`}
                >
                  <Monitor className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-1.5 rounded-md transition-all ${previewMode === 'mobile' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-400'}`}
                >
                  <Smartphone className="h-4 w-4" />
                </button>
              </div>
              <Button onClick={saveTemplate} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-8 px-4">
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Salvar
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editor Panel */}
            <div className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-[#1a1a1e] border border-white/[0.06] p-1 rounded-xl w-full grid grid-cols-4">
                  <TabsTrigger value="config" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-500 text-xs rounded-lg">Config</TabsTrigger>
                  <TabsTrigger value="fields" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-500 text-xs rounded-lg">Campos</TabsTrigger>
                  <TabsTrigger value="scoring" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-500 text-xs rounded-lg">Score</TabsTrigger>
                  <TabsTrigger value="style" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-500 text-xs rounded-lg">Visual</TabsTrigger>
                </TabsList>

                {/* Config Tab */}
                <TabsContent value="config" className="space-y-4 mt-4">
                  <div className="bg-[#1a1a1e] border border-white/[0.06] rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-white">Informações Básicas</h3>
                    <div>
                      <Label className="text-xs text-gray-400 mb-1 block">Nome do Formulário</Label>
                      <Input
                        value={currentTemplate.name}
                        onChange={e => {
                          const name = e.target.value
                          setCurrentTemplate(prev => ({
                            ...prev, name,
                            slug: prev.slug ? prev.slug : generateSlug(name),
                          }))
                        }}
                        placeholder="Ex: Formulário de Contato"
                        className="bg-[#141418] border-white/[0.06] text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400 mb-1 block">Descrição</Label>
                      <Textarea
                        value={currentTemplate.description}
                        onChange={e => setCurrentTemplate(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Breve descrição do formulário"
                        rows={3}
                        className="bg-[#141418] border-white/[0.06] text-white resize-none"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400 mb-1 block">Slug (URL)</Label>
                      <Input
                        value={currentTemplate.slug}
                        onChange={e => setCurrentTemplate(prev => ({ ...prev, slug: e.target.value }))}
                        placeholder="exemplo-formulario"
                        className="bg-[#141418] border-white/[0.06] text-white"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/forms/{currentTemplate.slug || 'seu-slug'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400 mb-1 block">Tipo</Label>
                      <Select
                        value={currentTemplate.form_type}
                        onValueChange={v => setCurrentTemplate(prev => ({ ...prev, form_type: v as any }))}
                      >
                        <SelectTrigger className="bg-[#141418] border-white/[0.06] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1e] border-white/[0.06]">
                          {formTypes.map(t => (
                            <SelectItem key={t.value} value={t.value} className="text-white hover:bg-white/5">
                              {t.icon} {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* Fields Tab */}
                <TabsContent value="fields" className="space-y-4 mt-4">
                  {/* Add field grid */}
                  <div className="bg-[#1a1a1e] border border-white/[0.06] rounded-xl p-4">
                    <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Adicionar Campo</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {fieldTypes.map(ft => {
                        const Icon = ft.icon
                        return (
                          <button
                            key={ft.value}
                            onClick={() => addField(ft.value)}
                            className="flex items-center gap-2.5 p-3 rounded-xl bg-[#141418] border border-white/[0.04] hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-left group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                              <Icon className="h-4 w-4 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-white">{ft.label}</p>
                              <p className="text-[10px] text-gray-500">{ft.desc}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Fields list */}
                  <div className="bg-[#1a1a1e] border border-white/[0.06] rounded-xl p-4">
                    <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                      Campos ({currentTemplate.fields.length})
                    </h3>
                    {currentTemplate.fields.length === 0 ? (
                      <div className="text-center py-10">
                        <FileText className="h-10 w-10 mx-auto mb-2 text-gray-700" />
                        <p className="text-sm text-gray-600">Nenhum campo adicionado</p>
                      </div>
                    ) : (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={currentTemplate.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2">
                            {currentTemplate.fields.map(field => (
                              <SortableField
                                key={field.id}
                                field={field}
                                onUpdate={updateField}
                                onRemove={removeField}
                                onDuplicate={duplicateField}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </TabsContent>

                {/* Scoring Tab */}
                <TabsContent value="scoring" className="space-y-4 mt-4">
                  <div className="bg-[#1a1a1e] border border-white/[0.06] rounded-xl p-5 space-y-5">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Qualificação de Leads</h3>
                      <p className="text-xs text-gray-500 mt-1">Pontue respostas e direcione para closers automaticamente</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-gray-300">Ativar Qualificação</Label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentTemplate.leadQualification?.enabled || false}
                          onChange={e => setCurrentTemplate(prev => ({
                            ...prev,
                            leadQualification: {
                              ...prev.leadQualification,
                              enabled: e.target.checked,
                              thresholdMorno: prev.leadQualification?.thresholdMorno || 40,
                              thresholdQuente: prev.leadQualification?.thresholdQuente || 70,
                              enableCalendar: prev.leadQualification?.enableCalendar ?? true,
                            },
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                      </label>
                    </div>

                    {currentTemplate.leadQualification?.enabled && (
                      <>
                        {/* Max score summary */}
                        <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                          <p className="text-xs text-blue-300 mb-1">Pontuação Máxima</p>
                          {(() => {
                            const scored = currentTemplate.fields.filter(f => f.scoring?.enabled)
                            const maxScore = scored.reduce((total, f) => {
                              if (['select', 'radio', 'checkbox', 'rating'].includes(f.type) && f.scoring?.optionScores) {
                                return total + Math.max(...Object.values(f.scoring.optionScores), 0)
                              }
                              return total + (f.scoring?.points || 0)
                            }, 0)
                            return (
                              <>
                                <p className="text-2xl font-bold text-blue-400">{maxScore} pts</p>
                                <p className="text-xs text-blue-400/60 mt-1">{scored.length} campo(s) pontuados de {currentTemplate.fields.length}</p>
                              </>
                            )
                          })()}
                        </div>

                        {/* Thresholds */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-yellow-400 mb-1 block">Limite Morno</Label>
                            <Input
                              type="number"
                              value={currentTemplate.leadQualification?.thresholdMorno || 40}
                              onChange={e => setCurrentTemplate(prev => ({
                                ...prev, leadQualification: { ...prev.leadQualification!, thresholdMorno: Number(e.target.value) },
                              }))}
                              className="bg-[#141418] border-white/[0.06] text-white" min={0} max={100}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-emerald-400 mb-1 block">Limite Quente</Label>
                            <Input
                              type="number"
                              value={currentTemplate.leadQualification?.thresholdQuente || 70}
                              onChange={e => setCurrentTemplate(prev => ({
                                ...prev, leadQualification: { ...prev.leadQualification!, thresholdQuente: Number(e.target.value) },
                              }))}
                              className="bg-[#141418] border-white/[0.06] text-white" min={0} max={100}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 text-[10px]">
                          <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400">Frio: 0-{(currentTemplate.leadQualification?.thresholdMorno || 40) - 1}</span>
                          <span className="px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-400">Morno: {currentTemplate.leadQualification?.thresholdMorno || 40}-{(currentTemplate.leadQualification?.thresholdQuente || 70) - 1}</span>
                          <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400">Quente: {currentTemplate.leadQualification?.thresholdQuente || 70}+</span>
                        </div>

                        {/* Closers */}
                        <div className="space-y-3">
                          <Label className="text-sm text-gray-300">Closer por Temperatura</Label>
                          {[
                            { key: 'frioCloserId', label: 'Frio', color: 'blue' },
                            { key: 'mornoCloserId', label: 'Morno', color: 'yellow' },
                            { key: 'quenteCloserId', label: 'Quente', color: 'emerald' },
                          ].map(({ key, label, color }) => (
                            <div key={key} className={`border rounded-xl p-3 border-${color}-500/20 bg-${color}-500/5`}>
                              <Label className={`text-xs text-${color}-400 mb-1 block`}>Closer {label}</Label>
                              <Select
                                value={(currentTemplate.leadQualification as any)?.[key] || ''}
                                onValueChange={v => setCurrentTemplate(prev => ({
                                  ...prev, leadQualification: { ...prev.leadQualification!, [key]: v },
                                }))}
                              >
                                <SelectTrigger className="bg-[#141418] border-white/[0.06] text-white text-sm h-9">
                                  <SelectValue placeholder={`Selecione closer ${label.toLowerCase()}`} />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a1e] border-white/[0.06]">
                                  {closers.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="text-white hover:bg-white/5">{c.nome_completo}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>

                        {/* Calendar toggle */}
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm text-gray-300">Agendamento Automático</Label>
                            <p className="text-xs text-gray-500">Redirecionar para agenda após envio</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={currentTemplate.leadQualification?.enableCalendar || false}
                              onChange={e => setCurrentTemplate(prev => ({
                                ...prev, leadQualification: { ...prev.leadQualification!, enableCalendar: e.target.checked },
                              }))}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>

                {/* Style Tab */}
                <TabsContent value="style" className="space-y-4 mt-4">
                  <div className="bg-[#1a1a1e] border border-white/[0.06] rounded-xl p-5 space-y-6">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Palette className="h-4 w-4 text-emerald-400" />
                      Personalização Visual
                    </h3>

                    {/* Logo URL */}
                    <div>
                      <Label className="text-xs text-gray-400 mb-2 block flex items-center gap-1.5">
                        <Image className="h-3.5 w-3.5" /> Logo (URL da imagem)
                      </Label>
                      <Input
                        value={currentTemplate.style?.logoUrl || ''}
                        onChange={e => updateStyle({ logoUrl: e.target.value } as any)}
                        placeholder="https://exemplo.com/logo.png"
                        className="bg-[#141418] border-white/[0.06] text-white text-sm"
                      />
                      {currentTemplate.style?.logoUrl && (
                        <div className="mt-2 p-3 bg-[#141418] rounded-lg">
                          <img src={currentTemplate.style.logoUrl} alt="" className="h-10 object-contain" />
                        </div>
                      )}
                    </div>

                    {/* Color presets */}
                    <div>
                      <Label className="text-xs text-gray-400 mb-2 block">Temas Prontos</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {colorPresets.map(preset => (
                          <button
                            key={preset.name}
                            onClick={() => updateStyle({ primaryColor: preset.primary, backgroundColor: preset.bg, textColor: preset.text })}
                            className="p-2.5 rounded-xl border border-white/[0.06] hover:border-white/20 transition-all text-center group"
                          >
                            <div className="flex items-center justify-center gap-1 mb-1.5">
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.primary }} />
                              <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: preset.bg }} />
                            </div>
                            <span className="text-[10px] text-gray-500 group-hover:text-gray-400">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom colors */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-400 mb-1 block">Cor Principal</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={currentTemplate.style?.primaryColor || '#C13B3B'}
                            onChange={e => updateStyle({ primaryColor: e.target.value })}
                            className="w-10 h-8 rounded-lg border border-white/[0.06] bg-transparent cursor-pointer"
                          />
                          <Input
                            value={currentTemplate.style?.primaryColor || '#C13B3B'}
                            onChange={e => updateStyle({ primaryColor: e.target.value })}
                            className="bg-[#141418] border-white/[0.06] text-white text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400 mb-1 block">Cor de Fundo</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={currentTemplate.style?.backgroundColor || '#FDF6EE'}
                            onChange={e => updateStyle({ backgroundColor: e.target.value })}
                            className="w-10 h-8 rounded-lg border border-white/[0.06] bg-transparent cursor-pointer"
                          />
                          <Input
                            value={currentTemplate.style?.backgroundColor || '#FDF6EE'}
                            onChange={e => updateStyle({ backgroundColor: e.target.value })}
                            className="bg-[#141418] border-white/[0.06] text-white text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400 mb-1 block">Cor do Texto</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={currentTemplate.style?.textColor || '#2D2D2D'}
                            onChange={e => updateStyle({ textColor: e.target.value })}
                            className="w-10 h-8 rounded-lg border border-white/[0.06] bg-transparent cursor-pointer"
                          />
                          <Input
                            value={currentTemplate.style?.textColor || '#2D2D2D'}
                            onChange={e => updateStyle({ textColor: e.target.value })}
                            className="bg-[#141418] border-white/[0.06] text-white text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Border radius */}
                    <div>
                      <Label className="text-xs text-gray-400 mb-1 block">Bordas</Label>
                      <Select
                        value={currentTemplate.style?.borderRadius || '16'}
                        onValueChange={v => updateStyle({ borderRadius: v })}
                      >
                        <SelectTrigger className="bg-[#141418] border-white/[0.06] text-white text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1e] border-white/[0.06]">
                          <SelectItem value="4" className="text-white hover:bg-white/5">Pouco arredondado</SelectItem>
                          <SelectItem value="8" className="text-white hover:bg-white/5">Médio</SelectItem>
                          <SelectItem value="12" className="text-white hover:bg-white/5">Arredondado</SelectItem>
                          <SelectItem value="16" className="text-white hover:bg-white/5">Bem arredondado</SelectItem>
                          <SelectItem value="24" className="text-white hover:bg-white/5">Muito arredondado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Font */}
                    <div>
                      <Label className="text-xs text-gray-400 mb-1 block">Fonte</Label>
                      <Select
                        value={currentTemplate.style?.fontFamily || 'Inter'}
                        onValueChange={v => updateStyle({ fontFamily: v })}
                      >
                        <SelectTrigger className="bg-[#141418] border-white/[0.06] text-white text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1e] border-white/[0.06]">
                          <SelectItem value="Inter" className="text-white hover:bg-white/5">Inter (Moderna)</SelectItem>
                          <SelectItem value="Arial" className="text-white hover:bg-white/5">Arial (Clássica)</SelectItem>
                          <SelectItem value="Georgia" className="text-white hover:bg-white/5">Georgia (Elegante)</SelectItem>
                          <SelectItem value="Roboto" className="text-white hover:bg-white/5">Roboto (Google)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Preview Panel */}
            <div className="lg:sticky lg:top-20 lg:self-start">
              <div className="bg-[#1a1a1e] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Preview</span>
                  <span className="text-xs text-gray-600">{previewMode === 'desktop' ? 'Desktop' : 'Mobile'}</span>
                </div>
                <div className="p-4 max-h-[70vh] overflow-y-auto">
                  <div className="relative">
                    <FormPreview />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Template List View ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      <Header title="Criador de Formulários" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Criador de Formulários</h1>
            <p className="text-gray-500 mt-1 text-sm">Crie formulários personalizados</p>
          </div>
          <Button onClick={() => setShowEditor(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Novo Formulário
          </Button>
        </div>

        {templates.length === 0 ? (
          <div className="bg-[#1a1a1e] border border-white/[0.06] rounded-2xl text-center py-16 px-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum formulário criado</h3>
            <p className="text-gray-500 mb-6 text-sm">Comece criando seu primeiro formulário personalizado</p>
            <Button onClick={() => setShowEditor(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Criar Formulário
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(t => (
              <div
                key={t.id}
                className="bg-[#1a1a1e] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{t.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{t.description || 'Sem descrição'}</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] ml-2 flex-shrink-0">
                    {formTypes.find(ft => ft.value === t.form_type)?.label}
                  </Badge>
                </div>

                <div className="flex items-center text-xs text-gray-600 mb-4">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  {t.fields?.length || 0} campos
                  {(t as any).lead_qualification?.enabled && (
                    <span className="ml-3 flex items-center">
                      <Zap className="h-3.5 w-3.5 mr-1 text-yellow-500" /> Score ativo
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => editTemplate(t)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all text-xs font-medium"
                  >
                    <Edit className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/forms/${t.slug}`)
                      alert('Link copiado!')
                    }}
                    className="p-2 rounded-lg bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white transition-all"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => window.open(`/forms/${t.slug}`, '_blank')}
                    className="p-2 rounded-lg bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white transition-all"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteTemplate(t.id!)}
                    className="p-2 rounded-lg bg-white/5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
