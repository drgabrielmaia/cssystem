'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlusIcon, SaveIcon, TrashIcon, EditIcon } from 'lucide-react'

interface ScoringConfig {
  id: string
  name: string
  is_active: boolean
  
  // Basic field scores
  telefone_score: number
  email_score: number
  empresa_score: number
  cargo_score: number
  
  // Temperature scoring
  temperatura_elite_score: number
  temperatura_quente_score: number
  temperatura_morno_score: number
  temperatura_frio_score: number
  
  // Interest level scoring
  nivel_interesse_alto_score: number
  nivel_interesse_medio_score: number
  nivel_interesse_baixo_score: number
  
  // Other factors
  orcamento_disponivel_score: number
  decisor_principal_score: number
  dor_principal_score: number
  
  // Assignment rules
  low_score_threshold: number
  low_score_closer_id?: string
  high_score_closer_id?: string
  
  // Form settings
  form_title: string
  form_description: string
}

interface Closer {
  id: string
  nome_completo: string
  status_contrato: string
}

interface ScoringConfigPanelProps {
  organizationId: string
}

const ScoringConfigPanel = ({ organizationId }: ScoringConfigPanelProps) => {
  const [configs, setConfigs] = useState<ScoringConfig[]>([])
  const [closers, setClosers] = useState<Closer[]>([])
  const [selectedConfig, setSelectedConfig] = useState<ScoringConfig | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Default empty config
  const defaultConfig: Partial<ScoringConfig> = {
    name: 'Nova Configuração',
    is_active: false,
    telefone_score: 10,
    email_score: 10,
    empresa_score: 15,
    cargo_score: 15,
    temperatura_elite_score: 40,
    temperatura_quente_score: 30,
    temperatura_morno_score: 20,
    temperatura_frio_score: 10,
    nivel_interesse_alto_score: 25,
    nivel_interesse_medio_score: 15,
    nivel_interesse_baixo_score: 5,
    orcamento_disponivel_score: 20,
    decisor_principal_score: 25,
    dor_principal_score: 15,
    low_score_threshold: 60,
    form_title: 'Qualificação de Lead',
    form_description: 'Preencha os dados para calcular automaticamente o score'
  }

  useEffect(() => {
    loadConfigs()
    loadClosers()
  }, [])

  const loadConfigs = async () => {
    try {
      const response = await fetch(`/api/scoring-configs?organization_id=${organizationId}`)
      const data = await response.json()
      setConfigs(data || [])
      
      // Select active config by default
      const activeConfig = data.find((config: ScoringConfig) => config.is_active)
      if (activeConfig) {
        setSelectedConfig(activeConfig)
      }
    } catch (error) {
      console.error('Error loading configs:', error)
    }
  }

  const loadClosers = async () => {
    try {
      const response = await fetch(`/api/closers?organization_id=${organizationId}`)
      const data = await response.json()
      setClosers(data?.filter((closer: Closer) => closer.status_contrato === 'ativo') || [])
    } catch (error) {
      console.error('Error loading closers:', error)
    }
  }

  const handleSave = async () => {
    if (!selectedConfig) return
    
    setIsSaving(true)
    try {
      const response = await fetch('/api/scoring-configs', {
        method: selectedConfig.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedConfig,
          organization_id: organizationId
        })
      })

      if (response.ok) {
        await loadConfigs()
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error saving config:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const createNewConfig = () => {
    setSelectedConfig({ ...defaultConfig } as ScoringConfig)
    setIsEditing(true)
  }

  const activateConfig = async (configId: string) => {
    try {
      await fetch(`/api/scoring-configs/${configId}/activate`, { method: 'POST' })
      await loadConfigs()
    } catch (error) {
      console.error('Error activating config:', error)
    }
  }

  const getTotalMaxScore = (config: ScoringConfig) => {
    return (
      config.telefone_score +
      config.email_score +
      config.empresa_score +
      config.cargo_score +
      config.temperatura_elite_score +
      config.nivel_interesse_alto_score +
      config.orcamento_disponivel_score +
      config.decisor_principal_score +
      config.dor_principal_score
    )
  }

  if (!selectedConfig && configs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuração de Pontuação</CardTitle>
          <CardDescription>
            Nenhuma configuração encontrada. Crie sua primeira configuração.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={createNewConfig} className="w-full">
            <PlusIcon className="w-4 h-4 mr-2" />
            Criar Primeira Configuração
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Config Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Configurações de Pontuação
            <Button onClick={createNewConfig} size="sm">
              <PlusIcon className="w-4 h-4 mr-2" />
              Nova Configuração
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {configs.map((config) => (
              <Card 
                key={config.id} 
                className={`cursor-pointer transition-all ${
                  selectedConfig?.id === config.id ? 'ring-2 ring-blue-500' : ''
                } ${config.is_active ? 'border-green-500' : ''}`}
                onClick={() => setSelectedConfig(config)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{config.name}</h4>
                    {config.is_active && <Badge variant="default">Ativa</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Score máximo: {getTotalMaxScore(config)}
                  </p>
                  <div className="flex gap-2">
                    {!config.is_active && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          activateConfig(config.id)
                        }}
                      >
                        Ativar
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedConfig(config)
                        setIsEditing(true)
                      }}
                    >
                      <EditIcon className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Config Editor */}
      {selectedConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {isEditing ? 'Editando' : 'Visualizando'}: {selectedConfig.name}
              <div className="flex gap-2">
                {!isEditing && (
                  <Button onClick={() => setIsEditing(true)} variant="outline">
                    <EditIcon className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                )}
                {isEditing && (
                  <>
                    <Button 
                      onClick={() => {
                        setIsEditing(false)
                        if (!selectedConfig.id) {
                          setSelectedConfig(null)
                        }
                      }} 
                      variant="outline"
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                      <SaveIcon className="w-4 h-4 mr-2" />
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </>
                )}
              </div>
            </CardTitle>
            <CardDescription>
              Score máximo possível: <Badge>{getTotalMaxScore(selectedConfig)}</Badge>
              {selectedConfig.is_active && <Badge className="ml-2" variant="default">Configuração Ativa</Badge>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="scoring" className="space-y-4">
              <TabsList>
                <TabsTrigger value="scoring">Pontuação</TabsTrigger>
                <TabsTrigger value="assignment">Atribuição</TabsTrigger>
                <TabsTrigger value="form">Formulário</TabsTrigger>
              </TabsList>

              {/* Scoring Tab */}
              <TabsContent value="scoring" className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Configurações Gerais</Label>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="space-y-2">
                      <Label>Nome da Configuração</Label>
                      <Input
                        value={selectedConfig.name}
                        onChange={(e) => setSelectedConfig(prev => prev ? {...prev, name: e.target.value} : null)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Limite para Score Alto</Label>
                      <Input
                        type="number"
                        value={selectedConfig.low_score_threshold}
                        onChange={(e) => setSelectedConfig(prev => prev ? {...prev, low_score_threshold: Number(e.target.value)} : null)}
                        disabled={!isEditing}
                      />
                      <p className="text-xs text-muted-foreground">
                        Score {'>='} {selectedConfig.low_score_threshold} vai para closer principal
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Basic Fields */}
                <div>
                  <Label className="text-base font-medium">Dados Básicos</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        type="number"
                        value={selectedConfig.telefone_score}
                        onChange={(e) => setSelectedConfig(prev => prev ? {...prev, telefone_score: Number(e.target.value)} : null)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="number"
                        value={selectedConfig.email_score}
                        onChange={(e) => setSelectedConfig(prev => prev ? {...prev, email_score: Number(e.target.value)} : null)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Empresa</Label>
                      <Input
                        type="number"
                        value={selectedConfig.empresa_score}
                        onChange={(e) => setSelectedConfig(prev => prev ? {...prev, empresa_score: Number(e.target.value)} : null)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cargo</Label>
                      <Input
                        type="number"
                        value={selectedConfig.cargo_score}
                        onChange={(e) => setSelectedConfig(prev => prev ? {...prev, cargo_score: Number(e.target.value)} : null)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Temperature */}
                <div>
                  <Label className="text-base font-medium">Urgência/Temperatura</Label>
                  <div className="grid grid-cols-4 gap-4 mt-3">
                    <div className="space-y-2">
                      <Label>Elite</Label>
                      <Input
                        type="number"
                        value={selectedConfig.temperatura_elite_score}
                        onChange={(e) => setSelectedConfig(prev => prev ? {...prev, temperatura_elite_score: Number(e.target.value)} : null)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quente</Label>
                      <Input
                        type="number"
                        value={selectedConfig.temperatura_quente_score}
                        onChange={(e) => setSelectedConfig(prev => prev ? {...prev, temperatura_quente_score: Number(e.target.value)} : null)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Morno</Label>
                      <Input
                        type="number"
                        value={selectedConfig.temperatura_morno_score}
                        onChange={(e) => setSelectedConfig(prev => prev ? {...prev, temperatura_morno_score: Number(e.target.value)} : null)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Frio</Label>
                      <Input
                        type="number"
                        value={selectedConfig.temperatura_frio_score}
                        onChange={(e) => setSelectedConfig(prev => prev ? {...prev, temperatura_frio_score: Number(e.target.value)} : null)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Interest Level */}
                <div>
                  <Label className="text-base font-medium">Nível de Interesse</Label>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div className="space-y-2">
                      <Label>Alto</Label>
                      <Input
                        type="number"
                        value={selectedConfig.nivel_interesse_alto_score}
                        onChange={(e) => setSelectedConfig(prev => prev ? {...prev, nivel_interesse_alto_score: Number(e.target.value)} : null)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Médio</Label>
                      <Input
                        type="number"
                        value={selectedConfig.nivel_interesse_medio_score}
                        onChange={(e) => setSelectedConfig(prev => prev ? {...prev, nivel_interesse_medio_score: Number(e.target.value)} : null)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Baixo</Label>
                      <Input
                        type="number"
                        value={selectedConfig.nivel_interesse_baixo_score}
                        onChange={(e) => setSelectedConfig(prev => prev ? {...prev, nivel_interesse_baixo_score: Number(e.target.value)} : null)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Other Factors */}
                <div>
                  <Label className="text-base font-medium">Outros Fatores</Label>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div className="space-y-2">
                      <Label>Tem Orçamento</Label>
                      <Input
                        type="number"
                        value={selectedConfig.orcamento_disponivel_score}
                        onChange={(e) => setSelectedConfig(prev => prev ? {...prev, orcamento_disponivel_score: Number(e.target.value)} : null)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>É Decisor</Label>
                      <Input
                        type="number"
                        value={selectedConfig.decisor_principal_score}
                        onChange={(e) => setSelectedConfig(prev => prev ? {...prev, decisor_principal_score: Number(e.target.value)} : null)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tem Dor Principal</Label>
                      <Input
                        type="number"
                        value={selectedConfig.dor_principal_score}
                        onChange={(e) => setSelectedConfig(prev => prev ? {...prev, dor_principal_score: Number(e.target.value)} : null)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Assignment Tab */}
              <TabsContent value="assignment" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium text-orange-700">
                        Score Baixo ({'<'} {selectedConfig.low_score_threshold})
                      </Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Leads com score abaixo do limite
                      </p>
                      <Select
                        value={selectedConfig.low_score_closer_id || ''}
                        onValueChange={(value) => setSelectedConfig(prev => prev ? {...prev, low_score_closer_id: value || undefined} : null)}
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um closer" />
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

                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium text-green-700">
                        Score Alto ({'>='} {selectedConfig.low_score_threshold})
                      </Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Leads qualificados com score alto
                      </p>
                      <Select
                        value={selectedConfig.high_score_closer_id || ''}
                        onValueChange={(value) => setSelectedConfig(prev => prev ? {...prev, high_score_closer_id: value || undefined} : null)}
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um closer" />
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
                </div>
              </TabsContent>

              {/* Form Tab */}
              <TabsContent value="form" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título do Formulário</Label>
                    <Input
                      value={selectedConfig.form_title}
                      onChange={(e) => setSelectedConfig(prev => prev ? {...prev, form_title: e.target.value} : null)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição do Formulário</Label>
                    <Textarea
                      value={selectedConfig.form_description}
                      onChange={(e) => setSelectedConfig(prev => prev ? {...prev, form_description: e.target.value} : null)}
                      disabled={!isEditing}
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ScoringConfigPanel