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
import { automationService, funnelService, AutomationRule, Funnel } from '@/lib/supabase'
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
      setAutomationRules(data.map(item => ({
        id: item.id,
        name: item.name,
        trigger: item.trigger_type,
        keywords: item.keywords || [],
        response: item.response_message,
        isActive: item.is_active,
        created: new Date(item.created_at),
        responses_sent: item.responses_sent
      })))
    } catch (error) {
      console.error('Error loading automations:', error)
      toast.error('Erro ao carregar automações')
    }
  }

  const loadFunnels = async () => {
    try {
      const data = await funnelService.getAll()
      setFunnels(data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        steps: [],
        isActive: item.is_active,
        leads: item.leads_count,
        conversions: item.conversions_count,
        created: new Date(item.created_at)
      })))
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

      const rule: AutomationRule = {
        id: created.id,
        name: created.name,
        trigger: created.trigger_type,
        keywords: created.keywords || [],
        response: created.response_message,
        isActive: created.is_active,
        created: new Date(created.created_at),
        responses_sent: created.responses_sent
      }

      setAutomationRules(prev => [rule, ...prev])
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

      const funnel: Funnel = {
        id: created.id,
        name: created.name,
        description: created.description || '',
        steps: [],
        isActive: created.is_active,
        leads: created.leads_count,
        conversions: created.conversions_count,
        created: new Date(created.created_at)
      }

      setFunnels(prev => [funnel, ...prev])
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
        is_active: !current.isActive
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