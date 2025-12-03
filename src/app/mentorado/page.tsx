'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UserCheck, Mail, Eye, EyeOff, LogIn, Plus, TrendingUp, DollarSign, BarChart3, Activity, Trophy, Target, Zap, Gift, Star, Award, Crown, Flame, Rocket, Diamond } from 'lucide-react'

export default function MentoradoLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [mentorado, setMentorado] = useState<any>(null)
  const [indicacoes, setIndicacoes] = useState<any[]>([])
  const [comissoes, setComissoes] = useState<any[]>([])
  const [showNewIndicacao, setShowNewIndicacao] = useState(false)
  const [showBadges, setShowBadges] = useState(false)
  const [novaIndicacao, setNovaIndicacao] = useState({
    nome_completo: '',
    telefone: '',
    observacoes: ''
  })
  const router = useRouter()

  // Verificar se já está logado
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        // Buscar dados do mentorado
        const { data: mentoradoData, error } = await supabase
          .from('mentorados')
          .select('*')
          .eq('email', session.user.email)
          .eq('status_login', 'ativo')
          .single()

        if (mentoradoData && !error) {
          setMentorado(mentoradoData)
          setIsLoggedIn(true)
          localStorage.setItem('mentorado', JSON.stringify(mentoradoData))
          loadIndicacoes(mentoradoData.id)
        } else {
          await supabase.auth.signOut()
        }
      } else {
        // Verificar localStorage como fallback
        const savedMentorado = localStorage.getItem('mentorado')
        if (savedMentorado) {
          const mentoradoData = JSON.parse(savedMentorado)
          setMentorado(mentoradoData)
          setIsLoggedIn(true)
          loadIndicacoes(mentoradoData.id)
        }
      }
    }

    checkAuth()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Fazer login com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (authError) {
        alert('Email ou senha incorretos')
        return
      }

      // Buscar dados do mentorado
      const { data: mentoradoData, error: mentoradoError } = await supabase
        .from('mentorados')
        .select('*')
        .eq('email', email)
        .eq('status_login', 'ativo')
        .single()

      if (mentoradoError || !mentoradoData) {
        alert('Conta não encontrada ou inativa')
        await supabase.auth.signOut()
        return
      }

      // Login bem-sucedido
      setMentorado(mentoradoData)
      setIsLoggedIn(true)
      localStorage.setItem('mentorado', JSON.stringify(mentoradoData))
      await loadIndicacoes(mentoradoData.id)

    } catch (error) {
      console.error('Erro no login:', error)
      alert('Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const loadIndicacoes = async (mentoradoId: string) => {
    try {
      console.log('🔍 Carregando indicações para mentorado:', mentoradoId)

      // Tentar buscar por diferentes campos possíveis
      let data, error

      // Primeira tentativa: campo indicado_por
      const result1 = await supabase
        .from('leads')
        .select('*')
        .eq('indicado_por', mentoradoId)
        .order('created_at', { ascending: false })

      // Segunda tentativa: campo mentorado_indicador_id
      const result2 = await supabase
        .from('leads')
        .select('*')
        .eq('mentorado_indicador_id', mentoradoId)
        .order('created_at', { ascending: false })

      // Usar o resultado que trouxe mais dados
      if (result1.data && result1.data.length > 0) {
        data = result1.data
        error = result1.error
        console.log('✅ Indicações encontradas via indicado_por:', data.length)
      } else if (result2.data && result2.data.length > 0) {
        data = result2.data
        error = result2.error
        console.log('✅ Indicações encontradas via mentorado_indicador_id:', data.length)
      } else {
        data = []
        console.log('⚠️ Nenhuma indicação encontrada para este mentorado')
      }

      if (error) throw error
      setIndicacoes(data || [])

      // Carregar comissões reais do banco
      await loadComissoes(mentoradoId)
    } catch (error) {
      console.error('Erro ao carregar indicações:', error)
      setIndicacoes([]) // Fallback para lista vazia
    }
  }

  const loadComissoes = async (mentoradoId: string) => {
    try {
      console.log('🔍 Carregando comissões para mentorado:', mentoradoId)

      const { data, error } = await supabase
        .from('comissoes')
        .select('*')
        .eq('mentorado_id', mentoradoId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro na query de comissões:', error)
        throw error
      }

      console.log('📊 Comissões encontradas:', data?.length || 0)
      setComissoes(data || [])

      // Se temos comissões, buscar dados dos leads separadamente
      if (data && data.length > 0) {
        const leadIds = data.map(c => c.lead_id).filter(Boolean)
        if (leadIds.length > 0) {
          const { data: leadsData, error: leadsError } = await supabase
            .from('leads')
            .select('id, nome_completo, telefone, status, valor_vendido, data_primeiro_contato, convertido_em')
            .in('id', leadIds)

          if (leadsError) {
            console.error('Erro ao buscar leads:', leadsError)
          } else {
            // Associar dados dos leads às comissões
            const comissoesComLeads = data.map(comissao => ({
              ...comissao,
              lead_info: leadsData?.find(lead => lead.id === comissao.lead_id)
            }))
            setComissoes(comissoesComLeads)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar comissões:', error)
      setComissoes([]) // Fallback para lista vazia
    }
  }

  const handleNovaIndicacao = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const leadData = {
        nome_completo: novaIndicacao.nome_completo,
        telefone: novaIndicacao.telefone,
        status: 'novo',
        origem: 'indicacao',
        origem_detalhada: `Indicado por: ${mentorado.nome_completo} (${mentorado.email})`,
        observacoes: novaIndicacao.observacoes,
        indicado_por: mentorado.id,
        mentorado_indicador_id: mentorado.id, // Campo adicional
        data_primeiro_contato: new Date().toISOString()
      }

      const { error } = await supabase
        .from('leads')
        .insert([leadData])

      if (error) throw error

      alert('Indicação enviada com sucesso!')
      setNovaIndicacao({ nome_completo: '', telefone: '', observacoes: '' })
      setShowNewIndicacao(false)
      await loadIndicacoes(mentorado.id)

    } catch (error) {
      console.error('Erro ao enviar indicação:', error)
      alert('Erro ao enviar indicação')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('mentorado')
      setIsLoggedIn(false)
      setMentorado(null)
      setIndicacoes([])
      setEmail('')
      setPassword('')
      // Force page reload to ensure complete logout
      window.location.reload()
    } catch (error) {
      console.error('Erro no logout:', error)
      // Force logout even if there's an error
      localStorage.removeItem('mentorado')
      setIsLoggedIn(false)
      window.location.reload()
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'novo': 'bg-blue-100 text-blue-800',
      'call_agendada': 'bg-yellow-100 text-yellow-800',
      'proposta_enviada': 'bg-purple-100 text-purple-800',
      'vendido': 'bg-green-100 text-green-800',
      'perdido': 'bg-red-100 text-red-800',
      'no_show': 'bg-gray-100 text-gray-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const calcularComissaoEscalonada = (vendas: number) => {
    if (vendas >= 11) return 20
    if (vendas >= 6) return 15
    if (vendas >= 4) return 10
    if (vendas >= 1) return 5
    return 5 // padrão para quem ainda não vendeu
  }

  const calcularComissao = () => {
    const vendidos = indicacoes.filter(lead => lead.status === 'vendido')
    const numeroVendas = vendidos.length
    const totalVendas = vendidos.reduce((sum, lead) => sum + (lead.valor_vendido || 0), 0)

    // Usar comissões reais do banco de dados
    const comissaoTotal = comissoes.reduce((sum, comissao) => sum + (comissao.valor_comissao || 0), 0)
    const comissaoPendente = comissoes.filter(c => c.status_pagamento === 'pendente').reduce((sum, comissao) => sum + (comissao.valor_comissao || 0), 0)
    const comissaoPaga = comissoes.filter(c => c.status_pagamento === 'pago').reduce((sum, comissao) => sum + (comissao.valor_comissao || 0), 0)

    // Usar percentual do mentorado (5% padrão)
    const percentualAtual = mentorado?.porcentagem_comissao || 5

    return {
      vendidos: numeroVendas,
      totalVendas,
      comissaoTotal,
      comissaoPendente,
      comissaoPaga,
      percentualAtual,
      totalComissoes: comissoes.length
    }
  }

  const getProximoEscalao = (vendas: number) => {
    if (vendas < 4) return { vendas: 4, percentual: 10 }
    if (vendas < 6) return { vendas: 6, percentual: 15 }
    if (vendas < 11) return { vendas: 11, percentual: 20 }
    return null // já está no máximo
  }

  const calcularNivel = () => {
    const vendidos = indicacoes.filter(lead => lead.status === 'vendido').length

    if (vendidos >= 50) return { nivel: 'LENDA', cor: 'from-purple-500 to-pink-500', emoji: '👑', proximoNivel: null }
    if (vendidos >= 30) return { nivel: 'MESTRE', cor: 'from-yellow-400 to-orange-500', emoji: '🏆', proximoNivel: 50 }
    if (vendidos >= 15) return { nivel: 'EXPERT', cor: 'from-green-400 to-blue-500', emoji: '💎', proximoNivel: 30 }
    if (vendidos >= 5) return { nivel: 'AVANÇADO', cor: 'from-blue-400 to-purple-500', emoji: '🚀', proximoNivel: 15 }
    if (vendidos >= 1) return { nivel: 'INICIANTE', cor: 'from-green-300 to-green-400', emoji: '⭐', proximoNivel: 5 }
    return { nivel: 'NOVATO', cor: 'from-gray-300 to-gray-400', emoji: '🔥', proximoNivel: 1 }
  }

  const calcularProgresso = () => {
    const vendidos = indicacoes.filter(lead => lead.status === 'vendido').length
    const nivel = calcularNivel()

    if (!nivel.proximoNivel) return 100

    const baseAnterior = vendidos >= 30 ? 30 : vendidos >= 15 ? 15 : vendidos >= 5 ? 5 : vendidos >= 1 ? 1 : 0
    const progressoAtual = vendidos - baseAnterior
    const progressoNecessario = nivel.proximoNivel - baseAnterior

    return Math.min((progressoAtual / progressoNecessario) * 100, 100)
  }

  const getStatusDisplay = (status: string) => {
    const statusMap = {
      'novo': { label: '🆕 Novo', desc: 'Acabou de chegar!' },
      'contactado': { label: '📞 Contactado', desc: 'Primeiro contato feito' },
      'qualificado': { label: '✅ Qualificado', desc: 'Tem potencial!' },
      'call_agendada': { label: '📅 Call Agendada', desc: 'Reunião marcada' },
      'proposta_enviada': { label: '📋 Proposta Enviada', desc: 'Quase fechando!' },
      'vendido': { label: '💰 VENDIDO', desc: 'PARABÉNS! 🎉' },
      'perdido': { label: '❌ Perdido', desc: 'Não rolou dessa vez' },
      'no_show': { label: '🚫 No-show', desc: 'Não apareceu' }
    }
    return statusMap[status as keyof typeof statusMap] || { label: status, desc: '' }
  }

  const calcularNivelIndicacao = () => {
    const totalIndicacoes = indicacoes.length

    if (totalIndicacoes >= 100) return { nivel: 'LENDA DA INDICAÇÃO', cor: 'from-purple-600 to-pink-600', emoji: '👑', proximoNivel: null }
    if (totalIndicacoes >= 50) return { nivel: 'MASTER INDICADOR', cor: 'from-yellow-500 to-red-500', emoji: '🏆', proximoNivel: 100 }
    if (totalIndicacoes >= 25) return { nivel: 'EXPERT REFERRAL', cor: 'from-green-500 to-blue-500', emoji: '💎', proximoNivel: 50 }
    if (totalIndicacoes >= 10) return { nivel: 'INDICADOR PRO', cor: 'from-blue-500 to-purple-500', emoji: '🚀', proximoNivel: 25 }
    if (totalIndicacoes >= 5) return { nivel: 'NETWORKER', cor: 'from-green-400 to-teal-400', emoji: '⭐', proximoNivel: 10 }
    if (totalIndicacoes >= 1) return { nivel: 'INICIANTE', cor: 'from-orange-400 to-yellow-400', emoji: '🔥', proximoNivel: 5 }
    return { nivel: 'RECRUTA', cor: 'from-gray-400 to-gray-500', emoji: '🎯', proximoNivel: 1 }
  }

  const calcularProgressoIndicacao = () => {
    const totalIndicacoes = indicacoes.length
    const nivel = calcularNivelIndicacao()

    if (!nivel.proximoNivel) return 100

    const baseAnterior = totalIndicacoes >= 50 ? 50 : totalIndicacoes >= 25 ? 25 : totalIndicacoes >= 10 ? 10 : totalIndicacoes >= 5 ? 5 : totalIndicacoes >= 1 ? 1 : 0
    const progressoAtual = totalIndicacoes - baseAnterior
    const progressoNecessario = nivel.proximoNivel - baseAnterior

    return Math.min((progressoAtual / progressoNecessario) * 100, 100)
  }

  const getBadges = () => {
    const badges = []
    const totalIndicacoes = indicacoes.length
    const vendidos = indicacoes.filter(lead => lead.status === 'vendido').length

    // Badges de Indicação
    if (totalIndicacoes >= 1) badges.push({ nome: 'Primeira Indicação', emoji: '🎯', cor: 'bg-blue-100 text-blue-800', conquistado: true })
    if (totalIndicacoes >= 5) badges.push({ nome: 'Networker', emoji: '⭐', cor: 'bg-green-100 text-green-800', conquistado: true })
    if (totalIndicacoes >= 10) badges.push({ nome: 'Indicador Pro', emoji: '🚀', cor: 'bg-purple-100 text-purple-800', conquistado: true })
    if (totalIndicacoes >= 25) badges.push({ nome: 'Expert Referral', emoji: '💎', cor: 'bg-indigo-100 text-indigo-800', conquistado: true })
    if (totalIndicacoes >= 50) badges.push({ nome: 'Master Indicador', emoji: '🏆', cor: 'bg-yellow-100 text-yellow-800', conquistado: true })

    // Badges de Vendas
    if (vendidos >= 1) badges.push({ nome: 'Primeira Venda', emoji: '💰', cor: 'bg-emerald-100 text-emerald-800', conquistado: true })
    if (vendidos >= 3) badges.push({ nome: 'Hat-trick', emoji: '⚽', cor: 'bg-orange-100 text-orange-800', conquistado: true })
    if (vendidos >= 5) badges.push({ nome: 'Top Seller', emoji: '🎖️', cor: 'bg-red-100 text-red-800', conquistado: true })
    if (vendidos >= 10) badges.push({ nome: 'Vendedor Expert', emoji: '👨‍💼', cor: 'bg-pink-100 text-pink-800', conquistado: true })

    // Badges Especiais
    const callsAgendadas = indicacoes.filter(lead => lead.status === 'call_agendada').length
    if (callsAgendadas >= 5) badges.push({ nome: 'Agendador Master', emoji: '📅', cor: 'bg-cyan-100 text-cyan-800', conquistado: true })

    const qualificados = indicacoes.filter(lead => lead.status === 'qualificado').length
    if (qualificados >= 10) badges.push({ nome: 'Qualificador', emoji: '✅', cor: 'bg-lime-100 text-lime-800', conquistado: true })

    // Taxa de conversão
    const taxaConversao = totalIndicacoes > 0 ? (vendidos / totalIndicacoes) * 100 : 0
    if (taxaConversao >= 20) badges.push({ nome: 'Conversor de Elite', emoji: '🔥', cor: 'bg-gradient-to-r from-red-100 to-yellow-100 text-red-800', conquistado: true })

    return badges
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Portal do Mentorado</CardTitle>
            <CardDescription>
              Faça login para gerenciar suas indicações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Sua senha"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
                <LogIn className="h-4 w-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Dashboard do mentorado logado
  const { vendidos, totalVendas, comissaoTotal, comissaoPendente, comissaoPaga, percentualAtual, totalComissoes } = calcularComissao()
  const nivelInfo = calcularNivel()
  const progresso = calcularProgresso()
  const nivelIndicacao = calcularNivelIndicacao()
  const progressoIndicacao = calcularProgressoIndicacao()
  const badges = getBadges()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Olá, {mentorado?.nome_completo}!
              </h1>
              <p className="text-gray-600">Portal do Mentorado - Suas indicações e ganhos</p>
              <div className="flex items-center mt-2">
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Mentorado - {mentorado?.turma}
                </span>
                <span className="ml-3 text-sm text-green-600 font-semibold">
                  Comissão: {percentualAtual}%
                </span>
                <span className="ml-3 text-sm text-blue-600">
                  {totalComissoes} comissão{totalComissoes !== 1 ? 'ões' : ''} gerada{totalComissoes !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="flex space-x-4">
              <Button
                onClick={() => setShowBadges(true)}
                variant="outline"
                className="border-purple-300 text-purple-600 hover:bg-purple-50"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Badges ({badges.length})
              </Button>
              <Button
                onClick={() => setShowNewIndicacao(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Indicação
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Indicações</p>
                  <p className="text-2xl font-bold text-gray-900">{indicacoes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Vendas Fechadas</p>
                  <p className="text-2xl font-bold text-gray-900">{vendidos}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Vendido</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalVendas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Comissão</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(comissaoTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-sm">$</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">A Receber</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(comissaoPendente)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card de Resumo de Comissões */}
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center">
                  💰 Resumo Financeiro
                </h2>
                <p className="opacity-90">
                  {totalComissoes === 0 ? 'Nenhuma comissão gerada ainda' :
                   comissaoPendente > 0 ? `R$ ${(comissaoPendente).toFixed(2)} aguardando pagamento` :
                   'Todas as comissões foram pagas!'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{totalComissoes}</div>
                <div className="text-sm opacity-90">comissões</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-3">
                <div className="text-lg font-bold">{formatCurrency(comissaoPaga)}</div>
                <div className="text-sm opacity-90">Já Recebido</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-3">
                <div className="text-lg font-bold">{formatCurrency(comissaoPendente)}</div>
                <div className="text-sm opacity-90">Pendente</div>
              </div>
            </div>
          </div>

          {/* Lista de Comissões */}
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-green-500" />
              Suas Comissões
            </h3>

            {comissoes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma comissão gerada ainda.</p>
                <p>Suas vendas aparecerão aqui!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comissoes.map((comissao) => (
                  <div key={comissao.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{comissao.lead_info?.nome_completo || 'Lead não encontrado'}</div>
                      <div className="text-sm text-gray-600">
                        Venda: {formatCurrency(comissao.valor_venda || 0)} • Comissão: {comissao.percentual_comissao}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(comissao.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-green-600">
                        {formatCurrency(comissao.valor_comissao || 0)}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        comissao.status_pagamento === 'pago'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {comissao.status_pagamento === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                      </span>
                      {comissao.data_pagamento && (
                        <div className="text-xs text-gray-500 mt-1">
                          Pago em: {new Date(comissao.data_pagamento).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {comissaoTotal >= 1000 && (
              <div className="mt-4 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg border-l-4 border-yellow-500">
                <div className="flex items-center">
                  <Gift className="h-6 w-6 text-yellow-600 mr-3" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Parabéns! 🎉</h4>
                    <p className="text-sm text-yellow-700">Você já ganhou mais de R$ 1.000 em comissões!</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Gamificação de Indicações */}
        <Card className="mb-6 overflow-hidden">
          <div className={`bg-gradient-to-r ${nivelIndicacao.cor} p-6 text-white`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center">
                  {nivelIndicacao.emoji} {nivelIndicacao.nivel}
                </h2>
                <p className="opacity-90">
                  {indicacoes.length === 0 ? 'Faça sua primeira indicação para começar!' :
                   nivelIndicacao.proximoNivel ? `Faltam ${nivelIndicacao.proximoNivel - indicacoes.length} indicações para o próximo nível` :
                   'Você é uma LENDA das indicações! 🌟'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{indicacoes.length}</div>
                <div className="text-sm opacity-90">indicações</div>
              </div>
            </div>

            {nivelIndicacao.proximoNivel && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Progresso para {nivelIndicacao.proximoNivel === 1 ? 'INICIANTE' :
                                       nivelIndicacao.proximoNivel === 5 ? 'NETWORKER' :
                                       nivelIndicacao.proximoNivel === 10 ? 'INDICADOR PRO' :
                                       nivelIndicacao.proximoNivel === 25 ? 'EXPERT REFERRAL' :
                                       nivelIndicacao.proximoNivel === 50 ? 'MASTER INDICADOR' : 'LENDA'}</span>
                  <span>{Math.round(progressoIndicacao)}%</span>
                </div>
                <div className="w-full bg-black bg-opacity-20 rounded-full h-2">
                  <div
                    className="bg-white rounded-full h-2 transition-all duration-500"
                    style={{ width: `${progressoIndicacao}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{indicacoes.length}</div>
                <div className="text-sm text-blue-700">Total Indicações</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{vendidos}</div>
                <div className="text-sm text-green-700">Convertidas</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {indicacoes.length > 0 ? Math.round((vendidos / indicacoes.length) * 100) : 0}%
                </div>
                <div className="text-sm text-purple-700">Taxa Conversão</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal nova indicação */}
        <Dialog open={showNewIndicacao} onOpenChange={setShowNewIndicacao}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-green-600" />
                Nova Indicação
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleNovaIndicacao} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome_completo">Nome Completo *</Label>
                <Input
                  id="nome_completo"
                  value={novaIndicacao.nome_completo}
                  onChange={(e) => setNovaIndicacao(prev => ({...prev, nome_completo: e.target.value}))}
                  required
                  placeholder="Nome da pessoa que você está indicando"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  value={novaIndicacao.telefone}
                  onChange={(e) => setNovaIndicacao(prev => ({...prev, telefone: e.target.value}))}
                  required
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações (opcional)</Label>
                <Input
                  id="observacoes"
                  value={novaIndicacao.observacoes}
                  onChange={(e) => setNovaIndicacao(prev => ({...prev, observacoes: e.target.value}))}
                  placeholder="Alguma informação adicional sobre a pessoa..."
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowNewIndicacao(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                  {loading ? 'Enviando...' : 'Enviar Indicação'}
                  <Rocket className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Badges */}
        <Dialog open={showBadges} onOpenChange={setShowBadges}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Crown className="h-5 w-5 mr-2 text-yellow-600" />
                Suas Conquistas ({badges.length})
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Profile Stats */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{mentorado?.nome_completo}</h3>
                    <p className="opacity-90">Perfil Geral</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{badges.length}</div>
                    <div className="text-sm opacity-90">badges</div>
                  </div>
                </div>
              </div>

              {/* Níveis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`bg-gradient-to-r ${nivelInfo.cor} text-white p-4 rounded-lg`}>
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{nivelInfo.emoji}</span>
                    <div>
                      <div className="font-bold">Nível Vendas</div>
                      <div className="text-sm opacity-90">{nivelInfo.nivel}</div>
                    </div>
                  </div>
                </div>

                <div className={`bg-gradient-to-r ${nivelIndicacao.cor} text-white p-4 rounded-lg`}>
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{nivelIndicacao.emoji}</span>
                    <div>
                      <div className="font-bold">Nível Indicação</div>
                      <div className="text-sm opacity-90">{nivelIndicacao.nivel}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Badges Grid */}
              <div>
                <h4 className="font-semibold mb-3">Badges Conquistados</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {badges.map((badge, index) => (
                    <div key={index} className={`p-3 rounded-lg text-center ${badge.cor}`}>
                      <div className="text-2xl mb-1">{badge.emoji}</div>
                      <div className="text-xs font-medium">{badge.nome}</div>
                    </div>
                  ))}
                </div>
                {badges.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Você ainda não conquistou nenhum badge.</p>
                    <p>Faça sua primeira indicação para começar!</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Formulário nova indicação - REMOVIDO - Agora é modal */}
        {false && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Nova Indicação</CardTitle>
              <CardDescription>
                Indique alguém e acompanhe o status da sua indicação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNovaIndicacao} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome_completo">Nome Completo *</Label>
                    <Input
                      id="nome_completo"
                      value={novaIndicacao.nome_completo}
                      onChange={(e) => setNovaIndicacao(prev => ({...prev, nome_completo: e.target.value}))}
                      required
                      placeholder="Nome da pessoa que você está indicando"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone *</Label>
                    <Input
                      id="telefone"
                      value={novaIndicacao.telefone}
                      onChange={(e) => setNovaIndicacao(prev => ({...prev, telefone: e.target.value}))}
                      required
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações (opcional)</Label>
                  <Input
                    id="observacoes"
                    value={novaIndicacao.observacoes}
                    onChange={(e) => setNovaIndicacao(prev => ({...prev, observacoes: e.target.value}))}
                    placeholder="Alguma informação adicional sobre a pessoa..."
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={() => setShowNewIndicacao(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                    {loading ? 'Enviando...' : 'Enviar Indicação'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de indicações */}
        <Card>
          <CardHeader>
            <CardTitle>Suas Indicações</CardTitle>
            <CardDescription>
              Acompanhe o status de todas as suas indicações
            </CardDescription>
          </CardHeader>
          <CardContent>
            {indicacoes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Você ainda não fez nenhuma indicação.</p>
                <p>Clique em "Nova Indicação" para começar!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Nome</th>
                      <th className="text-left p-3">Telefone</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Valor Vendido</th>
                      <th className="text-left p-3">Sua Comissão</th>
                      <th className="text-left p-3">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indicacoes.map((indicacao, index) => {
                      const valorVendido = indicacao.valor_vendido || 0
                      // Buscar comissão real do banco de dados
                      const comissaoReal = comissoes.find(c => c.lead_id === indicacao.id)
                      const statusDisplay = getStatusDisplay(indicacao.status)

                      return (
                        <tr key={indicacao.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{indicacao.nome_completo}</td>
                          <td className="p-3">{indicacao.telefone}</td>
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(indicacao.status)} mb-1`}>
                                {statusDisplay.label}
                              </span>
                              <span className="text-xs text-gray-500">{statusDisplay.desc}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            {valorVendido > 0 ? (
                              <span className="font-medium text-green-600">
                                {formatCurrency(valorVendido)}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="p-3 font-medium">
                            {indicacao.status === 'vendido' && comissaoReal ? (
                              <div className="flex flex-col">
                                <span className="text-green-700 font-bold">
                                  {formatCurrency(comissaoReal.valor_comissao || 0)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({comissaoReal.percentual_comissao}%)
                                </span>
                                <span className={`text-xs px-1 py-0.5 rounded ${
                                  comissaoReal.status_pagamento === 'pago'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {comissaoReal.status_pagamento === 'pago' ? 'Pago' : 'Pendente'}
                                </span>
                              </div>
                            ) : indicacao.status === 'vendido' ? (
                              <span className="text-gray-500 text-sm">Processando...</span>
                            ) : '-'}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span>{new Date(indicacao.data_primeiro_contato).toLocaleDateString('pt-BR')}</span>
                              <span className="text-xs text-gray-500">
                                {indicacao.status === 'vendido' && indicacao.convertido_em ?
                                  `Vendido em: ${new Date(indicacao.convertido_em).toLocaleDateString('pt-BR')}` :
                                  'Em andamento'
                                }
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}