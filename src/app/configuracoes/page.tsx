'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSettings } from '@/contexts/settings'
import { Target, Bell, Palette, Workflow, Save, Check } from 'lucide-react'

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

export default function ConfiguracoesPage() {
  const { settings, updateSettings, loading } = useSettings()
  const [message, setMessage] = useState('')

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
