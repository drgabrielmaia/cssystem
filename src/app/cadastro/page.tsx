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
}

export default function CadastroPage() {
  const [mentorados, setMentorados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState<MentoradoCadastro>({
    nome_completo: '',
    email: '',
    telefone: '',
    cpf: '',
    endereco: '',
    observacoes: '',
    password: 'mentoradoindica', // Senha padrão
    confirmPassword: 'mentoradoindica', // Senha padrão
    porcentagem_comissao: 5 // 5% padrão
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
      alert('Senhas não coincidem!')
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
        cpf: formData.cpf,
        endereco: formData.endereco,
        observacoes: formData.observacoes,
        password_hash: btoa(formData.password), // Simples encoding por enquanto
        porcentagem_comissao: formData.porcentagem_comissao,
        status_login: 'ativo'
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
        
        // 🚀 LIBERAR TODOS OS MÓDULOS AUTOMATICAMENTE
        if (result && result[0]) {
          try {
            const newMentorado = result[0]
            
            // Buscar todos os módulos ativos da organização
            const { data: modules, error: modulesError } = await supabase
              .from('video_modules')
              .select('id, title')
              .eq('is_active', true)
              .eq('organization_id', newMentorado.organization_id || '9c8c0033-15ea-4e33-a55f-28d81a19693b')

            if (!modulesError && modules && modules.length > 0) {
              // Criar acessos para TODOS os módulos
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
                console.error('❌ Erro ao liberar módulos:', accessError)
              } else {
                console.log(`🎉 ${modules.length} módulos liberados automaticamente para ${newMentorado.nome_completo}!`)
              }
            }
          } catch (autoError) {
            console.error('⚠️ Erro na liberação automática de módulos:', autoError)
          }
        }
        
        alert('Mentorado cadastrado com sucesso! Todos os módulos foram liberados automaticamente!')
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
      alert('Mentorado excluído com sucesso!')
      await loadMentorados()
    } catch (error) {
      console.error('Erro ao excluir mentorado:', error)
      alert('Erro ao excluir mentorado')
    }
  }

  // Carregar dados na inicialização
  useEffect(() => {
    loadMentorados()
  }, [])

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#111827] flex items-center gap-3">
              <div className="bg-gradient-to-r from-[#2563EB] to-[#3B82F6] p-2 rounded-lg">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
              Cadastro de Mentorados
            </h1>
            <p className="text-[#6B7280] mt-1">
              Cadastre mentorados que poderão fazer indicações e acompanhar seus leads
            </p>
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
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showForm ? 'Cancelar' : 'Novo Mentorado'}
          </Button>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {showForm && (
            <Card className="bg-white shadow-sm border-[#E5E7EB]">
              <CardHeader>
                <CardTitle className="text-[#111827]">
                  {editingId ? 'Editar Mentorado' : 'Novo Mentorado'}
                </CardTitle>
                <CardDescription className="text-[#6B7280]">
                  Preencha os dados do mentorado que poderá fazer indicações
                </CardDescription>
              </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome completo */}
                <div className="space-y-2">
                  <Label htmlFor="nome_completo">
                    <User className="h-4 w-4 inline mr-2" />
                    Nome Completo *
                  </Label>
                  <Input
                    id="nome_completo"
                    value={formData.nome_completo}
                    onChange={(e) => setFormData(prev => ({...prev, nome_completo: e.target.value}))}
                    required
                    placeholder="Nome completo do mentorado"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="h-4 w-4 inline mr-2" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                    required
                    placeholder="email@exemplo.com"
                  />
                </div>

                {/* Telefone */}
                <div className="space-y-2">
                  <Label htmlFor="telefone">
                    <Phone className="h-4 w-4 inline mr-2" />
                    Telefone *
                  </Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData(prev => ({...prev, telefone: e.target.value}))}
                    required
                    placeholder="(00) 00000-0000"
                  />
                </div>

                {/* CPF */}
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData(prev => ({...prev, cpf: e.target.value}))}
                    placeholder="000.000.000-00"
                  />
                </div>


                {/* Porcentagem comissão */}
                <div className="space-y-2">
                  <Label htmlFor="porcentagem_comissao">
                    Comissão (%)
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
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-2">
                <Label htmlFor="endereco">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Endereço
                </Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData(prev => ({...prev, endereco: e.target.value}))}
                  placeholder="Endereço completo"
                />
              </div>

              {/* Senha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Senha de Acesso *
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
                      required
                      placeholder="Mínimo 6 caracteres"
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirmar Senha *
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({...prev, confirmPassword: e.target.value}))}
                    required
                    placeholder="Confirme a senha"
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({...prev, observacoes: e.target.value}))}
                  placeholder="Observações sobre o mentorado..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={loading}
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                  >
                    {loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </CardContent>
            </Card>
          )}

          {/* Lista de mentorados */}
          <Card className="bg-white shadow-sm border-[#E5E7EB]">
            <CardHeader>
              <CardTitle className="text-[#111827]">Mentorados Cadastrados</CardTitle>
              <CardDescription className="text-[#6B7280]">
                Lista de todos os mentorados que podem fazer indicações
              </CardDescription>
            </CardHeader>
        <CardContent>
          {mentorados.length === 0 ? (
              <div className="text-center py-8 text-[#6B7280]">
                <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum mentorado cadastrado ainda.</p>
              </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                    <tr className="border-b border-[#E5E7EB]">
                      <th className="text-left py-3 px-4 font-medium text-[#6B7280]">Nome</th>
                      <th className="text-left py-3 px-4 font-medium text-[#6B7280]">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-[#6B7280]">Telefone</th>
                      <th className="text-left py-3 px-4 font-medium text-[#6B7280]">Comissão</th>
                      <th className="text-left py-3 px-4 font-medium text-[#6B7280]">Ações</th>
                    </tr>
                </thead>
                <tbody>
                  {mentorados.map((mentorado) => (
                      <tr key={mentorado.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                        <td className="py-3 px-4 font-medium text-[#111827]">{mentorado.nome_completo}</td>
                        <td className="py-3 px-4 text-[#6B7280]">{mentorado.email}</td>
                        <td className="py-3 px-4 text-[#6B7280]">{mentorado.telefone}</td>
                        <td className="py-3 px-4 text-[#6B7280]">{mentorado.porcentagem_comissao}%</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(mentorado)}
                              className="border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(mentorado.id)}
                              className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}