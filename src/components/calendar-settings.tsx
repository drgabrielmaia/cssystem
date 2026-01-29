'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import {
  Clock,
  Plus,
  Trash2,
  Save,
  Settings,
  Calendar,
  AlertCircle
} from 'lucide-react'

interface TimeSlot {
  start: string
  end: string
  duration: number // em minutos
}

interface CalendarSettings {
  available_days: number[] // 0=Dom, 1=Seg, etc
  time_slots: TimeSlot[]
  lunch_break: {
    start: string
    end: string
  }
  advance_booking_days: number
  max_booking_days: number
  timezone: string
}

const WEEKDAYS = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' }
]

export function CalendarSettingsComponent() {
  const [settings, setSettings] = useState<CalendarSettings>({
    available_days: [1, 2, 3, 4, 5], // Seg a Sex por padrão
    time_slots: [
      { start: '09:00', end: '18:00', duration: 60 } // Horário corrido sem almoço
    ],
    lunch_break: { start: '', end: '' }, // Sem almoço por padrão
    advance_booking_days: 1, // min 1 dia de antecedência
    max_booking_days: 30, // máx 30 dias no futuro
    timezone: 'America/Sao_Paulo'
  })

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      // Buscar configurações do usuário atual
      const { data: userSettings, error } = await supabase
        .from('user_settings')
        .select('*')
        .single()

      if (userSettings?.calendar_settings) {
        setSettings({
          ...settings,
          ...userSettings.calendar_settings
        })
      }
    } catch (error) {
      console.log('Usando configurações padrão')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // Atualizar user_settings com as configurações do calendário
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          calendar_settings: settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) throw error

      alert('Configurações salvas com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      alert('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const generateTimeSlots = () => {
    const slots = []

    for (const timeSlot of settings.time_slots) {
      const start = new Date(`2000-01-01T${timeSlot.start}:00`)
      const end = new Date(`2000-01-01T${timeSlot.end}:00`)

      let current = new Date(start)

      while (current < end) {
        const timeStr = current.toTimeString().substring(0, 5)
        slots.push(timeStr)
        current.setMinutes(current.getMinutes() + timeSlot.duration)
      }
    }

    // Filtrar horários durante o almoço (só se estiver configurado)
    if (settings.lunch_break.start && settings.lunch_break.end) {
      const lunchStart = new Date(`2000-01-01T${settings.lunch_break.start}:00`)
      const lunchEnd = new Date(`2000-01-01T${settings.lunch_break.end}:00`)

      return slots.filter(slot => {
        const slotTime = new Date(`2000-01-01T${slot}:00`)
        return slotTime < lunchStart || slotTime >= lunchEnd
      })
    }

    return slots
  }

  const addTimeSlot = () => {
    setSettings({
      ...settings,
      time_slots: [
        ...settings.time_slots,
        { start: '09:00', end: '12:00', duration: 60 }
      ]
    })
  }

  const removeTimeSlot = (index: number) => {
    setSettings({
      ...settings,
      time_slots: settings.time_slots.filter((_, i) => i !== index)
    })
  }

  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: any) => {
    const newTimeSlots = [...settings.time_slots]
    newTimeSlots[index] = { ...newTimeSlots[index], [field]: value }
    setSettings({ ...settings, time_slots: newTimeSlots })
  }

  const toggleDay = (day: number) => {
    const newDays = settings.available_days.includes(day)
      ? settings.available_days.filter(d => d !== day)
      : [...settings.available_days, day]

    setSettings({ ...settings, available_days: newDays })
  }

  const availableSlots = generateTimeSlots()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-blue-600" />
            <span>Configurações do Calendário</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dias Disponíveis */}
          <div>
            <Label className="text-base font-medium mb-3 block">Dias Disponíveis</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map(day => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  className={`
                    px-3 py-2 rounded-lg text-sm transition-all
                    ${settings.available_days.includes(day.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Horários de Trabalho */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">Horários de Trabalho</Label>
              <Button onClick={addTimeSlot} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            <div className="space-y-3">
              {settings.time_slots.map((slot, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 flex-1">
                    <Input
                      type="time"
                      value={slot.start}
                      onChange={(e) => updateTimeSlot(index, 'start', e.target.value)}
                      className="w-24"
                    />
                    <span className="text-gray-500">às</span>
                    <Input
                      type="time"
                      value={slot.end}
                      onChange={(e) => updateTimeSlot(index, 'end', e.target.value)}
                      className="w-24"
                    />
                    <select
                      value={slot.duration}
                      onChange={(e) => updateTimeSlot(index, 'duration', Number(e.target.value))}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value={30}>30 min</option>
                      <option value={60}>1 hora</option>
                      <option value={90}>1h30</option>
                      <option value={120}>2 horas</option>
                    </select>
                  </div>

                  {settings.time_slots.length > 1 && (
                    <Button
                      onClick={() => removeTimeSlot(index)}
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Horário de Almoço */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Horário de Almoço <span className="text-sm text-gray-500 font-normal">(opcional)</span>
            </Label>
            <div className="flex items-center space-x-3">
              <Input
                type="time"
                value={settings.lunch_break.start}
                onChange={(e) => setSettings({
                  ...settings,
                  lunch_break: { ...settings.lunch_break, start: e.target.value }
                })}
                className="w-24"
              />
              <span className="text-gray-500">às</span>
              <Input
                type="time"
                value={settings.lunch_break.end}
                onChange={(e) => setSettings({
                  ...settings,
                  lunch_break: { ...settings.lunch_break, end: e.target.value }
                })}
                className="w-24"
              />
            </div>
          </div>

          {/* Regras de Agendamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Antecedência Mínima (dias)</Label>
              <Input
                type="number"
                min="0"
                max="7"
                value={settings.advance_booking_days}
                onChange={(e) => setSettings({
                  ...settings,
                  advance_booking_days: Number(e.target.value)
                })}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Máximo de Dias no Futuro</Label>
              <Input
                type="number"
                min="1"
                max="90"
                value={settings.max_booking_days}
                onChange={(e) => setSettings({
                  ...settings,
                  max_booking_days: Number(e.target.value)
                })}
              />
            </div>
          </div>

          {/* Preview dos Horários */}
          <div>
            <Label className="text-base font-medium mb-3 block">Preview dos Horários Disponíveis</Label>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-32 overflow-y-auto">
              {availableSlots.map((slot, index) => (
                <Badge key={index} variant="secondary" className="justify-center">
                  {slot}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Total: {availableSlots.length} horários por dia
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={loadSettings}
              disabled={loading}
            >
              Resetar
            </Button>
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook para usar as configurações do calendário em outros componentes
export function useCalendarSettings() {
  const [settings, setSettings] = useState<CalendarSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('calendar_settings')
        .single()

      if (userSettings?.calendar_settings) {
        setSettings(userSettings.calendar_settings)
      } else {
        // Configurações padrão (sem almoço)
        setSettings({
          available_days: [1, 2, 3, 4, 5],
          time_slots: [
            { start: '09:00', end: '18:00', duration: 60 }
          ],
          lunch_break: { start: '', end: '' },
          advance_booking_days: 1,
          max_booking_days: 30,
          timezone: 'America/Sao_Paulo'
        })
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateAvailableSlots = () => {
    if (!settings) return []

    const slots = []

    for (const timeSlot of settings.time_slots) {
      const start = new Date(`2000-01-01T${timeSlot.start}:00`)
      const end = new Date(`2000-01-01T${timeSlot.end}:00`)

      let current = new Date(start)

      while (current < end) {
        const timeStr = current.toTimeString().substring(0, 5)
        slots.push(timeStr)
        current.setMinutes(current.getMinutes() + timeSlot.duration)
      }
    }

    // Filtrar horários durante o almoço (só se estiver configurado)
    if (settings.lunch_break.start && settings.lunch_break.end) {
      const lunchStart = new Date(`2000-01-01T${settings.lunch_break.start}:00`)
      const lunchEnd = new Date(`2000-01-01T${settings.lunch_break.end}:00`)

      return slots.filter(slot => {
        const slotTime = new Date(`2000-01-01T${slot}:00`)
        return slotTime < lunchStart || slotTime >= lunchEnd
      })
    }

    return slots
  }

  return {
    settings,
    loading,
    availableSlots: generateAvailableSlots(),
    refresh: loadSettings
  }
}