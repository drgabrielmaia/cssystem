'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { UserCheck, Mail, Phone, MapPin, User, Building, Calendar, Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MentoradoCadastro {
  nome_completo: string
  email: string
  telefone: string
  cpf?: string
  endereco?: string
  observacoes?: string
  password: string
  confirmPassword: string
  porcentagem_comissao: number
  data_nascimento?: string
  data_inicio_mentoria?: string
  data_entrada?: string
}

export default function CadastroPage() {
  const [mentorados, setMentorados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState<MentoradoCadastro>({
    nome_completo: '',
    email: '',
    telefone: '',
    cpf: '',
    endereco: '',
    observacoes: '',
    password: 'mentoradoindica', // Senha padrao
    confirmPassword: 'mentoradoindica', // Senha padrao
    porcentagem_comissao: 5, // 5% padrao
    data_nascimento: '',
    data_inicio_mentoria: '',
    data_entrada: new Date().toISOString().split('T')[0] // Data atual por padrao
  })

  // Carregar mentorados existentes
  const loadMentorados = async () => {
    try {
      const { data, error } = await supabase
        .from('mentorados')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setMentorados(data || [])
    } catch (error) {
      console.error('Erro ao carregar mentorados:', error)
      alert('Erro ao carregar mentorados')
    }
  }

  // Salvar ou atualizar mentorado
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      alert('Senhas nao coincidem!')
      return
    }

    if (formData.password.length < 6) {
      alert('Senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const mentoradoData = {
        nome_completo: formData.nome_completo,
        email: formData.email,
        telefone: formData.telefone,
        cpf: formData.cpf || null,
        endereco: formData.endereco || null,
        observacoes: formData.observacoes || null,
        password_hash: btoa(formData.password), // Simples encoding por enquanto
        porcentagem_comissao: formData.porcentagem_comissao,
        status_login: 'ativo',
        data_nascimento: formData.data_nascimento || null,
        data_inicio_mentoria: formData.data_inicio_mentoria || formData.data_entrada,
        data_entrada: formData.data_entrada,
        organization_id: '1689ece2-a066-4bca-9262-c3bf66a15d43'
      }

      if (editingId) {
        // Atualizar
        const { error } = await supabase
          .from('mentorados')
          .update(mentoradoData)
          .eq('id', editingId)

        if (error) throw error
        alert('Mentorado atualizado com sucesso!')
      } else {
        // Criar novo
        const { data: result, error } = await supabase
          .from('mentorados')
          .insert([mentoradoData])
          .select()

        if (error) throw error

        // LIBERAR TODOS OS MODULOS AUTOMATICAMENTE
        if (result && result[0]) {
          try {
            const newMentorado = result[0]

            // Buscar todos os modulos ativos da organizacao
            const { data: modules, error: modulesError } = await supabase
              .from('video_modules')
              .select('id, title')
              .eq('is_active', true)
              .eq('organization_id', newMentorado.organization_id || '9c8c0033-15ea-4e33-a55f-28d81a19693b')

            if (!modulesError && modules && modules.length > 0) {
              // Criar acessos para TODOS os modulos
              const accessRecords = modules.map(module => ({
                mentorado_id: newMentorado.id,
                module_id: module.id,
                has_access: true,
                granted_at: new Date().toISOString(),
                granted_by: 'auto_cadastro',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }))

              const { error: accessError } = await supabase
                .from('video_access_control')
                .insert(accessRecords)

              if (accessError) {
                console.error('Erro ao liberar modulos:', accessError)
              } else {
                console.log(`${modules.length} modulos liberados automaticamente para ${newMentorado.nome_completo}!`)
              }
            }
          } catch (autoError) {
            console.error('Erro na liberacao automatica de modulos:', autoError)
          }
        }

        alert('Mentorado cadastrado com sucesso! Todos os modulos foram liberados automaticamente!')
      }

      // Reset form
      setFormData({
        nome_completo: '',
        email: '',
        telefone: '',
        cpf: '',
        endereco: '',
        observacoes: '',
        password: 'mentoradoindica',
        confirmPassword: 'mentoradoindica',
        porcentagem_comissao: 5
      })
      setShowForm(false)
      setEditingId(null)
      await loadMentorados()

    } catch (error) {
      console.error('Erro ao salvar mentorado:', error)
      alert('Erro ao salvar mentorado')
    } finally {
      setLoading(false)
    }
  }

  // Editar mentorado
  const handleEdit = (mentorado: any) => {
    setFormData({
      nome_completo: mentorado.nome_completo,
      email: mentorado.email,
      telefone: mentorado.telefone,
      cpf: mentorado.cpf || '',
      endereco: mentorado.endereco || '',
      observacoes: mentorado.observacoes || '',
      password: '',
      confirmPassword: '',
      porcentagem_comissao: mentorado.porcentagem_comissao || 5
    })
    setEditingId(mentorado.id)
    setShowForm(true)
  }

  // Deletar mentorado
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este mentorado?')) return

    try {
      const { error } = await supabase
        .from('mentorados')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('Mentorado excluido com sucesso!')
      await loadMentorados()
    } catch (error) {
      console.error('Erro ao excluir mentorado:', error)
      alert('Erro ao excluir mentorado')
    }
  }

  // Carregar dados na inicializacao
  useEffect(() => {
    loadMentorados()
  }, [])

  // Filtered mentorados based on search
  const filteredMentorados = mentorados.filter((m) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      m.nome_completo?.toLowerCase().includes(term) ||
      m.email?.toLowerCase().includes(term) ||
      m.telefone?.toLowerCase().includes(term) ||
      m.cpf?.toLowerCase().includes(term)
    )
  })

  // Stats
  const totalMentorados = mentorados.length
  const activeMentorados = mentorados.filter(m => m.status_login === 'ativo').length
  const avgComissao = mentorados.length > 0
    ? (mentorados.reduce((sum, m) => sum + (m.porcentagem_comissao || 0), 0) / mentorados.length).toFixed(1)
    : '0'
  const recentMentorados = mentorados.filter(m => {
    if (!m.created_at) return false
    const created = new Date(m.created_at)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return created >= thirtyDaysAgo
  }).length

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-4 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <UserCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Cadastro de Mentorados
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">
                Cadastre mentorados que podem fazer indicacoes e acompanhar seus leads
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              setShowForm(!showForm)
              setEditingId(null)
              setFormData({
                nome_completo: '',
                email: '',
                telefone: '',
                cpf: '',
                endereco: '',
                observacoes: '',
                password: '',
                confirmPassword: '',
                porcentagem_comissao: 5
              })
            }}
            className={cn(
              "flex items-center gap-2 transition-all",
              showForm
                ? "bg-white/10 hover:bg-white/15 text-gray-300 border border-white/[0.06]"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
            )}
          >
            {showForm ? (
              <>
                <Plus className="h-4 w-4 rotate-45" />
                Cancelar
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Novo Mentorado
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#141418] p-5 rounded-xl ring-1 ring-white/[0.06]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Mentorados</p>
                  <p className="text-2xl font-bold text-white mt-1">{totalMentorados}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-[#141418] p-5 rounded-xl ring-1 ring-white/[0.06]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Ativos</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{activeMentorados}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            </div>

            <div className="bg-[#141418] p-5 rounded-xl ring-1 ring-white/[0.06]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Comissao Media</p>
                  <p className="text-2xl font-bold text-white mt-1">{avgComissao}%</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
                  <Building className="w-5 h-5 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-[#141418] p-5 rounded-xl ring-1 ring-white/[0.06]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Ultimos 30 dias</p>
                  <p className="text-2xl font-bold text-white mt-1">{recentMentorados}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-amber-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06] overflow-hidden">
              {/* Form Header */}
              <div className="px-6 py-5 border-b border-white/[0.06]">
                <h2 className="text-lg font-semibold text-white">
                  {editingId ? 'Editar Mentorado' : 'Novo Mentorado'}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Preencha os dados do mentorado que podera fazer indicacoes
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-8">
                {/* Section: Informacoes Pessoais */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Informacoes Pessoais</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Nome completo */}
                    <div className="space-y-2">
                      <Label htmlFor="nome_completo" className="text-gray-300 text-sm">
                        Nome Completo <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="nome_completo"
                        value={formData.nome_completo}
                        onChange={(e) => setFormData(prev => ({...prev, nome_completo: e.target.value}))}
                        required
                        placeholder="Nome completo do mentorado"
                        className="bg-[#1a1a1e] border-white/[0.06] text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300 text-sm">
                        Email <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                        required
                        placeholder="email@exemplo.com"
                        className="bg-[#1a1a1e] border-white/[0.06] text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                      />
                    </div>

                    {/* Telefone */}
                    <div className="space-y-2">
                      <Label htmlFor="telefone" className="text-gray-300 text-sm">
                        Telefone <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => setFormData(prev => ({...prev, telefone: e.target.value}))}
                        required
                        placeholder="(00) 00000-0000"
                        className="bg-[#1a1a1e] border-white/[0.06] text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                      />
                    </div>

                    {/* CPF */}
                    <div className="space-y-2">
                      <Label htmlFor="cpf" className="text-gray-300 text-sm">CPF</Label>
                      <Input
                        id="cpf"
                        value={formData.cpf}
                        onChange={(e) => setFormData(prev => ({...prev, cpf: e.target.value}))}
                        placeholder="000.000.000-00"
                        className="bg-[#1a1a1e] border-white/[0.06] text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Detalhes da Mentoria */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                      <Building className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Detalhes da Mentoria</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Porcentagem comissao */}
                    <div className="space-y-2">
                      <Label htmlFor="porcentagem_comissao" className="text-gray-300 text-sm">
                        Comissao (%)
                      </Label>
                      <Input
                        id="porcentagem_comissao"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.porcentagem_comissao}
                        onChange={(e) => setFormData(prev => ({...prev, porcentagem_comissao: parseFloat(e.target.value) || 0}))}
                        placeholder="10"
                        className="bg-[#1a1a1e] border-white/[0.06] text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                      />
                    </div>

                    {/* Endereco */}
                    <div className="space-y-2">
                      <Label htmlFor="endereco" className="text-gray-300 text-sm">
                        Endereco
                      </Label>
                      <Input
                        id="endereco"
                        value={formData.endereco}
                        onChange={(e) => setFormData(prev => ({...prev, endereco: e.target.value}))}
                        placeholder="Endereco completo"
                        className="bg-[#1a1a1e] border-white/[0.06] text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Seguranca */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Seguranca</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-300 text-sm">
                        Senha de Acesso <span className="text-red-400">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
                          required
                          placeholder="Minimo 6 caracteres"
                          className="bg-[#1a1a1e] border-white/[0.06] text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-emerald-500/20 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-white"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-300 text-sm">
                        Confirmar Senha <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({...prev, confirmPassword: e.target.value}))}
                        required
                        placeholder="Confirme a senha"
                        className="bg-[#1a1a1e] border-white/[0.06] text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Observacoes */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
                      <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Observacoes</h3>
                  </div>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData(prev => ({...prev, observacoes: e.target.value}))}
                    placeholder="Observacoes sobre o mentorado..."
                    rows={3}
                    className="bg-[#1a1a1e] border-white/[0.06] text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-emerald-500/20 resize-none"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="border-white/[0.06] text-gray-300 hover:bg-white/5 hover:text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 min-w-[140px]"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Salvando...
                      </span>
                    ) : editingId ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Mentorados List */}
          <div className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06]">
            {/* List Header */}
            <div className="px-6 py-5 border-b border-white/[0.06]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Mentorados Cadastrados</h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {filteredMentorados.length} de {mentorados.length} mentorados
                  </p>
                </div>
                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <Input
                    placeholder="Buscar por nome, email, telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-[#1a1a1e] border-white/[0.06] text-white placeholder-gray-500 pl-9 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            </div>

            {/* List Content */}
            <div className="p-6">
              {filteredMentorados.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] flex items-center justify-center mx-auto mb-4">
                    <UserCheck className="h-8 w-8 text-gray-600" />
                  </div>
                  {searchTerm ? (
                    <>
                      <p className="text-gray-300 font-medium">Nenhum resultado encontrado</p>
                      <p className="text-gray-500 text-sm mt-1">Tente buscar com outros termos</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-300 font-medium">Nenhum mentorado cadastrado ainda</p>
                      <p className="text-gray-500 text-sm mt-1">Clique em &quot;Novo Mentorado&quot; para comecar</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left py-3 px-4 font-medium text-xs text-gray-500 uppercase tracking-wider">Nome</th>
                          <th className="text-left py-3 px-4 font-medium text-xs text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="text-left py-3 px-4 font-medium text-xs text-gray-500 uppercase tracking-wider">Telefone</th>
                          <th className="text-left py-3 px-4 font-medium text-xs text-gray-500 uppercase tracking-wider">Comissao</th>
                          <th className="text-left py-3 px-4 font-medium text-xs text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="text-right py-3 px-4 font-medium text-xs text-gray-500 uppercase tracking-wider">Acoes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMentorados.map((mentorado, index) => (
                          <tr
                            key={mentorado.id}
                            className={cn(
                              "border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors group",
                              index === filteredMentorados.length - 1 && "border-b-0"
                            )}
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 ring-1 ring-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                  <span className="text-emerald-400 text-xs font-semibold">
                                    {mentorado.nome_completo?.charAt(0)?.toUpperCase() || '?'}
                                  </span>
                                </div>
                                <span className="font-medium text-white text-sm">{mentorado.nome_completo}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-sm text-gray-400">{mentorado.email}</td>
                            <td className="py-3.5 px-4 text-sm text-gray-400">{mentorado.telefone}</td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-xs font-medium ring-1 ring-purple-500/20">
                                {mentorado.porcentagem_comissao}%
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ring-1",
                                mentorado.status_login === 'ativo'
                                  ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                                  : "bg-red-500/10 text-red-400 ring-red-500/20"
                              )}>
                                <span className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  mentorado.status_login === 'ativo' ? "bg-emerald-400" : "bg-red-400"
                                )} />
                                {mentorado.status_login === 'ativo' ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(mentorado)}
                                  className="h-8 px-3 text-xs border-white/[0.06] text-gray-300 hover:bg-white/5 hover:text-white"
                                >
                                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(mentorado.id)}
                                  className="h-8 w-8 p-0 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3">
                    {filteredMentorados.map((mentorado) => (
                      <div
                        key={mentorado.id}
                        className="p-4 rounded-lg ring-1 ring-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 ring-1 ring-emerald-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-emerald-400 text-sm font-semibold">
                                {mentorado.nome_completo?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-white text-sm">{mentorado.nome_completo}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{mentorado.email}</p>
                            </div>
                          </div>
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ring-1",
                            mentorado.status_login === 'ativo'
                              ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                              : "bg-red-500/10 text-red-400 ring-red-500/20"
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              mentorado.status_login === 'ativo' ? "bg-emerald-400" : "bg-red-400"
                            )} />
                            {mentorado.status_login === 'ativo' ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {mentorado.telefone}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20 font-medium">
                            {mentorado.porcentagem_comissao}%
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-white/[0.04]">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(mentorado)}
                            className="flex-1 h-8 text-xs border-white/[0.06] text-gray-300 hover:bg-white/5"
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(mentorado.id)}
                            className="h-8 w-8 p-0 border-red-500/20 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
