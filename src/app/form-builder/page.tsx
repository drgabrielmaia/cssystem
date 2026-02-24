'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { PageLayout } from '@/components/ui/page-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'
import { useOrganization } from '@/hooks/use-organization'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  Trash2,
  Eye,
  Edit,
  Settings,
  Copy,
  ExternalLink,
  Type,
  Phone,
  Mail,
  Building,
  User,
  FileText,
  Hash,
  Calendar,
  ToggleLeft,
  CheckSquare,
  Radio,
  List,
  Palette,
  GripVertical,
  Save,
  ArrowLeft,
  Smartphone,
  Monitor
} from 'lucide-react'

interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date'
  label: string
  name: string
  required: boolean
  options?: string[]
  placeholder?: string
  mapToLead?: string
  // Scoring system
  scoring?: {
    enabled: boolean
    points?: number
    optionScores?: { [key: string]: number } // Para select/radio
  }
}

interface FormStyle {
  primaryColor: string
  backgroundColor: string
  textColor: string
  cardColor: string
  borderRadius: string
  fontFamily: string
}

interface FormTemplate {
  id?: string
  name: string
  description: string
  slug: string
  form_type: 'lead' | 'nps' | 'survey' | 'feedback' | 'other'
  fields: FormField[]
  // Lead qualification settings
  leadQualification?: {
    enabled: boolean
    scoringConfigId?: string
    lowScoreCloserId?: string
    highScoreCloserId?: string
    threshold?: number
    enableCalendar?: boolean
  }
  style?: FormStyle
  created_at?: string
  updated_at?: string
}

const defaultStyle: FormStyle = {
  primaryColor: '#3b82f6',
  backgroundColor: '#f8fafc',
  textColor: '#1e293b',
  cardColor: '#ffffff',
  borderRadius: '12',
  fontFamily: 'Inter'
}

const colorPresets = [
  { name: 'Azul', primary: '#3b82f6', bg: '#f8fafc' },
  { name: 'Verde', primary: '#10b981', bg: '#f0fdf4' },
  { name: 'Roxo', primary: '#8b5cf6', bg: '#faf5ff' },
  { name: 'Rosa', primary: '#ec4899', bg: '#fdf2f8' },
  { name: 'Laranja', primary: '#f97316', bg: '#fff7ed' },
  { name: 'Vermelho', primary: '#ef4444', bg: '#fef2f2' },
]

export default function FormBuilderPage() {
  const { user } = useAuth()
  const { organization } = useOrganization(user?.id || null)
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [currentTemplate, setCurrentTemplate] = useState<FormTemplate>({
    name: '',
    description: '',
    slug: '',
    form_type: 'lead',
    fields: [],
    style: defaultStyle
  })
  const [showEditor, setShowEditor] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingField, setEditingField] = useState<FormField | null>(null)
  const [scoringConfigs, setScoringConfigs] = useState<any[]>([])
  const [closers, setClosers] = useState<any[]>([])
  const [showScoringSettings, setShowScoringSettings] = useState(false)
  const [activeTab, setActiveTab] = useState('fields')
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')

  // Drag and Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fieldTypes = [
    { value: 'text', label: 'Texto', icon: Type, description: 'Campo de texto simples' },
    { value: 'email', label: 'Email', icon: Mail, description: 'Campo de email com validação' },
    { value: 'phone', label: 'Telefone', icon: Phone, description: 'Campo de telefone' },
    { value: 'number', label: 'Número', icon: Hash, description: 'Campo numérico' },
    { value: 'textarea', label: 'Texto Longo', icon: FileText, description: 'Área de texto multilinha' },
    { value: 'select', label: 'Lista Suspensa', icon: List, description: 'Lista de opções' },
    { value: 'radio', label: 'Seleção Única', icon: Radio, description: 'Escolha uma opção' },
    { value: 'checkbox', label: 'Múltipla Escolha', icon: CheckSquare, description: 'Escolha múltiplas opções' },
    { value: 'date', label: 'Data', icon: Calendar, description: 'Selecionador de data' }
  ]

  const leadFields = [
    { value: 'none', label: 'Não mapear' },
    { value: 'nome_completo', label: 'Nome Completo' },
    { value: 'email', label: 'Email' },
    { value: 'telefone', label: 'Telefone' },
    { value: 'empresa', label: 'Empresa' },
    { value: 'cargo', label: 'Cargo' }
  ]

  const formTypes = [
    { value: 'lead', label: 'Captura de Lead', description: 'Formulário para capturar novos prospects', icon: '🎯' },
    { value: 'nps', label: 'Pesquisa NPS', description: 'Net Promoter Score - satisfação do cliente', icon: '📊' },
    { value: 'survey', label: 'Pesquisa', description: 'Pesquisa de opinião ou feedback geral', icon: '📋' },
    { value: 'feedback', label: 'Feedback', description: 'Coleta de feedback específico', icon: '💭' },
    { value: 'other', label: 'Outro', description: 'Outro tipo de formulário', icon: '📝' }
  ]

  useEffect(() => {
    if (organization?.id) {
      fetchTemplates()
      fetchScoringConfigs()
      fetchClosers()
    }
  }, [organization?.id])

  const fetchTemplates = async () => {
    if (!organization?.id) return
    
    try {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar templates:', error)
        return
      }

      setTemplates(data || [])
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchScoringConfigs = async () => {
    if (!organization?.id) return
    
    try {
      const response = await fetch(`/api/scoring-configs?organization_id=${organization.id}`)
      const data = await response.json()
      setScoringConfigs(data || [])
    } catch (error) {
      console.error('Erro ao buscar configs de scoring:', error)
    }
  }

  const fetchClosers = async () => {
    if (!organization?.id) return
    
    try {
      const { data, error } = await supabase
        .from('closers')
        .select('id, nome_completo, status_contrato')
        .eq('status_contrato', 'ativo')
        .eq('organizacao_id', organization.id)

      if (error) {
        console.error('Erro ao buscar closers:', error)
        return
      }

      setClosers(data || [])
    } catch (error) {
      console.error('Erro ao buscar closers:', error)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const addField = (type: string) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: type as any,
      label: `${fieldTypes.find(f => f.value === type)?.label} ${currentTemplate.fields.length + 1}`,
      name: `field_${currentTemplate.fields.length + 1}`,
      required: false,
      placeholder: '',
      mapToLead: 'none'
    }

    if (type === 'select' || type === 'radio' || type === 'checkbox') {
      newField.options = ['Opção 1', 'Opção 2']
    }

    setCurrentTemplate(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }))
  }

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setCurrentTemplate(prev => ({
      ...prev,
      fields: prev.fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }))
  }

  const removeField = (fieldId: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }))
  }

  const duplicateField = (fieldId: string) => {
    const field = currentTemplate.fields.find(f => f.id === fieldId)
    if (field) {
      const newField = {
        ...field,
        id: `field_${Date.now()}`,
        name: `${field.name}_copy`
      }
      setCurrentTemplate(prev => ({
        ...prev,
        fields: [...prev.fields, newField]
      }))
    }
  }

  const saveTemplate = async () => {
    if (!organization?.id) {
      alert('Organização não identificada')
      return
    }
    
    try {
      if (!currentTemplate.name.trim()) {
        alert('Nome do formulário é obrigatório')
        return
      }

      // Usar o slug definido pelo usuário ou gerar automaticamente se vazio
      const slug = currentTemplate.slug?.trim() || generateSlug(currentTemplate.name)
      const templateData = {
        ...currentTemplate,
        slug,
        organization_id: organization.id,
        updated_at: new Date().toISOString()
      }

      let result
      if (currentTemplate.id) {
        // Atualizar existente
        result = await supabase
          .from('form_templates')
          .update(templateData)
          .eq('id', currentTemplate.id)
          .eq('organization_id', organization.id)
          .select()
      } else {
        // Criar novo
        result = await supabase
          .from('form_templates')
          .insert([{ ...templateData, created_at: new Date().toISOString() }])
          .select()
      }

      if (result.error) {
        console.error('Erro ao salvar:', result.error)
        alert('Erro ao salvar formulário')
        return
      }

      alert('Formulário salvo com sucesso!')
      await fetchTemplates()
      setShowEditor(false)
      resetEditor()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro inesperado')
    }
  }

  const resetEditor = () => {
    setCurrentTemplate({
      name: '',
      description: '',
      slug: '',
      form_type: 'lead',
      fields: [],
      style: defaultStyle
    })
    setActiveTab('fields')
  }

  const editTemplate = (template: FormTemplate) => {
    setCurrentTemplate({
      ...template,
      style: template.style || defaultStyle
    })
    setShowEditor(true)
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este formulário?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('form_templates')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Erro ao excluir:', error)
        alert('Erro ao excluir formulário')
        return
      }

      await fetchTemplates()
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const updateStyle = (updates: Partial<FormStyle>) => {
    setCurrentTemplate(prev => ({
      ...prev,
      style: { ...prev.style, ...updates } as FormStyle
    }))
  }

  const applyColorPreset = (preset: typeof colorPresets[0]) => {
    updateStyle({
      primaryColor: preset.primary,
      backgroundColor: preset.bg
    })
  }

  // Handle drag end for reordering fields
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setCurrentTemplate(prev => {
        const oldIndex = prev.fields.findIndex(field => field.id === active.id)
        const newIndex = prev.fields.findIndex(field => field.id === over?.id)

        return {
          ...prev,
          fields: arrayMove(prev.fields, oldIndex, newIndex)
        }
      })
    }
  }

  // Sortable Field Component
  const SortableField = ({ field, index }: { field: FormField, index: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: field.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`border rounded-lg p-4 space-y-3 ${isDragging ? 'z-50 shadow-lg' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab hover:cursor-grabbing flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600"
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <Badge variant="secondary">
              {fieldTypes.find(t => t.value === field.type)?.label}
            </Badge>
            <span className="font-medium">{field.label}</span>
            {field.required && <Badge variant="destructive">Obrigatório</Badge>}
          </div>
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => duplicateField(field.id)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => removeField(field.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Rótulo</Label>
            <Input
              value={field.label}
              onChange={(e) => updateField(field.id, { label: e.target.value })}
            />
          </div>
          <div>
            <Label>Nome do campo</Label>
            <Input
              value={field.name}
              onChange={(e) => updateField(field.id, { name: e.target.value })}
            />
          </div>
          <div>
            <Label>Placeholder</Label>
            <Input
              value={field.placeholder || ''}
              onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
            />
          </div>
          <div>
            <Label>Mapear para Lead</Label>
            <Select
              value={field.mapToLead}
              onValueChange={(value) => updateField(field.id, { mapToLead: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leadFields.map((lf) => (
                  <SelectItem key={lf.value} value={lf.value}>
                    {lf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Options for select/radio/checkbox */}
        {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
          <div>
            <Label>Opções</Label>
            <div className="space-y-2">
              {field.options?.map((option, optIndex) => (
                <div key={optIndex} className="flex items-center space-x-2">
                  <Input
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...(field.options || [])]
                      newOptions[optIndex] = e.target.value
                      updateField(field.id, { options: newOptions })
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newOptions = field.options?.filter((_, i) => i !== optIndex)
                      updateField(field.id, { options: newOptions })
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const newOptions = [...(field.options || []), `Opção ${(field.options?.length || 0) + 1}`]
                  updateField(field.id, { options: newOptions })
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Opção
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => updateField(field.id, { required: e.target.checked })}
          />
          <Label>Campo obrigatório</Label>
        </div>
      </div>
    )
  }

  // Preview Component
  const FormPreview = () => {
    const style = currentTemplate.style || defaultStyle

    return (
      <div
        className={`min-h-[600px] rounded-lg transition-all duration-300 ${
          previewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
        }`}
        style={{
          backgroundColor: style.backgroundColor,
          color: style.textColor,
          fontFamily: style.fontFamily
        }}
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">
              {currentTemplate.name || 'Título do Formulário'}
            </h2>
            <p className="text-gray-600">
              {currentTemplate.description || 'Descrição do formulário'}
            </p>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            {currentTemplate.fields.map((field, index) => (
              <div
                key={field.id}
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: style.cardColor,
                  borderRadius: `${style.borderRadius}px`,
                  borderColor: style.primaryColor + '20'
                }}
              >
                <label className="block text-sm font-medium mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {/* Renderizar campo baseado no tipo */}
                {field.type === 'textarea' ? (
                  <textarea
                    placeholder={field.placeholder}
                    className="w-full p-3 border rounded-lg"
                    style={{ borderColor: style.primaryColor + '40' }}
                    rows={3}
                  />
                ) : field.type === 'select' ? (
                  <select className="w-full p-3 border rounded-lg" style={{ borderColor: style.primaryColor + '40' }}>
                    <option>{field.placeholder || 'Selecione uma opção'}</option>
                    {field.options?.map((option, i) => (
                      <option key={i} value={option}>{option}</option>
                    ))}
                  </select>
                ) : field.type === 'radio' ? (
                  <div className="space-y-2">
                    {field.options?.map((option, i) => (
                      <label key={i} className="flex items-center space-x-2">
                        <input type="radio" name={field.name} className="text-blue-600" />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : field.type === 'checkbox' ? (
                  <div className="space-y-2">
                    {field.options?.map((option, i) => (
                      <label key={i} className="flex items-center space-x-2">
                        <input type="checkbox" className="text-blue-600" />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    className="w-full p-3 border rounded-lg"
                    style={{ borderColor: style.primaryColor + '40' }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="text-center pt-4">
            <button
              className="px-8 py-3 rounded-lg text-white font-medium"
              style={{
                backgroundColor: style.primaryColor,
                borderRadius: `${style.borderRadius}px`
              }}
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Form Builder" />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando formulários...</p>
          </div>
        </div>
      </div>
    )
  }

  if (showEditor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Form Builder" />

        {/* Toolbar */}
        <div className="border-b bg-white sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEditor(false)}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar</span>
              </Button>
              <div>
                <h2 className="text-lg font-semibold">
                  {currentTemplate.name || 'Novo Formulário'}
                </h2>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Preview Mode Toggle */}
              <div className="flex items-center space-x-2">
                <Button
                  variant={previewMode === 'desktop' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewMode('desktop')}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewMode === 'mobile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewMode('mobile')}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>

              <Button onClick={saveTemplate} className="flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>Salvar</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editor Panel */}
            <div className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="config">Configuração</TabsTrigger>
                  <TabsTrigger value="fields">Campos</TabsTrigger>
                  <TabsTrigger value="scoring">Qualificação</TabsTrigger>
                  <TabsTrigger value="style">Visual</TabsTrigger>
                </TabsList>

                {/* Config Tab */}
                <TabsContent value="config" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Informações Básicas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nome do Formulário</Label>
                        <Input
                          id="name"
                          value={currentTemplate.name}
                          onChange={(e) => {
                            const newName = e.target.value
                            setCurrentTemplate(prev => ({
                              ...prev,
                              name: newName,
                              // Só atualiza o slug automaticamente se ainda não foi definido manualmente
                              slug: prev.slug ? prev.slug : generateSlug(newName)
                            }))
                          }}
                          placeholder="Ex: Formulário de Contato"
                        />
                      </div>

                      <div>
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                          id="description"
                          value={currentTemplate.description}
                          onChange={(e) => setCurrentTemplate(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Breve descrição do formulário"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="slug">Link do Formulário (Slug)</Label>
                        <div className="space-y-2">
                          <Input
                            id="slug"
                            value={currentTemplate.slug}
                            onChange={(e) => setCurrentTemplate(prev => ({ ...prev, slug: e.target.value }))}
                            placeholder="exemplo-formulario-contato"
                          />
                          <p className="text-sm text-gray-500">
                            URL final: {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/forms/{currentTemplate.slug || 'seu-slug'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="type">Tipo do Formulário</Label>
                        <Select
                          value={currentTemplate.form_type}
                          onValueChange={(value) => setCurrentTemplate(prev => ({ ...prev, form_type: value as any }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {formTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center space-x-2">
                                  <span>{type.icon}</span>
                                  <div>
                                    <div className="font-medium">{type.label}</div>
                                    <div className="text-xs text-gray-500">{type.description}</div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Fields Tab */}
                <TabsContent value="fields" className="space-y-4">
                  {/* Add Field Buttons */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Adicionar Campo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {fieldTypes.map((fieldType) => {
                          const Icon = fieldType.icon
                          return (
                            <Button
                              key={fieldType.value}
                              variant="outline"
                              onClick={() => addField(fieldType.value)}
                              className="flex items-center space-x-2 h-auto p-3 justify-start"
                            >
                              <Icon className="h-4 w-4 text-blue-600" />
                              <div className="text-left">
                                <div className="text-sm font-medium">{fieldType.label}</div>
                                <div className="text-xs text-gray-500">{fieldType.description}</div>
                              </div>
                            </Button>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Fields List */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Campos do Formulário ({currentTemplate.fields.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {currentTemplate.fields.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>Nenhum campo adicionado ainda</p>
                          <p className="text-sm">Comece adicionando um campo acima</p>
                        </div>
                      ) : (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <SortableContext
                            items={currentTemplate.fields.map(f => f.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {currentTemplate.fields.map((field, index) => (
                              <SortableField key={field.id} field={field} index={index} />
                            ))}
                          </SortableContext>
                        </DndContext>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Style Tab */}
                <TabsContent value="style" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Palette className="h-5 w-5" />
                        <span>Personalização Visual</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Color Presets */}
                      <div>
                        <Label className="text-base font-medium">Temas Prontos</Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {colorPresets.map((preset) => (
                            <button
                              key={preset.name}
                              onClick={() => applyColorPreset(preset)}
                              className="p-3 rounded-lg border text-sm font-medium transition-all hover:scale-105"
                              style={{
                                backgroundColor: preset.bg,
                                borderColor: preset.primary,
                                color: preset.primary
                              }}
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Colors */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="primaryColor">Cor Principal</Label>
                          <div className="flex items-center space-x-2">
                            <input
                              id="primaryColor"
                              type="color"
                              value={currentTemplate.style?.primaryColor}
                              onChange={(e) => updateStyle({ primaryColor: e.target.value })}
                              className="w-12 h-10 rounded border"
                            />
                            <Input
                              value={currentTemplate.style?.primaryColor}
                              onChange={(e) => updateStyle({ primaryColor: e.target.value })}
                              placeholder="#3b82f6"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="backgroundColor">Cor de Fundo</Label>
                          <div className="flex items-center space-x-2">
                            <input
                              id="backgroundColor"
                              type="color"
                              value={currentTemplate.style?.backgroundColor}
                              onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                              className="w-12 h-10 rounded border"
                            />
                            <Input
                              value={currentTemplate.style?.backgroundColor}
                              onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                              placeholder="#f8fafc"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="borderRadius">Bordas Arredondadas</Label>
                        <Select
                          value={currentTemplate.style?.borderRadius}
                          onValueChange={(value) => updateStyle({ borderRadius: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="4">Pouco arredondado</SelectItem>
                            <SelectItem value="8">Médio</SelectItem>
                            <SelectItem value="12">Bem arredondado</SelectItem>
                            <SelectItem value="20">Muito arredondado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="fontFamily">Fonte</Label>
                        <Select
                          value={currentTemplate.style?.fontFamily}
                          onValueChange={(value) => updateStyle({ fontFamily: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Inter">Inter (Moderna)</SelectItem>
                            <SelectItem value="Arial">Arial (Clássica)</SelectItem>
                            <SelectItem value="Georgia">Georgia (Elegante)</SelectItem>
                            <SelectItem value="Roboto">Roboto (Google)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Scoring Tab */}
                <TabsContent value="scoring" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        🎯 Qualificação de Leads
                      </CardTitle>
                      <CardDescription>
                        Configure pontuação automática e direcionamento para closers baseado no score
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Enable Lead Qualification */}
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-medium">Ativar Qualificação de Leads</Label>
                          <p className="text-sm text-gray-500 mt-1">
                            Calcular pontuação e direcionar automaticamente para closers
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={currentTemplate.leadQualification?.enabled || false}
                          onChange={(e) => setCurrentTemplate(prev => ({
                            ...prev,
                            leadQualification: {
                              ...prev.leadQualification,
                              enabled: e.target.checked,
                              threshold: prev.leadQualification?.threshold || 70,
                              enableCalendar: prev.leadQualification?.enableCalendar || true
                            }
                          }))}
                          className="w-5 h-5"
                        />
                      </div>

                      {currentTemplate.leadQualification?.enabled && (
                        <>
                          {/* Scoring Configuration */}
                          <div className="space-y-3">
                            <Label>Configuração de Pontuação</Label>
                            <Select
                              value={currentTemplate.leadQualification?.scoringConfigId || ''}
                              onValueChange={(value) => setCurrentTemplate(prev => ({
                                ...prev,
                                leadQualification: {
                                  ...prev.leadQualification!,
                                  scoringConfigId: value
                                }
                              }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma configuração de pontuação" />
                              </SelectTrigger>
                              <SelectContent>
                                {scoringConfigs.map((config) => (
                                  <SelectItem key={config.id} value={config.id}>
                                    {config.name} (Max: {
                                      config.telefone_score + config.email_score + 
                                      config.empresa_score + config.cargo_score +
                                      config.temperatura_quente_score + config.nivel_interesse_alto_score +
                                      config.orcamento_disponivel_score + config.decisor_principal_score +
                                      config.dor_principal_score
                                    } pts)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {scoringConfigs.length === 0 && (
                              <p className="text-sm text-amber-600">
                                ⚠️ Nenhuma configuração de pontuação encontrada. Crie uma primeiro.
                              </p>
                            )}
                          </div>

                          {/* Score Threshold */}
                          <div className="space-y-3">
                            <Label>Limite de Score Alto</Label>
                            <div className="flex items-center gap-4">
                              <Input
                                type="number"
                                value={currentTemplate.leadQualification?.threshold || 70}
                                onChange={(e) => setCurrentTemplate(prev => ({
                                  ...prev,
                                  leadQualification: {
                                    ...prev.leadQualification!,
                                    threshold: Number(e.target.value)
                                  }
                                }))}
                                className="w-24"
                                min="0"
                                max="200"
                              />
                              <span className="text-sm text-gray-600">pontos</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Score ≥ {currentTemplate.leadQualification?.threshold || 70}: Gabriel Maia (QUENTE) | 
                              Score &lt; {currentTemplate.leadQualification?.threshold || 70}: Paulo Guimarães (FRIO/MORNO)
                            </p>
                            <div className="mt-2 text-xs space-y-1">
                              <div className="text-red-600">🔥 Frio: &lt; 50 pontos</div>
                              <div className="text-yellow-600">🔶 Morno: 50-70 pontos</div>
                              <div className="text-green-600">🔥 Quente: 70+ pontos</div>
                            </div>
                          </div>

                          {/* Closer Assignment */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <Label className="text-orange-700">Paulo Guimarães (Frio/Morno: &lt;70)</Label>
                              <Select
                                value={currentTemplate.leadQualification?.lowScoreCloserId || ''}
                                onValueChange={(value) => setCurrentTemplate(prev => ({
                                  ...prev,
                                  leadQualification: {
                                    ...prev.leadQualification!,
                                    lowScoreCloserId: value
                                  }
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione Paulo Guimarães para leads frios/mornos" />
                                </SelectTrigger>
                                <SelectContent>
                                  {closers.map((closer) => (
                                    <SelectItem key={closer.id} value={closer.id}>
                                      {closer.nome_completo}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-3">
                              <Label className="text-green-700">Gabriel Maia (Quente: 70+)</Label>
                              <Select
                                value={currentTemplate.leadQualification?.highScoreCloserId || ''}
                                onValueChange={(value) => setCurrentTemplate(prev => ({
                                  ...prev,
                                  leadQualification: {
                                    ...prev.leadQualification!,
                                    highScoreCloserId: value
                                  }
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione Gabriel Maia para leads quentes" />
                                </SelectTrigger>
                                <SelectContent>
                                  {closers.map((closer) => (
                                    <SelectItem key={closer.id} value={closer.id}>
                                      {closer.nome_completo}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {closers.length === 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <p className="text-sm text-red-700">
                                ⚠️ Nenhum closer encontrado! Configure closers no sistema primeiro.
                              </p>
                            </div>
                          )}

                          {/* Calendar Integration */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-base font-medium">Agendamento Automático</Label>
                                <p className="text-sm text-gray-500 mt-1">
                                  Mostrar agenda do closer no final do formulário para agendamento direto
                                </p>
                              </div>
                              <input
                                type="checkbox"
                                checked={currentTemplate.leadQualification?.enableCalendar || false}
                                onChange={(e) => setCurrentTemplate(prev => ({
                                  ...prev,
                                  leadQualification: {
                                    ...prev.leadQualification!,
                                    enableCalendar: e.target.checked
                                  }
                                }))}
                                className="w-5 h-5"
                              />
                            </div>

                            {currentTemplate.leadQualification?.enableCalendar && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-700">
                                  ✅ <strong>Fluxo Ativado:</strong> Após responder todas as perguntas, o lead verá:
                                </p>
                                <ul className="list-disc list-inside text-sm text-blue-600 mt-2 space-y-1">
                                  <li>Score calculado automaticamente</li>
                                  <li>Agenda do closer correspondente</li>
                                  <li>Agendamento direto sem sair do formulário</li>
                                  <li>Lead criado e atribuído automaticamente</li>
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Scoring Preview */}
                          {currentTemplate.leadQualification?.scoringConfigId && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <h4 className="font-medium text-gray-700 mb-3">📊 Configuração de Pontuação Ativa:</h4>
                              {(() => {
                                const config = scoringConfigs.find(c => c.id === currentTemplate.leadQualification?.scoringConfigId)
                                return config ? (
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                                    <div>📞 Telefone: +{config.telefone_score}</div>
                                    <div>📧 Email: +{config.email_score}</div>
                                    <div>🏢 Empresa: +{config.empresa_score}</div>
                                    <div>👔 Cargo: +{config.cargo_score}</div>
                                    <div>🔥 Quente: +{config.temperatura_quente_score}</div>
                                    <div>📈 Interest Alto: +{config.nivel_interesse_alto_score}</div>
                                  </div>
                                ) : null
                              })()}
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Preview Panel */}
            <div className="lg:sticky lg:top-20">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Preview</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {previewMode === 'desktop' ? 'Desktop' : 'Mobile'}
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormPreview />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main List View
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Criador de Formulários" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Criador de Formulários</h1>
            <p className="text-gray-600 mt-2">Crie formulários personalizados de forma fácil e visual</p>
          </div>
          <Button
            onClick={() => setShowEditor(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Novo Formulário</span>
          </Button>
        </div>

        {templates.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum formulário criado ainda
              </h3>
              <p className="text-gray-600 mb-6">
                Comece criando seu primeiro formulário personalizado
              </p>
              <Button onClick={() => setShowEditor(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Formulário
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {template.description || 'Sem descrição'}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {formTypes.find(t => t.value === template.form_type)?.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <FileText className="h-4 w-4 mr-2" />
                      {template.fields?.length || 0} campos
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editTemplate(template)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const url = `${window.location.origin}/forms/${template.slug}`
                          navigator.clipboard.writeText(url)
                          alert('Link copiado!')
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/forms/${template.slug}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTemplate(template.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}