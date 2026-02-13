'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScoringConfig {
  id: string
  name: string
  is_active: boolean
  telefone_score: number
  email_score: number
  empresa_score: number
  cargo_score: number
  temperatura_quente_score: number
  temperatura_morno_score: number
  temperatura_frio_score: number
  nivel_interesse_alto_score: number
  nivel_interesse_medio_score: number
  nivel_interesse_baixo_score: number
  orcamento_disponivel_score: number
  decisor_principal_score: number
  dor_principal_score: number
  low_score_threshold: number
  form_title: string
  form_description: string
}

interface LeadQualificationFormProps {
  primaryCloserId?: string
  organizationId: string
  onSuccess?: (result: any) => void
}

interface FormData {
  nome_completo: string
  email: string
  telefone: string
  empresa: string
  cargo: string
  temperatura: 'quente' | 'morno' | 'frio'
  nivel_interesse: 'alto' | 'medio' | 'baixo'
  orcamento_disponivel: number
  decisor_principal: boolean
  dor_principal: string
  preferred_datetime: string
}

const LeadQualificationForm = ({ 
  primaryCloserId, 
  organizationId,
  onSuccess 
}: LeadQualificationFormProps) => {
  const [formData, setFormData] = useState<FormData>({
    nome_completo: '',
    email: '',
    telefone: '',
    empresa: '',
    cargo: '',
    temperatura: 'morno',
    nivel_interesse: 'medio',
    orcamento_disponivel: 0,
    decisor_principal: false,
    dor_principal: '',
    preferred_datetime: ''
  })
  
  const [currentScore, setCurrentScore] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<any>(null)
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load scoring configuration
  React.useEffect(() => {
    const loadScoringConfig = async () => {
      try {
        const response = await fetch(`/api/scoring-configs?organization_id=${organizationId}`)
        const configs = await response.json()
        
        // Find active config or use first one
        const activeConfig = configs.find((config: ScoringConfig) => config.is_active) || configs[0]
        if (activeConfig) {
          setScoringConfig(activeConfig)
        }
      } catch (error) {
        console.error('Error loading scoring config:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadScoringConfig()
  }, [organizationId])

  // Calculate score in real-time using configuration
  React.useEffect(() => {
    if (!scoringConfig) return
    
    let score = 0
    
    // Basic data
    if (formData.telefone) score += scoringConfig.telefone_score
    if (formData.email) score += scoringConfig.email_score
    if (formData.empresa) score += scoringConfig.empresa_score
    if (formData.cargo) score += scoringConfig.cargo_score
    
    // Temperature
    if (formData.temperatura === 'quente') score += scoringConfig.temperatura_quente_score
    else if (formData.temperatura === 'morno') score += scoringConfig.temperatura_morno_score
    else if (formData.temperatura === 'frio') score += scoringConfig.temperatura_frio_score
    
    // Interest level
    if (formData.nivel_interesse === 'alto') score += scoringConfig.nivel_interesse_alto_score
    else if (formData.nivel_interesse === 'medio') score += scoringConfig.nivel_interesse_medio_score
    else if (formData.nivel_interesse === 'baixo') score += scoringConfig.nivel_interesse_baixo_score
    
    // Budget and decision maker
    if (formData.orcamento_disponivel > 0) score += scoringConfig.orcamento_disponivel_score
    if (formData.decisor_principal) score += scoringConfig.decisor_principal_score
    if (formData.dor_principal) score += scoringConfig.dor_principal_score
    
    setCurrentScore(score)
  }, [formData, scoringConfig])

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/leads/qualification-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          primary_closer_id: primaryCloserId,
          organization_id: organizationId,
          preferred_datetime: formData.preferred_datetime ? new Date(formData.preferred_datetime).toISOString() : null
        })
      })
      
      const result = await response.json()
      setSubmitResult(result)
      
      if (result.success && onSuccess) {
        onSuccess(result)
      }
    } catch (error) {
      console.error('Erro ao enviar formulário:', error)
      setSubmitResult({
        success: false,
        error: 'Erro ao processar formulário'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getScoreColor = (score: number) => {
    const threshold = scoringConfig?.low_score_threshold || 60
    if (score >= threshold) return 'text-green-600 bg-green-50'
    return 'text-orange-600 bg-orange-50'
  }

  const getAssignmentPreview = (score: number) => {
    const threshold = scoringConfig?.low_score_threshold || 60
    if (score < threshold) {
      return {
        closer: 'Closer Score Baixo',
        type: 'Lead de aquecimento',
        color: 'bg-orange-50 text-orange-700'
      }
    } else {
      return {
        closer: 'Closer Principal',
        type: 'Lead qualificado',
        color: 'bg-green-50 text-green-700'
      }
    }
  }

  const getTotalMaxScore = () => {
    if (!scoringConfig) return 155
    return (
      scoringConfig.telefone_score +
      scoringConfig.email_score +
      scoringConfig.empresa_score +
      scoringConfig.cargo_score +
      scoringConfig.temperatura_quente_score +
      scoringConfig.nivel_interesse_alto_score +
      scoringConfig.orcamento_disponivel_score +
      scoringConfig.decisor_principal_score +
      scoringConfig.dor_principal_score
    )
  }

  if (submitResult?.success) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <CardTitle className="text-green-700">Formulário Enviado com Sucesso!</CardTitle>
          <CardDescription>
            Seu lead foi processado e {submitResult.appointment_result?.appointment_scheduled 
              ? 'sua call foi agendada' 
              : 'será processado pela equipe'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label>Score Final:</Label>
              <Badge className={getScoreColor(submitResult.score_result?.total_score || 0)}>
                {submitResult.score_result?.total_score || 0} pontos
              </Badge>
            </div>
            <div>
              <Label>Atribuído para:</Label>
              <Badge className={getAssignmentPreview(submitResult.score_result?.total_score || 0).color}>
                {getAssignmentPreview(submitResult.score_result?.total_score || 0).closer}
              </Badge>
            </div>
          </div>
          
          {submitResult.appointment_result?.appointment_scheduled && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700">
                <CalendarIcon className="w-5 h-5" />
                <span className="font-medium">Call Agendada</span>
              </div>
              <p className="text-blue-600 mt-1">
                {new Date(submitResult.appointment_result.scheduled_date).toLocaleString('pt-BR')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <ClockIcon className="w-6 h-6 animate-spin mr-2" />
            <span>Carregando configuração...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!scoringConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuração Não Encontrada</CardTitle>
          <CardDescription>
            Nenhuma configuração de pontuação encontrada para esta organização.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const assignment = getAssignmentPreview(currentScore)

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {scoringConfig?.form_title || 'Qualificação de Lead'}
            <div className="flex items-center gap-4">
              <Badge className={getScoreColor(currentScore)}>
                Score: {currentScore}/{getTotalMaxScore()}
              </Badge>
              <Badge className={assignment.color}>
                → {assignment.closer}
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            {scoringConfig?.form_description || 'Preencha os dados para calcular automaticamente o score e agendar sua call'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dados Básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome_completo}
                onChange={(e) => handleInputChange('nome_completo', e.target.value)}
                placeholder="Digite seu nome completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="seu@email.com"
                required
              />
              <span className="text-xs text-green-600">+{scoringConfig?.email_score || 10} pontos</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleInputChange('telefone', e.target.value)}
                placeholder="(11) 99999-9999"
                required
              />
              <span className="text-xs text-green-600">+{scoringConfig?.telefone_score || 10} pontos</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa</Label>
              <Input
                id="empresa"
                value={formData.empresa}
                onChange={(e) => handleInputChange('empresa', e.target.value)}
                placeholder="Nome da sua empresa"
              />
              <span className="text-xs text-green-600">+15 pontos</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargo">Cargo/Função</Label>
            <Input
              id="cargo"
              value={formData.cargo}
              onChange={(e) => handleInputChange('cargo', e.target.value)}
              placeholder="Seu cargo ou função"
            />
            <span className="text-xs text-green-600">+15 pontos</span>
          </div>

          {/* Qualificação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>Nível de Interesse</Label>
              <RadioGroup
                value={formData.nivel_interesse}
                onValueChange={(value) => handleInputChange('nivel_interesse', value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="baixo" id="interesse-baixo" />
                  <Label htmlFor="interesse-baixo">Baixo (+5 pontos)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medio" id="interesse-medio" />
                  <Label htmlFor="interesse-medio">Médio (+15 pontos)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="alto" id="interesse-alto" />
                  <Label htmlFor="interesse-alto">Alto (+25 pontos)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Urgência da Necessidade</Label>
              <RadioGroup
                value={formData.temperatura}
                onValueChange={(value) => handleInputChange('temperatura', value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="frio" id="temp-frio" />
                  <Label htmlFor="temp-frio">Pode esperar (+10 pontos)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="morno" id="temp-morno" />
                  <Label htmlFor="temp-morno">Em alguns meses (+20 pontos)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="quente" id="temp-quente" />
                  <Label htmlFor="temp-quente">Urgente (+30 pontos)</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="orcamento">Orçamento Disponível (R$)</Label>
            <Input
              id="orcamento"
              type="number"
              value={formData.orcamento_disponivel}
              onChange={(e) => handleInputChange('orcamento_disponivel', Number(e.target.value))}
              placeholder="0"
            />
            <span className="text-xs text-green-600">
              {formData.orcamento_disponivel > 0 ? '+20 pontos' : 'Adicione um valor para ganhar +20 pontos'}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="decisor"
                checked={formData.decisor_principal}
                onCheckedChange={(checked) => handleInputChange('decisor_principal', checked)}
              />
              <Label htmlFor="decisor">
                Sou o principal responsável pelas decisões de compra (+25 pontos)
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dor">Principal Dificuldade/Necessidade</Label>
            <Textarea
              id="dor"
              value={formData.dor_principal}
              onChange={(e) => handleInputChange('dor_principal', e.target.value)}
              placeholder="Descreva sua principal dificuldade ou necessidade..."
              rows={3}
            />
            <span className="text-xs text-green-600">
              {formData.dor_principal ? '+15 pontos' : 'Descreva para ganhar +15 pontos'}
            </span>
          </div>

          {/* Agendamento */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Agendar Call de Qualificação
              </CardTitle>
              <CardDescription>
                Escolha o melhor horário para nossa conversa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="datetime">Data e Hora Preferida</Label>
                <Input
                  id="datetime"
                  type="datetime-local"
                  value={formData.preferred_datetime}
                  onChange={(e) => handleInputChange('preferred_datetime', e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-sm text-muted-foreground">
                  Se preenchido, sua call será agendada automaticamente
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview do Assignment */}
          <Card className={cn("border-2", assignment.color.includes('green') ? 'border-green-200' : 'border-orange-200')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Seu lead será direcionado para:</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentScore < 60 
                      ? 'Score baixo: Paulo Guimarães fará o primeiro contato para aquecimento'
                      : 'Score alto: Direcionado para o closer principal para call de fechamento'
                    }
                  </p>
                </div>
                <Badge className={assignment.color}>
                  {assignment.closer}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={isSubmitting || !formData.nome_completo || !formData.email || !formData.telefone}
          >
            {isSubmitting ? (
              <>
                <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Enviar e {formData.preferred_datetime ? 'Agendar Call' : 'Processar Lead'}
              </>
            )}
          </Button>

          {submitResult?.error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
              <AlertCircleIcon className="w-5 h-5" />
              <span>{submitResult.error}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  )
}

export default LeadQualificationForm