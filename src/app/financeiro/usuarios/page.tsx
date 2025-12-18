'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  UserPlus,
  Edit,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface FinanceUser {
  id: string
  nome: string
  email: string
  cargo: string
  permissoes: any
  ativo: boolean
  created_at: string
  updated_at: string
}

export default function FinanceiroUsuarios() {
  const [users, setUsers] = useState<FinanceUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<FinanceUser | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cargo: '',
    senha: '',
    permissoes: {
      dashboard: true,
      transacoes: false,
      orcamentos: false,
      relatorios: false,
      usuarios: false
    }
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('usuarios_financeiro')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)

      if (editingUser) {
        // Atualizar usuário
        const { error } = await supabase
          .from('usuarios_financeiro')
          .update({
            nome: formData.nome,
            email: formData.email,
            cargo: formData.cargo,
            permissoes: formData.permissoes,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUser.id)

        if (error) throw error
        alert('Usuário atualizado com sucesso!')
      } else {
        // Criar novo usuário
        const { error } = await supabase
          .from('usuarios_financeiro')
          .insert([{
            nome: formData.nome,
            email: formData.email,
            cargo: formData.cargo,
            permissoes: formData.permissoes,
            ativo: true
          }])

        if (error) throw error
        alert('Usuário criado com sucesso!')
      }

      setShowModal(false)
      setEditingUser(null)
      resetForm()
      loadUsers()
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error)
      alert('Erro ao salvar usuário: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user: FinanceUser) => {
    setEditingUser(user)
    setFormData({
      nome: user.nome,
      email: user.email,
      cargo: user.cargo,
      senha: '',
      permissoes: user.permissoes || {
        dashboard: true,
        transacoes: false,
        orcamentos: false,
        relatorios: false,
        usuarios: false
      }
    })
    setShowModal(true)
  }

  const handleDelete = async (user: FinanceUser) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${user.nome}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('usuarios_financeiro')
        .delete()
        .eq('id', user.id)

      if (error) throw error
      alert('Usuário excluído com sucesso!')
      loadUsers()
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error)
      alert('Erro ao excluir usuário: ' + error.message)
    }
  }

  const toggleUserStatus = async (user: FinanceUser) => {
    try {
      const { error } = await supabase
        .from('usuarios_financeiro')
        .update({
          ativo: !user.ativo,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error
      loadUsers()
    } catch (error: any) {
      console.error('Erro ao alterar status:', error)
      alert('Erro ao alterar status: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      cargo: '',
      senha: '',
      permissoes: {
        dashboard: true,
        transacoes: false,
        orcamentos: false,
        relatorios: false,
        usuarios: false
      }
    })
  }

  const filteredUsers = users.filter(user =>
    user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPermissionsText = (permissoes: any) => {
    if (!permissoes) return 'Nenhuma'
    const perms = Object.entries(permissoes)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => key)
    return perms.length > 0 ? perms.join(', ') : 'Nenhuma'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-lg border-b border-white/20 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 mb-1">Gestão de Usuários Financeiros</h1>
              <p className="text-slate-600">Gerencie acessos e permissões do sistema financeiro</p>
            </div>

            <button
              onClick={() => {
                setEditingUser(null)
                resetForm()
                setShowModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] hover:bg-[#B8860B] text-white rounded-2xl font-medium transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Novo Usuário
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Filtros */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar usuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
              />
            </div>

            <button
              onClick={loadUsers}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">
              Usuários ({filteredUsers.length})
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-800">{user.nome}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          user.ativo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {user.ativo ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {user.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>

                      <p className="text-sm text-slate-600 mb-1">{user.email}</p>
                      <p className="text-sm text-slate-500">{user.cargo}</p>

                      <div className="mt-2">
                        <p className="text-xs text-slate-400">
                          Permissões: {getPermissionsText(user.permissoes)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleUserStatus(user)}
                        className={`p-2 rounded-2xl transition-colors ${
                          user.ativo
                            ? 'text-red-500 hover:bg-red-50'
                            : 'text-green-500 hover:bg-green-50'
                        }`}
                        title={user.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                      >
                        {user.ativo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-2xl transition-colors"
                        title="Editar usuário"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(user)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-2xl transition-colors"
                        title="Excluir usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Novo/Editar Usuário */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-[#D4AF37] rounded-2xl">
                {editingUser ? <Edit className="w-5 h-5 text-white" /> : <UserPlus className="w-5 h-5 text-white" />}
              </div>
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nome *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cargo</label>
                <input
                  type="text"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  placeholder="Ex: Analista Financeiro"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Senha *</label>
                  <input
                    type="password"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                    required={!editingUser}
                    placeholder="Senha do usuário"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Permissões</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: 'dashboard', label: 'Dashboard', desc: 'Visualizar dados gerais' },
                  { key: 'transacoes', label: 'Transações', desc: 'Gerenciar transações' },
                  { key: 'orcamentos', label: 'Orçamentos', desc: 'Controlar orçamentos' },
                  { key: 'relatorios', label: 'Relatórios', desc: 'Gerar relatórios' },
                  { key: 'usuarios', label: 'Usuários', desc: 'Gerenciar usuários' },
                ].map((perm) => (
                  <label key={perm.key} className="flex items-start gap-3 p-3 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.permissoes[perm.key as keyof typeof formData.permissoes]}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissoes: {
                          ...formData.permissoes,
                          [perm.key]: e.target.checked
                        }
                      })}
                      className="w-4 h-4 text-[#D4AF37] border-slate-300 rounded focus:ring-[#D4AF37]"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{perm.label}</p>
                      <p className="text-xs text-slate-500">{perm.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-[#D4AF37] hover:bg-[#B8860B] text-white rounded-2xl font-medium transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    {editingUser ? 'Atualizar' : 'Criar'} Usuário
                  </>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}