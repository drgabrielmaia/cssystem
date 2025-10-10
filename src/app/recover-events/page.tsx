'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'

export default function RecoverEventsPage() {
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState([
    { title: '', description: '', date: '', time: '' }
  ])

  const addEvent = () => {
    setEvents([...events, { title: '', description: '', date: '', time: '' }])
  }

  const updateEvent = (index: number, field: string, value: string) => {
    const newEvents = [...events]
    newEvents[index] = { ...newEvents[index], [field]: value }
    setEvents(newEvents)
  }

  const removeEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index))
  }

  const recoverEvents = async () => {
    try {
      setLoading(true)

      const eventsToInsert = events
        .filter(event => event.title && event.date)
        .map(event => ({
          title: event.title,
          description: event.description || '',
          start_datetime: `${event.date}T${event.time || '09:00'}:00Z`,
          end_datetime: new Date(new Date(`${event.date}T${event.time || '09:00'}:00Z`).getTime() + 60 * 60 * 1000).toISOString(),
          all_day: false
        }))

      if (eventsToInsert.length === 0) {
        alert('Adicione pelo menos um evento válido')
        return
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .insert(eventsToInsert)
        .select()

      if (error) throw error

      alert(`✅ ${data.length} eventos recuperados com sucesso!`)

      // Limpar formulário
      setEvents([{ title: '', description: '', date: '', time: '' }])

    } catch (error) {
      console.error('Erro:', error)
      alert(`❌ Erro ao recuperar eventos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-red-600">🚨 Recuperar Eventos do Calendário</h1>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">
            <strong>Desculpa pela merda!</strong> O script de população deletou todos os eventos.
            Use este formulário para re-adicionar seus eventos perdidos.
          </p>
        </div>

        <div className="space-y-6">
          {events.map((event, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Evento {index + 1}</h3>
                {events.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeEvent(index)}
                    className="text-red-600"
                  >
                    Remover
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Título *</Label>
                  <Input
                    value={event.title}
                    onChange={(e) => updateEvent(index, 'title', e.target.value)}
                    placeholder="Ex: Call com cliente X"
                  />
                </div>

                <div>
                  <Label>Data *</Label>
                  <Input
                    type="date"
                    value={event.date}
                    onChange={(e) => updateEvent(index, 'date', e.target.value)}
                  />
                </div>

                <div>
                  <Label>Horário</Label>
                  <Input
                    type="time"
                    value={event.time}
                    onChange={(e) => updateEvent(index, 'time', e.target.value)}
                    placeholder="09:00"
                  />
                </div>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={event.description}
                  onChange={(e) => updateEvent(index, 'description', e.target.value)}
                  placeholder="Detalhes do evento..."
                  rows={2}
                />
              </div>
            </div>
          ))}

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={addEvent}
            >
              + Adicionar Evento
            </Button>

            <Button
              onClick={recoverEvents}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Recuperando...' : 'Recuperar Eventos'}
            </Button>
          </div>
        </div>

        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Correção aplicada:</h3>
          <p className="text-sm text-gray-600">
            Agora o script de população só deleta dados fake/gerados automaticamente,
            não mais seus eventos reais. Isso não vai acontecer de novo.
          </p>
        </div>
      </div>
    </div>
  )
}