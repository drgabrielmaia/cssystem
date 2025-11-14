'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { debounce } from 'lodash'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { supabase } from '@/lib/supabase'

const mentoradoSchema = z.object({
  nome_completo: z.string().min(1, 'Nome completo é obrigatório'),
  email: z.string().email('Email inválido'),
  telefone: z.string().optional(),
  turma: z.string().min(1, 'Turma é obrigatória'),
  estado_entrada: z.string().default('novo'),
  estado_atual: z.string().default('novo')
})

type MentoradoFormData = z.infer<typeof mentoradoSchema>

interface AddMentoradoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddMentoradoModal({ isOpen, onClose, onSuccess }: AddMentoradoModalProps) {
  const [loading, setLoading] = useState(false)
  const [tempMentoradoId, setTempMentoradoId] = useState<string | null>(null)
  const [isAutoSaving, setIsAutoSaving] = useState(false)

  const form = useForm<MentoradoFormData>({
    resolver: zodResolver(mentoradoSchema),
    defaultValues: {
      nome_completo: '',
      email: '',
      telefone: '',
      turma: '',
      estado_entrada: 'novo',
      estado_atual: 'novo'
    }
  })

  // Função para criar um mentorado temporário no banco
  const createTempMentorado = useCallback(async () => {
    if (tempMentoradoId) return tempMentoradoId

    try {
      const { data, error } = await supabase
        .from('mentorados')
        .insert([{
          nome_completo: 'Novo mentorado...',
          email: 'temp@example.com',
          estado_entrada: 'novo',
          estado_atual: 'novo'
        }])
        .select('id')
        .single()

      if (error) throw error

      const newId = data.id
      setTempMentoradoId(newId)
      return newId
    } catch (error) {
      console.error('Erro ao criar mentorado temporário:', error)
      return null
    }
  }, [tempMentoradoId])

  // Função para auto-salvar dados no banco
  const autoSaveToDatabase = useCallback(debounce(async (data: Partial<MentoradoFormData>) => {
    if (!isOpen) return

    setIsAutoSaving(true)
    try {
      let mentoradoId = tempMentoradoId

      // Criar mentorado temporário se não existir
      if (!mentoradoId) {
        mentoradoId = await createTempMentorado()
        if (!mentoradoId) return
      }

      // Filtrar campos vazios
      const dataToUpdate = Object.fromEntries(
        Object.entries(data).filter(([_, value]) =>
          value !== '' && value !== null && value !== undefined
        )
      )

      if (Object.keys(dataToUpdate).length === 0) return

      const { error } = await supabase
        .from('mentorados')
        .update(dataToUpdate)
        .eq('id', mentoradoId)

      if (error) {
        console.error('Erro no auto-save:', error)
      } else {
        console.log('✅ Auto-save realizado:', dataToUpdate)
      }
    } catch (error) {
      console.error('Erro no auto-save:', error)
    } finally {
      setIsAutoSaving(false)
    }
  }, 1000), [tempMentoradoId, isOpen, createTempMentorado])

  const onSubmit = async (data: MentoradoFormData) => {
    setLoading(true)

    try {
      let result

      if (tempMentoradoId) {
        // Atualizar mentorado existente
        const updateResult = await supabase
          .from('mentorados')
          .update(data)
          .eq('id', tempMentoradoId)
          .select()

        if (updateResult.error) throw updateResult.error
        result = updateResult.data
      } else {
        // Criar novo mentorado
        const insertResult = await supabase
          .from('mentorados')
          .insert([data])
          .select()

        if (insertResult.error) throw insertResult.error
        result = insertResult.data
      }

      // Send welcome message via WhatsApp if phone number is provided
      if (data.telefone && result && result[0]) {
        try {
          const welcomeMessage = `👋 Seja muito bem-vindo(a) à mentoria!

Parabéns pela decisão de estar aqui. Você acabou de dar um passo que muitos adiam — e que pode mudar completamente a forma como você atua, pensa e constrói seus resultados daqui pra frente.

A nossa jornada é estratégica, direta ao ponto e personalizada. Mas, pra garantir que você aproveite o melhor do processo, precisamos fazer um alinhamento inicial.

Por isso, quero que a gente agende seu onboarding 1:1 — é nessa conversa que você vai entender o caminho que vamos percorrer juntos, e eu vou te direcionar com base no seu momento atual.

👉 Me avisa aqui qual melhor dia/horário nos próximos dias, e já deixo reservado.

Vamos com tudo. 🔥`

          const { whatsappService } = await import('@/lib/whatsapp-core-service')
          const success = await whatsappService.sendMessage(data.telefone, welcomeMessage)

          if (success) {
            console.log('✅ Mensagem de boas-vindas enviada com sucesso!')
          } else {
            console.warn('⚠️ Não foi possível enviar mensagem de boas-vindas')
          }
        } catch (whatsappError) {
          console.warn('⚠️ Erro ao enviar mensagem de boas-vindas:', whatsappError)
        }
      }

      // Reset form
      form.reset()
      setTempMentoradoId(null)

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao adicionar mentorado:', error)
      alert('Erro ao adicionar mentorado')
    } finally {
      setLoading(false)
    }
  }


  // Função para salvar quando sair de um campo
  const handleFieldBlur = useCallback((fieldName: keyof MentoradoFormData, value: any) => {
    if (!isOpen || !value) return

    const fieldData = { [fieldName]: value }
    autoSaveToDatabase(fieldData)
  }, [isOpen, autoSaveToDatabase])

  // Reset ao abrir modal
  useEffect(() => {
    if (isOpen) {
      form.reset()
      setTempMentoradoId(null)
    }
  }, [isOpen, form])

  // Limpar dados temporários
  const handleClose = () => {
    if (tempMentoradoId) {
      // Opcional: deletar mentorado temporário se não foi finalizado
      supabase
        .from('mentorados')
        .delete()
        .eq('id', tempMentoradoId)
        .then(() => console.log('Mentorado temporário deletado'))
    }
    form.reset()
    setTempMentoradoId(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Mentorado</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            Preencha os dados do novo mentorado. Os dados são salvos automaticamente quando você vai para o próximo campo.
            {isAutoSaving && (
              <span className="text-blue-600 text-xs flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Salvando...
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Nome</FormLabel>
                <FormField
                  control={form.control}
                  name="nome_completo"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormControl>
                        <Input
                          {...field}
                          onBlur={() => handleFieldBlur('nome_completo', field.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Email</FormLabel>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormControl>
                        <Input
                          type="email"
                          {...field}
                          onBlur={() => handleFieldBlur('email', field.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Telefone</FormLabel>
                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormControl>
                        <Input
                          {...field}
                          onBlur={() => handleFieldBlur('telefone', field.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Turma</FormLabel>
                <FormField
                  control={form.control}
                  name="turma"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormControl>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value)
                            handleFieldBlur('turma', value)
                          }}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar turma" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Turma A">Turma A</SelectItem>
                            <SelectItem value="Turma B">Turma B</SelectItem>
                            <SelectItem value="Turma C">Turma C</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Estado</FormLabel>
                <FormField
                  control={form.control}
                  name="estado_atual"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormControl>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value)
                            handleFieldBlur('estado_atual', value)
                          }}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="novo">Novo</SelectItem>
                            <SelectItem value="interessado">Interessado</SelectItem>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="engajado">Engajado</SelectItem>
                            <SelectItem value="pausado">Pausado</SelectItem>
                            <SelectItem value="inativo">Inativo</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}