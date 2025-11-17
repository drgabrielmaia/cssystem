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
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const saveSettings = async () => {
    setSaving(true)
    setMessage('')

    try {
      // As configurações já são salvas automaticamente pelo context
      setMessage('✅ Configurações salvas com sucesso!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Erro ao salvar:', error)
      setMessage('❌ Erro ao salvar configurações')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-gray-500">Gerencie suas preferências e metas</p>
          </div>
        </div>

        <Button
          onClick={saveSettings}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-green-600" />
            <span>Metas Mensais</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-yellow-600" />
            <span>Notificações</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Notificações por Email</Label>
              <p className="text-sm text-gray-500">Receber alertas e relatórios por email</p>
            </div>
            <Switch
              checked={settings.notificacao_email}
              onCheckedChange={(checked) => updateSetting('notificacao_email', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Notificações WhatsApp</Label>
              <p className="text-sm text-gray-500">Receber alertas via WhatsApp</p>
            </div>
            <Switch
              checked={settings.notificacao_whatsapp}
              onCheckedChange={(checked) => updateSetting('notificacao_whatsapp', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Follow-ups Automáticos</Label>
              <p className="text-sm text-gray-500">Notificações de follow-ups pendentes</p>
            </div>
            <Switch
              checked={settings.notificacao_follow_ups}
              onCheckedChange={(checked) => updateSetting('notificacao_follow_ups', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Workflow className="h-5 w-5 text-purple-600" />
            <span>Automação</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Criar Follow-ups Automaticamente</Label>
              <p className="text-sm text-gray-500">Quando uma call for agendada, criar follow-ups automáticos</p>
            </div>
            <Switch
              checked={settings.auto_create_follow_ups}
              onCheckedChange={(checked) => updateSetting('auto_create_follow_ups', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Aparência */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5 text-pink-600" />
            <span>Aparência</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
  )
}