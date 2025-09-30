'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase, type Mentorado } from '@/lib/supabase'
import { Calendar, Clock, User, Target, Video } from 'lucide-react'

const checkinSchema = z.object({
  mentorado_id: z.string().min(1, 'Selecione um mentorado'),
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().optional(),
  data_agendada: z.string().min(1, 'Data é obrigatória'),
  hora_agendada: z.string().min(1, 'Hora é obrigatória'),
  duracao_minutos: z.number().default(60),
  tipo: z.enum(['checkin', 'mentoria', 'follow-up', 'avaliacao']),
  link_reuniao: z.string().url('URL inválida').optional().or(z.literal('')),
  notas_pre_reuniao: z.string().optional(),
  objetivos: z.string().optional()
})

type CheckinFormData = z.infer<typeof checkinSchema>

interface CheckinFormProps {
  mentorados: Mentorado[]
  onSave: () => void
  onCancel: () => void
}

const TIPOS_CHECKIN = {
  checkin: { label: 'Check-in Regular', icon: Calendar, color: 'text-blue-600' },
  mentoria: { label: 'Sessão de Mentoria', icon: User, color: 'text-green-600' },
  'follow-up': { label: 'Follow-up', icon: Target, color: 'text-purple-600' },
  avaliacao: { label: 'Avaliação', icon: Clock, color: 'text-orange-600' }
}

export function CheckinForm({ mentorados, onSave, onCancel }: CheckinFormProps) {
  const [saving, setSaving] = useState(false)

  const form = useForm({
    defaultValues: {
      tipo: 'checkin' as const,
      duracao_minutos: 60,
      mentorado_id: '',
      titulo: '',
      data_agendada: '',
      hora_agendada: '',
      descricao: '',
      link_reuniao: '',
      notas_pre_reuniao: '',
      objetivos: ''
    }
  })

  const onSubmit = async (data: any) => {
    setSaving(true)
    try {
      const dataHora = `${data.data_agendada}T${data.hora_agendada}:00`
      const objetivosArray = data.objetivos ? data.objetivos.split('\n').filter((obj: string) => obj.trim()) : []

      const { error } = await supabase
        .from('checkins')
        .insert({
          mentorado_id: data.mentorado_id,
          titulo: data.titulo,
          descricao: data.descricao,
          data_agendada: dataHora,
          duracao_minutos: data.duracao_minutos,
          tipo: data.tipo,
          link_reuniao: data.link_reuniao || null,
          notas_pre_reuniao: data.notas_pre_reuniao,
          objetivos: objetivosArray,
          status: 'agendado'
        })

      if (error) throw error
      onSave()
    } catch (error) {
      console.error('Erro ao criar check-in:', error)
    } finally {
      setSaving(false)
    }
  }

  const tipoSelecionado = form.watch('tipo')
  const tipoConfig = TIPOS_CHECKIN[tipoSelecionado]

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span>Agendar Novo Check-in</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mentorado_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mentorado</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um mentorado" />
                        </SelectTrigger>
                        <SelectContent>
                          {mentorados.map(mentorado => (
                            <SelectItem key={mentorado.id} value={mentorado.id}>
                              {mentorado.nome_completo} • {mentorado.turma}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Reunião</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TIPOS_CHECKIN).map(([key, config]) => {
                            const Icon = config.icon
                            return (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center space-x-2">
                                  <Icon className={`h-4 w-4 ${config.color}`} />
                                  <span>{config.label}</span>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={`${tipoConfig?.label} - Digite o título da reunião`}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o objetivo e contexto desta reunião..."
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="data_agendada"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        min={new Date().toISOString().split('T')[0]}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hora_agendada"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duracao_minutos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (min)</FormLabel>
                    <FormControl>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 minutos</SelectItem>
                          <SelectItem value="45">45 minutos</SelectItem>
                          <SelectItem value="60">1 hora</SelectItem>
                          <SelectItem value="90">1h 30min</SelectItem>
                          <SelectItem value="120">2 horas</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="link_reuniao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center space-x-2">
                    <Video className="h-4 w-4" />
                    <span>Link da Reunião (opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://zoom.us/j/... ou https://meet.google.com/..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="objetivos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivos da Reunião</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Liste os objetivos desta reunião (um por linha)&#10;• Revisar progresso do mês&#10;• Discutir próximos passos&#10;• Alinhar expectativas"
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notas_pre_reuniao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas Preparatórias (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Anotações importantes para preparar esta reunião..."
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Agendando...' : 'Agendar Check-in'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}