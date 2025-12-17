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
import { automationService, funnelService, AutomationRule, Funnel, supabase } from '@/lib/supabase'
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
  Wand2,
  PlayCircle,
  PauseCircle,
  Edit3,
  Trash2,
  Reply,
  Forward,
  BarChart3,
  Target,
  Globe,
  Workflow,
  Heart
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


interface InstagramMessage {
  id: string
  from_username: string
  message: string
  timestamp: Date
  replied: boolean
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
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([])
  const [funnels, setFunnels] = useState<Funnel[]>([])

  const [messages, setMessages] = useState<InstagramMessage[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [realInsights, setRealInsights] = useState<any>(null)

  const [newRule, setNewRule] = useState({
    name: '',
    trigger: 'comment_keyword' as 'comment_keyword' | 'dm_keyword' | 'new_follower' | 'story_mention',
    keywords: '',
    response: ''
  })

  const [newFunnel, setNewFunnel] = useState({
    name: '',
    description: ''
  })

  // States para teste de automação
  const [testMessage, setTestMessage] = useState('')
  const [testUserId, setTestUserId] = useState('')
  const [testHistory, setTestHistory] = useState<any[]>([])
  const [automationLogs, setAutomationLogs] = useState<any[]>([])

  // Carregar dados reais do Instagram
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Chamada real para a API do Instagram
        const response = await fetch('/api/instagram/profile')
        if (!response.ok) {
          throw new Error('Failed to fetch profile')
        }
        const data = await response.json()
        setProfile(data)
        toast.success('Conectado ao Instagram com sucesso!')

        // Carregar insights da conta
        try {
          const insightsResponse = await fetch('/api/instagram/insights')
          if (insightsResponse.ok) {
            const insights = await insightsResponse.json()
            setRealInsights(insights)
            setProfile(prev => prev ? { ...prev, ...insights } : null)
          }
        } catch (insightsError) {
          console.log('Insights not available:', insightsError)
        }

        // Carregar posts reais
        try {
          const postsResponse = await fetch('/api/instagram/media?limit=10')
          if (postsResponse.ok) {
            const postsData = await postsResponse.json()
            setPosts(postsData.data || [])
          }
        } catch (postsError) {
          console.log('Posts not available:', postsError)
        }

      } catch (error) {
        console.error('Error loading Instagram profile:', error)
        toast.error('Erro ao conectar com Instagram. Verifique os tokens no .env')
        // Fallback para dados simulados se a API falhar
        setProfile({
          id: 'instagram_user_id',
          username: 'meu_instagram',
          account_type: 'BUSINESS',
          media_count: 156,
          followers_count: 5420,
          following_count: 1203
        })
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
    loadAutomations()
    loadFunnels()
  }, [])

  const loadAutomations = async () => {
    try {
      const data = await automationService.getAll()
      setAutomationRules(data)
    } catch (error) {
      console.error('Error loading automations:', error)
      toast.error('Erro ao carregar automações')
    }
  }

  const loadFunnels = async () => {
    try {
      const data = await funnelService.getAll()
      setFunnels(data)
    } catch (error) {
      console.error('Error loading funnels:', error)
      toast.error('Erro ao carregar funis')
    }
  }

  const createAutomationRule = async () => {
    if (!newRule.name || !newRule.response) return

    try {
      const automationData = {
        name: newRule.name,
        trigger_type: newRule.trigger,
        keywords: newRule.keywords.split(',').map(k => k.trim()).filter(Boolean),
        response_message: newRule.response,
        is_active: true,
        responses_sent: 0
      }

      const created = await automationService.create(automationData)

      setAutomationRules(prev => [created, ...prev])
      setNewRule({ name: '', trigger: 'comment_keyword', keywords: '', response: '' })
      toast.success('Regra de automação criada!')
    } catch (error) {
      console.error('Error creating automation:', error)
      toast.error('Erro ao criar automação')
    }
  }

  const toggleRuleStatus = async (ruleId: string) => {
    try {
      const updated = await automationService.toggleActive(ruleId)
      setAutomationRules(prev =>
        prev.map(rule =>
          rule.id === ruleId ? { ...rule, isActive: updated.is_active } : rule
        )
      )
      toast.success('Status da automação atualizado!')
    } catch (error) {
      console.error('Error toggling automation status:', error)
      toast.error('Erro ao atualizar status da automação')
    }
  }

  const createFunnel = async () => {
    if (!newFunnel.name) return

    try {
      const funnelData = {
        name: newFunnel.name,
        description: newFunnel.description,
        is_active: false,
        leads_count: 0,
        conversions_count: 0
      }

      const created = await funnelService.create(funnelData)

      setFunnels(prev => [created, ...prev])
      setNewFunnel({ name: '', description: '' })
      toast.success('Funil criado! Configure os passos para ativá-lo.')
    } catch (error) {
      console.error('Error creating funnel:', error)
      toast.error('Erro ao criar funil')
    }
  }

  const toggleFunnelStatus = async (funnelId: string) => {
    try {
      const current = funnels.find(f => f.id === funnelId)
      if (!current) return

      const updated = await funnelService.update(funnelId, {
        is_active: !current.is_active
      })

      setFunnels(prev =>
        prev.map(funnel =>
          funnel.id === funnelId ? { ...funnel, isActive: updated.is_active } : funnel
        )
      )
      toast.success('Status do funil atualizado!')
    } catch (error) {
      console.error('Error toggling funnel status:', error)
      toast.error('Erro ao atualizar status do funil')
    }
  }

  // Função para simular mensagem de teste
  const simulateMessage = async () => {
    if (!testMessage.trim()) return

    const userId = testUserId || 'test_user_123'

    try {
      // Simular recebimento de mensagem testando automações localmente
      const messageText = testMessage.toLowerCase()
      let automationTriggered = false
      let triggeredRule: any = null
      let matchedKeyword = ''

      // Verificar se alguma automação seria ativada
      for (const rule of automationRules) {
        if (!rule.is_active || rule.trigger_type !== 'dm_keyword') continue

        const keywords = rule.keywords || []
        const keyword = keywords.find((k: string) =>
          messageText.includes(k.toLowerCase())
        )

        if (keyword) {
          automationTriggered = true
          triggeredRule = rule
          matchedKeyword = keyword
          break
        }
      }

      // Adicionar ao histórico
      const testResult = {
        timestamp: Date.now(),
        message: testMessage,
        userId: userId,
        triggered: automationTriggered,
        rule_name: triggeredRule?.name,
        response: triggeredRule?.response_message,
        keyword: matchedKeyword
      }

      setTestHistory(prev => [testResult, ...prev])

      // Se tiver automação, simular log
      if (automationTriggered && triggeredRule) {
        const logEntry = {
          automation_rule_id: triggeredRule.id,
          trigger_keyword: matchedKeyword,
          response_sent: triggeredRule.response_message,
          status: 'sent', // Simulando sucesso
          executed_at: new Date().toISOString(),
          error_message: null
        }
        setAutomationLogs(prev => [logEntry, ...prev])
      }

      // Limpar campo
      setTestMessage('')

      if (automationTriggered) {
        toast.success(`Automação "${triggeredRule.name}" seria ativada!`)
      } else {
        toast.info('Nenhuma automação seria ativada com esta mensagem')
      }

    } catch (error) {
      console.error('Erro ao simular mensagem:', error)
      toast.error('Erro ao simular mensagem')
    }
  }

  // Carregar logs reais
  const loadAutomationLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('instagram_automation_logs')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setAutomationLogs(data || [])
    } catch (error) {
      console.error('Erro ao carregar logs:', error)
    }
  }

  // Carregar mensagens do Instagram
  const loadInstagramMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('instagram_messages')
        .select('*')
        .eq('is_incoming', true)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      // Mapear para o formato esperado pela interface
      const formattedMessages = (data || []).map((msg: any) => ({
        id: msg.id,
        from_username: msg.sender_id, // Usaremos o ID por enquanto
        message: msg.content || '(sem texto)',
        timestamp: new Date(msg.created_at),
        replied: msg.automation_triggered || false
      }))

      setMessages(formattedMessages)
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
    }
  }

  // Carregar logs e mensagens na inicialização
  useEffect(() => {
    loadAutomationLogs()
    loadInstagramMessages()
  }, [])

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
    <div className="h-full bg-gray-900 text-white flex flex-col">
      <div className="flex-1 p-6 overflow-y-auto">
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
                    {automationRules.filter(r => r.is_active).length}
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
                  <p className="text-sm text-gray-400">Total de Posts</p>
                  <p className="text-2xl font-bold text-[#D4AF37]">
                    {profile?.media_count || 0}
                  </p>
                </div>
                <Instagram className="h-8 w-8 text-[#D4AF37]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:border-[#D4AF37]/30 transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Funis Ativos</p>
                  <p className="text-2xl font-bold text-[#D4AF37]">
                    {funnels.filter(f => f.is_active).length}
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
                  <p className="text-sm text-gray-400">Total de Likes</p>
                  <p className="text-2xl font-bold text-[#D4AF37]">
                    {posts.reduce((acc, post) => acc + (post.like_count || 0), 0)}
                  </p>
                </div>
                <Heart className="h-8 w-8 text-[#D4AF37]" />
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
            <TabsTrigger value="test-chat" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-gray-900">
              <Wand2 className="h-4 w-4 mr-2" />
              Teste Automação
            </TabsTrigger>
            <TabsTrigger value="posts" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-gray-900">
              <Instagram className="h-4 w-4 mr-2" />
              Posts Reais
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
                    <Select value={newRule.trigger} onValueChange={(value: 'comment_keyword' | 'dm_keyword' | 'new_follower' | 'story_mention') => setNewRule(prev => ({ ...prev, trigger: value }))}>
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
                                  rule.trigger_type === 'comment_keyword' ? 'Comentário com palavra-chave' :
                                  rule.trigger_type === 'dm_keyword' ? 'DM com palavra-chave' :
                                  rule.trigger_type === 'new_follower' ? 'Novo seguidor' : 'Menção em story'
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
                              <Badge className={rule.is_active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}>
                                {rule.is_active ? 'Ativa' : 'Inativa'}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleRuleStatus(rule.id)}
                                className="text-gray-400 hover:text-white"
                              >
                                {rule.is_active ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>

                          <div className="bg-gray-800 p-3 rounded border-l-4 border-[#D4AF37] mb-3">
                            <p className="text-gray-300 text-sm">{rule.response_message}</p>
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{rule.responses_sent} respostas enviadas</span>
                            <span>Criada em {new Date(rule.created_at).toLocaleDateString()}</span>
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
                              <p className="text-xs text-gray-500 mt-2">
                                {funnel.leads_count} leads | {funnel.conversions_count} conversões
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={funnel.is_active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}>
                                {funnel.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleFunnelStatus(funnel.id)}
                                className="text-gray-400 hover:text-white"
                              >
                                {funnel.is_active ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mt-4">
                            <div className="text-center">
                              <p className="text-lg font-bold text-[#D4AF37]">{funnel.leads_count}</p>
                              <p className="text-xs text-gray-400">Leads</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-green-400">{funnel.conversions_count}</p>
                              <p className="text-xs text-gray-400">Conversões</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-blue-400">
                                {funnel.leads_count > 0 ? Math.round((funnel.conversions_count / funnel.leads_count) * 100) : 0}%
                              </p>
                              <p className="text-xs text-gray-400">Taxa</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
                            <span>Criado em {new Date(funnel.created_at).toLocaleDateString()}</span>
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

          {/* Posts Reais Tab */}
          <TabsContent value="posts">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Instagram className="h-5 w-5 mr-2 text-[#D4AF37]" />
                  Seus Posts do Instagram
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Posts reais da sua conta conectada
                </CardDescription>
              </CardHeader>
              <CardContent>
                {posts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {posts.map((post) => (
                      <div key={post.id} className="bg-gray-700 rounded-lg border border-gray-600 overflow-hidden">
                        {post.media_url && (
                          <img
                            src={post.media_url}
                            alt="Instagram post"
                            className="w-full h-48 object-cover"
                          />
                        )}
                        <div className="p-4">
                          {post.caption && (
                            <p className="text-sm text-gray-300 mb-2 line-clamp-3">
                              {post.caption.length > 100
                                ? `${post.caption.substring(0, 100)}...`
                                : post.caption}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center space-x-3">
                              {post.like_count && (
                                <div className="flex items-center">
                                  <Heart className="h-3 w-3 mr-1 text-red-500" />
                                  {post.like_count}
                                </div>
                              )}
                              {post.comments_count && (
                                <div className="flex items-center">
                                  <MessageCircle className="h-3 w-3 mr-1 text-blue-500" />
                                  {post.comments_count}
                                </div>
                              )}
                            </div>
                            <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Instagram className="h-12 w-12 mx-auto mb-4 text-[#D4AF37]" />
                    <p>Nenhum post encontrado</p>
                    <p className="text-sm">Verifique sua conexão com o Instagram</p>
                  </div>
                )}
              </CardContent>
            </Card>
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
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">
                        Nenhuma mensagem recebida ainda
                      </p>
                      <p className="text-gray-500 text-sm">
                        As mensagens aparecerão aqui quando alguém enviar um DM
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => (
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
                    ))
                  )}
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
                          <span className="text-[#D4AF37] font-bold">{funnel.conversions_count}</span>
                          <span className="text-gray-400 text-sm">
                            ({funnel.leads_count > 0 ? Math.round((funnel.conversions_count / funnel.leads_count) * 100) : 0}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Aba de Teste de Automação */}
          <TabsContent value="test-chat">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Simulador de Chat */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2 text-[#D4AF37]" />
                    Simulador de Mensagem
                  </CardTitle>
                  <p className="text-gray-400 text-sm">
                    Teste suas automações enviando mensagens simuladas
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white">Simular mensagem de usuário:</Label>
                      <Input
                        placeholder="Digite uma mensagem para testar..."
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-white">ID do usuário (opcional):</Label>
                      <Input
                        placeholder="Deixe vazio para usar ID padrão"
                        value={testUserId}
                        onChange={(e) => setTestUserId(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white mt-1"
                      />
                    </div>
                    <Button
                      onClick={simulateMessage}
                      disabled={!testMessage.trim()}
                      className="w-full"
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Simular Mensagem
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Histórico de Testes */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-[#D4AF37]" />
                    Histórico de Testes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {testHistory.length === 0 ? (
                      <p className="text-gray-400 text-center py-4">
                        Nenhum teste executado ainda
                      </p>
                    ) : (
                      testHistory.map((test, index) => (
                        <div key={index} className="bg-gray-700 p-3 rounded space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="text-blue-300 text-sm font-medium">
                              Mensagem #{index + 1}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {new Date(test.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-white text-sm">
                            📤 <strong>Enviada:</strong> "{test.message}"
                          </p>
                          {test.triggered ? (
                            <div className="border-l-4 border-green-500 pl-3">
                              <p className="text-green-400 text-sm">
                                ✅ <strong>Automação ativada:</strong> "{test.rule_name}"
                              </p>
                              <p className="text-gray-300 text-sm">
                                📥 <strong>Resposta:</strong> "{test.response}"
                              </p>
                              <p className="text-yellow-400 text-xs">
                                🎯 Palavra-chave: "{test.keyword}"
                              </p>
                            </div>
                          ) : (
                            <p className="text-gray-400 text-sm">
                              ⚪ Nenhuma automação foi ativada
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Logs de Automação */}
              <Card className="bg-gray-800 border-gray-700 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-[#D4AF37]" />
                    Logs de Automação Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {automationLogs.length === 0 ? (
                      <p className="text-gray-400 text-center py-4">
                        Nenhum log disponível
                      </p>
                    ) : (
                      automationLogs.map((log, index) => (
                        <div key={index} className={`flex items-center justify-between p-2 rounded ${
                          log.status === 'sent' ? 'bg-green-900/30 border border-green-700' :
                          log.status === 'failed' ? 'bg-red-900/30 border border-red-700' :
                          'bg-yellow-900/30 border border-yellow-700'
                        }`}>
                          <div className="flex-1">
                            <span className="text-white text-sm">
                              {log.trigger_keyword} → "{log.response_sent?.substring(0, 50)}..."
                            </span>
                            {log.error_message && (
                              <p className="text-red-400 text-xs mt-1">{log.error_message}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              log.status === 'sent' ? 'bg-green-600 text-white' :
                              log.status === 'failed' ? 'bg-red-600 text-white' :
                              'bg-yellow-600 text-white'
                            }`}>
                              {log.status === 'sent' ? 'Enviado' : log.status === 'failed' ? 'Falhou' : 'Pendente'}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {new Date(log.executed_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
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