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

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialDate?: Date | null
}

export function AddEventModal({ isOpen, onClose, onSuccess, initialDate }: AddEventModalProps) {
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

  // Configurar data inicial se fornecida
  const getInitialDateString = () => {
    if (initialDate) {
      // Usar timezone local ao invés de UTC para evitar mudança de dia
      const year = initialDate.getFullYear()
      const month = String(initialDate.getMonth() + 1).padStart(2, '0')
      const day = String(initialDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validações
      if (!formData.title.trim()) {
        alert('Título é obrigatório')
        return
      }

      let startDateTime, endDateTime

      // Todos os eventos agora têm horário específico
      if (!formData.start_time || !formData.end_time) {
        alert('Horário de início e fim são obrigatórios')
        return
      }

      // Função para salvar horário SP como está no banco (sem conversão)
      const createBrazilianDateTime = (dateStr: string, timeStr: string) => {
        // Criar data/hora de São Paulo e converter para UTC corretamente
        // Se usuário digita 13:15, deve ser 13:15 em SP, que vira 16:15 UTC
        const spDateTime = new Date(`${dateStr}T${timeStr}:00-03:00`); // Forçar timezone SP
        return spDateTime.toISOString();
      }

      const startDateStr = formData.start_date || getInitialDateString()
      const endDateStr = formData.end_date || formData.start_date || getInitialDateString()

      startDateTime = createBrazilianDateTime(startDateStr, formData.start_time)
      endDateTime = createBrazilianDateTime(endDateStr, formData.end_time)

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
        all_day: false, // Sempre false - todos os eventos têm horário
        mentorado_id: formData.mentorado_id && formData.mentorado_id !== 'none' ? formData.mentorado_id : null,
        lead_id: formData.lead_id && formData.lead_id !== 'none' ? formData.lead_id : null
      }

      console.log('Criando evento:', eventData)

      const response = await fetch('/routes/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(eventData)
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao criar evento')
      }

      // Reset form
      setFormData({
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

      onSuccess()
      onClose()
      alert('Evento criado com sucesso!')
    } catch (error) {
      console.error('Erro ao criar evento:', error)
      alert('Erro ao criar evento')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Função toggleAllDay removida - sempre usar horários

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Novo Evento</DialogTitle>
          <DialogDescription>
            Agendar um novo evento no calendário.
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

            {/* Removido: opção de dia inteiro - sempre pedir horário */}

            {/* Data de início */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start_date" className="text-right">
                Data Início *
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date || getInitialDateString()}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className="col-span-3"
                required
              />
            </div>

            {/* Horário de início */}
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
                required
              />
            </div>

            {/* Data de fim (opcional) */}
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
                placeholder="Deixe em branco se for no mesmo dia"
              />
            </div>

            {/* Horário de fim */}
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
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}