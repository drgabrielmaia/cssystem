'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Instagram,
  MessageCircle,
  Send,
  Users,
  TrendingUp,
  Zap,
  Bot,
  Settings,
  Plus,
  Eye,
  Clock,
  Filter,
  MessageSquare,
  AutoFix,
  PlayCircle,
  PauseCircle,
  Edit3,
  Trash2,
  Reply,
  Forward,
  BarChart3,
  Target,
  Globe,
  Workflow
} from 'lucide-react'
import { toast } from 'sonner'

interface InstagramProfile {
  id: string
  username: string
  account_type: string
  media_count: number
  followers_count?: number
  following_count?: number
}

interface AutomationRule {
  id: string
  name: string
  trigger: 'comment_keyword' | 'dm_keyword' | 'new_follower' | 'story_mention'
  keywords: string[]
  response: string
  isActive: boolean
  created: Date
  responses_sent: number
}

interface InstagramMessage {
  id: string
  from_username: string
  message: string
  timestamp: Date
  replied: boolean
}

interface Funnel {
  id: string
  name: string
  description: string
  steps: FunnelStep[]
  isActive: boolean
  leads: number
  conversions: number
  created: Date
}

interface FunnelStep {
  id: string
  type: 'message' | 'delay' | 'condition' | 'action'
  content?: string
  delay?: number
  condition?: string
  action?: string
  nextStep?: string
}

export default function InstagramAutomationPage() {
  const [profile, setProfile] = useState<InstagramProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([
    {
      id: '1',
      name: 'Resposta Automática - Info',
      trigger: 'comment_keyword',
      keywords: ['info', 'informação', 'detalhes', 'mais informações'],
      response: 'Olá! Te enviei mais informações no seu DM 📩 Confere lá!',
      isActive: true,
      created: new Date('2024-01-10'),
      responses_sent: 45
    },
    {
      id: '2',
      name: 'Boas-vindas Novos Seguidores',
      trigger: 'new_follower',
      keywords: [],
      response: 'Obrigado por nos seguir! 🙏 Que tal conhecer nossos produtos? Digite CATALOGO e te mando tudo!',
      isActive: true,
      created: new Date('2024-01-08'),
      responses_sent: 128
    }
  ])

  const [funnels, setFunnels] = useState<Funnel[]>([
    {
      id: '1',
      name: 'Funil de Vendas Principal',
      description: 'Conversão de interessados em clientes',
      isActive: true,
      leads: 342,
      conversions: 89,
      created: new Date('2024-01-05'),
      steps: [
        { id: '1', type: 'message', content: 'Olá! Vi que você tem interesse em nossos produtos 😊' },
        { id: '2', type: 'delay', delay: 5 },
        { id: '3', type: 'message', content: 'Te envio nosso catálogo completo aqui no DM!' },
        { id: '4', type: 'action', action: 'send_catalog' }
      ]
    },
    {
      id: '2',
      name: 'Recuperação de Carrinho',
      description: 'Para usuários que não finalizaram compra',
      isActive: false,
      leads: 156,
      conversions: 23,
      created: new Date('2024-01-12'),
      steps: [
        { id: '1', type: 'message', content: 'Oi! Vi que você ficou interessado em nosso produto 🛒' },
        { id: '2', type: 'delay', delay: 10 },
        { id: '3', type: 'message', content: 'Que tal finalizar sua compra? Tenho um desconto especial para você!' }
      ]
    }
  ])

  const [messages, setMessages] = useState<InstagramMessage[]>([
    {
      id: '1',
      from_username: 'cliente1',
      message: 'Olá, gostaria de saber mais sobre os produtos',
      timestamp: new Date(),
      replied: false
    },
    {
      id: '2',
      from_username: 'prospect2',
      message: 'Vocês fazem entrega?',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      replied: true
    }
  ])

  const [newRule, setNewRule] = useState({
    name: '',
    trigger: 'comment_keyword' as AutomationRule['trigger'],
    keywords: '',
    response: ''
  })

  const [newFunnel, setNewFunnel] = useState({
    name: '',
    description: ''
  })

  // Simular carregamento do perfil do Instagram
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Aqui você faria a chamada real para /api/instagram/profile
        // const response = await fetch('/api/instagram/profile')
        // const data = await response.json()

        // Por enquanto, dados simulados
        setProfile({
          id: 'instagram_user_id',
          username: 'meu_instagram',
          account_type: 'BUSINESS',
          media_count: 156,
          followers_count: 5420,
          following_count: 1203
        })
      } catch (error) {
        console.error('Error loading profile:', error)
        toast.error('Erro ao carregar perfil do Instagram')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const createAutomationRule = () => {
    if (!newRule.name || !newRule.response) return

    const rule: AutomationRule = {
      id: Date.now().toString(),
      name: newRule.name,
      trigger: newRule.trigger,
      keywords: newRule.keywords.split(',').map(k => k.trim()).filter(Boolean),
      response: newRule.response,
      isActive: true,
      created: new Date(),
      responses_sent: 0
    }

    setAutomationRules(prev => [rule, ...prev])
    setNewRule({ name: '', trigger: 'comment_keyword', keywords: '', response: '' })
    toast.success('Regra de automação criada!')
  }

  const toggleRuleStatus = (ruleId: string) => {
    setAutomationRules(prev =>
      prev.map(rule =>
        rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
      )
    )
  }

  const createFunnel = () => {
    if (!newFunnel.name) return

    const funnel: Funnel = {
      id: Date.now().toString(),
      name: newFunnel.name,
      description: newFunnel.description,
      steps: [],
      isActive: false,
      leads: 0,
      conversions: 0,
      created: new Date()
    }

    setFunnels(prev => [funnel, ...prev])
    setNewFunnel({ name: '', description: '' })
    toast.success('Funil criado! Configure os passos para ativá-lo.')
  }

  const toggleFunnelStatus = (funnelId: string) => {
    setFunnels(prev =>
      prev.map(funnel =>
        funnel.id === funnelId ? { ...funnel, isActive: !funnel.isActive } : funnel
      )
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Instagram className="h-12 w-12 text-[#D4AF37] mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Conectando com Instagram...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#FFD700] shadow-lg">
              <Instagram className="h-6 w-6 text-gray-900" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Instagram Automação</h1>
              <p className="text-gray-400">
                {profile ? `@${profile.username} • ${profile.followers_count?.toLocaleString() || 0} seguidores` : 'Conectado'}
              </p>
            </div>
          </div>
          <Badge className="bg-green-900 text-green-300 px-4 py-2">
            <Globe className="h-4 w-4 mr-2" />
            Conectado
          </Badge>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700 hover:border-[#D4AF37]/30 transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Automações Ativas</p>
                  <p className="text-2xl font-bold text-[#D4AF37]">
                    {automationRules.filter(r => r.isActive).length}
                  </p>
                </div>
                <Bot className="h-8 w-8 text-[#D4AF37]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:border-[#D4AF37]/30 transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Mensagens Enviadas</p>
                  <p className="text-2xl font-bold text-[#D4AF37]">
                    {automationRules.reduce((acc, rule) => acc + rule.responses_sent, 0)}
                  </p>
                </div>
                <Send className="h-8 w-8 text-[#D4AF37]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:border-[#D4AF37]/30 transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Funis Ativos</p>
                  <p className="text-2xl font-bold text-[#D4AF37]">
                    {funnels.filter(f => f.isActive).length}
                  </p>
                </div>
                <Workflow className="h-8 w-8 text-[#D4AF37]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:border-[#D4AF37]/30 transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Taxa de Conversão</p>
                  <p className="text-2xl font-bold text-[#D4AF37]">
                    {funnels.length > 0 ? Math.round((funnels.reduce((acc, f) => acc + f.conversions, 0) / funnels.reduce((acc, f) => acc + f.leads, 1)) * 100) : 0}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-[#D4AF37]" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="automations" className="space-y-6">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="automations" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-gray-900">
              <Bot className="h-4 w-4 mr-2" />
              Automações
            </TabsTrigger>
            <TabsTrigger value="funnels" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-gray-900">
              <Workflow className="h-4 w-4 mr-2" />
              Funis
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-gray-900">
              <MessageCircle className="h-4 w-4 mr-2" />
              Mensagens
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-gray-900">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Automations Tab */}
          <TabsContent value="automations">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Create New Automation */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Plus className="h-5 w-5 mr-2 text-[#D4AF37]" />
                    Nova Automação
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Crie regras para responder automaticamente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="ruleName" className="text-gray-300">Nome da Regra</Label>
                    <Input
                      id="ruleName"
                      placeholder="Ex: Resposta Info"
                      value={newRule.name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="trigger" className="text-gray-300">Gatilho</Label>
                    <Select value={newRule.trigger} onValueChange={(value: AutomationRule['trigger']) => setNewRule(prev => ({ ...prev, trigger: value }))}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="comment_keyword">Palavra-chave em comentário</SelectItem>
                        <SelectItem value="dm_keyword">Palavra-chave em DM</SelectItem>
                        <SelectItem value="new_follower">Novo seguidor</SelectItem>
                        <SelectItem value="story_mention">Menção em story</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(newRule.trigger === 'comment_keyword' || newRule.trigger === 'dm_keyword') && (
                    <div>
                      <Label htmlFor="keywords" className="text-gray-300">Palavras-chave (separadas por vírgula)</Label>
                      <Input
                        id="keywords"
                        placeholder="info, detalhes, preço"
                        value={newRule.keywords}
                        onChange={(e) => setNewRule(prev => ({ ...prev, keywords: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="response" className="text-gray-300">Resposta Automática</Label>
                    <Textarea
                      id="response"
                      placeholder="Olá! Te envio mais informações no DM..."
                      value={newRule.response}
                      onChange={(e) => setNewRule(prev => ({ ...prev, response: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={createAutomationRule}
                    className="w-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-gray-900 font-semibold hover:from-[#B8860B] hover:to-[#D4AF37]"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Criar Automação
                  </Button>
                </CardContent>
              </Card>

              {/* Automation Rules List */}
              <div className="lg:col-span-2">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Bot className="h-5 w-5 mr-2 text-[#D4AF37]" />
                      Regras de Automação
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {automationRules.map((rule) => (
                        <div key={rule.id} className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-white font-semibold">{rule.name}</h3>
                              <p className="text-sm text-gray-400 mt-1">
                                Gatilho: {
                                  rule.trigger === 'comment_keyword' ? 'Comentário com palavra-chave' :
                                  rule.trigger === 'dm_keyword' ? 'DM com palavra-chave' :
                                  rule.trigger === 'new_follower' ? 'Novo seguidor' : 'Menção em story'
                                }
                              </p>
                              {rule.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {rule.keywords.map((keyword, i) => (
                                    <Badge key={i} variant="outline" className="text-xs text-[#D4AF37] border-[#D4AF37]">
                                      {keyword}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={rule.isActive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}>
                                {rule.isActive ? 'Ativa' : 'Inativa'}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleRuleStatus(rule.id)}
                                className="text-gray-400 hover:text-white"
                              >
                                {rule.isActive ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>

                          <div className="bg-gray-800 p-3 rounded border-l-4 border-[#D4AF37] mb-3">
                            <p className="text-gray-300 text-sm">{rule.response}</p>
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{rule.responses_sent} respostas enviadas</span>
                            <span>Criada em {rule.created.toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Funnels Tab */}
          <TabsContent value="funnels">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Create New Funnel */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Plus className="h-5 w-5 mr-2 text-[#D4AF37]" />
                    Novo Funil
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Crie sequências automáticas de mensagens
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="funnelName" className="text-gray-300">Nome do Funil</Label>
                    <Input
                      id="funnelName"
                      placeholder="Ex: Funil de Vendas"
                      value={newFunnel.name}
                      onChange={(e) => setNewFunnel(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="funnelDescription" className="text-gray-300">Descrição</Label>
                    <Textarea
                      id="funnelDescription"
                      placeholder="Descreva o objetivo deste funil..."
                      value={newFunnel.description}
                      onChange={(e) => setNewFunnel(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={createFunnel}
                    className="w-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-gray-900 font-semibold hover:from-[#B8860B] hover:to-[#D4AF37]"
                  >
                    <Workflow className="h-4 w-4 mr-2" />
                    Criar Funil
                  </Button>
                </CardContent>
              </Card>

              {/* Funnels List */}
              <div className="lg:col-span-2">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Workflow className="h-5 w-5 mr-2 text-[#D4AF37]" />
                      Funis de Automação
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {funnels.map((funnel) => (
                        <div key={funnel.id} className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-white font-semibold">{funnel.name}</h3>
                              <p className="text-sm text-gray-400 mt-1">{funnel.description}</p>
                              <p className="text-xs text-gray-500 mt-2">{funnel.steps.length} passos configurados</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={funnel.isActive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}>
                                {funnel.isActive ? 'Ativo' : 'Inativo'}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleFunnelStatus(funnel.id)}
                                className="text-gray-400 hover:text-white"
                              >
                                {funnel.isActive ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mt-4">
                            <div className="text-center">
                              <p className="text-lg font-bold text-[#D4AF37]">{funnel.leads}</p>
                              <p className="text-xs text-gray-400">Leads</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-green-400">{funnel.conversions}</p>
                              <p className="text-xs text-gray-400">Conversões</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-blue-400">
                                {funnel.leads > 0 ? Math.round((funnel.conversions / funnel.leads) * 100) : 0}%
                              </p>
                              <p className="text-xs text-gray-400">Taxa</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
                            <span>Criado em {funnel.created.toLocaleDateString()}</span>
                            <Button size="sm" variant="ghost" className="text-[#D4AF37] hover:text-white">
                              <Edit3 className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <MessageCircle className="h-5 w-5 mr-2 text-[#D4AF37]" />
                  Mensagens Diretas
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Gerencie conversas e respostas automáticas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-semibold text-white">@{message.from_username}</span>
                            <Badge className={message.replied ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}>
                              {message.replied ? 'Respondida' : 'Pendente'}
                            </Badge>
                          </div>
                          <p className="text-gray-300">{message.message}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {message.timestamp.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="ghost" className="text-[#D4AF37] hover:text-white">
                            <Reply className="h-4 w-4 mr-1" />
                            Responder
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-[#D4AF37]" />
                    Performance de Automações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-gray-400">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-[#D4AF37]" />
                    <p>Gráficos de performance em desenvolvimento</p>
                    <p className="text-sm">Analytics detalhados em breve</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Target className="h-5 w-5 mr-2 text-[#D4AF37]" />
                    Conversões por Funil
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {funnels.map((funnel) => (
                      <div key={funnel.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                        <span className="text-white">{funnel.name}</span>
                        <div className="flex items-center space-x-3">
                          <span className="text-[#D4AF37] font-bold">{funnel.conversions}</span>
                          <span className="text-gray-400 text-sm">
                            ({funnel.leads > 0 ? Math.round((funnel.conversions / funnel.leads) * 100) : 0}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}