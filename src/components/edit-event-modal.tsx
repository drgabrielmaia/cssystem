'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Mentorado {
  id: string
  nome: string
  email: string
  telefone: string | null
  turma: string
}

interface Lead {
  id: string
  nome_completo: string
  email: string | null
  telefone: string | null
  empresa: string | null
  status: string
}

interface CalendarEvent {
  id: string
  title: string
  description?: string
  start_datetime: string
  end_datetime: string
  all_day: boolean
  mentorado_id?: string
  lead_id?: string
}

interface EditEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  event: CalendarEvent | null
}

export function EditEventModal({ isOpen, onClose, onSuccess, event }: EditEventModalProps) {
  const [loading, setLoading] = useState(false)
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    all_day: false,
    mentorado_id: 'none',
    lead_id: 'none'
  })

  // Buscar mentorados e leads
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar mentorados
        const mentoradosResponse = await fetch('/api/mentorados', {
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        })
        const mentoradosData = await mentoradosResponse.json()
        if (mentoradosData.success) {
          setMentorados(mentoradosData.mentorados || [])
        }

        // Buscar leads
        const leadsResponse = await fetch('/routes/leads', {
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        })
        const leadsData = await leadsResponse.json()
        if (leadsData.success) {
          setLeads(leadsData.leads || [])
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error)
        setMentorados([])
        setLeads([])
      }
    }

    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  // Carregar dados do evento quando o modal abrir
  useEffect(() => {
    if (event && isOpen) {
      // Converter datas para horário de São Paulo para exibição correta
      const startDate = new Date(event.start_datetime)
      const endDate = new Date(event.end_datetime)

      // Função para formatar data sem problemas de timezone
      const formatDateString = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      // Função para formatar horário no timezone de São Paulo
      const formatTimeString = (date: Date) => {
        return date.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo',
          hour12: false
        })
      }

      setFormData({
        title: event.title,
        description: event.description || '',
        start_date: formatDateString(startDate),
        start_time: event.all_day ? '' : formatTimeString(startDate),
        end_date: formatDateString(endDate),
        end_time: event.all_day ? '' : formatTimeString(endDate),
        all_day: event.all_day,
        mentorado_id: event.mentorado_id || 'none',
        lead_id: event.lead_id || 'none'
      })
    }
  }, [event, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return

    setLoading(true)

    try {
      // Validações
      if (!formData.title.trim()) {
        alert('Título é obrigatório')
        return
      }

      let startDateTime, endDateTime

      // Função para salvar horário SP como está no banco (sem conversão)
      const createBrazilianDateTime = (dateStr: string, timeStr: string) => {
        // Criar data/hora de São Paulo e converter para UTC corretamente
        // Se usuário digita 13:15, deve ser 13:15 em SP, que vira 16:15 UTC
        const spDateTime = new Date(`${dateStr}T${timeStr}:00-03:00`); // Forçar timezone SP
        return spDateTime.toISOString();
      }

      if (formData.all_day) {
        // Para eventos de dia inteiro
        const startDate = new Date(`${formData.start_date}T00:00:00`);
        const endDate = new Date(`${formData.end_date || formData.start_date}T23:59:59`);
        startDateTime = startDate.toISOString();
        endDateTime = endDate.toISOString();
      } else {
        // Para eventos com horário específico
        if (!formData.start_time || !formData.end_time) {
          alert('Horário de início e fim são obrigatórios')
          return
        }
        startDateTime = createBrazilianDateTime(formData.start_date, formData.start_time);
        endDateTime = createBrazilianDateTime(formData.end_date || formData.start_date, formData.end_time);
      }

      // Validar que a data de fim é posterior à de início
      if (new Date(endDateTime) <= new Date(startDateTime)) {
        alert('A data/hora de término deve ser posterior à de início')
        return
      }

      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        start_datetime: startDateTime,
        end_datetime: endDateTime,
        all_day: formData.all_day,
        mentorado_id: formData.mentorado_id && formData.mentorado_id !== 'none' ? formData.mentorado_id : null,
        lead_id: formData.lead_id && formData.lead_id !== 'none' ? formData.lead_id : null
      }

      console.log('Atualizando evento:', eventData)

      const response = await fetch(`/routes/calendar/events/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(eventData)
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao atualizar evento')
      }

      onSuccess()
      onClose()
      alert('Evento atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar evento:', error)
      alert('Erro ao atualizar evento')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleAllDay = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      all_day: checked,
      start_time: checked ? '' : prev.start_time,
      end_time: checked ? '' : prev.end_time
    }))
  }

  if (!event) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Editar Evento</DialogTitle>
          <DialogDescription>
            Atualizar as informações do evento.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Título */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Título *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="col-span-3"
                placeholder="Nome do evento"
                required
              />
            </div>

            {/* Descrição */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Observação
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="col-span-3"
                placeholder="Descrição ou observações sobre o evento"
                rows={3}
              />
            </div>

            {/* Mentorado */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mentorado" className="text-right">
                Mentorado
              </Label>
              <Select value={formData.mentorado_id} onValueChange={(value) => handleChange('mentorado_id', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione um mentorado (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum mentorado</SelectItem>
                  {mentorados.map((mentorado) => (
                    <SelectItem key={mentorado.id} value={mentorado.id}>
                      {mentorado.nome} ({mentorado.turma})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lead */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lead" className="text-right">
                Lead
              </Label>
              <Select value={formData.lead_id} onValueChange={(value) => handleChange('lead_id', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione um lead (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum lead</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.nome_completo} - {lead.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dia inteiro */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Tipo
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="all_day"
                  checked={formData.all_day}
                  onChange={(e) => toggleAllDay(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="all_day" className="text-sm">
                  Evento de dia inteiro
                </Label>
              </div>
            </div>

            {/* Data de início */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start_date" className="text-right">
                Data Início *
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className="col-span-3"
                required
              />
            </div>

            {/* Horário de início (se não for dia inteiro) */}
            {!formData.all_day && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="start_time" className="text-right">
                  Hora Início *
                </Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleChange('start_time', e.target.value)}
                  className="col-span-3"
                  required={!formData.all_day}
                />
              </div>
            )}

            {/* Data de fim */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end_date" className="text-right">
                Data Fim
              </Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
                className="col-span-3"
              />
            </div>

            {/* Horário de fim (se não for dia inteiro) */}
            {!formData.all_day && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="end_time" className="text-right">
                  Hora Fim *
                </Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleChange('end_time', e.target.value)}
                  className="col-span-3"
                  required={!formData.all_day}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}