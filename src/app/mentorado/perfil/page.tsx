'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useMentoradoAuth } from '@/contexts/mentorado-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  Edit2,
  Save,
  X,
  Stethoscope,
  UserCheck,
  Trophy,
  Target,
  Star
} from 'lucide-react'

interface MentoradoProfile {
  id: string
  nome_completo: string
  email: string
  telefone?: string
  cidade?: string
  estado_atual: string
  turma?: string
  genero?: string
  especialidade?: string
  data_entrada?: string
  created_at: string
  total_indicacoes?: number
  ranking_position?: number
}

export default function PerfilMentorado() {
  const { mentorado, loading: authLoading } = useMentoradoAuth()
  const [profile, setProfile] = useState<MentoradoProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [editForm, setEditForm] = useState({
    nome_completo: '',
    telefone: '',
    cidade: '',
    especialidade: ''
  })

  useEffect(() => {
    if (mentorado && !authLoading) {
      loadProfile()
    }
  }, [mentorado, authLoading])

  const loadProfile = async () => {
    try {
      setLoading(true)

      if (!mentorado?.id) {
        throw new Error('ID do mentorado não encontrado')
      }

      // Buscar dados completos do mentorado
      const { data: profileData, error: profileError } = await supabase
        .from('mentorados')
        .select('*')
        .eq('id', mentorado.id)
        .single()

      if (profileError) throw profileError

      // Buscar ranking
      const { data: rankingData } = await supabase
        .from('mentorados')
        .select('id, total_indicacoes')
        .order('total_indicacoes', { ascending: false })

      let ranking_position = null
      if (rankingData) {
        ranking_position = rankingData.findIndex(m => m.id === mentorado.id) + 1
      }

      const profileWithRanking = {
        ...profileData,
        ranking_position
      }

      setProfile(profileWithRanking)

      // Preencher form de edição
      setEditForm({
        nome_completo: profileData.nome_completo || '',
        telefone: profileData.telefone || '',
        cidade: profileData.cidade || '',
        especialidade: profileData.especialidade || ''
      })

    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error)
      setError('Erro ao carregar dados do perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')

      if (!mentorado?.id) {
        throw new Error('ID do mentorado não encontrado')
      }

      const { error: updateError } = await supabase
        .from('mentorados')
        .update({
          nome_completo: editForm.nome_completo.trim(),
          telefone: editForm.telefone.trim(),
          cidade: editForm.cidade.trim(),
          especialidade: editForm.especialidade.trim()
        })
        .eq('id', mentorado.id)

      if (updateError) throw updateError

      // Recarregar dados
      await loadProfile()
      setEditing(false)

    } catch (error: any) {
      console.error('Erro ao salvar:', error)
      setError('Erro ao salvar alterações. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'text-green-600 bg-green-50'
      case 'engajado': return 'text-blue-600 bg-blue-50'
      case 'pausado': return 'text-yellow-600 bg-yellow-50'
      case 'inativo': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ativo': return '✅ Ativo'
      case 'engajado': return '🚀 Engajado'
      case 'pausado': return '⏸️ Pausado'
      case 'inativo': return '❌ Inativo'
      default: return status
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="text-gray-600">Carregando perfil...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Perfil não encontrado</h2>
          <p className="text-gray-600">Não foi possível carregar os dados do seu perfil.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header do Perfil */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <User className="w-12 h-12" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">{profile.nome_completo}</h1>
                  <div className="flex items-center gap-4 text-blue-100">
                    {profile.especialidade && (
                      <span className="flex items-center gap-1">
                        <Stethoscope className="w-4 h-4" />
                        {profile.especialidade}
                      </span>
                    )}
                    {profile.turma && (
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-4 h-4" />
                        {profile.turma}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setEditing(!editing)}
                variant={editing ? "outline" : "secondary"}
                className={editing ? "bg-white text-gray-800 hover:bg-gray-100" : "bg-white/20 text-white hover:bg-white/30"}
              >
                {editing ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar Perfil
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="p-6 bg-gray-50 border-t">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg text-center">
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(profile.estado_atual)}`}>
                  {getStatusLabel(profile.estado_atual)}
                </div>
                <p className="text-xs text-gray-500 mt-2">Status Atual</p>
              </div>

              <div className="bg-white p-4 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 text-xl font-bold text-gray-800">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  #{profile.ranking_position || 'N/A'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Posição no Ranking</p>
              </div>

              <div className="bg-white p-4 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 text-xl font-bold text-gray-800">
                  <Star className="w-5 h-5 text-blue-500" />
                  {profile.total_indicacoes || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">Total de Indicações</p>
              </div>

              <div className="bg-white p-4 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 text-xl font-bold text-gray-800">
                  <Calendar className="w-5 h-5 text-green-500" />
                  {profile.data_entrada ? formatDate(profile.data_entrada) : formatDate(profile.created_at)}
                </div>
                <p className="text-xs text-gray-500 mt-1">Data de Entrada</p>
              </div>
            </div>
          </div>
        </div>

        {/* Informações Pessoais */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-800">Informações Pessoais</h2>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="nome">Nome Completo</Label>
              {editing ? (
                <Input
                  id="nome"
                  value={editForm.nome_completo}
                  onChange={(e) => setEditForm({ ...editForm, nome_completo: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 p-2 bg-gray-50 rounded border">{profile.nome_completo}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="mt-1 p-2 bg-gray-50 rounded border flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                {profile.email}
              </div>
            </div>

            <div>
              <Label htmlFor="telefone">Telefone</Label>
              {editing ? (
                <Input
                  id="telefone"
                  value={editForm.telefone}
                  onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 p-2 bg-gray-50 rounded border flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {profile.telefone || 'Não informado'}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="cidade">Cidade</Label>
              {editing ? (
                <Input
                  id="cidade"
                  value={editForm.cidade}
                  onChange={(e) => setEditForm({ ...editForm, cidade: e.target.value })}
                  placeholder="São Paulo - SP"
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 p-2 bg-gray-50 rounded border flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {profile.cidade || 'Não informado'}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="especialidade">Especialidade</Label>
              {editing ? (
                <Input
                  id="especialidade"
                  value={editForm.especialidade}
                  onChange={(e) => setEditForm({ ...editForm, especialidade: e.target.value })}
                  placeholder="Ex: Cardiologia, Dermatologia..."
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 p-2 bg-gray-50 rounded border flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-gray-400" />
                  {profile.especialidade || 'Não informado'}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="genero">Gênero</Label>
              <div className="mt-1 p-2 bg-gray-50 rounded border">
                {profile.genero === 'masculino' && '👨 Masculino'}
                {profile.genero === 'feminino' && '👩 Feminino'}
                {profile.genero === 'outro' && '⚧ Outro'}
                {!profile.genero && 'Não informado'}
              </div>
            </div>
          </div>

          {editing && (
            <div className="flex gap-3 pt-6 border-t mt-6">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </div>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>

              <Button
                onClick={() => {
                  setEditing(false)
                  setError('')
                  // Resetar form
                  setEditForm({
                    nome_completo: profile.nome_completo || '',
                    telefone: profile.telefone || '',
                    cidade: profile.cidade || '',
                    especialidade: profile.especialidade || ''
                  })
                }}
                variant="outline"
              >
                Cancelar
              </Button>
            </div>
          )}
        </Card>

        {/* Links Rápidos */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Links Rápidos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/mentorado"
              className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors block"
            >
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-blue-500" />
                <div>
                  <h3 className="font-medium text-gray-800">Ranking</h3>
                  <p className="text-sm text-gray-600">Ver posição e indicações</p>
                </div>
              </div>
            </a>

            <a
              href="/mentorado/videos"
              className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors block"
            >
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-purple-500" />
                <div>
                  <h3 className="font-medium text-gray-800">Vídeos</h3>
                  <p className="text-sm text-gray-600">Acessar conteúdos</p>
                </div>
              </div>
            </a>

            <a
              href="/mentorado/comissoes"
              className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors block"
            >
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-green-500" />
                <div>
                  <h3 className="font-medium text-gray-800">Comissões</h3>
                  <p className="text-sm text-gray-600">Histórico de ganhos</p>
                </div>
              </div>
            </a>
          </div>
        </Card>
      </div>
    </div>
  )
}