'use client'

import { useState, useRef } from 'react'
import { Header } from '@/components/header'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSettings } from '@/contexts/settings'
import { useAuth } from '@/contexts/auth'
import { supabase } from '@/lib/supabase'
import { Target, Bell, Palette, Workflow, Save, Check, User, Camera, Briefcase, Calendar, Pencil } from 'lucide-react'

interface UserSettings {
  id: string
  user_id: string
  meta_leads_mes: number
  meta_vendas_mes: number
  meta_faturamento_mes: number
  meta_arrecadacao_mes: number
  meta_calls_mes: number
  meta_follow_ups_mes: number
  taxa_conversao_ideal: number
  notificacao_email: boolean
  notificacao_whatsapp: boolean
  notificacao_follow_ups: boolean
  auto_create_follow_ups: boolean
  tema: 'light' | 'dark'
  cor_primaria: string
}

const funcoes = [
  'Proprietário', 'Diretor', 'Gerente', 'Closer', 'SDR', 'Social Seller',
  'Administrativo', 'Financeiro', 'Marketing', 'Suporte', 'Desenvolvedor', 'Outro',
]

const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve) => {
    const img = document.createElement('img')
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      const MAX_DIM = 800
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = (height / width) * MAX_DIM; width = MAX_DIM }
        else { width = (width / height) * MAX_DIM; height = MAX_DIM }
      }
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.8)
    }
    img.src = url
  })
}

export default function ConfiguracoesPage() {
  const { settings, updateSettings, loading } = useSettings()
  const { user, orgUser, organizationId, refreshAuth } = useAuth()
  const [message, setMessage] = useState('')

  // Profile state
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileName, setProfileName] = useState(orgUser?.nome_completo || '')
  const [profileYear, setProfileYear] = useState(orgUser?.ano_nascimento?.toString() || '')
  const [profileFunc, setProfileFunc] = useState(orgUser?.funcao || '')
  const [profilePhoto, setProfilePhoto] = useState(orgUser?.foto_perfil || '')
  const [photoPreview, setPhotoPreview] = useState(orgUser?.foto_perfil || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const handleProfilePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setUploadingPhoto(true)
    try {
      const compressed = await compressImage(file)
      const compressedFile = new File([compressed], file.name, { type: 'image/jpeg' })
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (ev) => resolve(ev.target?.result as string)
        reader.readAsDataURL(compressedFile)
      })
      setPhotoPreview(base64)
      setProfilePhoto(base64)
    } catch { /* ignore */ }
    finally { setUploadingPhoto(false) }
  }

  const handleSaveProfile = async () => {
    if (!profileName.trim() || !profileYear || !profileFunc) {
      setMessage('Preencha todos os campos do perfil')
      return
    }
    setSavingProfile(true)
    try {
      const { error } = await supabase
        .from('organization_users')
        .update({
          nome_completo: profileName.trim(),
          ano_nascimento: Number(profileYear),
          funcao: profileFunc,
          foto_perfil: profilePhoto || photoPreview || orgUser?.foto_perfil,
          profile_completed: true,
        })
        .eq('email', user?.email)
        .eq('organization_id', organizationId)
      if (error) throw error
      await refreshAuth()
      setEditingProfile(false)
      setMessage('Perfil atualizado com sucesso!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err: any) {
      setMessage('Erro ao salvar perfil: ' + err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    updateSettings({ [key]: value } as Partial<UserSettings>)
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#0A0A0A]">
        <Header title="Configuracoes" subtitle="Gerencie suas preferencias e metas" />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/20"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0A0A0A]">
      <Header title="Configuracoes" subtitle="Gerencie suas preferencias e metas" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Auto-save indicator */}
          <div className="flex items-center gap-2 text-xs text-emerald-400/70">
            <Check className="h-3.5 w-3.5" />
            <span>Salvo automaticamente</span>
          </div>

          {/* Message banner */}
          {message && (
            <div className={`p-4 rounded-xl text-center text-sm font-medium border ${
              message.includes('sucesso') || message.includes('Salvo')
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {message}
            </div>
          )}

          {/* Meu Perfil */}
          <div className="bg-[#141418] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-[#D4AF37]" />
                </div>
                <h2 className="text-white font-semibold text-base">Meu Perfil</h2>
              </div>
              {!editingProfile && (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-lg ring-1 ring-white/[0.06] transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </button>
              )}
            </div>

            <div className="p-6">
              {editingProfile ? (
                <div className="space-y-5">
                  {/* Photo */}
                  <div className="flex items-center gap-5">
                    <div
                      onClick={() => photoInputRef.current?.click()}
                      className="relative w-20 h-20 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 hover:border-[#D4AF37] cursor-pointer flex items-center justify-center overflow-hidden transition-all group flex-shrink-0"
                    >
                      {photoPreview ? (
                        <img src={photoPreview} alt="Foto" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="h-6 w-6 text-gray-500 group-hover:text-[#D4AF37]" />
                      )}
                      {uploadingPhoto && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhoto} />
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Nome completo</label>
                        <input
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full px-3 py-2 bg-[#1a1a1e] ring-1 ring-white/[0.06] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Ano de nascimento</label>
                      <input
                        type="number"
                        value={profileYear}
                        onChange={(e) => setProfileYear(e.target.value)}
                        placeholder="Ex: 1990"
                        min={1940} max={2010}
                        className="w-full px-3 py-2 bg-[#1a1a1e] ring-1 ring-white/[0.06] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Funcao</label>
                      <select
                        value={profileFunc}
                        onChange={(e) => setProfileFunc(e.target.value)}
                        className="w-full px-3 py-2 bg-[#1a1a1e] ring-1 ring-white/[0.06] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                      >
                        <option value="">Selecione</option>
                        {funcoes.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setEditingProfile(false)}
                      className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-white/[0.04] rounded-lg ring-1 ring-white/[0.06] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-[#D4AF37] hover:bg-[#c4a030] rounded-lg transition-colors disabled:opacity-50"
                    >
                      {savingProfile ? 'Salvando...' : <><Save className="w-3.5 h-3.5" /> Salvar</>}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/[0.08] to-white/[0.02] ring-1 ring-white/[0.08] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {orgUser?.foto_perfil ? (
                      <img src={orgUser.foto_perfil} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-white/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-white truncate">{orgUser?.nome_completo || user?.email?.split('@')[0]}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {orgUser?.funcao && (
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Briefcase className="w-3 h-3" /> {orgUser.funcao}</span>
                      )}
                      {orgUser?.ano_nascimento && (
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {orgUser.ano_nascimento}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metas Mensais */}
          <div className="bg-[#141418] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Target className="h-4.5 w-4.5 text-emerald-400" />
              </div>
              <h2 className="text-white font-semibold text-base">Metas Mensais</h2>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {/* Meta de Leads */}
              <div className="space-y-2">
                <label htmlFor="meta-leads" className="block text-sm text-white/40 font-medium">
                  Meta de Leads
                </label>
                <input
                  id="meta-leads"
                  type="number"
                  value={settings.meta_leads_mes}
                  onChange={(e) => updateSetting('meta_leads_mes', parseInt(e.target.value) || 0)}
                  className="w-full h-11 px-4 bg-[#111113] border border-white/[0.08] rounded-xl text-white text-base placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.03] transition-all duration-200"
                />
              </div>

              {/* Meta de Vendas */}
              <div className="space-y-2">
                <label htmlFor="meta-vendas" className="block text-sm text-white/40 font-medium">
                  Meta de Vendas
                </label>
                <input
                  id="meta-vendas"
                  type="number"
                  value={settings.meta_vendas_mes}
                  onChange={(e) => updateSetting('meta_vendas_mes', parseInt(e.target.value) || 0)}
                  className="w-full h-11 px-4 bg-[#111113] border border-white/[0.08] rounded-xl text-white text-base placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.03] transition-all duration-200"
                />
              </div>

              {/* Meta de Faturamento */}
              <div className="space-y-2">
                <label htmlFor="meta-faturamento" className="block text-sm text-white/40 font-medium">
                  Meta de Faturamento (R$)
                </label>
                <input
                  id="meta-faturamento"
                  type="number"
                  value={settings.meta_faturamento_mes}
                  onChange={(e) => updateSetting('meta_faturamento_mes', parseFloat(e.target.value) || 0)}
                  step="1000"
                  className="w-full h-11 px-4 bg-[#111113] border border-white/[0.08] rounded-xl text-white text-base placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.03] transition-all duration-200"
                />
              </div>

              {/* Meta de Arrecadacao */}
              <div className="space-y-2">
                <label htmlFor="meta-arrecadacao" className="block text-sm text-white/40 font-medium">
                  Meta de Arrecadacao (R$)
                </label>
                <input
                  id="meta-arrecadacao"
                  type="number"
                  value={settings.meta_arrecadacao_mes}
                  onChange={(e) => updateSetting('meta_arrecadacao_mes', parseFloat(e.target.value) || 0)}
                  step="1000"
                  className="w-full h-11 px-4 bg-[#111113] border border-white/[0.08] rounded-xl text-white text-base placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.03] transition-all duration-200"
                />
                <p className="text-xs text-white/30">
                  Geralmente 50% do faturamento
                </p>
              </div>

              {/* Meta de Calls */}
              <div className="space-y-2">
                <label htmlFor="meta-calls" className="block text-sm text-white/40 font-medium">
                  Meta de Calls
                </label>
                <input
                  id="meta-calls"
                  type="number"
                  value={settings.meta_calls_mes}
                  onChange={(e) => updateSetting('meta_calls_mes', parseInt(e.target.value) || 0)}
                  className="w-full h-11 px-4 bg-[#111113] border border-white/[0.08] rounded-xl text-white text-base placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.03] transition-all duration-200"
                />
              </div>

              {/* Meta de Follow-ups */}
              <div className="space-y-2">
                <label htmlFor="meta-followups" className="block text-sm text-white/40 font-medium">
                  Meta de Follow-ups
                </label>
                <input
                  id="meta-followups"
                  type="number"
                  value={settings.meta_follow_ups_mes}
                  onChange={(e) => updateSetting('meta_follow_ups_mes', parseInt(e.target.value) || 0)}
                  className="w-full h-11 px-4 bg-[#111113] border border-white/[0.08] rounded-xl text-white text-base placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.03] transition-all duration-200"
                />
              </div>

              {/* Taxa de Conversao Ideal */}
              <div className="space-y-2">
                <label htmlFor="taxa-conversao" className="block text-sm text-white/40 font-medium">
                  Taxa de Conversao Ideal (%)
                </label>
                <input
                  id="taxa-conversao"
                  type="number"
                  value={settings.taxa_conversao_ideal}
                  onChange={(e) => updateSetting('taxa_conversao_ideal', parseFloat(e.target.value) || 0)}
                  step="0.1"
                  placeholder="Ex: 10.5"
                  className="w-full h-11 px-4 bg-[#111113] border border-white/[0.08] rounded-xl text-white text-base placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.03] transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Notificacoes */}
          <div className="bg-[#141418] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Bell className="h-4.5 w-4.5 text-blue-400" />
              </div>
              <h2 className="text-white font-semibold text-base">Notificacoes</h2>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {/* Email */}
              <div className="flex items-center justify-between px-6 py-5">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-white/70">Notificacoes por Email</p>
                  <p className="text-xs text-white/30 mt-0.5">Receber alertas e relatorios por email</p>
                </div>
                <Switch
                  checked={settings.notificacao_email}
                  onCheckedChange={(checked) => updateSetting('notificacao_email', checked)}
                />
              </div>

              {/* WhatsApp */}
              <div className="flex items-center justify-between px-6 py-5">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-white/70">Notificacoes WhatsApp</p>
                  <p className="text-xs text-white/30 mt-0.5">Receber alertas via WhatsApp</p>
                </div>
                <Switch
                  checked={settings.notificacao_whatsapp}
                  onCheckedChange={(checked) => updateSetting('notificacao_whatsapp', checked)}
                />
              </div>

              {/* Follow-ups */}
              <div className="flex items-center justify-between px-6 py-5">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-white/70">Follow-ups Automaticos</p>
                  <p className="text-xs text-white/30 mt-0.5">Notificacoes de follow-ups pendentes</p>
                </div>
                <Switch
                  checked={settings.notificacao_follow_ups}
                  onCheckedChange={(checked) => updateSetting('notificacao_follow_ups', checked)}
                />
              </div>
            </div>
          </div>

          {/* Automacao */}
          <div className="bg-[#141418] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Workflow className="h-4.5 w-4.5 text-purple-400" />
              </div>
              <h2 className="text-white font-semibold text-base">Automacao</h2>
            </div>

            <div className="px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-white/70">Criar Follow-ups Automaticamente</p>
                  <p className="text-xs text-white/30 mt-0.5">Quando uma call for agendada, criar follow-ups automaticos</p>
                </div>
                <Switch
                  checked={settings.auto_create_follow_ups}
                  onCheckedChange={(checked) => updateSetting('auto_create_follow_ups', checked)}
                />
              </div>
            </div>
          </div>

          {/* Aparencia */}
          <div className="bg-[#141418] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Palette className="h-4.5 w-4.5 text-amber-400" />
              </div>
              <h2 className="text-white font-semibold text-base">Aparencia</h2>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Tema */}
              <div className="space-y-2">
                <label htmlFor="tema" className="block text-sm text-white/40 font-medium">
                  Tema
                </label>
                <Select
                  value={settings.tema}
                  onValueChange={(value: 'light' | 'dark') => updateSetting('tema', value)}
                >
                  <SelectTrigger className="h-11 bg-[#111113] border-white/[0.08] text-white rounded-xl focus:border-white/20 focus:ring-0 transition-all duration-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1E] border-white/[0.08] text-white">
                    <SelectItem value="light" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Claro</SelectItem>
                    <SelectItem value="dark" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Escuro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cor Primaria */}
              <div className="space-y-2">
                <label htmlFor="cor-primaria" className="block text-sm text-white/40 font-medium">
                  Cor Primaria
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="cor-primaria"
                    type="color"
                    value={settings.cor_primaria}
                    onChange={(e) => updateSetting('cor_primaria', e.target.value)}
                    className="w-11 h-11 rounded-xl border border-white/[0.08] bg-[#111113] cursor-pointer appearance-none [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-none"
                  />
                  <input
                    value={settings.cor_primaria}
                    onChange={(e) => updateSetting('cor_primaria', e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1 h-11 px-4 bg-[#111113] border border-white/[0.08] rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.03] transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
