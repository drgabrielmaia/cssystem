'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserCheck, Mail, Eye, EyeOff, LogIn, Plus, TrendingUp, DollarSign, BarChart3, Activity } from 'lucide-react'

export default function MentoradoLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [mentorado, setMentorado] = useState<any>(null)
  const [indicacoes, setIndicacoes] = useState<any[]>([])
  const [showNewIndicacao, setShowNewIndicacao] = useState(false)
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
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('indicado_por', mentoradoId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setIndicacoes(data || [])
    } catch (error) {
      console.error('Erro ao carregar indicações:', error)
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
        origem: 'indicacao_mentorado',
        observacoes: novaIndicacao.observacoes,
        indicado_por: mentorado.id,
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
    await supabase.auth.signOut()
    localStorage.removeItem('mentorado')
    setIsLoggedIn(false)
    setMentorado(null)
    setIndicacoes([])
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

  const calcularComissao = () => {
    const vendidos = indicacoes.filter(lead => lead.status === 'vendido')
    const totalVendas = vendidos.reduce((sum, lead) => sum + (lead.valor_vendido || 0), 0)
    const comissaoTotal = totalVendas * (mentorado?.porcentagem_comissao || 0) / 100
    return { vendidos: vendidos.length, totalVendas, comissaoTotal }
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
  const { vendidos, totalVendas, comissaoTotal } = calcularComissao()

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
                <span className="ml-3 text-sm text-gray-500">
                  Comissão: {mentorado?.porcentagem_comissao}%
                </span>
              </div>
            </div>
            <div className="flex space-x-4">
              <Button
                onClick={() => setShowNewIndicacao(!showNewIndicacao)}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
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
                  <p className="text-sm font-medium text-gray-600">Sua Comissão</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(comissaoTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formulário nova indicação */}
        {showNewIndicacao && (
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
                    {indicacoes.map((indicacao) => {
                      const valorVendido = indicacao.valor_vendido || 0
                      const comissao = valorVendido * (mentorado?.porcentagem_comissao || 0) / 100

                      return (
                        <tr key={indicacao.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{indicacao.nome_completo}</td>
                          <td className="p-3">{indicacao.telefone}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(indicacao.status)}`}>
                              {indicacao.status}
                            </span>
                          </td>
                          <td className="p-3">
                            {valorVendido > 0 ? formatCurrency(valorVendido) : '-'}
                          </td>
                          <td className="p-3 font-medium">
                            {indicacao.status === 'vendido' ? formatCurrency(comissao) : '-'}
                          </td>
                          <td className="p-3">
                            {new Date(indicacao.data_primeiro_contato).toLocaleDateString('pt-BR')}
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