'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useSettings } from '@/contexts/settings'
import { Settings, Target, Bell, Palette, Workflow, Save } from 'lucide-react'

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#111827] flex items-center gap-2 sm:gap-3">
                <div className="bg-gradient-to-r from-[#2563EB] to-[#3B82F6] p-1.5 sm:p-2 rounded-lg">
                  <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <span className="truncate">Configurações</span>
              </h1>
              <p className="text-[#6B7280] mt-1 text-sm sm:text-base">Gerencie suas preferências e metas</p>
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-sm text-green-600 self-start sm:self-center">
              <Save className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Salvo automaticamente</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">

      {message && (
        <div className={`p-4 rounded-lg text-center font-medium ${
          message.includes('✅')
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

          {/* Metas Mensais */}
          <Card className="bg-white shadow-sm border-[#E5E7EB]">
            <CardHeader>
              <CardTitle className="text-[#111827] flex items-center gap-2">
                <Target className="h-5 w-5 text-[#2563EB]" />
                Metas Mensais
              </CardTitle>
            </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="space-y-2">
            <Label htmlFor="meta-leads">Meta de Leads</Label>
            <Input
              id="meta-leads"
              type="number"
              value={settings.meta_leads_mes}
              onChange={(e) => updateSetting('meta_leads_mes', parseInt(e.target.value) || 0)}
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-vendas">Meta de Vendas</Label>
            <Input
              id="meta-vendas"
              type="number"
              value={settings.meta_vendas_mes}
              onChange={(e) => updateSetting('meta_vendas_mes', parseInt(e.target.value) || 0)}
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-faturamento">Meta de Faturamento (R$)</Label>
            <Input
              id="meta-faturamento"
              type="number"
              value={settings.meta_faturamento_mes}
              onChange={(e) => updateSetting('meta_faturamento_mes', parseFloat(e.target.value) || 0)}
              className="text-lg"
              step="1000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-arrecadacao">Meta de Arrecadação (R$)</Label>
            <Input
              id="meta-arrecadacao"
              type="number"
              value={settings.meta_arrecadacao_mes}
              onChange={(e) => updateSetting('meta_arrecadacao_mes', parseFloat(e.target.value) || 0)}
              className="text-lg"
              step="1000"
            />
            <p className="text-xs text-gray-500">
              💡 Geralmente 50% do faturamento
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-calls">Meta de Calls</Label>
            <Input
              id="meta-calls"
              type="number"
              value={settings.meta_calls_mes}
              onChange={(e) => updateSetting('meta_calls_mes', parseInt(e.target.value) || 0)}
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-followups">Meta de Follow-ups</Label>
            <Input
              id="meta-followups"
              type="number"
              value={settings.meta_follow_ups_mes}
              onChange={(e) => updateSetting('meta_follow_ups_mes', parseInt(e.target.value) || 0)}
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxa-conversao">Taxa de Conversão Ideal (%)</Label>
            <Input
              id="taxa-conversao"
              type="number"
              value={settings.taxa_conversao_ideal}
              onChange={(e) => updateSetting('taxa_conversao_ideal', parseFloat(e.target.value) || 0)}
              className="text-lg"
              step="0.1"
              placeholder="Ex: 10.5"
            />
          </div>
        </CardContent>
      </Card>

          {/* Notificações */}
          <Card className="bg-white shadow-sm border-[#E5E7EB]">
            <CardHeader>
              <CardTitle className="text-[#111827] flex items-center gap-2">
                <Bell className="h-5 w-5 text-[#2563EB]" />
                Notificações
              </CardTitle>
            </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex-1">
              <Label className="text-sm sm:text-base font-medium">Notificações por Email</Label>
              <p className="text-xs sm:text-sm text-gray-500">Receber alertas e relatórios por email</p>
            </div>
            <Switch
              checked={settings.notificacao_email}
              onCheckedChange={(checked) => updateSetting('notificacao_email', checked)}
            />
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex-1">
              <Label className="text-sm sm:text-base font-medium">Notificações WhatsApp</Label>
              <p className="text-xs sm:text-sm text-gray-500">Receber alertas via WhatsApp</p>
            </div>
            <Switch
              checked={settings.notificacao_whatsapp}
              onCheckedChange={(checked) => updateSetting('notificacao_whatsapp', checked)}
            />
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex-1">
              <Label className="text-sm sm:text-base font-medium">Follow-ups Automáticos</Label>
              <p className="text-xs sm:text-sm text-gray-500">Notificações de follow-ups pendentes</p>
            </div>
            <Switch
              checked={settings.notificacao_follow_ups}
              onCheckedChange={(checked) => updateSetting('notificacao_follow_ups', checked)}
            />
          </div>
        </CardContent>
      </Card>

          {/* Workflow */}
          <Card className="bg-white shadow-sm border-[#E5E7EB]">
            <CardHeader>
              <CardTitle className="text-[#111827] flex items-center gap-2">
                <Workflow className="h-5 w-5 text-[#2563EB]" />
                Automação
              </CardTitle>
            </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex-1">
              <Label className="text-sm sm:text-base font-medium">Criar Follow-ups Automaticamente</Label>
              <p className="text-xs sm:text-sm text-gray-500">Quando uma call for agendada, criar follow-ups automáticos</p>
            </div>
            <Switch
              checked={settings.auto_create_follow_ups}
              onCheckedChange={(checked) => updateSetting('auto_create_follow_ups', checked)}
            />
          </div>
        </CardContent>
      </Card>

          {/* Aparência */}
          <Card className="bg-white shadow-sm border-[#E5E7EB]">
            <CardHeader>
              <CardTitle className="text-[#111827] flex items-center gap-2">
                <Palette className="h-5 w-5 text-[#2563EB]" />
                Aparência
              </CardTitle>
            </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <Label htmlFor="tema">Tema</Label>
            <Select
              value={settings.tema}
              onValueChange={(value: 'light' | 'dark') => updateSetting('tema', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Escuro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cor-primaria">Cor Primária</Label>
            <div className="flex items-center space-x-3">
              <Input
                id="cor-primaria"
                type="color"
                value={settings.cor_primaria}
                onChange={(e) => updateSetting('cor_primaria', e.target.value)}
                className="w-16 h-10"
              />
              <Input
                value={settings.cor_primaria}
                onChange={(e) => updateSetting('cor_primaria', e.target.value)}
                placeholder="#3b82f6"
                className="flex-1"
              />
            </div>
            </div>
          </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}