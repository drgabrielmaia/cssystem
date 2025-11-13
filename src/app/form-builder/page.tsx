'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
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
  List
} from 'lucide-react'

interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date'
  label: string
  name: string
  required: boolean
  options?: string[] // para select, radio, checkbox
  placeholder?: string
  mapToLead?: string // qual campo do lead mapear (nome_completo, email, telefone, etc)
}

interface FormTemplate {
  id?: string
  name: string
  description: string
  slug: string // URL amigável
  form_type: 'lead' | 'nps' | 'survey' | 'feedback' | 'other' // Tipo do formulário
  fields: FormField[]
  created_at?: string
  updated_at?: string
}

export default function FormBuilderPage() {
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [currentTemplate, setCurrentTemplate] = useState<FormTemplate>({
    name: '',
    description: '',
    slug: '',
    form_type: 'lead',
    fields: []
  })
  const [showEditor, setShowEditor] = useState(false)
  const [loading, setLoading] = useState(true)

  const fieldTypes = [
    { value: 'text', label: 'Texto', icon: Type },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'phone', label: 'Telefone', icon: Phone },
    { value: 'number', label: 'Número', icon: Hash },
    { value: 'textarea', label: 'Texto Longo', icon: FileText },
    { value: 'select', label: 'Lista Suspensa', icon: List },
    { value: 'radio', label: 'Seleção Única', icon: Radio },
    { value: 'checkbox', label: 'Múltipla Escolha', icon: CheckSquare },
    { value: 'date', label: 'Data', icon: Calendar }
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
    { value: 'lead', label: 'Captura de Lead', description: 'Formulário para capturar novos prospects' },
    { value: 'nps', label: 'Pesquisa NPS', description: 'Net Promoter Score - satisfação do cliente' },
    { value: 'survey', label: 'Pesquisa', description: 'Pesquisa de opinião ou feedback geral' },
    { value: 'feedback', label: 'Feedback', description: 'Coleta de feedback específico' },
    { value: 'other', label: 'Outro', description: 'Outro tipo de formulário' }
  ]

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      // Buscar templates salvos
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
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

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: '',
      name: '',
      required: false,
      placeholder: ''
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
        field.id === fieldId
          ? { ...field, ...updates }
          : field
      )
    }))
  }

  const removeField = (fieldId: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }))
  }

  const saveTemplate = async () => {
    try {
      if (!currentTemplate.name || !currentTemplate.slug) {
        alert('Nome e URL são obrigatórios')
        return
      }

      const templateData = {
        name: currentTemplate.name,
        description: currentTemplate.description,
        slug: currentTemplate.slug,
        form_type: currentTemplate.form_type,
        fields: currentTemplate.fields,
        updated_at: new Date().toISOString()
      }

      if (currentTemplate.id) {
        // Atualizar
        const { error } = await supabase
          .from('form_templates')
          .update(templateData)
          .eq('id', currentTemplate.id)

        if (error) throw error
      } else {
        // Criar novo
        const { error } = await supabase
          .from('form_templates')
          .insert([{
            ...templateData,
            created_at: new Date().toISOString()
          }])

        if (error) throw error
      }

      await fetchTemplates()
      setShowEditor(false)
      setCurrentTemplate({
        name: '',
        description: '',
        slug: '',
        fields: []
      })

      alert('Formulário salvo com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar o formulário')
    }
  }

  const editTemplate = (template: FormTemplate) => {
    setCurrentTemplate(template)
    setShowEditor(true)
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este formulário?')) return

    try {
      const { error } = await supabase
        .from('form_templates')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchTemplates()
      alert('Formulário excluído com sucesso!')
    } catch (error) {
      console.error('Erro ao excluir:', error)
      alert('Erro ao excluir o formulário')
    }
  }

  const duplicateTemplate = (template: FormTemplate) => {
    setCurrentTemplate({
      name: `${template.name} (Cópia)`,
      description: template.description,
      slug: `${template.slug}-copia`,
      form_type: template.form_type,
      fields: template.fields.map(field => ({
        ...field,
        id: `field_${Date.now()}_${Math.random()}`
      }))
    })
    setShowEditor(true)
  }

  const getFormUrl = (slug: string) => {
    return `${window.location.origin}/forms/${slug}`
  }

  const FieldEditor = ({ field }: { field: FormField }) => {
    const FieldIcon = fieldTypes.find(t => t.value === field.type)?.icon || Type

    return (
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FieldIcon className="h-5 w-5 text-gray-500" />
              <span className="font-medium">
                {field.label || 'Campo sem nome'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeField(field.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tipo do Campo</Label>
              <Select
                value={field.type}
                onValueChange={(value) => updateField(field.id, { type: value as FormField['type'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentTemplate.form_type === 'lead' && (
              <div>
                <Label>Mapear para Lead</Label>
                <Select
                  value={field.mapToLead || 'none'}
                  onValueChange={(value) => updateField(field.id, { mapToLead: value === 'none' ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leadFields.map(leadField => (
                      <SelectItem key={leadField.value} value={leadField.value}>
                        {leadField.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label>Label do Campo</Label>
            <Input
              value={field.label}
              onChange={(e) => updateField(field.id, { label: e.target.value })}
              placeholder="Ex: Nome completo"
            />
          </div>

          <div>
            <Label>Nome do Campo (usado no formulário)</Label>
            <Input
              value={field.name}
              onChange={(e) => updateField(field.id, { name: e.target.value })}
              placeholder="Ex: nome_completo"
            />
          </div>

          <div>
            <Label>Placeholder (texto de exemplo)</Label>
            <Input
              value={field.placeholder || ''}
              onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
              placeholder="Ex: Digite seu nome completo"
            />
          </div>

          {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
            <div>
              <Label>Opções (uma por linha)</Label>
              <Textarea
                value={field.options?.join('\n') || ''}
                onChange={(e) => updateField(field.id, {
                  options: e.target.value.split('\n').filter(opt => opt.trim())
                })}
                placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                rows={3}
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`required_${field.id}`}
              checked={field.required}
              onChange={(e) => updateField(field.id, { required: e.target.checked })}
            />
            <Label htmlFor={`required_${field.id}`}>Campo obrigatório</Label>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header
          title="🛠️ Construtor de Formulários"
          subtitle="Criando formulários personalizados..."
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title="🛠️ Construtor de Formulários"
        subtitle={`${templates.length} formulários personalizados`}
      />

      <main className="flex-1 p-6 space-y-6">
        {/* Botão para criar novo */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Formulários Personalizados</h2>
          <Button
            onClick={() => {
              setCurrentTemplate({
                name: '',
                description: '',
                slug: '',
                form_type: 'lead',
                fields: []
              })
              setShowEditor(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Formulário
          </Button>
        </div>

        {/* Lista de templates */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{template.name}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {formTypes.find(t => t.value === template.form_type)?.label || 'Lead'}
                    </Badge>
                    <Badge variant="secondary">
                      {template.fields.length} campos
                    </Badge>
                  </div>
                </CardTitle>
                <p className="text-gray-600 text-sm">{template.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-500">URL do formulário:</Label>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1">
                        /forms/{template.slug}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(getFormUrl(template.slug))
                          alert('URL copiada!')
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/forms/${template.slug}`, '_blank')}
                      className="flex-1"
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Visualizar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => editTemplate(template)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => duplicateTemplate(template)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteTemplate(template.id!)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {templates.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum formulário criado ainda
              </h3>
              <p className="text-gray-500 mb-4">
                Crie seu primeiro formulário personalizado para capturar leads.
              </p>
              <Button
                onClick={() => {
                  setCurrentTemplate({
                    name: '',
                    description: '',
                    slug: '',
                    fields: []
                  })
                  setShowEditor(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Formulário
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Modal do Editor */}
        <Dialog open={showEditor} onOpenChange={setShowEditor}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {currentTemplate.id ? 'Editar Formulário' : 'Novo Formulário'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Configurações gerais */}
              <div className="space-y-4">
                <div>
                  <Label>Nome do Formulário</Label>
                  <Input
                    value={currentTemplate.name}
                    onChange={(e) => {
                      const name = e.target.value
                      setCurrentTemplate(prev => ({
                        ...prev,
                        name,
                        slug: prev.slug || generateSlug(name)
                      }))
                    }}
                    placeholder="Ex: Formulário de Mentoria"
                  />
                </div>

                <div>
                  <Label>Tipo de Formulário</Label>
                  <Select
                    value={currentTemplate.form_type}
                    onValueChange={(value: 'lead' | 'nps' | 'survey' | 'feedback' | 'other') =>
                      setCurrentTemplate(prev => ({ ...prev, form_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo do formulário" />
                    </SelectTrigger>
                    <SelectContent>
                      {formTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{type.label}</span>
                            <span className="text-xs text-gray-500">{type.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={currentTemplate.description}
                    onChange={(e) => setCurrentTemplate(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                    placeholder="Descreva brevemente o propósito deste formulário"
                    rows={2}
                  />
                </div>

                <div>
                  <Label>URL (slug)</Label>
                  <Input
                    value={currentTemplate.slug}
                    onChange={(e) => setCurrentTemplate(prev => ({
                      ...prev,
                      slug: e.target.value
                    }))}
                    placeholder="Ex: paralitice"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL final: {window.location.origin}/forms/{currentTemplate.slug}
                  </p>
                </div>
              </div>

              {/* Campos */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Campos do Formulário</h3>
                  <Button onClick={addField} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Campo
                  </Button>
                </div>

                {currentTemplate.fields.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-gray-500">
                        Nenhum campo adicionado ainda. Clique em "Adicionar Campo" para começar.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div>
                    {currentTemplate.fields.map((field) => (
                      <FieldEditor key={field.id} field={field} />
                    ))}
                  </div>
                )}
              </div>

              {/* Botões de ação */}
              <div className="flex space-x-4 pt-4 border-t">
                <Button onClick={saveTemplate} disabled={!currentTemplate.name || !currentTemplate.slug}>
                  Salvar Formulário
                </Button>
                <Button variant="outline" onClick={() => setShowEditor(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}